// First setup (R22): female or male (P9, L9; R40), then the selfie step
// (P7, L7), then the review (P8, L8; R24). Location (P2, L2) and Today
// follow in main.js. Until C9 builds selfie reading, the selfie step offers
// "Set it up by hand" only. One layout file serves both widths; CSS switches
// at 900 px (R31).
//
// showSetup(root, { storage, onDone })
//   storage   where the avatar values are saved (R24)
//   onDone    called with the saved values after "Looks good"

import { renderAvatar } from '../art/avatar.js';
import { MONK_TONES, HAIR_COLORS } from '../art/palette.js';
import { HAIRSTYLES } from '../art/hair.js';
import { STARTER_SETS } from '../content/starters.js';
import { GENDER_NAMES, HAIRSTYLE_NAMES, HAIR_COLOR_NAMES, FACIAL_HAIR_NAMES } from '../content/avatarOptions.js';
import { GENDERS, FACIAL_HAIR, defaultAvatar, withGender, saveAvatar, lookOf, describeAvatar } from '../store/avatar.js';
import { ICONS } from './icons.js';

// The previews wear a tee, a bottom and sneakers from the gender's starter
// set, so the body shows clearly.
function previewOutfit(gender) {
  const items = STARTER_SETS[gender].items;
  const first = (type) => items.find((i) => i.type === type);
  return { top: first('tee'), bottom: first(gender === 'woman' ? 'pants' : 'shorts'), shoes: first('sneakers') };
}

const preview = (avatar, title = '') => renderAvatar(lookOf(avatar), previewOutfit(avatar.gender), { title });

// "Step 2 of 4" with four dots (P9, P7, P8).
const steps = (n) => `<p class="steps"><span class="dots" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>Step ${n} of 4</p>`;

const frame = (n, body) => `
  <div class="setup">
    <header class="setup-bar"><span class="logo">Quick Dresser</span>${steps(n)}</header>
    <main class="setup-main">${body}</main>
  </div>`;

// A group of radio buttons drawn as chips or swatches; the native inputs
// keep keyboard and screen-reader support (R33).
const radios = (name, options, checked, render) => options
  .map(([value, label]) => `<label class="opt opt-${name}"><input type="radio" name="${name}" value="${value}" ${String(value) === String(checked) ? 'checked' : ''}>${render(value, label)}</label>`)
  .join('');

export function showSetup(root, { storage, onDone }) {
  let gender = null;
  let draft = null;

  const focusHeading = () => root.querySelector('h1')?.focus({ preventScroll: false });

  // ---- Step 1: Female or male (P9, L9; R40) --------------------------------
  function genderStep() {
    root.innerHTML = frame(1, `
      <section class="setup-step step-gender" aria-labelledby="setup-title">
        <h1 id="setup-title" tabindex="-1">Make your avatar</h1>
        <p class="lead">Pick one to start. It sets your avatar's body, face and starter outfits. You can change any of them later.</p>
        <fieldset class="gender-cards">
          <legend class="sr-only">Female or male</legend>
          ${GENDERS.map((g) => `<label class="gender-card"><input type="radio" name="gender" value="${g}" ${gender === g ? 'checked' : ''}>
            <span class="gender-preview" aria-hidden="true">${preview(defaultAvatar(g))}</span>
            <span class="gender-name">${GENDER_NAMES[g]}</span></label>`).join('')}
        </fieldset>
        <p class="privacy">${ICONS.lock}<span>Saved only on this device. Never sent.</span></p>
        <div class="setup-actions"><button type="button" class="btn" data-next ${gender ? '' : 'disabled'}>Continue</button></div>
      </section>`);
    const next = root.querySelector('[data-next]');
    root.querySelectorAll('input[name="gender"]').forEach((input) => input.addEventListener('change', () => {
      gender = input.value;
      next.disabled = false;
    }));
    next.addEventListener('click', () => gender && startStep());
    focusHeading();
  }

  // ---- Step 2: Selfie or by hand (P7, L7) ---------------------------------
  // Taking or choosing a photo arrives with C9; both are shown, disabled.
  function startStep() {
    root.innerHTML = frame(2, `
      <section class="setup-step step-start" aria-labelledby="setup-title">
        <h1 id="setup-title" tabindex="-1">Make your avatar</h1>
        <p class="lead">Take a selfie and the app matches your skin tone and hair. You can adjust it next.</p>
        <div class="face-guide" aria-hidden="true"><span></span></div>
        <p class="privacy">${ICONS.lock}<span>Read on this device. Not uploaded or saved.</span></p>
        <div class="setup-actions stack">
          <button type="button" class="btn" disabled aria-describedby="selfie-later">${ICONS.camera}<span>Take a selfie</span></button>
          <button type="button" class="btn btn-outline" disabled aria-describedby="selfie-later">${ICONS.image}<span>Choose a photo</span></button>
          <p class="note" id="selfie-later">Matching from a photo arrives in a later update.</p>
          <button type="button" class="btn btn-outline" data-hand>${ICONS.sliders}<span>Set it up by hand</span></button>
          <button type="button" class="btn-link" data-back>Back</button>
        </div>
      </section>`);
    root.querySelector('[data-hand]').addEventListener('click', () => {
      // Keeps changes made on an earlier visit to the review, unless the
      // gender was changed since.
      draft = draft && draft.gender === gender ? draft : defaultAvatar(gender);
      reviewStep();
    });
    root.querySelector('[data-back]').addEventListener('click', genderStep);
    focusHeading();
  }

  // ---- Step 3: Review and adjust (P8, L8; R24, R40) -----------------------
  function reviewStep() {
    const hairColors = Object.keys(HAIR_COLORS).map((k) => [k, HAIR_COLOR_NAMES[k]]);
    root.innerHTML = frame(3, `
      <section class="setup-step step-review" aria-labelledby="setup-title">
        <h1 id="setup-title" tabindex="-1">Does this look like you?</h1>
        <div class="review">
          <div class="review-preview" data-preview>${preview(draft, describeAvatar(draft))}</div>
          <form class="review-controls" data-controls>
            <fieldset class="ctrl"><legend>Gender</legend><div class="segs">
              ${radios('gender', GENDERS.map((g) => [g, GENDER_NAMES[g]]), draft.gender, (v, l) => `<span class="seg">${l}</span>`)}
            </div></fieldset>
            <fieldset class="ctrl"><legend>Skin tone</legend><div class="swatches skins">
              ${radios('skin', MONK_TONES.map((hex, i) => [i + 1, `Monk ${i + 1}`]), draft.skin, (v, l) => `<span class="sw" style="background:${MONK_TONES[v - 1]}"></span><span class="sr-only">${l}</span>`)}
            </div></fieldset>
            <fieldset class="ctrl"><legend>Hair color</legend><div class="swatches hairs">
              ${radios('hairColor', hairColors, draft.hair.color, (v, l) => `<span class="sw" style="background:${HAIR_COLORS[v]}"></span><span class="sr-only">${l}</span>`)}
            </div></fieldset>
            <fieldset class="ctrl"><legend>Hairstyle</legend><div class="chips-row">
              ${radios('hairStyle', Object.keys(HAIRSTYLES).map((k) => [k, HAIRSTYLE_NAMES[k]]), draft.hair.style, (v, l) => `<span class="chip">${l}</span>`)}
            </div></fieldset>
            <div class="ctrl-pair">
              <fieldset class="ctrl" data-facial ${draft.gender === 'man' ? '' : 'hidden'}><legend>Facial hair</legend><div class="segs">
                ${radios('facialHair', FACIAL_HAIR.map((f) => [f, FACIAL_HAIR_NAMES[f]]), draft.facialHair, (v, l) => `<span class="seg">${l}</span>`)}
              </div></fieldset>
              <fieldset class="ctrl"><legend>Glasses</legend><div class="segs">
                ${radios('glasses', [['off', 'Off'], ['on', 'On']], draft.glasses ? 'on' : 'off', (v, l) => `<span class="seg">${l}</span>`)}
              </div></fieldset>
            </div>
          </form>
        </div>
        <div class="setup-actions split">
          <button type="button" class="btn btn-outline" data-back>Back</button>
          <button type="button" class="btn" data-save>Looks good</button>
        </div>
      </section>`);

    const form = root.querySelector('[data-controls]');
    const previewBox = root.querySelector('[data-preview]');
    const facial = root.querySelector('[data-facial]');

    // Every change redraws the preview right away (R24).
    form.addEventListener('change', (e) => {
      const { name, value } = e.target;
      if (name === 'gender') {
        draft = withGender(draft, value);
        gender = value;
        // Facial hair is Male only (R40): hidden for Female and reset.
        facial.hidden = value !== 'man';
        form.querySelector('input[name="facialHair"][value="none"]').checked = true;
      }
      if (name === 'skin') draft = { ...draft, skin: Number(value) };
      if (name === 'hairColor') draft = { ...draft, hair: { ...draft.hair, color: value } };
      if (name === 'hairStyle') draft = { ...draft, hair: { ...draft.hair, style: value } };
      if (name === 'facialHair') draft = { ...draft, facialHair: value };
      if (name === 'glasses') draft = { ...draft, glasses: value === 'on' };
      previewBox.innerHTML = preview(draft, describeAvatar(draft));
    });

    root.querySelector('[data-back]').addEventListener('click', startStep);
    root.querySelector('[data-save]').addEventListener('click', () => onDone(saveAvatar(storage, draft)));
    focusHeading();
    // On the phone the hairstyle row scrolls sideways; bring the chosen
    // style into view without moving the page.
    const row = root.querySelector('.chips-row');
    const chosen = row.querySelector('input:checked')?.closest('.opt');
    if (chosen && row.scrollWidth > row.clientWidth) {
      const offset = chosen.getBoundingClientRect().left - row.getBoundingClientRect().left;
      row.scrollLeft += offset - (row.clientWidth - chosen.offsetWidth) / 2;
    }
  }

  genderStep();
}
