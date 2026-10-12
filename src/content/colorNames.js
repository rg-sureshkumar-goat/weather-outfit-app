// Everyday color names for a closet item's suggested name ("Navy tee", R17).
// The nearest name by how different the colors look (CIE Lab) wins.

import { colorDistance } from '../recommend/color.js';
import { GARMENT_TYPES } from './garments.js';

export const COLOR_NAMES = [
  ['White', '#f4f2ee'], ['Cream', '#efe4cf'], ['Beige', '#d8c3a5'], ['Tan', '#c8b48a'],
  ['Khaki', '#b5a37a'], ['Camel', '#c19a6b'], ['Brown', '#6b4a2f'], ['Light grey', '#c9c9c9'],
  ['Grey', '#8e9196'], ['Charcoal', '#4a4d52'], ['Black', '#1f1f22'], ['Navy', '#26344f'],
  ['Blue', '#3a6fb0'], ['Light blue', '#a9c6e3'], ['Denim', '#5d7a99'], ['Teal', '#2f7f7a'],
  ['Green', '#3d7a3f'], ['Forest green', '#2f5a3f'], ['Olive', '#6b6b3a'], ['Sage', '#9fb59a'],
  ['Yellow', '#f2c230'], ['Mustard', '#c9a227'], ['Orange', '#e07a2e'], ['Coral', '#f07a5a'],
  ['Red', '#b8392f'], ['Burgundy', '#7a2e3a'], ['Pink', '#e8a0a8'], ['Rose', '#d98c9a'],
  ['Lavender', '#b9a6d6'], ['Purple', '#6e4b8a'], ['Plum', '#7d3c6e'],
];

export function colorName(hex) {
  let best = COLOR_NAMES[0];
  let bestDistance = Infinity;
  for (const entry of COLOR_NAMES) {
    const d = colorDistance(hex, entry[1]);
    if (d < bestDistance) {
      best = entry;
      bestDistance = d;
    }
  }
  return best[0];
}

// "Navy tee", "Light blue short-sleeve button-up".
export function suggestName(type, base) {
  const label = GARMENT_TYPES[type]?.label ?? 'item';
  return `${colorName(base)} ${label.toLowerCase()}`;
}
