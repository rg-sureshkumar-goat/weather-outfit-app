// Add item (P4a, P4c, P4d; L4; R15, R17, R18) and Edit item (R20).
//
// A photo from the camera in the page, Photos, or a dropped file (laptop),
// then what it is (the 34 types as icon tiles under the six group headings),
// then colors, a name and what it suits, with the avatar wearing it. Until
// the cut-out (C8) the whole photo stands in for it, and colors are sampled
// from its middle. On the phone the steps come one at a time (photo, then
// 2 of 3, then 3 of 3; the cut-out step joins in C8); on the laptop they sit
// side by side (L4). Editing reopens the confirm step (R20).
//
// showAdd(root, ctx) -> dispose()   (stops the camera)
//   ctx.location, ctx.avatar        the top bar and the preview
//   ctx.existing, ctx.photoUrl      an item to edit, and its photo's URL
//   ctx.onTab, ctx.onChangeLocation, ctx.onInfo
//   ctx.onSave({ type, name, colors, photo }) -> Promise<item>
//                                   may throw store/closet.js ClosetFullError
//   ctx.onDone(item), ctx.onCancel()

import { renderAvatar } from '../art/avatar.js';
import { GARMENT_TYPES, TYPE_GROUPS } from '../content/garments.js';
import { suggestName } from '../content/colorNames.js';
import { lookOf } from '../store/avatar.js';
import { ClosetFullError, NAME_MAX } from '../store/closet.js';
import { preparePhoto, frameFromVideo } from '../vision/photo.js';
import { ICONS, GARMENT_ICONS } from './icons.js';
import { esc, tabs, topBar, bindChrome } from './chrome.js';
import { suitsHtml } from './closet.js';

const wide = matchMedia('(min-width: 900px)');

// The avatar wearing the item, with plain basics in the other slots.
function previewOutfit(type, colors) {
  const item = { id: 'preview', type, colors, name: '', source: 'closet' };
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
    colors: ctx.existing ? { ...ctx.existing.colors } : null,
    name: ctx.existing?.name ?? '',
    nameEdited: editing,
    cameraOn: false,
    message: null, // about the camera or the photo
    saveError: null,
    busy: false,
  };
  let stream = null;
  let ownUrl = null; // object URLs this screen made, revoked on dispose

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

  // P4a, and the laptop's photo panel (L4).
  function photoPanel() {
    if (s.cameraOn) {
      return `<div class="camera">
          <video data-video playsinline muted aria-label="Camera view"></video>
          <p class="camera-hint">Lay the item flat in good light</p>
        </div>
        <div class="camera-actions">
          ${photoInput('Photos', 'btn btn-outline btn-small')}
          <button type="button" class="shutter" data-shutter aria-label="Take the photo"><span></span></button>
          <button type="button" class="btn-link" data-camera-off>Close camera</button>
        </div>`;
    }
    if (s.photoUrl) {
      return `<div class="photo-frame"><img src="${s.photoUrl}" alt="Your photo"></div>
        ${message()}
        ${editing ? '' : `<div class="photo-actions">${photoInput('Choose another photo')}<button type="button" class="btn btn-outline" data-camera>${ICONS.camera}<span>Use camera</span></button></div>`}`;
    }
    return `<div class="drop-zone" data-drop>
        <span class="drop-icon" aria-hidden="true">${ICONS.upload}</span>
        <p><b>${wide.matches ? 'Choose or drop a photo of one item' : 'Choose a photo of one item'}</b></p>
        <p class="muted">Lay it flat in good light. The photo stays on this device.</p>
        <div class="photo-actions">${photoInput('Choose a photo', 'btn')}<button type="button" class="btn btn-outline" data-camera>${ICONS.camera}<span>Use camera</span></button></div>
      </div>
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

  const colorPicker = (which, label) => {
    const hex = s.colors[which];
    return `<div class="color-pick">
        <label class="color-swatch${hex ? '' : ' is-none'}" style="${hex ? `background:${hex}` : ''}">
          <input type="color" value="${hex ?? '#ffffff'}" data-color="${which}" aria-label="${label} color">
        </label>
        <div><b>${label}</b><span class="color-links">${hex ? '<span class="link-like">Change</span>' : '<span class="link-like">Add</span>'}${which === 'print' && hex ? ' · <button type="button" class="btn-link" data-no-print>None</button>' : ''}</span></div>
      </div>`;
  };

  // P4d: preview, colors, name and what it suits.
  const confirmBody = () => `
    <div class="confirm-grid">
      ${wide.matches ? '' : `<figure class="confirm-photo"><img src="${s.photoUrl}" alt=""><figcaption>Your photo</figcaption></figure>`}
      <figure class="confirm-avatar" data-preview><figcaption>On your avatar</figcaption></figure>
    </div>
    <h3 class="field-title">Colors</h3>
    <div class="color-row">${colorPicker('base', 'Base')}${colorPicker('print', 'Print')}</div>
    <label class="field"><span class="field-title">Name</span>
      <input type="text" class="text-input" data-name maxlength="${NAME_MAX}" value="${esc(s.name)}" autocomplete="off">
    </label>
    <h3 class="field-title">Suits</h3>
    <p class="suits" data-suits>${suitsHtml(s.type)} <span class="muted">from its type</span></p>`;

  const saveButton = () => `
    <p class="save-error" role="alert" data-save-error>${s.saveError ? esc(s.saveError) : ''}</p>
    <button type="button" class="btn" data-save ${ready() ? '' : 'disabled'}>${s.busy ? 'Saving…' : editing ? 'Save changes' : 'Save to closet'}</button>`;

  const ready = () => Boolean(s.photo && s.type && s.name.trim() && !s.busy);

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
            <div class="type-head">${s.photoUrl ? `<img class="type-thumb" src="${s.photoUrl}" alt="">` : ''}<div><h2>What is it?</h2><p class="muted">This sets the avatar's garment and the weather it suits.</p></div></div>
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

  function render({ focus = true } = {}) {
    root.innerHTML = wide.matches ? laptopMarkup() : phoneMarkup();
    bind();
    updatePreview();
    if (s.cameraOn) attachCamera();
    if (focus) root.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function updatePreview() {
    const box = root.querySelector('[data-preview]');
    if (!box || !s.type || !s.colors) return;
    const look = { ...lookOf(ctx.avatar), ...(s.type === 'glasses' ? { glasses: true } : {}) };
    const svg = renderAvatar(look, previewOutfit(s.type, s.colors), { title: `Your avatar wearing the ${GARMENT_TYPES[s.type].label.toLowerCase()}` })
      .replace(/viewBox="[^"]*"/, `viewBox="${previewView(s.type)}"`);
    box.querySelector('svg')?.remove();
    box.insertAdjacentHTML('afterbegin', svg);
  }

  function updateSave() {
    const btn = root.querySelector('[data-save]');
    if (btn) btn.disabled = !ready();
    const err = root.querySelector('[data-save-error]');
    if (err) err.textContent = s.saveError ?? '';
  }

  // ---- Photo ----------------------------------------------------------------------

  async function usePhoto(file) {
    if (!file || !file.type.startsWith('image/')) {
      s.message = "That isn't a photo. Choose a JPEG or PNG.";
      render();
      return;
    }
    s.message = null;
    try {
      const { photo, colors } = await preparePhoto(file);
      if (ownUrl) URL.revokeObjectURL(ownUrl);
      ownUrl = URL.createObjectURL(photo);
      Object.assign(s, { photo, photoUrl: ownUrl, colors });
      if (!s.nameEdited && s.type) s.name = suggestName(s.type, colors.base);
      stopCamera();
      if (!wide.matches) s.step = 'type';
    } catch (e) {
      s.message = e.message;
    }
    render();
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

  function bind() {
    bindChrome(root, ctx);
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
      s.colors = { ...s.colors, [input.dataset.color]: input.value };
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
    // Colors settle after the picker closes: draw the "None" and link text.
    root.querySelectorAll('[data-color]').forEach((input) => input.addEventListener('change', () => render({ focus: false })));
    root.querySelector('[data-no-print]')?.addEventListener('click', () => {
      s.colors = { ...s.colors, print: null };
      render({ focus: false });
    });
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
        const item = await ctx.onSave({ type: s.type, name: s.name, colors: s.colors, photo: s.photo });
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
    stopCamera();
    wide.removeEventListener('change', onWidth);
    if (ownUrl) URL.revokeObjectURL(ownUrl);
    ownUrl = null;
  }

  // The phone opens on the camera, as drawn (P4a); the browser asks for
  // permission the first time.
  if (!wide.matches && !editing) s.cameraOn = true;
  render();
  return dispose;
}
