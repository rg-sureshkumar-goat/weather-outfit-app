// First setup (R22): female or male (P9, L9; R40), then the selfie step
// (P7, L7), then the review with its 7 tabs (P8, L8; R24, R43). Location
// (P2, L2) and Today follow in main.js. Until C9 builds selfie reading, the
// selfie step offers "Set it up by hand" only. One layout file serves both
// widths; CSS switches at 900 px (R31).
//
// showSetup(root, { storage, onDone, edit, onCancel })
//   storage   where the avatar values are saved (R24)
//   onDone    called with the saved values after "Looks good"
//   edit      saved avatar values: opens the review with them ("Edit
//             avatar" in the Closet, R26), without the step count
//   onCancel  Back from that review

import { renderAvatar, AVATAR_VIEWBOX } from '../art/avatar.js';
import { MONK_TONES, HAIR_COLORS } from '../art/palette.js';
import { HAIRSTYLES } from '../art/hair.js';
import { FEATURE_CHOICES, EYE_COLORS, LIP_COLORS, EYESHADOWS, BLUSHES, BEARDS, MOUSTACHES } from '../art/face.js';
import { STARTER_SETS } from '../content/starters.js';
import { GENDER_NAMES, BODY_TYPE_NAMES, HAIRSTYLE_NAMES, HAIR_COLOR_NAMES, BEARD_NAMES, MOUSTACHE_NAMES, FEATURE_NAMES } from '../content/avatarOptions.js';
import { GENDERS, bodyTypesFor, defaultAvatar, withGender, saveAvatar, lookOf, describeAvatar } from '../store/avatar.js';
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
    <header class="setup-bar"><span class="logo">Quick Dresser</span>${n ? steps(n) : '<p class="steps">Edit avatar</p>'}</header>
    <main class="setup-main">${body}</main>
  </div>`;

// A group of radio buttons drawn as chips or swatches; the native inputs
// keep keyboard and screen-reader support (R33).
const radios = (name, options, checked, render) => options
  .map(([value, label]) => `<label class="opt opt-${name}"><input type="radio" name="${name}" value="${value}" ${String(value) === String(checked) ? 'checked' : ''}>${render(value, label)}</label>`)
  .join('');

// ---- Review controls (P8, L8; R43) --------------------------------------------

// One labelled group per choice: segments, a row of named chips, or color
// swatches. A swatch with no color is "None".
const group = (legend, inner, attrs = '') => `<fieldset class="ctrl" ${attrs}><legend>${legend}</legend>${inner}</fieldset>`;
const segs = (name, legend, options, checked) =>
  group(legend, `<div class="segs">${radios(name, options, checked, (v, l) => `<span class="seg">${l}</span>`)}</div>`);
const chips = (name, legend, options, checked) =>
  group(legend, `<div class="chips-row">${radios(name, options, checked, (v, l) => `<span class="chip">${l}</span>`)}</div>`);
const swatches = (name, legend, options, checked, colorOf, cls = '') =>
  group(legend, `<div class="swatches ${cls}">${radios(name, options, checked, (v, l) => {
    const color = colorOf(v);
    return `<span class="sw${color ? '' : ' sw-none'}" ${color ? `style="background:${color}"` : ''}></span><span class="sr-only">${l}</span>`;
  })}</div>`);

const named = (keys, names) => keys.map((k) => [k, names[k]]);
// A face feature (face.js FEATURE_CHOICES), as chips or as swatches.
const feature = (draft, key) => chips(`feature-${key}`, FEATURE_NAMES[key].label, named(FEATURE_CHOICES[key], FEATURE_NAMES[key].choices), draft.features[key]);
const featureSwatches = (draft, key, colors) =>
  swatches(`feature-${key}`, FEATURE_NAMES[key].label, named(FEATURE_CHOICES[key], FEATURE_NAMES[key].choices), draft.features[key], (v) => colors[v]);

// The 7 tabs and what each holds (R43).
const TABS = [['body', 'Body'], ['face', 'Face'], ['eyes', 'Eyes'], ['noseMouth', 'Nose and mouth'], ['hair', 'Hair'], ['details', 'Details'], ['makeup', 'Makeup']];
const PANELS = {
  body: (d) => segs('gender', 'Female or male', GENDERS.map((g) => [g, GENDER_NAMES[g]]), d.gender)
    + chips('bodyType', 'Body type', named(bodyTypesFor(d.gender), BODY_TYPE_NAMES), d.bodyType)
    + swatches('skin', 'Skin tone', MONK_TONES.map((_, i) => [i + 1, `Monk ${i + 1}`]), d.skin, (v) => MONK_TONES[v - 1], 'skins'),
  face: (d) => feature(d, 'shape') + feature(d, 'ears') + feature(d, 'lines'),
  eyes: (d) => feature(d, 'eyeShape') + featureSwatches(d, 'eyeColor', EYE_COLORS) + feature(d, 'brows') + feature(d, 'lashes')
    + segs('glasses', 'Glasses', [['off', 'Off'], ['on', 'On']], d.glasses ? 'on' : 'off'),
  noseMouth: (d) => feature(d, 'nose') + feature(d, 'mouth'),
  // Beard and moustache are Male only (R40).
  hair: (d) => chips('hairStyle', 'Hairstyle', named(Object.keys(HAIRSTYLES), HAIRSTYLE_NAMES), d.hair.style)
    + swatches('hairColor', 'Hair color', named(Object.keys(HAIR_COLORS), HAIR_COLOR_NAMES), d.hair.color, (v) => HAIR_COLORS[v], 'hairs')
    + (d.gender === 'man' ? chips('beard', 'Beard', named(BEARDS, BEARD_NAMES), d.beard) + chips('moustache', 'Moustache', named(MOUSTACHES, MOUSTACHE_NAMES), d.moustache) : ''),
  details: (d) => feature(d, 'freckles') + feature(d, 'mark'),
  makeup: (d) => featureSwatches(d, 'lips', LIP_COLORS) + featureSwatches(d, 'eyeshadow', EYESHADOWS) + feature(d, 'eyeliner') + featureSwatches(d, 'blush', BLUSHES),
};

// On the phone a long row of chips scrolls sideways; bring the chosen one
// into view without moving the page.
function centerChosen(panel) {
  panel?.querySelectorAll('.chips-row').forEach((row) => {
    const chosen = row.querySelector('input:checked')?.closest('.opt');
    if (!chosen || row.scrollWidth <= row.clientWidth) return;
    const offset = chosen.getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollLeft += offset - (row.clientWidth - chosen.offsetWidth) / 2;
  });
}

// The preview's framing, as SVG viewBox windows: the whole body, so each
// body type shows in full, or the head and shoulders, with room for an afro,
// long hair and long beards. Changing tabs eases between them, unless reduced
// motion is on.
const FULL_BODY = AVATAR_VIEWBOX.split(' ').map(Number);
const HEAD_AND_SHOULDERS = [80, 8, 240, 280];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function previewZoom(box) {
  let framing = 'body';
  let current = null;
  let raf = 0;
  const target = () => (framing === 'face' ? HEAD_AND_SHOULDERS : FULL_BODY);
  const show = (view) => {
    current = view;
    box.querySelector('svg')?.setAttribute('viewBox', view.map((n) => +n.toFixed(1)).join(' '));
  };
  return {
    // After the preview is redrawn.
    apply: () => show(current ?? target()),
    to(next, { animate }) {
      framing = next;
      cancelAnimationFrame(raf);
      const from = current;
      const to = target();
      if (!animate || !from || reducedMotion.matches) return show(to);
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 240);
        const ease = 1 - (1 - t) ** 3;
        show(from.map((v, i) => v + (to[i] - v) * ease));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
  };
}

export function showSetup(root, { storage, onDone, edit = null, onCancel }) {
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

  // ---- Step 3: Review and adjust (P8, L8; R24, R40, R43) ------------------
  // Seven tabs of choices with a live preview. The Body tab shows the whole
  // body; the others zoom the preview to the head and shoulders.
  function reviewStep({ tab = 'body', focus = null } = {}) {
    let activeTab = tab;
    root.innerHTML = frame(edit ? null : 3, `
      <section class="setup-step step-review" aria-labelledby="setup-title">
        <h1 id="setup-title" tabindex="-1">Does this look like you?</h1>
        <div class="review">
          <div class="review-preview" data-preview></div>
          <div class="review-controls">
            <div class="avatar-tabs" role="tablist" aria-label="Avatar choices">
              ${TABS.map(([id, label]) => `<button type="button" class="avatar-tab" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${id === activeTab}" tabindex="${id === activeTab ? 0 : -1}">${label}</button>`).join('')}
            </div>
            <form data-controls>
              ${TABS.map(([id]) => `<div class="tab-panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" ${id === activeTab ? '' : 'hidden'}>${PANELS[id](draft)}</div>`).join('')}
            </form>
          </div>
        </div>
        <div class="setup-actions split">
          <button type="button" class="btn btn-outline" data-back>Back</button>
          <button type="button" class="btn" data-save>Looks good</button>
        </div>
      </section>`);

    const form = root.querySelector('[data-controls]');
    const previewBox = root.querySelector('[data-preview]');
    const tabButtons = [...root.querySelectorAll('[role="tab"]')];
    const zoom = previewZoom(previewBox);

    const showPreview = () => {
      previewBox.innerHTML = preview(draft, describeAvatar(draft));
      zoom.apply();
    };

    function selectTab(id, { focusTab = false } = {}) {
      activeTab = id;
      tabButtons.forEach((b) => {
        const on = b.id === `tab-${id}`;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focusTab) b.focus();
      });
      root.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== `panel-${id}`; });
      zoom.to(id === 'body' ? 'body' : 'face', { animate: true });
      centerChosen(root.querySelector(`#panel-${id}`));
    }

    tabButtons.forEach((b, i) => {
      b.addEventListener('click', () => selectTab(TABS[i][0]));
      // Arrow keys, Home and End move between tabs (L8).
      b.addEventListener('keydown', (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        selectTab(TABS[(to + TABS.length) % TABS.length][0], { focusTab: true });
      });
    });

    // Every change redraws the preview right away (R24, R43).
    form.addEventListener('change', (e) => {
      const { name, value } = e.target;
      if (name === 'gender') {
        // Female or Male changes the body types, face defaults and facial
        // hair on offer (R40), so the choices are drawn again.
        draft = withGender(draft, value);
        gender = value;
        reviewStep({ tab: activeTab, focus: 'gender' });
        return;
      }
      if (name === 'bodyType') draft = { ...draft, bodyType: value };
      if (name === 'skin') draft = { ...draft, skin: Number(value) };
      if (name === 'hairColor') draft = { ...draft, hair: { ...draft.hair, color: value } };
      if (name === 'hairStyle') draft = { ...draft, hair: { ...draft.hair, style: value } };
      if (name === 'beard' || name === 'moustache') draft = { ...draft, [name]: value };
      if (name === 'glasses') draft = { ...draft, glasses: value === 'on' };
      if (name.startsWith('feature-')) draft = { ...draft, features: { ...draft.features, [name.slice('feature-'.length)]: value } };
      showPreview();
    });

    root.querySelector('[data-back]').addEventListener('click', edit ? onCancel : startStep);
    root.querySelector('[data-save]').addEventListener('click', () => onDone(saveAvatar(storage, draft)));

    zoom.to(activeTab === 'body' ? 'body' : 'face', { animate: false });
    showPreview();
    if (focus) root.querySelector(`input[name="${focus}"]:checked`)?.focus();
    else focusHeading();
    centerChosen(root.querySelector(`#panel-${activeTab}`));
  }

  // Edit avatar (R26) starts at the review with the saved values.
  if (edit) {
    draft = edit;
    gender = edit.gender;
    reviewStep();
  } else {
    genderStep();
  }
}
