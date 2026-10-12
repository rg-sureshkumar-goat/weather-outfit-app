// Interface, weather and reminder icons. Simple placeholders until the
// final set in C10; each is decorative (aria-hidden) and always sits next
// to a text label (R33).

import { TYPE_ICON_PATHS } from '../art/typeIcons.js';

const svg = (body, size = 22) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const PATHS = {
  // Interface
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  shuffle: '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6C14.3 16 15.5 17 17.5 17H21M3 17h3.5c1.4 0 2.4-.5 3.2-1.4M14.3 8.4c.8-.9 1.8-1.4 3.2-1.4H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  person: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 11l5-2 5 2M9 21l3-6 3 6"/>',
  rack: '<path d="M3 4h18M7 4v2M17 4v2M7 6l-3.5 4h7zM17 6l-3.5 4h7zM5 10v9h4v-9M15 10v9h4v-9"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  retry: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  // Weather: one icon per family of Open-Meteo codes (R10,
  // src/content/weatherCodes.js)
  clear: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  partlyCloudy: '<circle cx="15" cy="8" r="3"/><path d="M15 2.5v1.2M19.6 4.4l-.9.9M21 8h-1.2M11.3 4.4l.8.8"/><path d="M7 19h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 19z"/>',
  overcast: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
  fog: '<path d="M4 9h16M2 13h20M5 17h14"/>',
  drizzle: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M8.6 18.2l-.4 1M12.6 18.2l-.4 1M16.6 18.2l-.4 1M10.6 21.2l-.4 1M14.6 21.2l-.4 1"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M8 21l1-3M12 21l1-3M16 21l1-3"/>',
  freezingRain: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 15z"/><path d="M7 21l1-3M11 21l1-3"/><path d="M16.5 17.5v4.5M14.6 18.6l3.8 2.3M14.6 20.9l3.8-2.3"/>',
  showers: '<circle cx="17" cy="6" r="2.5"/><path d="M17 1.8v.8M21.2 6h-.8M20 3l-.6.6"/><path d="M5.5 15h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 5.5 15z"/><path d="M7 21l1-3M11 21l1-3"/>',
  thunderstorm: '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M12 14l-2 4h3l-2 4"/>',
  snow: '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M8 18v.01M12 20v.01M16 18v.01M10 22v.01M14 22v.01"/>',
  // Reminders (R8)
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 1-4 0"/>',
  sunscreen: '<path d="M9 3h6v3H9zM8 6h8l1 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9z"/><path d="M10 13h4"/>',
  water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  layer: '<path d="M9 3h6l5 3.5V20h-4v-9M9 3L4 6.5V20h4v-9M9 3l3 5 3-5M8 11v9h8v-9M12 8v12"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"/>',
  rainJacket: '<path d="M8 6c0-2.4 1.8-4 4-4s4 1.6 4 4M8 6L4 8v12h4v-8M16 6l4 2v12h-4v-8M8 6h8M8 12v8h8v-8M12 6v14"/>',
};

export const ICONS = Object.fromEntries(Object.entries(PATHS).map(([k, body]) => [k, svg(body)]));

// Weather icons at the header and strip sizes. Callers pass a family from
// weatherCodes.js; with no code for the day they show no icon at all.
export const bigIcon = (name, size = 48) => svg(PATHS[name], size);
export const smallIcon = (name, size = 18) => svg(PATHS[name], size);

// Garment-type icons for the "What is it?" tiles (P4c, L4), drawn in
// art/typeIcons.js.
export const GARMENT_ICONS = Object.fromEntries(Object.entries(TYPE_ICON_PATHS).map(([k, body]) => [k, svg(body, 28)]));
