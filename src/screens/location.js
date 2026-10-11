// Location setup (P2, L2): search a US city or ZIP (R2), or use the
// device's location (R3); the choice is saved on this device (R4).
//
// showLocation(root, options) draws the screen into `root`.
//   options.storage     where the location is saved (R4)
//   options.onChosen    called with the saved place
//   options.onClose     when set, the card is a dismissible dialog (opened
//                       from Today); during first setup it isn't
//   options.fetchImpl, options.geolocation   swappable for tests

import { searchPlaces, isZip } from '../weather/places.js';
import { reverseLookup } from '../weather/reverseGeocode.js';
import { saveLocation } from '../store/location.js';
import { ICONS } from './icons.js';

export const MESSAGES = {
  searching: 'Searching…',
  notFoundCity: "We couldn't find that US city. Enter your ZIP code instead, or use your phone's location.",
  notFoundZip: "We couldn't find that ZIP code. Check it, or use your phone's location.",
  searchFailed: "Couldn't reach the place search. Check your connection and try again.",
  locating: 'Finding your location…',
  naming: 'Looking up the place name…',
  outsideUS: 'This app works for US locations only. Search for a US city or ZIP code instead.',
  lookupFailed: "Found your position, but couldn't get its place name from OpenStreetMap. Try again, or search instead.",
  denied: "Location is turned off for this site. To use it, allow location for this site in your browser's settings (on an iPhone: Settings → Privacy & Security → Location Services → Safari Websites). Or search for your city or ZIP code.",
  unavailable: "Couldn't get your location right now. Try again, or search for your city or ZIP code.",
  unsupported: "This browser can't share your location here. Search for your city or ZIP code instead.",
};

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Decorative map shapes behind the card (final art in C10).
const MAP = `<svg class="loc-map" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <path d="M0 100h400M0 200h400M0 300h400M0 400h400M0 500h400M0 600h400M0 700h400M100 0v800M200 0v800M300 0v800" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
  <path d="M20 110 C80 80 160 92 214 124 C262 152 304 140 346 164 C368 214 336 258 304 288 C252 300 222 330 180 320 C140 302 92 312 60 282 C28 242 14 176 20 110Z" fill="currentColor" fill-opacity="0.35"/>
  <path d="M86 470 C130 450 172 470 182 522 C192 582 160 650 130 700 C110 722 90 682 84 640 C78 590 58 520 86 470Z" fill="currentColor" fill-opacity="0.35"/>
  <path d="M262 560 C302 540 352 560 362 602 C366 642 332 662 300 652 C270 642 252 600 262 560Z" fill="currentColor" fill-opacity="0.35"/>
</svg>`;

export function showLocation(root, { storage, onChosen, onClose = null, fetchImpl = globalThis.fetch, geolocation = globalThis.navigator?.geolocation }) {
  root.innerHTML = `
    <div class="loc-screen${onClose ? ' is-dialog' : ''}">
      ${MAP}
      <section class="loc-card" ${onClose ? 'role="dialog" aria-modal="true"' : ''} aria-labelledby="loc-title">
        <div class="loc-head">
          <h1 id="loc-title">Where are you?</h1>
          ${onClose ? `<button type="button" class="icon-btn" data-close aria-label="Close">${ICONS.close}</button>` : ''}
        </div>
        <label class="sr-only" for="place-input">City or ZIP code</label>
        <div class="field">
          ${ICONS.search}
          <input id="place-input" type="text" placeholder="City or ZIP code" autocomplete="off" autocapitalize="words" spellcheck="false"
            enterkeyhint="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="place-list" />
        </div>
        <ul id="place-list" class="matches" role="listbox" aria-label="Matching places" hidden></ul>
        <div class="status" id="place-status" role="status" aria-live="polite"></div>
        <div class="or" aria-hidden="true"><span>or</span></div>
        <button type="button" class="btn btn-outline" data-locate>${ICONS.pin}<span>Use my location</span></button>
        <p class="note">US cities and ZIP codes only.</p>
      </section>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const input = $('#place-input');
  const list = $('#place-list');
  const status = $('#place-status');
  const locateBtn = $('[data-locate]');

  let results = [];
  let active = -1;
  let seq = 0;
  let timer = null;
  let lastCoords = null;

  // A message, with optional action buttons ({ label, run }).
  function say(text, actions = []) {
    status.innerHTML = text ? `<p>${escapeHtml(text)}</p>${actions.length ? `<div class="status-actions">${actions.map((a, i) => `<button type="button" class="btn btn-small" data-action="${i}">${a.icon ?? ''}<span>${escapeHtml(a.label)}</span></button>`).join('')}</div>` : ''}` : '';
    status.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => actions[Number(b.dataset.action)].run()));
  }

  function showResults(places) {
    results = places;
    active = -1;
    list.innerHTML = places.map((p, i) => `<li role="option" id="place-opt-${i}" aria-selected="false" data-i="${i}">${escapeHtml(p.longLabel)}</li>`).join('');
    list.hidden = places.length === 0;
    input.setAttribute('aria-expanded', String(places.length > 0));
    input.removeAttribute('aria-activedescendant');
  }

  function setActive(i) {
    active = i;
    list.querySelectorAll('[role="option"]').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', `place-opt-${i}`);
      list.querySelector(`#place-opt-${i}`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  function choose(place) {
    const saved = saveLocation(storage, place);
    onChosen(saved);
  }

  async function search(query) {
    const mine = ++seq;
    if (query.trim().length < 2) {
      showResults([]);
      say('');
      return;
    }
    say(MESSAGES.searching);
    try {
      const places = await searchPlaces(query, fetchImpl);
      if (mine !== seq) return; // a newer search has started
      showResults(places);
      // The "Use my location" button sits right below the message.
      if (places.length === 0) say(isZip(query) ? MESSAGES.notFoundZip : MESSAGES.notFoundCity);
      else say(`${places.length} ${places.length === 1 ? 'match' : 'matches'}`);
    } catch {
      if (mine !== seq) return;
      showResults([]);
      // The typed text stays in the field (R30).
      say(MESSAGES.searchFailed, [{ label: 'Retry', run: () => search(input.value) }]);
    }
  }

  // One reverse lookup per tap (R3): only from "Use my location" or Retry.
  async function nameAndSave(coords) {
    say(MESSAGES.naming);
    locateBtn.disabled = true;
    try {
      const result = await reverseLookup(coords, fetchImpl);
      if (result.inUS) choose(result.place);
      else {
        say(MESSAGES.outsideUS);
        input.focus();
      }
    } catch {
      say(MESSAGES.lookupFailed, [{ label: 'Retry', run: () => nameAndSave(lastCoords) }]);
    } finally {
      locateBtn.disabled = false;
    }
  }

  function locate() {
    if (!geolocation || globalThis.isSecureContext === false) {
      say(MESSAGES.unsupported);
      return;
    }
    say(MESSAGES.locating);
    locateBtn.disabled = true;
    geolocation.getCurrentPosition(
      (pos) => {
        lastCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        nameAndSave(lastCoords);
      },
      (err) => {
        locateBtn.disabled = false;
        say(err && err.code === 1 ? MESSAGES.denied : MESSAGES.unavailable);
        input.focus();
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => search(input.value), 300);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setActive((active + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive(active <= 0 ? results.length - 1 : active - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length) choose(results[Math.max(active, 0)]);
      else {
        clearTimeout(timer);
        search(input.value);
      }
    } else if (e.key === 'Escape' && onClose) {
      onClose();
    }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) choose(results[Number(li.dataset.i)]);
  });
  locateBtn.addEventListener('click', () => locate());
  if (onClose) {
    $('[data-close]').addEventListener('click', () => onClose());
    root.querySelector('.loc-screen').addEventListener('click', (e) => {
      if (e.target.classList.contains('loc-screen') || e.target.closest('.loc-map')) onClose();
    });
  }
  // Keyboard first on the laptop layout (L2); on phones the keyboard waits
  // until the field is tapped.
  if (globalThis.matchMedia?.('(min-width: 900px)').matches) input.focus();
}
