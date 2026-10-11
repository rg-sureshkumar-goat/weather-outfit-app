// Colors for the avatar and the starter garments.

// Monk Skin Tone Scale, MST 1 (lightest) to MST 10, by Ellis Monk with
// Google, CC BY 4.0. Values from skintone.google/get-started, checked
// 2026-10-11.
export const MONK_TONES = [
  '#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96',
  '#a07e56', '#825c43', '#604134', '#3a312a', '#292420',
];

// The 8 hair colors the review screen offers (R24); also the targets the
// selfie reading snaps to in C9.
export const HAIR_COLORS = {
  black: '#1d1a18',
  darkBrown: '#3b2a20',
  brown: '#61402b',
  lightBrown: '#8c6443',
  blonde: '#c9a467',
  platinum: '#e2d5b5',
  auburn: '#8a3a20',
  grey: '#9b9a96',
};

// Drawn values for every starter color named in spec.md (Content
// variation). Garments are filled with these and shaded on top.
export const STARTER_COLORS = {
  white: '#f4f2ee',
  cream: '#efe4cf',
  grey: '#9da3aa',
  'heather-grey': '#b5b7b9',
  charcoal: '#4a4d52',
  black: '#2b2d31',
  navy: '#26344f',
  'light-blue': '#a9c6e3',
  denim: '#4f6f96',
  'light denim': '#8fb0d2',
  'dark denim': '#33465f',
  khaki: '#c8b48a',
  tan: '#b98f62',
  camel: '#c19a6b',
  olive: '#6b7148',
  brown: '#7a5233',
  sage: '#a7b79a',
  maroon: '#6e2b33',
  red: '#b8392f',
  burgundy: '#7c2436',
  'forest-green': '#2f5a3f',
  coral: '#ee7f6b',
  lavender: '#b7a6d6',
  rose: '#d98c9a',
  yellow: '#f2c230',
};

// Colors of a garment item: the User's sampled colors, or a starter color.
export function itemColors(item) {
  if (item.colors?.base) return { base: item.colors.base, print: item.colors.print ?? null };
  return { base: STARTER_COLORS[item.color] ?? '#999999', print: null };
}
