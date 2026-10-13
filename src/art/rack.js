// The Closet's rack header (P3, L3; R19): a shelf of closet things as
// decoration, a rail, and hangers holding the newest items, each drawn as
// its type's shape (art/typeIcons.js) filled with the item's colors. Shoes
// and accessories rest on the rack's floor instead of hanging. With no
// items, the hangers hang empty.
//
// rackHeader(items, { width, photos }) -> SVG string
//   items     up to 3 { id, type, colors: { base } }, newest first
//   width     the drawing's width in px units (the height is fixed)
//   photos    { [item id]: vision/pattern.js photoLook() }: a photographed
//             item (R44) is filled with a square of its fabric, repeating

import { shades } from './paint.js';
import { uid } from './draw.js';
import { GARMENT_TYPES } from '../content/garments.js';
import { TYPE_ICON_PATHS } from './typeIcons.js';

const HEIGHT = 170;
const INK = '#4b5563';
const RAIL_Y = 64;
const FLOOR_Y = 158;

// The decorative shelf above the rail: a cap, folded clothes and an
// umbrella (P3). Not buttons.
function shelf(cx) {
  const y = 34;
  const plank = `<path d="M${cx - 92} ${y}h184" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M${cx - 76} ${y}l8 10M${cx + 76} ${y}l-8 10" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  const cap = `<path d="M${cx - 70} ${y - 2}c0-12 8-18 18-18s18 6 18 18zM${cx - 34} ${y - 2}h16" fill="#e0725a" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const folded = [['#8fb0d2', 0], ['#f2c230', 7], ['#f4f2ee', 14]]
    .map(([fill, dy]) => `<rect x="${cx - 14}" y="${y - 9 - dy}" width="30" height="8" rx="2.5" fill="${fill}" stroke="${INK}" stroke-width="2"/>`).join('');
  const umbrella = `<path d="M${cx + 46} ${y - 2}l10-24 10 24z" fill="#3a4f7a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
    + `<path d="M${cx + 56} ${y - 26}v-4a3 3 0 0 1 6 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  return plank + cap + folded + umbrella;
}

// A hanger hooked on the rail at x.
const hanger = (x) => `<path d="M${x} ${RAIL_Y + 2}c0-5 6-5 6-1s-6 4-6 9M${x} ${RAIL_Y + 10}l-30 16h60z" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;

// An item's type shape at (x, y) and `scale`, filled with its base color,
// or, for a photographed item, a square of its fabric repeating at about its
// real size on the 24-unit icon.
function garment(item, x, y, scale, look) {
  const base = item.colors?.base ?? '#d6d0c6';
  const line = shades(base).line;
  const paths = TYPE_ICON_PATHS[item.type] ?? TYPE_ICON_PATHS.tee;
  let fill = base;
  let defs = '';
  if (look) {
    const id = uid('rack-pattern');
    const t = (look.patchBox.w / look.width) * 24 * 2;
    defs = `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${t}" height="${t}"><image href="${look.patch}" width="${t}" height="${t}" preserveAspectRatio="none"/></pattern></defs>`;
    fill = `url(#${id})`;
  }
  return `<g transform="translate(${x - 12 * scale} ${y}) scale(${scale})" fill="${fill}" stroke="${line}" stroke-width="${2 / scale * 2.2}" stroke-linejoin="round" stroke-linecap="round">${defs}${paths}</g>`;
}

export function rackHeader(items = [], { width = 340, photos = null } = {}) {
  const cx = width / 2;
  const slots = [cx - 96, cx, cx + 96];
  const rail = `<path d="M${cx - 150} ${RAIL_Y}h300" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M${cx - 150} ${RAIL_Y}v-12M${cx + 150} ${RAIL_Y}v-12" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M${cx - 160} ${FLOOR_Y}h320" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>`;
  const hung = slots.map((x, i) => {
    const item = items[i];
    const group = item && GARMENT_TYPES[item.type]?.group;
    if (group === 'shoes' || group === 'accessories') {
      // Shoes and accessories rest on the floor under an empty hanger.
      return hanger(x) + garment(item, x, FLOOR_Y - 62, 2.6, photos?.[item.id]);
    }
    return hanger(x) + (item ? garment(item, x, RAIL_Y + 20, 3.4, photos?.[item.id]) : '');
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${HEIGHT}" aria-hidden="true" focusable="false">${shelf(cx)}${rail}${hung}</svg>`;
}
