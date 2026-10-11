// Today (P1a, P1b, L1): the avatar in the day's outfit, the weather, the
// written recommendation, reminders and the Wearing list, all drawn from one
// recommendation state (R7), with the 7-day strip (phone) or week list
// (laptop) to change the date (R5). Loading, missing-data and error states
// follow R28–R30. One layout file serves both widths: CSS switches between
// the phone and laptop arrangements at 900 px (R31).
//
// showToday(root, ctx)
//   ctx.storage            on-device storage (picks, R14)
//   ctx.location           the saved location (R4)
//   ctx.avatar             the saved avatar values (R24)
//   ctx.getForecast({ refresh })  returns { forecast, fetchedAt } or throws
//                          a ForecastError; the shell caches one forecast
//                          per location per visit, refresh skips the cache
//   ctx.onChangeLocation, ctx.onInfo, ctx.onTab(name)
//   ctx.testWeather        the fixture name in dev (?fixture=), if any

import { buildState, shuffle } from '../recommend/state.js';
import { weekOverview, WEEK_LENGTH } from '../recommend/week.js';
import { loadPicks, savePicks } from '../store/picks.js';
import { lookOf } from '../store/avatar.js';
import { renderAvatar } from '../art/avatar.js';
import { itemColors } from '../art/palette.js';
import { GARMENT_TYPES } from '../content/garments.js';
import { ICONS, bigIcon, smallIcon } from './icons.js';
import { dayLabels, timeLabel, skyFor, outfitDescription } from './format.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const deg = (v) => (v === null || v === undefined ? '—' : `${v}°`);

// ---- Pieces --------------------------------------------------------------------

const tabs = (where) => `
  <nav class="tabs tabs-${where}" aria-label="Sections">
    <button type="button" class="tab" aria-current="page" data-tab="today">${ICONS.person}<span>Today</span></button>
    <button type="button" class="tab" data-tab="closet">${ICONS.rack}<span>Closet</span></button>
    <button type="button" class="tab" data-tab="add">${ICONS.camera}<span>Add item</span></button>
  </nav>`;

const locationPill = (location) =>
  `<button type="button" class="pill" data-location aria-label="Location: ${esc(location.label)}. Change location">${ICONS.pin}<span>${esc(location.label)}</span>${ICONS.chevron}</button>`;

const infoButton = '<button type="button" class="icon-btn" data-info aria-label="About this app, sources and privacy">' + ICONS.info + '</button>';

// Weather icon, then the temperature with feels-like (today) or high and
// low (forecast days) and Open-Meteo's description (P1a, R10). Today uses
// the current code; forecast days use the day's code.
const nowIcon = (state, size) => (state.headerWeather ? bigIcon(state.headerWeather.icon, size) : '');

const nowTemp = (state) =>
  state.isToday
    ? `<p class="temp">${deg(state.display.temp)}F</p>`
    : `<p class="temp"><span class="temp-label">High</span> ${deg(state.display.high)}F</p>`;

function nowFeels(state) {
  const word = state.headerWeather ? ` <span class="word">· ${esc(state.headerWeather.text)}</span>` : '';
  const line = state.isToday ? `Feels ${deg(state.display.feels)}` : `Low ${deg(state.display.low)}`;
  return `<p class="feels">${line}${word}</p>`;
}

const nowBlock = (state) => `<div class="now-temp">${nowIcon(state, 64)}<div>${nowTemp(state)}${nowFeels(state)}</div></div>`;

const badge = (state) => `<span class="badge${state.isToday ? '' : ' badge-forecast'}">${state.label}</span>`;

function swatch(item) {
  const { base } = itemColors(item);
  return `<span class="swatch" style="background:${base}" aria-hidden="true"></span>`;
}

const typeLabel = (item) => GARMENT_TYPES[item.type]?.label ?? item.type;

// Phone tiles beside the avatar, top to shoes. Four or five items get
// smaller tiles so they and Shuffle fit the avatar's height (P1a).
function wearingMini(state) {
  const short = (item) => GARMENT_TYPES[item.type]?.short ?? typeLabel(item);
  const many = state.wearing.length > 3 ? ' many' : '';
  return `<ul class="wear-mini${many}" aria-hidden="true">${state.wearing.map((w) => `<li>${swatch(w.item)}<span>${esc(short(w.item))}</span></li>`).join('')}</ul>`;
}

function wearingList(state) {
  return `<section class="wearing" aria-labelledby="wearing-title">
    <h2 class="section-title" id="wearing-title">Wearing</h2>
    <ul>${state.wearing.map((w) => `<li>${swatch(w.item)}<div><p class="item-name">${esc(w.item.name)}</p><p class="item-from">${w.label}</p></div></li>`).join('')}</ul>
  </section>`;
}

function reminderCards(state) {
  if (!state.reminders.length) return '';
  return `<section class="reminders" aria-labelledby="bring-title">
    <h2 class="section-title" id="bring-title">Bring along</h2>
    <ul>${state.reminders.map((r) => `<li class="card rem">${ICONS[r.icon] ?? ''}<p><strong>${esc(r.title)}.</strong> ${esc(r.text)}</p></li>`).join('')}</ul>
  </section>`;
}

const chips = (state) =>
  state.reminders.length ? `<ul class="chips" aria-hidden="true">${state.reminders.map((r) => `<li>${ICONS[r.icon] ?? ''}<span>${esc(r.title)}</span></li>`).join('')}</ul>` : '';

function glance(state) {
  const v = state.values;
  const cell = (value, label) => `<div><p class="g-value">${value}</p><p class="g-label">${label}</p></div>`;
  const range = v.feelsMin === v.feelsMax ? deg(v.feelsMax) : `${v.feelsMin}–${deg(v.feelsMax)}`;
  return `<section class="card glance" aria-labelledby="glance-title">
    <h2 class="section-title" id="glance-title">${state.isToday ? 'Today' : esc(dayLabels(state.date).short)}, 9 am–9 pm</h2>
    <div class="g-grid">
      ${cell(range, 'Feels like')}
      ${cell(v.rain === null ? '—' : `${v.rain}%`, 'Rain chance')}
      ${cell(v.uv === null ? '—' : v.uv, 'UV peak')}
      ${cell(v.gust === null ? '—' : `${v.gust} mph`, 'Gusts')}
    </div>
    ${state.notes.map((n) => `<p class="missing-note">${esc(n)}</p>`).join('')}
  </section>`;
}

const credit = (fetchedAt) =>
  `<p class="credit">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0)${fetchedAt ? ` · Updated ${timeLabel(fetchedAt)}` : ''}</p>`;

// What a day button says to screen readers, since its icon is decorative:
// "Tuesday, Oct 13, high 93°, Light drizzle" (R33).
const dayName = (d) => {
  const l = dayLabels(d.date);
  const detail = d.available ? `, high ${d.high}°${d.weather ? `, ${d.weather.text}` : ''}` : d.loading ? ', loading' : ', no forecast';
  return esc(`${d.isToday ? 'Today' : l.long}${detail}`);
};

function strip(week, selected) {
  return `<nav class="strip" aria-label="Choose a day">${week.map((d) => {
    const l = dayLabels(d.date);
    return `<button type="button" class="day" data-date="${d.date}" aria-pressed="${d.date === selected}" ${d.available ? '' : 'disabled aria-disabled="true"'}
      aria-label="${dayName(d)}">
      <span class="d-name">${d.isToday ? 'Today' : l.short}</span>${d.available && d.weather ? smallIcon(d.weather.icon, 20) : '<span class="d-none">–</span>'}<span class="d-temp">${d.available ? deg(d.high) : ''}</span>
    </button>`;
  }).join('')}</nav>`;
}

function weekList(week, selected) {
  return `<section class="week" aria-labelledby="week-title">
    <h2 class="section-title" id="week-title">This week</h2>
    <div class="week-list" role="group" aria-label="Choose a day">${week.map((d) => {
      const l = dayLabels(d.date);
      return `<button type="button" class="week-day" data-date="${d.date}" aria-pressed="${d.date === selected}" ${d.available ? '' : 'disabled aria-disabled="true"'}
        aria-label="${dayName(d)}${d.available && d.rain !== null ? `, ${d.rain}% rain chance` : ''}">
        <span class="w-name">${l.short} ${l.dayNum}</span>${d.available && d.weather ? smallIcon(d.weather.icon, 20) : '<span></span>'}
        <span class="w-temps">${d.available ? `${deg(d.high)} / ${deg(d.low)}` : d.loading ? '' : 'No forecast'}</span>
        <span class="w-rain">${d.available && d.rain !== null ? `${d.rain}%` : ''}</span>
      </button>`;
    }).join('')}</div>
  </section>`;
}

// Each render replaces the markup, so keyboard focus is carried over to the
// same control by its data attribute. Phone and laptop both have a pill and
// a day button per date; the one on screen gets focus.
const FOCUS_KEYS = ['data-location', 'data-info', 'data-shuffle', 'data-retry', 'data-tab', 'data-date'];
const focusKey = (el) => {
  const a = FOCUS_KEYS.find((k) => el.hasAttribute(k));
  return a ? `[${a}${el.getAttribute(a) ? `="${el.getAttribute(a)}"` : ''}]` : null;
};
const focusVisible = (root, selector) =>
  [...root.querySelectorAll(selector)].find((b) => b.offsetParent !== null)?.focus({ preventScroll: true });

// ---- Screen ----------------------------------------------------------------------

export function showToday(root, ctx) {
  let data = null; // { forecast, fetchedAt }
  let selected = null;
  let error = null;

  const frame = (main, { state = null, week = null, loading = false, banner = '' } = {}) => {
    const date = state ? state.date : null;
    const labels = date ? dayLabels(date) : null;
    const dateLine = labels
      ? `<p class="date-line"><span>${labels.medium}</span>${badge(state)}</p>`
      : `<p class="date-line"><span>${dayLabels(new Date().toLocaleDateString('en-CA')).medium}</span></p>`;
    // Dev only: names the saved weather in use (?fixture=).
    const active = root.contains(document.activeElement) ? focusKey(document.activeElement) : null;
    const test = import.meta.env.DEV && ctx.testWeather ? `<p class="test-weather">Test weather: ${esc(ctx.testWeather)}</p>` : '';
    root.innerHTML = `
      <div class="today${loading ? ' is-loading' : ''}">
        <header class="bar">
          <span class="logo">Quick Dresser</span>
          ${tabs('top')}
          <span class="bar-gap"></span>
          ${locationPill(ctx.location)}
          ${infoButton}
        </header>
        <div class="phone-top">
          <div class="phone-row">${locationPill(ctx.location)}${infoButton}<span class="grow"></span>${state ? nowIcon(state, 52) : ''}</div>
          <div class="phone-row">${dateLine}<span class="grow"></span>${state ? nowTemp(state) : ''}</div>
          ${state ? `<div class="phone-feels">${nowFeels(state)}</div>` : ''}
        </div>
        ${test}
        ${banner}
        ${main}
        ${week ? `<div class="bottom-dock">${strip(week, selected)}${tabs('bottom')}</div>` : `<div class="bottom-dock">${tabs('bottom')}</div>`}
      </div>`;
    bind();
    if (active) focusVisible(root, active);
  };

  // R28: location, date, an avatar placeholder and "Getting the forecast…";
  // the day choices and Shuffle are in place but disabled until data comes.
  function renderLoading() {
    const week = Array.from({ length: WEEK_LENGTH }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { date: d.toLocaleDateString('en-CA'), isToday: i === 0, available: false, loading: true };
    });
    frame(`<main class="layout">
      <div class="col-left">${weekList(week, null)}</div>
      <section class="stage">
        <div class="avatar placeholder-avatar" aria-hidden="true"></div>
        <div class="stage-side"><span></span><button type="button" class="shuffle" disabled aria-label="Shuffle: available once the forecast loads">${ICONS.shuffle}<span class="shuffle-word">Shuffle</span></button></div>
      </section>
      <section class="status-card card" role="status"><p>Getting the forecast…</p></section>
    </main>`, { week, loading: true });
  }

  function renderError(err) {
    const what = err?.offline ? "You're offline, or Open-Meteo can't be reached." : `Open-Meteo didn't send the forecast${err?.message ? ` (${esc(err.message)})` : ''}.`;
    frame(`<main class="layout">
      <section class="status-card card" role="alert">
        <p>${what} Check your connection and try again.</p>
        <button type="button" class="btn" data-retry>${ICONS.retry}<span>Retry</span></button>
      </section>
    </main>`);
  }

  function renderMain() {
    const { forecast, fetchedAt } = data;
    const week = weekOverview(forecast);
    if (!selected || !week.some((d) => d.date === selected && d.available)) {
      selected = (week.find((d) => d.isToday && d.available) || week.find((d) => d.available) || week[0]).date;
    }
    const saved = loadPicks(ctx.storage, ctx.location, forecast.today)[selected];
    const { state, picks } = buildState({ forecast, date: selected, location: ctx.location, closet: ctx.closet ?? [], avatar: ctx.avatar, saved });
    if (picks) savePicks(ctx.storage, ctx.location, selected, picks);

    if (!state.available) {
      frame(`<main class="layout"><section class="status-card card" role="status"><p>There's no forecast for this day yet. Pick another day.</p></section></main>`, { state, week });
      return;
    }

    // Weather already shown stays visible when a refresh fails (R30).
    const refreshError = error
      ? `<section class="card refresh-error" role="alert"><p>Couldn't refresh the forecast. Showing the one from ${timeLabel(fetchedAt)}.</p><button type="button" class="btn btn-small" data-retry>${ICONS.retry}<span>Retry</span></button></section>`
      : '';
    const sky = skyFor(state.dayWeather?.icon);
    const avatarSvg = renderAvatar(lookOf(ctx.avatar), state.outfit, { title: outfitDescription(state) });

    frame(`<main class="layout">
      <div class="col-left">
        <section class="now card" aria-label="Conditions">
          <p class="date-line"><span>${dayLabels(state.date).long}</span>${badge(state)}</p>
          ${nowBlock(state)}
          ${credit(fetchedAt)}
        </section>
        ${weekList(week, selected)}
      </div>
      <section class="stage" aria-label="Today's outfit">
        <div class="avatar sky-${sky}">${avatarSvg}</div>
        <div class="stage-side">
          ${wearingMini(state)}
          <button type="button" class="shuffle" data-shuffle aria-label="Shuffle: show another outfit for this day">${ICONS.shuffle}<span class="shuffle-word">Shuffle</span></button>
        </div>
      </section>
      <div class="headline">
        <p class="one-liner">${esc(state.summary.title)}</p>
        ${chips(state)}
      </div>
      <div class="col-right">
        <section class="card rec" aria-labelledby="rec-title">
          <h2 id="rec-title">${esc(state.summary.title.replace(/\.$/, ''))}</h2>
          <p>${esc(state.summary.text)}</p>
        </section>
        ${reminderCards(state)}
        ${glance(state)}
        ${wearingList(state)}
      </div>
      <div class="phone-credit">${credit(fetchedAt)}</div>
    </main>`, { state, week, banner: refreshError });
  }

  function select(date) {
    selected = date;
    renderMain();
  }

  function bind() {
    root.querySelectorAll('[data-location]').forEach((b) => b.addEventListener('click', () => ctx.onChangeLocation()));
    root.querySelectorAll('[data-info]').forEach((b) => b.addEventListener('click', () => ctx.onInfo()));
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => ctx.onTab(b.dataset.tab)));
    root.querySelectorAll('[data-retry]').forEach((b) => b.addEventListener('click', () => load(true)));
    root.querySelectorAll('.strip [data-date], .week-list [data-date]').forEach((b) => b.addEventListener('click', () => select(b.dataset.date)));
    // Arrow keys move through the week list on the laptop (L1).
    const days = [...root.querySelectorAll('.week-list [data-date]:not([disabled])')];
    days.forEach((b, i) => b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const next = days[(i + (e.key === 'ArrowDown' ? 1 : -1) + days.length) % days.length];
      selected = next.dataset.date;
      renderMain();
      focusVisible(root, `[data-date="${selected}"]`);
    }));
    root.querySelector('[data-shuffle]')?.addEventListener('click', () => {
      const saved = loadPicks(ctx.storage, ctx.location, data.forecast.today)[selected];
      const next = shuffle({ forecast: data.forecast, date: selected, closet: ctx.closet ?? [], avatar: ctx.avatar, saved });
      savePicks(ctx.storage, ctx.location, selected, next);
      renderMain();
    });
  }

  async function load(refresh = false) {
    if (!data) renderLoading();
    try {
      data = await ctx.getForecast({ refresh });
      error = null;
    } catch (err) {
      error = err;
      if (!data) {
        renderError(err);
        return;
      }
    }
    renderMain();
  }

  // The shell calls this when the app comes back to the foreground after a
  // while, so the weather stays current.
  root.refreshToday = () => load(true);
  load();
}
