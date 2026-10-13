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

// The item being drawn as photographed (R44), set by avatar.js around one
// garment: pieces in the item's base color fill with its photo and report
// their outlines, so the photo can be fitted to the whole garment.
let photographing = null;

export function withPhoto({ base, fitId, patchId }, draw) {
  photographing = { base, fitId, patchId, boxes: [], parts: [] };
  try {
    const out = draw();
    return { out, boxes: photographing.boxes, parts: photographing.parts };
  } finally {
    photographing = null;
  }
}

// The box around a path's points (its curves' control points included, so
// the box can be a little generous). Parts are drawn with absolute
// commands; any part with relative ones is skipped.
export function boxOf(d) {
  if (/[a-df-y]/.test(d)) return null;
  const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (n.length < 2) return null;
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// A small repeating print in the item's second color (R17's print color).
function printPattern(id, color) {
  return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">`
    + `<path d="M3 4h5M11 12h3" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`
    + '</pattern>';
}

// One drawn piece (a garment, skin or hair) from a base color:
// - parts: closed paths that make the silhouette
// - collar: drawn collar points, part of the silhouette too
// - shade: [{ d, tone: 'shadow' | 'deep' | 'light', opacity }] areas
// - lines: [{ d, tone, width }] folds, seams and details
// Shading and lines are clipped to the silhouette. In a garment drawn as
// photographed (withPhoto), pieces in its base color show the photo instead
// of the print: a repeating square of its fabric, then the fitted photo.
// Their drawn collar points, seams and pockets are left off, so the
// garment's own show.
export function piece({ parts: body, collar = [], base, print = null, shade = [], lines = [], outline = 2.4, name = 'piece' }) {
  const s = shades(base);
  const photographed = photographing && base === photographing.base;
  const parts = photographed ? body : [...body, ...collar];
  const clip = uid(`${name}-clip`);
  let defs = `<clipPath id="${clip}">${parts.map((d) => path(d, '')).join('')}</clipPath>`;
  // Fills that follow each part's own shape: the photo or the print. They
  // stay outside the clip: where parts overlap, like collar points on a
  // torso, browsers can cancel the clip's overlapping parts out, which hid
  // these fills there.
  let fills = '';
  if (photographed) {
    photographing.boxes.push(...parts.map(boxOf).filter(Boolean));
    photographing.parts.push(...parts);
    fills = [photographing.patchId, photographing.fitId].filter(Boolean).map((id) => parts.map((d) => path(d, `fill="url(#${id})"`)).join('')).join('');
  } else if (print) {
    const pat = uid(`${name}-print`);
    defs += printPattern(pat, print);
    fills = parts.map((d) => path(d, `fill="url(#${pat})"`)).join('');
  }
  // Over a photo, shading darkens what's under it instead of covering it,
  // and the drawn seams, pockets and buttons are left off.
  let overlay = shade.map((a) => path(a.d, photographed
    ? `fill="${s[a.tone]}" opacity="${(a.opacity ?? 1) * 0.55}" style="mix-blend-mode:multiply"`
    : `fill="${s[a.tone]}" opacity="${a.opacity ?? 1}"`)).join('');
  overlay += (photographed ? [] : lines)
    .map((l) => path(l.d, `fill="none" stroke="${s[l.tone || 'deep']}" stroke-width="${l.width ?? 2.2}" stroke-linecap="round" stroke-linejoin="round" opacity="${l.opacity ?? 1}"`))
    .join('');
  return `<g><defs>${defs}</defs>${solid(parts, base, s.line, outline)}${fills}<g clip-path="url(#${clip})">${overlay}</g></g>`;
}
