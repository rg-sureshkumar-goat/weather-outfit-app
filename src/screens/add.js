// Add item (P4a, P4c, P4d; L4; R15, R17, R18) and Edit item (R20).
//
// A photo from the camera in the page, Photos, or a dropped file (laptop),
// then what it is (the 34 types as icon tiles under the six group headings),
// then colors, a name and what it suits, with the avatar wearing it. On the
// phone the steps come one at a time (photo, then 2 of 3, then 3 of 3); on
// the laptop they sit side by side (L4). Editing reopens the confirm step
// (R20).
//
// The cut-out (R16) needs no step of its own: the model starts loading when
// Add item opens, with a progress bar (R37), and the app cuts the item out
// while the User picks its type. Its colors then replace the first guess
// from the photo's middle, unless the User is already editing colors or the
// name. Save waits for the cut-out. With no usable outline, the whole photo
// is kept and a note suggests a retake.
//
// With a cut-out, the app reads the item's pattern and buttons (R44) and
// shows it Drawn in the app's style or as its Photo fitted to the drawing:
// it picks one, and "Show as" changes it. Button shirts get a choice of
// chest pockets. Color edits carry into a drawn pattern.
//
// showAdd(root, ctx) -> dispose()   (stops the camera)
//   ctx.location, ctx.avatar        the top bar and the preview
//   ctx.existing, ctx.photoUrl      an item to edit, and its photo's URL
//   ctx.onTab, ctx.onChangeLocation, ctx.onInfo
//   ctx.onSave({ type, name, colors, photo, cutout, show, pattern, details })
//                                   -> Promise<item>
//                                   may throw store/closet.js ClosetFullError
//   ctx.onDone(item), ctx.onCancel()

import { renderAvatar } from '../art/avatar.js';
import { GARMENT_TYPES, TYPE_GROUPS } from '../content/garments.js';
import { suggestName } from '../content/colorNames.js';
import { lookOf } from '../store/avatar.js';
import { ClosetFullError, NAME_MAX } from '../store/closet.js';
import { preparePhoto, cutOut, frameFromVideo } from '../vision/photo.js';
import { loadSegmenter, segmenterLoaded } from '../vision/segmenter.js';
import { MAX_COLORS } from '../vision/colors.js';
import { photoLook } from '../vision/pattern.js';
import { readPattern, followColorEdit } from '../vision/reading.js';
import { readShirtButtons } from '../vision/details.js';
import { ICONS, GARMENT_ICONS } from './icons.js';
import { esc, tabs, topBar, bindChrome, segs } from './chrome.js';
import { suitsHtml } from './closet.js';

const wide = matchMedia('(min-width: 900px)');

// Button shirts get a choice of chest pockets (R44).
const BUTTON_SHIRTS = new Set(['buttonUpShort', 'longSleeveShirt', 'dressShirt']);
// Readings the app draws by default; anything else shows as its photo.
const DRAWN_KINDS = new Set(['solid', 'plaid', 'check', 'stripes']);

// What "Drawn" shows for a reading.
const DRAWN_NOTES = {
  solid: 'Drawn flat, in its colors.',
  plaid: 'Drawn as a plaid in its own colors.',
  check: 'Drawn as a check in its own colors.',
  stripes: 'Drawn as stripes in its own colors.',
};

// The avatar wearing the item, with plain basics in the other slots.
function previewOutfit(type, colors, look) {
  const item = { id: 'preview', type, colors, name: '', source: 'closet', ...look };
  const plain = (t, base) => ({ type: t, colors: { base, print: null }, source: 'closet' });
  const basics = { top: plain('tee', '#f4f2ee'), bottom: plain('pants', '#3b4a63'), shoes: plain('sneakers', '#f4f2ee') };
  const slot = GARMENT_TYPES[type].slot;
  if (slot === 'dress') return { dress: item, shoes: basics.shoes };
  return { ...basics, [slot]: item };
}

// How much of the avatar the preview shows: shoes and bottoms need the
// legs, accessories the head.
function previewView(type) {
  const { slot, group } = GARMENT_TYPES[type];
  if (group === 'accessories') return '80 0 240 330';
  if (slot === 'shoes' || slot === 'bottom' || slot === 'dress') return '0 30 400 940';
  return '40 20 320 560';
}

// What the cut-out note says when the whole photo is kept (R16).
const CUT_MESSAGES = {
  failed: "Couldn't find the item in this photo, so the whole photo is kept. For a better match, retake it laid flat or on a hanger, against a plain background, in good light.",
  unavailable: "The cut-out couldn't load, so the whole photo is kept. Check your connection, then retake to try again.",
};

const CAMERA_MESSAGES = {
  NotAllowedError: "Camera access is off for this site. Choose a photo instead, or allow the camera in your browser's settings.",
  default: "No camera is available here. Choose a photo instead.",
};

export function showAdd(root, ctx) {
  const editing = Boolean(ctx.existing);
  const s = {
    step: editing ? 'confirm' : 'photo',
    photo: ctx.existing?.photo ?? null,
    photoUrl: editing ? ctx.photoUrl(ctx.existing) : null,
    type: ctx.existing?.type ?? null,
    colors: ctx.existing ? { more: [], ...ctx.existing.colors } : null,
    colorsEdited: editing,
    name: ctx.existing?.name ?? '',
    nameEdited: editing,
    // The cut-out: idle, working, done, failed (no usable outline) or
    // unavailable (the model didn't load). Editing keeps the saved image.
    cut: editing ? 'kept' : 'idle',
    cutout: ctx.existing?.cutout ?? false,
    // How the avatar shows it (R44): the pattern reading, Drawn or Photo,
    // and a button shirt's details. `reading` while the app reads them; an
    // item saved before the app read patterns is read when it's edited.
    show: ctx.existing?.show ?? null,
    pattern: ctx.existing?.pattern ?? null,
    details: ctx.existing?.details ?? null,
    reading: Boolean(ctx.existing?.cutout && ctx.existing.photo && !ctx.existing.pattern),
    modelShare: null, // 0–1 while the model downloads
    cameraOn: false,
    message: null, // about the camera or the photo
    saveError: null,
    busy: false,
  };
  let stream = null;
  let ownUrl = null; // the object URL this screen made, revoked on dispose
  let photoToken = 0; // which photo a finishing cut-out belongs to
  let disposed = false;
  // The preview's photo look (R44), made from the cut-out once.
  let look = null;
  let lookPhoto = null;
  let lookToken = 0;

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    s.cameraOn = false;
  };

  // ---- Markup -------------------------------------------------------------------

  const photoInput = (label, cls = 'btn btn-outline') => `
    <label class="${cls} file-btn">${ICONS.image}<span>${label}</span>
      <input type="file" accept="image/*" data-file class="sr-only-input">
    </label>`;

  const message = () => (s.message ? `<p class="add-message" role="alert">${esc(s.message)}</p>` : '');

  const photoImg = (cls, alt) => `<img class="${cls}${s.cutout ? ' is-cutout' : ''}" src="${s.photoUrl}" alt="${alt}" data-photo-img>`;

  // The cut-out's progress, or why the whole photo is kept (R16, R37).
  // `where` is the step showing it: on the type step and beside the
  // laptop's photo, a finished cut-out leaves a one-line confirmation in its
  // place, so the tiles below don't jump; the confirm step's caption already
  // says "Cut out".
  function cutNote(where) {
    const open = (cls = '', live = true) => `<div class="cut-note${cls}" data-cut-note="${where}"${live ? ' role="status"' : ''}>`;
    const downloading = s.modelShare != null && s.modelShare < 1;
    const bar = downloading ? `<progress max="1" value="${s.modelShare}" aria-label="Cut-out download"></progress>` : '';
    if (s.cut === 'working') {
      return `${open()}<p>${downloading ? 'Getting the cut-out ready, then cutting out your item…' : 'Cutting out your item…'}</p>${bar}</div>`;
    }
    if (s.cut === 'failed' || s.cut === 'unavailable') {
      return `${open(' is-warning')}<p>${CUT_MESSAGES[s.cut]}</p>
        <button type="button" class="btn btn-outline btn-small" data-retake>${ICONS.camera}<span>Retake</span></button></div>`;
    }
    if (s.cut === 'done' && where !== 'confirm') return `${open(' is-done')}<p>${ICONS.check}<span>Cut out on this device</span></p></div>`;
    if (!s.photo && downloading) return `${open('', false)}<p>Getting the cut-out ready</p>${bar}</div>`;
    return '';
  }

  // P4a, and the laptop's photo panel (L4).
  function photoPanel() {
    if (s.cameraOn) {
      return `<div class="camera">
          <video data-video playsinline muted aria-label="Camera view"></video>
          <p class="camera-hint">Lay it flat or hang it up, in good light</p>
        </div>
        <div class="camera-actions">
          ${photoInput('Photos', 'btn btn-outline btn-small')}
          <button type="button" class="shutter" data-shutter aria-label="Take the photo"><span></span></button>
          <button type="button" class="btn-link" data-camera-off>Close camera</button>
        </div>
        ${cutNote('photo')}`;
    }
    if (s.photoUrl) {
      return `<div class="photo-frame">${photoImg('', s.cutout ? 'Your item, cut out' : 'Your photo')}</div>
        ${cutNote('photo')}
        ${message()}
        ${editing ? '' : `<div class="photo-actions">${photoInput('Choose another photo')}<button type="button" class="btn btn-outline" data-camera>${ICONS.camera}<span>Use camera</span></button></div>`}`;
    }
    return `<div class="drop-zone" data-drop>
        <span class="drop-icon" aria-hidden="true">${ICONS.upload}</span>
        <p><b>${wide.matches ? 'Choose or drop a photo of one item' : 'Choose a photo of one item'}</b></p>
        <p class="muted">Lay it flat or hang it up, in good light. The app cuts it out on this device.</p>
        <div class="photo-actions">${photoInput('Choose a photo', 'btn')}<button type="button" class="btn btn-outline" data-camera>${ICONS.camera}<span>Use camera</span></button></div>
      </div>
      ${cutNote('photo')}
      ${message()}`;
  }

  // P4c: the 34 types as icon tiles under the six group headings (R17).
  const typeTiles = () => TYPE_GROUPS.map(([group, title]) => `
    <fieldset class="type-group">
      <legend>${title}</legend>
      <div class="type-tiles">${Object.entries(GARMENT_TYPES).filter(([, t]) => t.group === group).map(([key, t]) => `
        <label class="type-tile"><input type="radio" name="type" value="${key}" ${key === s.type ? 'checked' : ''}>
          <span class="type-icon" aria-hidden="true">${GARMENT_ICONS[key]}</span><span class="type-label">${t.label}</span></label>`).join('')}
      </div>
    </fieldset>`).join('');

  // How many colors the item has: the base, a print and the others (R17).
  const colorCount = () => 1 + (s.colors.print ? 1 : 0) + s.colors.more.length;

  const colorPicker = (which, label) => {
    const hex = s.colors[which];
    // A print can't be added while the item already has 6 colors.
    const full = !hex && colorCount() >= MAX_COLORS;
    const links = full
      ? '<span class="muted">Remove a color to add one</span>'
      : `${hex ? '<span class="link-like">Change</span>' : '<span class="link-like">Add</span>'}${which === 'print' && hex ? ' · <button type="button" class="btn-link" data-no-print>None</button>' : ''}`;
    return `<div class="color-pick">
        <label class="color-swatch${hex ? '' : ' is-none'}" style="${hex ? `background:${hex}` : ''}">
          <input type="color" value="${hex ?? '#ffffff'}" data-color="${which}" aria-label="${label} color"${full ? ' disabled' : ''}>
        </label>
        <div><b>${label}</b><span class="color-links">${links}</span></div>
      </div>`;
  };

  // The item's other colors (R17): each can be changed or removed, and more
  // added, up to 6 colors in all. The avatar draws the base and print.
  const moreColors = () => `
    <div class="more-colors" role="group" aria-labelledby="more-colors-title">
      ${s.colors.more.map((hex, i) => `
        <div class="more-color">
          <label class="color-swatch" style="background:${hex}"><input type="color" value="${hex}" data-more="${i}" aria-label="Other color ${i + 1}"></label>
          <button type="button" class="more-remove" data-remove-more="${i}" aria-label="Remove other color ${i + 1}">${ICONS.close}</button>
        </div>`).join('')}
      ${colorCount() < MAX_COLORS ? `<label class="color-swatch is-add"><input type="color" value="#ffffff" data-add-more aria-label="Add another color"><span aria-hidden="true">+</span></label>` : ''}
    </div>`;

  // The standard drawing's chest pockets: one on Body B's shirts, none on
  // Body A's or on a dress shirt (art/garments.js, formal.js).
  const pocketsNow = () => s.details?.pockets ?? (s.type === 'dressShirt' || lookOf(ctx.avatar).body === 'A' ? 0 : 1);

  // What the chosen look shows.
  const lookNote = () => (s.show === 'drawn'
    ? (DRAWN_NOTES[s.pattern?.kind] ?? 'Drawn flat, in its base and print colors: its print can’t be drawn.')
    : 'Its photo, fitted to the drawing.');

  // How the avatar shows the item (R44), and a button shirt's pockets.
  const lookControls = () => {
    let out = '';
    if (s.cutout && s.reading) out += '<p class="muted look-note">Reading its pattern…</p>';
    else if (s.cutout) {
      out += segs('show', 'Show as', [['drawn', 'Drawn'], ['photo', 'Photo']], s.show ?? 'photo') + `<p class="muted look-note" data-look-note>${lookNote()}</p>`;
    }
    if (BUTTON_SHIRTS.has(s.type)) {
      out += segs('pockets', 'Chest pockets', [[0, 'None'], [1, 'One'], [2, 'Two']], pocketsNow());
      if (pocketsNow() > 0) out += segs('flaps', 'Pocket flaps', [['no', 'No'], ['yes', 'Yes']], s.details?.flaps ? 'yes' : 'no');
    }
    return out ? `<div class="look-controls">${out}</div>` : '';
  };

  // P4d: preview, colors, name and what it suits.
  const confirmBody = () => `
    <div class="confirm-grid">
      ${wide.matches ? '' : `<figure class="confirm-photo">${photoImg('', '')}<figcaption data-photo-caption>${s.cutout ? 'Cut out' : 'Your photo'}</figcaption></figure>`}
      <figure class="confirm-avatar" data-preview><figcaption>On your avatar</figcaption></figure>
    </div>
    ${wide.matches ? '' : cutNote('confirm')}
    ${lookControls()}
    <h3 class="field-title">Colors</h3>
    <div class="color-row">${colorPicker('base', 'Base')}${colorPicker('print', 'Print')}</div>
    <h3 class="field-title" id="more-colors-title">Other colors</h3>
    ${moreColors()}
    <label class="field"><span class="field-title">Name</span>
      <input type="text" class="text-input" data-name maxlength="${NAME_MAX}" value="${esc(s.name)}" autocomplete="off">
    </label>
    <h3 class="field-title">Suits</h3>
    <p class="suits" data-suits>${suitsHtml(s.type)} <span class="muted">from its type</span></p>`;

  const saveButton = () => `
    <p class="save-error" role="alert" data-save-error>${s.saveError ? esc(s.saveError) : ''}</p>
    <button type="button" class="btn" data-save ${ready() ? '' : 'disabled'}>${saveLabel()}</button>`;

  const saveLabel = () => {
    if (s.busy) return 'Saving…';
    if (s.cut === 'working' && s.type) return 'Cutting out…';
    if (s.reading && s.type) return 'Reading its pattern…';
    return editing ? 'Save changes' : 'Save to closet';
  };

  // Save waits for the cut-out and its reading, so the closet keeps the
  // cut-out image and how to draw it.
  const ready = () => Boolean(s.photo && s.type && s.name.trim() && !s.busy && s.cut !== 'working' && !s.reading);

  // The phone's step header (P4c, P4d): back, title and step count.
  const stepBar = (n) => `
    <header class="add-bar">
      <button type="button" class="icon-btn" data-step-back aria-label="Back">${ICONS.back}</button>
      <h1 tabindex="-1">${editing ? 'Edit item' : 'Add item'}</h1>
      <span class="step-count">${editing ? '' : `${n} of 3`}</span>
    </header>`;

  function phoneMarkup() {
    if (s.step === 'photo') {
      return `<div class="add-page add-photo">
          <h1 class="sr-only" tabindex="-1">Add item</h1>
          <main class="add-main">${photoPanel()}</main>
          <div class="bottom-dock">${tabs('bottom', 'add')}</div>
        </div>`;
    }
    if (s.step === 'type') {
      return `<div class="add-page">
          ${stepBar(2)}
          <main class="add-main">
            <div class="type-head">${s.photoUrl ? photoImg('type-thumb', '') : ''}<div><h2>What is it?</h2><p class="muted">This sets the avatar's garment and the weather it suits.</p></div></div>
            ${cutNote('type')}
            <form class="type-form" data-types>${typeTiles()}</form>
          </main>
          <div class="add-actions"><button type="button" class="btn" data-next ${s.type ? '' : 'disabled'}>Next</button></div>
        </div>`;
    }
    return `<div class="add-page">
        ${stepBar(3)}
        <main class="add-main">
          ${confirmBody()}
          ${editing ? '<button type="button" class="btn-link" data-change-type>Change type</button>' : ''}
        </main>
        <div class="add-actions">${saveButton()}</div>
      </div>`;
  }

  // L4: the steps side by side.
  function laptopMarkup() {
    return `<div class="add-page add-wide">
        ${topBar(ctx.location, editing ? null : 'add')}
        <main class="add-layout">
          <section class="add-left" aria-label="Photo">
            <h1 tabindex="-1">${editing ? 'Edit item' : 'Add item'}</h1>
            ${photoPanel()}
          </section>
          <section class="add-right">
            <h2 class="add-step">${s.photo ? `<span class="step-done" aria-hidden="true">${ICONS.check}</span>` : '<span class="step-num">1</span>'} Photo ${s.photo ? '<span class="muted">Done</span>' : ''}</h2>
            <h2 class="add-step"><span class="step-num">2</span> What is it?</h2>
            <form class="type-form" data-types>${typeTiles()}</form>
            <h2 class="add-step"><span class="step-num">3</span> Colors and name</h2>
            ${s.photo && s.type ? confirmBody() : '<p class="muted">Choose a photo and a type first.</p>'}
            <div class="add-actions">${editing ? '<button type="button" class="btn btn-outline" data-cancel-edit>Cancel</button>' : ''}${saveButton()}</div>
          </section>
        </main>
      </div>`;
  }

  // ---- Rendering ----------------------------------------------------------------

  function render({ focus = true, keepScroll = false } = {}) {
    root.innerHTML = wide.matches ? laptopMarkup() : phoneMarkup();
    bind();
    updatePreview();
    if (s.cameraOn) attachCamera();
    if (focus) root.querySelector('h1')?.focus({ preventScroll: true });
    if (!keepScroll) window.scrollTo(0, 0);
  }

  // A selector that finds the focused control again after a re-render.
  function focusKey(el) {
    if (!el || !root.contains(el)) return null;
    if (el.type === 'radio') return `input[name="${el.name}"][value="${el.value}"]`;
    const data = [...el.attributes].find((a) => a.name.startsWith('data-'));
    return data ? `[${data.name}]` : null;
  }

  // Shows a finished cut-out or download without moving the User's place.
  // While they're typing a name or choosing a color, only the photo, the
  // note and Save change, so the field they're in stays as it is.
  function refresh() {
    const active = document.activeElement;
    if (active?.matches?.('[data-color], [data-more], [data-add-more], [data-name]') && root.contains(active)) {
      root.querySelectorAll('[data-photo-img]').forEach((img) => {
        img.src = s.photoUrl;
        img.classList.toggle('is-cutout', s.cutout);
      });
      const caption = root.querySelector('[data-photo-caption]');
      if (caption) caption.textContent = s.cutout ? 'Cut out' : 'Your photo';
      root.querySelectorAll('[data-cut-note]').forEach((n) => { n.outerHTML = cutNote(n.dataset.cutNote); });
      bindRetake();
      updateSave();
      const btn = root.querySelector('[data-save]');
      if (btn) btn.textContent = saveLabel();
      return;
    }
    const key = focusKey(active);
    render({ focus: false, keepScroll: true });
    if (key) root.querySelector(key)?.focus({ preventScroll: true });
  }

  // Download progress moves only the bars; once the download ends or fails
  // the note is redrawn without them.
  function showProgress(share) {
    s.modelShare = share;
    if (disposed) return;
    const bars = root.querySelectorAll('[data-cut-note] progress');
    if (share != null && share < 1 && bars.length) {
      bars.forEach((b) => { b.value = share; });
      return;
    }
    root.querySelectorAll('[data-cut-note]').forEach((n) => { n.outerHTML = cutNote(n.dataset.cutNote); });
    bindRetake();
  }

  function updatePreview() {
    const box = root.querySelector('[data-preview]');
    if (!box || !s.type || !s.colors) return;
    const avatarLook = { ...lookOf(ctx.avatar), ...(s.type === 'glasses' ? { glasses: true } : {}) };
    const svg = renderAvatar(avatarLook, previewOutfit(s.type, s.colors, { show: s.cutout ? s.show : null, pattern: s.pattern, details: s.details }), { title: `Your avatar wearing the ${GARMENT_TYPES[s.type].label.toLowerCase()}`, photos: look ? { preview: look } : null })
      .replace(/viewBox="[^"]*"/, `viewBox="${previewView(s.type)}"`);
    box.querySelector('svg')?.remove();
    box.insertAdjacentHTML('afterbegin', svg);
  }

  // Makes the preview's photo look for a new cut-out shown as its photo,
  // then redraws it.
  async function refreshLook() {
    const token = ++lookToken;
    if (!s.cutout || !s.photo) {
      look = null;
    } else if (s.show !== 'drawn' && lookPhoto !== s.photo) {
      try {
        const made = await photoLook(s.photo);
        if (token !== lookToken || disposed) return;
        look = made;
        lookPhoto = s.photo;
      } catch {
        look = null; // drawn in its colors instead
      }
    }
    if (token === lookToken && !disposed) updatePreview();
  }

  function updateSave() {
    const btn = root.querySelector('[data-save]');
    if (btn) btn.disabled = !ready();
    if (btn && !s.busy) btn.textContent = saveLabel();
    const err = root.querySelector('[data-save-error]');
    if (err) err.textContent = s.saveError ?? '';
  }

  // ---- Photo ----------------------------------------------------------------------

  function setPhoto(photo, cutout) {
    if (ownUrl) URL.revokeObjectURL(ownUrl);
    ownUrl = photo ? URL.createObjectURL(photo) : null;
    Object.assign(s, { photo, photoUrl: ownUrl, cutout });
  }

  // Back to the photo step, for a retake.
  function retake() {
    photoToken += 1;
    setPhoto(null, false);
    Object.assign(s, { cut: 'idle', colors: null, colorsEdited: false, show: null, pattern: null, details: null, reading: false, message: null, step: 'photo' });
    look = null;
    if (!wide.matches) s.cameraOn = true;
    render();
  }

  async function usePhoto(file) {
    if (!file || !file.type.startsWith('image/')) {
      s.message = "That isn't a photo. Choose a JPEG or PNG.";
      render();
      return;
    }
    s.message = null;
    const token = ++photoToken;
    try {
      const { photo, colors, canvas } = await preparePhoto(file);
      if (token !== photoToken || disposed) return;
      setPhoto(photo, false);
      Object.assign(s, { colors, colorsEdited: false, cut: 'working', show: null, pattern: null, details: null });
      look = null;
      if (!s.nameEdited && s.type) s.name = suggestName(s.type, colors.base);
      stopCamera();
      if (!wide.matches) s.step = 'type';
      render();
      runCutout(canvas, token);
    } catch (e) {
      s.message = e.message;
      render();
    }
  }

  // Cuts the item out (R16) while the User picks its type.
  async function runCutout(canvas, token) {
    let segmenter;
    try {
      segmenter = await loadSegmenter(showProgress);
    } catch {
      if (token === photoToken && !disposed) {
        s.cut = 'unavailable';
        refresh();
      }
      return;
    }
    let result = null;
    try {
      if (token === photoToken && !disposed) result = await cutOut(canvas, segmenter);
    } catch {
      result = null;
    }
    if (token !== photoToken || disposed) return;
    s.cut = result ? 'done' : 'failed';
    if (result) {
      setPhoto(result.photo, true);
      const editingFields = document.activeElement?.matches?.('[data-color], [data-more], [data-add-more], [data-name]');
      if (!s.colorsEdited && !editingFields) {
        s.colors = result.colors;
        if (!s.nameEdited && s.type) s.name = suggestName(s.type, s.colors.base);
      }
      s.reading = true;
    }
    refresh();
    if (result) await readLook(result, token);
  }

  // Reads the cut-out's pattern and buttons (R44), then shows it Drawn when
  // the app can draw it, or as its Photo.
  async function readLook(result, token, { keepShow = false } = {}) {
    let pattern = { kind: 'other' };
    let buttons = null;
    try {
      [pattern, { buttons }] = await Promise.all([readPattern(result.photo, result.colors), readShirtButtons(result.photo, result.colors)]);
    } catch {
      // Unread: it shows as its photo.
    }
    if (token !== photoToken || disposed) return;
    s.pattern = pattern;
    s.details = { ...s.details, buttons };
    if (!keepShow || !s.show) s.show = DRAWN_KINDS.has(pattern.kind) ? 'drawn' : 'photo';
    s.reading = false;
    refresh();
    refreshLook();
  }

  async function attachCamera() {
    const video = root.querySelector('[data-video]');
    if (!video) return;
    try {
      if (!stream) {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unavailable'), { name: 'NotFoundError' });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: wide.matches ? 'user' : 'environment', width: { ideal: 1920 } }, audio: false });
      }
      video.srcObject = stream;
      await video.play();
    } catch (e) {
      stopCamera();
      s.message = CAMERA_MESSAGES[e.name] ?? CAMERA_MESSAGES.default;
      render({ focus: false });
    }
  }

  // ---- Events -------------------------------------------------------------------------

  const bindRetake = () => root.querySelectorAll('[data-retake]').forEach((b) => b.addEventListener('click', retake));

  function bind() {
    bindChrome(root, ctx);
    bindRetake();
    root.querySelectorAll('[data-file]').forEach((input) => input.addEventListener('change', () => usePhoto(input.files[0])));
    root.querySelectorAll('[data-camera]').forEach((b) => b.addEventListener('click', () => {
      s.cameraOn = true;
      s.message = null;
      render({ focus: false });
    }));
    root.querySelector('[data-camera-off]')?.addEventListener('click', () => {
      stopCamera();
      render();
    });
    root.querySelector('[data-shutter]')?.addEventListener('click', async () => {
      const video = root.querySelector('[data-video]');
      if (!video?.videoWidth) return;
      usePhoto(new File([await frameFromVideo(video)], 'camera.jpg', { type: 'image/jpeg' }));
    });

    const drop = root.querySelector('[data-drop]');
    if (drop) {
      drop.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop.classList.add('is-over');
      });
      drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        drop.classList.remove('is-over');
        usePhoto(e.dataTransfer.files[0]);
      });
    }

    root.querySelector('[data-types]')?.addEventListener('change', (e) => {
      s.type = e.target.value;
      if (!s.nameEdited && s.colors) s.name = suggestName(s.type, s.colors.base);
      if (wide.matches) {
        render({ focus: false });
        root.querySelector(`input[name="type"][value="${s.type}"]`)?.focus({ preventScroll: true });
      } else {
        root.querySelector('[data-next]').disabled = false;
      }
    });
    root.querySelector('[data-next]')?.addEventListener('click', () => {
      s.step = 'confirm';
      render();
    });
    root.querySelector('[data-step-back]')?.addEventListener('click', () => {
      if (editing && s.step === 'confirm') return ctx.onCancel();
      s.step = s.step === 'confirm' ? 'type' : 'photo';
      render();
    });
    root.querySelector('[data-change-type]')?.addEventListener('click', () => {
      s.step = 'type';
      render();
    });
    root.querySelector('[data-cancel-edit]')?.addEventListener('click', () => ctx.onCancel());

    root.querySelectorAll('[data-color]').forEach((input) => input.addEventListener('input', () => {
      s.pattern = followColorEdit(s.pattern, s.colors[input.dataset.color], input.value);
      s.colors = { ...s.colors, [input.dataset.color]: input.value };
      s.colorsEdited = true;
      if (!s.nameEdited && input.dataset.color === 'base') {
        s.name = suggestName(s.type, s.colors.base);
        const nameInput = root.querySelector('[data-name]');
        if (nameInput) nameInput.value = s.name;
      }
      const sw = input.closest('.color-swatch');
      sw.style.background = input.value;
      sw.classList.remove('is-none');
      updatePreview();
    }));
    // Colors settle after the picker closes: draw the "None" and link text,
    // keeping the User's place.
    root.querySelectorAll('[data-color]').forEach((input) => input.addEventListener('change', () => {
      render({ focus: false, keepScroll: true });
      root.querySelector(`[data-color="${input.dataset.color}"]`)?.focus({ preventScroll: true });
    }));
    root.querySelector('[data-no-print]')?.addEventListener('click', () => {
      s.pattern = followColorEdit(s.pattern, s.colors.print, null);
      s.colors = { ...s.colors, print: null };
      s.colorsEdited = true;
      render({ focus: false });
    });
    // Other colors: change, remove or add (R17).
    root.querySelectorAll('[data-more]').forEach((input) => {
      input.addEventListener('input', () => {
        const more = [...s.colors.more];
        s.pattern = followColorEdit(s.pattern, more[Number(input.dataset.more)], input.value);
        more[Number(input.dataset.more)] = input.value;
        s.colors = { ...s.colors, more };
        s.colorsEdited = true;
        input.closest('.color-swatch').style.background = input.value;
        updatePreview();
      });
    });
    root.querySelectorAll('[data-remove-more]').forEach((btn) => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.removeMore);
      s.pattern = followColorEdit(s.pattern, s.colors.more[i], null);
      s.colors = { ...s.colors, more: s.colors.more.filter((_, j) => j !== i) };
      s.colorsEdited = true;
      render({ focus: false, keepScroll: true });
      // Focus stays in the row: the next color's Remove, or the add swatch.
      (root.querySelector(`[data-remove-more="${Math.min(i, s.colors.more.length - 1)}"]`) ?? root.querySelector('[data-add-more]'))?.focus({ preventScroll: true });
    }));
    root.querySelector('[data-add-more]')?.addEventListener('change', (e) => {
      s.colors = { ...s.colors, more: [...s.colors.more, e.target.value] };
      s.colorsEdited = true;
      render({ focus: false, keepScroll: true });
      root.querySelector(`[data-more="${s.colors.more.length - 1}"]`)?.focus({ preventScroll: true });
    });
    // Show as, chest pockets and their flaps (R44).
    root.querySelectorAll('input[name="show"]').forEach((input) => input.addEventListener('change', () => {
      s.show = input.value;
      const note = root.querySelector('[data-look-note]');
      if (note) note.textContent = lookNote();
      updatePreview();
      refreshLook();
    }));
    root.querySelectorAll('input[name="pockets"]').forEach((input) => input.addEventListener('change', () => {
      s.details = { ...s.details, pockets: Number(input.value) };
      render({ focus: false, keepScroll: true });
      root.querySelector(`input[name="pockets"][value="${input.value}"]`)?.focus({ preventScroll: true });
    }));
    root.querySelectorAll('input[name="flaps"]').forEach((input) => input.addEventListener('change', () => {
      s.details = { ...s.details, flaps: input.value === 'yes' };
      updatePreview();
    }));
    root.querySelector('[data-name]')?.addEventListener('input', (e) => {
      s.name = e.target.value;
      s.nameEdited = true;
      updateSave();
    });

    root.querySelector('[data-save]')?.addEventListener('click', async () => {
      if (!ready()) return;
      s.busy = true;
      s.saveError = null;
      updateSave();
      try {
        const item = await ctx.onSave({ type: s.type, name: s.name, colors: s.colors, photo: s.photo, cutout: s.cutout, show: s.cutout ? s.show : null, pattern: s.cutout ? s.pattern : null, details: s.details });
        dispose();
        ctx.onDone(item);
      } catch (e) {
        s.busy = false;
        s.saveError = e instanceof ClosetFullError
          ? "Storage on this device is full, so nothing was saved. Delete some items or free up space, then try again."
          : `Couldn't save the item: ${e.message}`;
        render({ focus: false });
        root.querySelector('[data-save-error]')?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // Crossing 900 px switches between the steps and the side-by-side layout.
  const onWidth = () => {
    if (!root.isConnected) return;
    if (!wide.matches && s.photo && s.step === 'photo') s.step = s.type ? 'confirm' : 'type';
    render({ focus: false });
  };
  wide.addEventListener('change', onWidth);

  function dispose() {
    disposed = true;
    stopCamera();
    wide.removeEventListener('change', onWidth);
    if (ownUrl) URL.revokeObjectURL(ownUrl);
    ownUrl = null;
  }

  // The phone opens on the camera, as drawn (P4a); the browser asks for
  // permission the first time.
  if (!wide.matches && !editing) s.cameraOn = true;
  // The cut-out model loads only here, never on Today (R37). A failed load
  // is tried again with the photo, and then explained in the cut-out note.
  if (!editing && !segmenterLoaded()) s.modelShare = 0;
  render();
  if (!editing) loadSegmenter(showProgress).catch(() => showProgress(null));
  // Editing an item with a cut-out shows its look on the preview, reading
  // it first if it was saved before the app read patterns (any choice made
  // stays).
  if (s.reading) readLook({ photo: s.photo, colors: s.colors }, photoToken, { keepShow: true });
  else if (editing) refreshLook();
  return dispose;
}
