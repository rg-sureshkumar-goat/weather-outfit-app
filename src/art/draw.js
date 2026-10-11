// SVG building blocks shared by the body, hair and garments.

import { shades } from './paint.js';

// Ids must be unique per page, since several avatars can share one page.
let counter = 0;
export const uid = (name) => `qd-${name}-${++counter}`;

const path = (d, attrs) => `<path d="${d}" ${attrs}/>`;

// A filled shape made of overlapping parts with one clean outer outline:
// every part is first drawn in the line color with a thick stroke, then
// filled on top, so the joins between parts don't show.
export function solid(parts, fill, line, width = 2.4) {
  const under = parts.map((d) => path(d, `fill="${line}" stroke="${line}" stroke-width="${width * 2}" stroke-linejoin="round"`)).join('');
  const over = parts.map((d) => path(d, `fill="${fill}"`)).join('');
  return under + over;
}

// A small repeating print in the item's second color (R17's print color).
function printPattern(id, color) {
  return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">`
    + `<path d="M3 4h5M11 12h3" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`
    + '</pattern>';
}

// One drawn piece (a garment, skin or hair) from a base color:
// - parts: closed paths that make the silhouette
// - shade: [{ d, tone: 'shadow' | 'deep' | 'light', opacity }] areas
// - lines: [{ d, tone, width }] folds, seams and details
// Shading and lines are clipped to the silhouette.
export function piece({ parts, base, print = null, shade = [], lines = [], outline = 2.4, name = 'piece' }) {
  const s = shades(base);
  const clip = uid(`${name}-clip`);
  let defs = `<clipPath id="${clip}">${parts.map((d) => path(d, '')).join('')}</clipPath>`;
  let overlay = '';
  if (print) {
    const pat = uid(`${name}-print`);
    defs += printPattern(pat, print);
    overlay += parts.map((d) => path(d, `fill="url(#${pat})"`)).join('');
  }
  overlay += shade.map((a) => path(a.d, `fill="${s[a.tone]}" opacity="${a.opacity ?? 1}"`)).join('');
  overlay += lines
    .map((l) => path(l.d, `fill="none" stroke="${s[l.tone || 'deep']}" stroke-width="${l.width ?? 2.2}" stroke-linecap="round" stroke-linejoin="round" opacity="${l.opacity ?? 1}"`))
    .join('');
  return `<g><defs>${defs}</defs>${solid(parts, base, s.line, outline)}<g clip-path="url(#${clip})">${overlay}</g></g>`;
}
