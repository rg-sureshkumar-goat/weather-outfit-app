// The frame shared by Today, Info and (in C7) the Closet: the laptop top
// bar, the Today / Closet / Add item tabs, the location pill and the info
// button (P1a, P6, L1, L6). Screens wire the clicks through the data
// attributes: data-tab, data-location and data-info.

import { ICONS } from './icons.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TABS = [
  ['today', ICONS.person, 'Today'],
  ['closet', ICONS.rack, 'Closet'],
  ['add', ICONS.camera, 'Add item'],
];

// `current` is the tab of the screen on show, or null (Info isn't a tab).
export const tabs = (where, current) => `
  <nav class="tabs tabs-${where}" aria-label="Sections">
    ${TABS.map(([id, icon, label]) => `<button type="button" class="tab" data-tab="${id}" ${id === current ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`).join('')}
  </nav>`;

export const locationPill = (location) =>
  `<button type="button" class="pill" data-location aria-label="Location: ${esc(location.label)}. Change location">${ICONS.pin}<span>${esc(location.label)}</span>${ICONS.chevron}</button>`;

export const infoButton = `<button type="button" class="icon-btn" data-info aria-label="About this app, sources and privacy">${ICONS.info}</button>`;

// The laptop's top bar (L1, L6); hidden on the phone by CSS.
export const topBar = (location, current) => `
  <header class="bar">
    <span class="logo">Quick Dresser</span>
    ${tabs('top', current)}
    <span class="bar-gap"></span>
    ${locationPill(location)}
    ${infoButton}
  </header>`;

// Wires the shared controls inside `root`.
export function bindChrome(root, { onTab, onChangeLocation, onInfo }) {
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => onTab(b.dataset.tab)));
  root.querySelectorAll('[data-location]').forEach((b) => b.addEventListener('click', () => onChangeLocation()));
  root.querySelectorAll('[data-info]').forEach((b) => b.addEventListener('click', () => onInfo()));
}
