// The Closet (P3, P5; L3; R19–R21, R26): only the items the User added
// (R21), in the type picker's six groups with counts, under a rack of the 3
// newest. Opening an item shows its detail: its own view on the phone,
// beside the grid on the laptop (L3), with Edit and Delete; Delete asks in
// the page first (R20). "Edit avatar" opens the avatar review (R26). One
// layout file serves both widths; CSS switches at 900 px (R31).
//
// showCloset(root, ctx)
//   ctx.items         the closet, newest first (store/closet.js)
//   ctx.photoUrl(item) an object URL for the item's photo
//   ctx.location      the saved location (for the laptop's top bar)
//   ctx.selectedId    an item to open, if any
//   ctx.onTab, ctx.onChangeLocation, ctx.onInfo
//   ctx.onEditAvatar(), ctx.onAdd(), ctx.onEdit(item)
//   ctx.onDelete(item) -> Promise   removes it; the Closet is shown again

import { rackHeader } from '../art/rack.js';
import { GARMENT_TYPES, TYPE_GROUPS, suitsFor } from '../content/garments.js';
import { ICONS } from './icons.js';
import { esc, tabs, topBar, bindChrome } from './chrome.js';

const typeLabel = (item) => GARMENT_TYPES[item.type]?.label ?? item.type;
const added = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// What the item suits, in words and chips (R17).
export function suitsHtml(type) {
  const s = suitsFor(type);
  if (s.kind === 'bands') return s.bands.map((b) => `<span class="band-chip">${b}</span>`).join('');
  return `<span class="suits-note">${{
    rain: 'Rainy, windy days, over the rest of the outfit',
    occasion: 'Occasions (from a later update)',
    accessory: 'When the weather calls for it (from a later update)',
  }[s.kind]}</span>`;
}

const swatch = (hex, label) => `<span class="sw-small" style="background:${hex}" role="img" aria-label="${label}"></span>`;

export function showCloset(root, ctx) {
  let selectedId = ctx.items.some((i) => i.id === ctx.selectedId) ? ctx.selectedId : null;

  const tile = (item) => `
    <li><button type="button" class="closet-tile${item.id === selectedId ? ' is-selected' : ''}" data-item="${esc(item.id)}" aria-label="${esc(item.name)}, ${esc(typeLabel(item))}">
      <img${item.cutout ? ' class="is-cutout"' : ''} src="${ctx.photoUrl(item)}" alt="" loading="lazy">
      <span class="tile-name">${esc(item.name)}</span>
    </button></li>`;

  const groups = () => TYPE_GROUPS.map(([group, title]) => {
    const items = ctx.items.filter((i) => GARMENT_TYPES[i.type]?.group === group);
    if (items.length === 0) return '';
    return `<section class="closet-group" aria-labelledby="group-${group}">
      <h2 class="group-title" id="group-${group}">${title} <span class="count">· ${items.length}</span></h2>
      <ul class="closet-grid">${items.map(tile).join('')}</ul>
    </section>`;
  }).join('');

  const empty = `<section class="card closet-empty">
      <h2>Your closet is empty</h2>
      <p>Add your first item, and Today will dress your avatar in it. Until then, starter clothes fill every outfit.</p>
      <button type="button" class="btn" data-add>${ICONS.camera}<span>Add item</span></button>
    </section>`;

  function detail(item) {
    if (!item) return `<p class="detail-hint">Choose an item to see its details.</p>`;
    const c = item.colors;
    return `
      <button type="button" class="btn-back detail-back" data-close>${ICONS.back}<span>Closet</span></button>
      <img class="detail-photo" src="${ctx.photoUrl(item)}" alt="${item.cutout ? 'Your' : 'Your photo of'} ${esc(item.name)}">
      <h2 class="detail-name" tabindex="-1">${esc(item.name)}</h2>
      <dl class="detail-facts">
        <div><dt>Type</dt><dd>${esc(typeLabel(item))}</dd></div>
        <div><dt>Colors</dt><dd>${swatch(c.base, 'Base color')}${c.print ? swatch(c.print, 'Print color') : ''}${(c.more ?? []).map((m, i) => swatch(m, `Other color ${i + 1}`)).join('')}${c.print || c.more?.length ? '' : '<span class="muted">No print</span>'}</dd></div>
        <div><dt>Suits</dt><dd class="suits">${suitsHtml(item.type)}</dd></div>
        <div><dt>Added</dt><dd>${added(item.added)}</dd></div>
      </dl>
      <div class="detail-actions" data-actions>
        <button type="button" class="btn btn-outline" data-edit>${ICONS.edit}<span>Edit</span></button>
        <button type="button" class="btn btn-outline btn-danger-outline" data-delete>${ICONS.trash}<span>Delete</span></button>
      </div>`;
  }

  function render() {
    const item = ctx.items.find((i) => i.id === selectedId) ?? null;
    root.innerHTML = `
      <div class="closet-page${item ? ' detail-open' : ''}">
        ${topBar(ctx.location, 'closet')}
        <main class="closet-layout">
          <div class="closet-main">
            <div class="closet-head">
              <h1 tabindex="-1">Closet</h1>
              <button type="button" class="btn btn-outline btn-small" data-edit-avatar>${ICONS.person}<span>Edit avatar</span></button>
            </div>
            <section class="rack card" aria-label="Newest items">${rackHeader(ctx.items.slice(0, 3), { width: 340 })}</section>
            ${ctx.items.length ? groups() : empty}
          </div>
          <aside class="closet-detail card" aria-label="Item detail" data-detail>${detail(item)}</aside>
        </main>
        <div class="bottom-dock">${tabs('bottom', 'closet')}</div>
      </div>`;
    bind(item);
  }

  function bind(item) {
    bindChrome(root, ctx);
    root.querySelector('[data-edit-avatar]').addEventListener('click', () => ctx.onEditAvatar());
    root.querySelector('[data-add]')?.addEventListener('click', () => ctx.onAdd());
    root.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', () => {
      selectedId = b.dataset.item;
      render();
      root.querySelector('.detail-name')?.focus({ preventScroll: matchMedia('(min-width: 900px)').matches });
      if (!matchMedia('(min-width: 900px)').matches) window.scrollTo(0, 0);
    }));
    root.querySelector('[data-close]')?.addEventListener('click', () => {
      const id = selectedId;
      selectedId = null;
      render();
      root.querySelector(`[data-item="${CSS.escape(id)}"]`)?.focus();
    });
    if (!item) return;
    root.querySelector('[data-edit]').addEventListener('click', () => ctx.onEdit(item));
    root.querySelector('[data-delete]').addEventListener('click', () => confirmDelete(item));
  }

  // Delete asks in the page first; Cancel changes nothing (R20).
  function confirmDelete(item) {
    const area = root.querySelector('[data-actions]');
    area.innerHTML = `
      <div class="confirm" role="group" aria-labelledby="del-title">
        <p id="del-title" class="confirm-title">Delete ${esc(item.name)}?</p>
        <p>It's removed from this device. This can't be undone.</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-outline" data-cancel>Cancel</button>
          <button type="button" class="btn btn-danger" data-confirm>${ICONS.trash}<span>Delete</span></button>
        </div>
      </div>`;
    area.querySelector('[data-cancel]').addEventListener('click', () => {
      render();
      root.querySelector('[data-delete]')?.focus();
    });
    area.querySelector('[data-confirm]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      await ctx.onDelete(item);
    });
    area.querySelector('[data-cancel]').focus();
  }

  render();
  if (selectedId) root.querySelector('.detail-name')?.focus({ preventScroll: true });
  else root.querySelector('h1').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
