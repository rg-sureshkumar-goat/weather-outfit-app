// The item as photographed on the avatar (R44): its cut-out fitted to the
// drawing of its type on the avatar's body, under the drawing's outline and
// shading (the Developer's choice, 2026-10-12). The drawn collar points,
// seams and pockets are left off, so the garment's own show.
//
// The fit works row by row: the photo's top (the collar) meets the
// drawing's top and its hem the hem, and in every row the photo's left and
// right edges meet the drawing's at that height. With short sleeves on
// both, rows split into the sides and the body, each fitted to its own
// part, so the body keeps its place. Every pixel of the drawing gets a
// color: where the photo has nothing (the collar opening, a hanger taken
// out), the nearest fabric fills in. Before fitting, a hanger seen in the
// collar is taken out (dropHanger) and the lighting is evened out
// (evenLighting).
//
// The pure functions run in tests; photoLook() needs a browser canvas.

import { colorDistance } from '../recommend/color.js';

// How an item type wears its photo: fitted over the whole garment, as a
// repeating patch only (too small to fit), or not at all (glasses keep
// their frame color).
export function patternMode(type, group) {
  if (type === 'glasses' || type === 'sunglasses') return 'none';
  if (group === 'shoes' || group === 'accessories') return 'patch';
  return 'fit';
}

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const hexAt = (rgba, i) => hex(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);

// Even lighting: a photo is often brighter and hazier in one part (a
// hanging shirt's shoulders) and darker in another. Each pixel's brightness
// moves part of the way (LIGHT_STRENGTH) from its area's average (within a
// tenth of the item's width) to the whole item's, so those parts don't show
// as patches. Color and fabric texture stay. Returns new RGBA.
const LIGHT_STRENGTH = 0.6;

export function evenLighting(rgba, mask, w, h) {
  const r = Math.max(4, Math.round(w * 0.1));
  const Y = new Float32Array(w * h);
  const sum = new Float64Array((w + 1) * (h + 1));
  const cnt = new Uint32Array((w + 1) * (h + 1));
  let gSum = 0;
  let gN = 0;
  for (let y = 0; y < h; y += 1) {
    let rs = 0;
    let rc = 0;
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (mask[i]) {
        Y[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
        rs += Y[i];
        rc += 1;
        gSum += Y[i];
        gN += 1;
      }
      const k = (y + 1) * (w + 1) + x + 1;
      sum[k] = sum[k - w - 1] + rs;
      cnt[k] = cnt[k - w - 1] + rc;
    }
  }
  const out = Uint8ClampedArray.from(rgba);
  if (!gN) return out;
  const gMean = gSum / gN;
  const box = (arr, x0, y0, x1, y1) => arr[y1 * (w + 1) + x1] - arr[y0 * (w + 1) + x1] - arr[y1 * (w + 1) + x0] + arr[y0 * (w + 1) + x0];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const x0 = Math.max(0, x - r);
      const y0 = Math.max(0, y - r);
      const x1 = Math.min(w, x + r + 1);
      const y1 = Math.min(h, y + r + 1);
      const mean = box(sum, x0, y0, x1, y1) / box(cnt, x0, y0, x1, y1);
      const f = Math.max(0, Y[i] + (gMean - mean) * LIGHT_STRENGTH) / Math.max(1, Y[i]);
      for (let k = 0; k < 3; k += 1) out[i * 4 + k] = rgba[i * 4 + k] * f;
    }
  }
  return out;
}

// A square of the item, up to `share` of its width, wholly inside it and as
// close as possible to the lower left of its middle, away from plackets,
// pockets and chest graphics: the square that's repeated on shoes, hats and
// scarves, and under a fitted photo to soften its edges.
export function findPatch(mask, w, h, share = 0.3) {
  const sum = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let row = 0;
    for (let x = 0; x < w; x += 1) {
      row += mask[y * w + x] ? 1 : 0;
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
    }
  }
  const filled = (x, y, s) => sum[(y + s) * (w + 1) + x + s] - sum[y * (w + 1) + x + s] - sum[(y + s) * (w + 1) + x] + sum[y * (w + 1) + x] === s * s;
  const target = { x: w * 0.38, y: h * 0.6 };
  for (let s = Math.max(4, Math.round(w * share)); s >= 4; s = Math.floor(s * 0.85)) {
    let best = null;
    let bestD = Infinity;
    const step = Math.max(1, Math.round(s / 10));
    for (let y = 0; y + s <= h; y += step) {
      for (let x = 0; x + s <= w; x += step) {
        if (!filled(x, y, s)) continue;
        const d = (x + s / 2 - target.x) ** 2 + (y + s / 2 - target.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = { x, y, w: s, h: s };
        }
      }
    }
    if (best) return best;
  }
  return { x: 0, y: 0, w: Math.max(1, Math.min(w, h)), h: Math.max(1, Math.min(w, h)) };
}

// ---- Fitting to the drawing -------------------------------------------------------

// Rows narrower than this share of the widest row don't count as the top or
// bottom of the garment (a hanger's hook, a loose thread, collar points).
const MIN_ROW_SHARE = 0.3;
// Edges are averaged over this many rows above and below, so a ragged
// outline doesn't make the pattern ripple.
const SMOOTH_ROWS = 3;

// The outline of a mask (1 where the item is), row by row: its outermost
// left and right edges in every row that has any, and its top and bottom
// rows (the first and last at least MIN_ROW_SHARE of the widest). Edges are
// smoothed between the top and bottom; outside them (collar points above, a
// curved hem below) each row keeps its own.
export function rowProfile(mask, w, h) {
  const left = new Float32Array(h).fill(NaN);
  const right = new Float32Array(h).fill(NaN);
  let widest = 0;
  for (let y = 0; y < h; y += 1) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      if (l < 0) l = x;
      r = x + 1;
    }
    if (l >= 0) {
      left[y] = l;
      right[y] = r;
      widest = Math.max(widest, r - l);
    }
  }
  const wide = (y) => right[y] - left[y] >= widest * MIN_ROW_SHARE;
  let top = 0;
  while (top < h && !wide(top)) top += 1;
  let bottom = h - 1;
  while (bottom > top && !wide(bottom)) bottom -= 1;
  const smooth = (edge) => edge.map((v, y) => {
    if (Number.isNaN(v) || y < top || y > bottom) return v;
    let s = 0;
    let n = 0;
    for (let k = Math.max(top, y - SMOOTH_ROWS); k <= Math.min(bottom, y + SMOOTH_ROWS); k += 1) {
      if (!Number.isNaN(edge[k])) {
        s += edge[k];
        n += 1;
      }
    }
    return s / n;
  });
  return { top, bottom, widest, left: smooth(left), right: smooth(right) };
}

// Where short sleeves end: the row in the upper part of the garment where
// the outline narrows most sharply (by at least an eighth of its widest
// row), or null when it doesn't (long sleeves hanging the whole way down).
export function sleeveEnd(profile) {
  const { top, bottom, left, right } = profile;
  const span = bottom - top;
  if (span < 20) return null;
  const width = (y) => right[y] - left[y];
  let widest = 0;
  for (let y = top; y <= bottom; y += 1) if (width(y) > widest) widest = width(y);
  const k = Math.max(2, Math.round(span * 0.03));
  let best = null;
  let bestDrop = widest / 8;
  for (let y = Math.round(top + span * 0.1); y <= Math.round(top + span * 0.6); y += 1) {
    const drop = width(y - k) - width(y + k);
    if (drop > bestDrop) {
      bestDrop = drop;
      best = y;
    }
  }
  return best;
}

// The photo's row for a row of the drawing: top to top and hem to hem,
// and, when both have short sleeves, sleeve end to sleeve end. Rows above
// the top or below the hem take the nearest of the photo's.
export function rowMap(s, d) {
  const sKey = sleeveEnd(s);
  const dKey = sleeveEnd(d);
  const lerpRow = (y, d0, d1, s0, s1) => s0 + ((y - d0) / Math.max(1, d1 - d0)) * (s1 - s0);
  const clamp = (y) => Math.min(s.bottom, Math.max(s.top, y));
  if (sKey === null || dKey === null) return (y) => clamp(lerpRow(y, d.top, d.bottom, s.top, s.bottom));
  return (y) => clamp(y <= dKey ? lerpRow(y, d.top, dKey, s.top, sKey) : lerpRow(y, dKey, d.bottom, sKey, s.bottom));
}

// The body's edges, under short sleeves: taken just below where the sleeves
// end, and kept for the rows above, where the sleeves stick out past them.
export function torsoBand(profile, key) {
  const y = Math.min(profile.bottom, key + Math.max(2, Math.round((profile.bottom - profile.top) * 0.06)));
  return { left: profile.left[y], right: profile.right[y] };
}

// A position along a row, from one row's stops to another's: each stop of
// `from` meets the same stop of `to`, straight in between.
function alongStops(x, from, to) {
  let i = 0;
  while (i < from.length - 2 && x > from[i + 1]) i += 1;
  const t = (x - from[i]) / Math.max(1e-6, from[i + 1] - from[i]);
  return to[i] + t * (to[i + 1] - to[i]);
}

// The photo fitted to the drawing (see the top of this file), blending
// neighboring pixels so edges stay smooth.
//   src  { rgba, w, h, profile }   the photo, every pixel filled (fillPhoto),
//                                  and the item's outline (rowProfile)
//   dst  { mask, w, h, profile }   the drawing's outline
// Returns RGBA w × h of dst: a color for every pixel of the drawing.
export function fitPhoto(src, dst) {
  const out = new Uint8ClampedArray(dst.w * dst.h * 4);
  // Read a little inside the fabric's edges, where a photo's outline is
  // ragged (curved shirttails, sleeve hems), so they don't streak.
  fitRows(src, dst, (i, sx, row, sy) => {
    const x0 = Math.min(src.w - 2, Math.max(0, Math.floor(sx - 0.5)));
    const y0 = Math.min(src.h - 2, Math.max(0, Math.floor(sy)));
    const fx = Math.min(1, Math.max(0, sx - 0.5 - x0));
    const fy = Math.min(1, Math.max(0, sy - y0));
    for (let k = 0; k < 3; k += 1) {
      const at = (x, y) => src.rgba[(y * src.w + x) * 4 + k];
      out[i * 4 + k] = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    }
    out[i * 4 + 3] = 255;
  }, PHOTO_INSET);
  return out;
}

// How far inside its edges a photo is read (a share of its size).
const PHOTO_INSET = 0.015;

// Every clear pixel of a photo takes the color of the nearest pixel of the
// item, so the fit can read a color anywhere. Returns new RGBA.
export function fillPhoto(rgba, mask, w, h) {
  const out = Uint8ClampedArray.from(rgba);
  const done = Uint8Array.from(mask);
  let frontier = [];
  for (let i = 0; i < done.length; i += 1) if (done[i]) frontier.push(i);
  while (frontier.length) {
    const next = [];
    for (const i of frontier) {
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && !done[j]) {
          done[j] = 1;
          for (let k = 0; k < 3; k += 1) out[j * 4 + k] = out[i * 4 + k];
          out[j * 4 + 3] = 255;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return out;
}

// The row-by-row fit: calls put(drawing pixel, photo x, photo row, photo y)
// for every pixel of the drawing. `inset` (a share of the photo's size)
// keeps the reading inside its edges.
function fitRows(src, dst, put, inset = 0) {
  const ix = src.w * inset;
  const iy = (src.profile.bottom - src.profile.top) * inset;
  const s = inset
    ? { ...src.profile, top: Math.round(src.profile.top + iy), bottom: Math.round(src.profile.bottom - iy), left: src.profile.left.map((v) => v + ix), right: src.profile.right.map((v) => v - ix) }
    : src.profile;
  const d = dst.profile;
  const toMapRow = rowMap(s, d);
  const sKey = sleeveEnd(s);
  const dKey = sleeveEnd(d);
  const bands = sKey !== null && dKey !== null ? { s: torsoBand(s, sKey), d: torsoBand(d, dKey) } : null;
  const stops = (band, L, R) => (band ? [L, Math.min(R, Math.max(L, band.left)), Math.max(L, Math.min(R, band.right)), R] : [L, R]);
  for (let y = 0; y < dst.h; y += 1) {
    const L2 = d.left[y];
    const R2 = d.right[y];
    if (Number.isNaN(L2)) continue;
    const sy = toMapRow(y);
    const row = Math.round(sy);
    const L = s.left[row];
    const R = s.right[row];
    if (Number.isNaN(L)) continue;
    const to = stops(bands?.d, L2, R2);
    const from = stops(bands?.s, L, R);
    // Every pixel of the drawing in this row; pixels just past the smoothed
    // edges take the color at the edge.
    for (let x = 0; x < dst.w; x += 1) {
      if (!dst.mask[y * dst.w + x]) continue;
      const at = Math.min(R2, Math.max(L2, x + 0.5));
      put(y * dst.w + x, alongStops(at, to, from), row, sy);
    }
  }
}

// ---- A hanger --------------------------------------------------------------------------

// A hanger's hook: rows above the garment narrower than this share of its
// widest row, in a color at least HANGER_CONTRAST (Delta E) from the top of
// the garment. Pixels within HANGER_DISTANCE of the hook's color are the
// hanger, looked for only in the top HANGER_DEPTH of the garment.
const HOOK_SHARE = 0.12;
const HANGER_CONTRAST = 15;
const HANGER_DISTANCE = 18;
const HANGER_DEPTH = 0.15;

function averageColor(rgba, pixels) {
  const s = [0, 0, 0];
  for (const i of pixels) for (let k = 0; k < 3; k += 1) s[k] += rgba[i * 4 + k];
  return hex(...s.map((v) => v / pixels.length));
}

// A shirt photographed on a hanger shows the hanger above and inside its
// collar. The hook (thin rows above the garment's top) gives the hanger's
// color; pixels of that color joined to the hook, in the top of the
// garment, are made clear in rgba and mask. A flat-laid shirt's collar is
// in the shirt's own color, so it is never taken for a hook. Returns how
// many pixels were taken out.
export function dropHanger(rgba, mask, w, h, profile) {
  const rows = [];
  let widest = 0;
  for (let y = 0; y < h; y += 1) {
    const row = [];
    for (let x = 0; x < w; x += 1) if (mask[y * w + x]) row.push(y * w + x);
    rows.push(row);
    if (row.length) widest = Math.max(widest, (row[row.length - 1] % w) - (row[0] % w) + 1);
  }
  const seeds = [];
  for (let y = 0; y < profile.top; y += 1) {
    const row = rows[y];
    if (row.length && (row[row.length - 1] % w) - (row[0] % w) + 1 < widest * HOOK_SHARE) seeds.push(...row);
  }
  if (seeds.length === 0) return 0;
  const hook = averageColor(rgba, seeds);
  const topRows = rows.slice(profile.top, profile.top + Math.max(1, Math.round((profile.bottom - profile.top) * 0.2))).flat();
  if (topRows.length === 0 || colorDistance(hook, averageColor(rgba, topRows)) < HANGER_CONTRAST) return 0;
  const limit = profile.top + (profile.bottom - profile.top) * HANGER_DEPTH;
  const seen = new Uint8Array(w * h);
  const stack = [...seeds];
  seeds.forEach((i) => { seen[i] = 1; });
  let removed = 0;
  while (stack.length) {
    const i = stack.pop();
    mask[i] = 0;
    rgba[i * 4 + 3] = 0;
    removed += 1;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j < 0 || j >= w * h || seen[j] || !mask[j] || Math.floor(j / w) > limit) continue;
      seen[j] = 1;
      if (colorDistance(hexAt(rgba, j), hook) < HANGER_DISTANCE) stack.push(j);
    }
  }
  return removed;
}

// ---- Browser only ----------------------------------------------------------------------

// The photo is read at most this wide, and fitted at this many pixels per
// avatar unit.
const PHOTO_WIDTH = 640;
const FIT_SCALE = 2;

const canvasOf = (w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

const maskOf = (rgba) => {
  const mask = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < mask.length; i += 1) mask[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
  return mask;
};

async function pixelsOf(blob, width) {
  const bitmap = await createImageBitmap(blob);
  const w = Math.min(width, bitmap.width);
  const h = Math.max(1, Math.round((bitmap.height * w) / bitmap.width));
  const ctx = canvasOf(w, h).getContext('2d', { willReadFrequently: true });
  // Shrinking with smoothing averages the weave before colors are matched.
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const rgba = ctx.getImageData(0, 0, w, h).data;
  return { rgba, mask: maskOf(rgba), w, h };
}

// A short key for a garment's outline, so a fit is reused for the same
// drawing on the same body.
function keyOf(parts, box) {
  let k = 0;
  for (const ch of parts.join('|')) k = (k * 31 + ch.charCodeAt(0)) | 0;
  return `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.w)},${Math.round(box.h)},${k}`;
}

// What avatar.js needs to show an item as photographed (R44), from its
// cut-out (a PNG with a clear background): its photo fitted to a garment
// drawing, with a hanger left out, the lighting evened and holes filled
// with the nearest fabric, remembered per drawing; and a square of its
// fabric to repeat.
// Returns { fit({ parts, box }) -> image URL, patch, patchBox, width, height }.
export async function photoLook(cutout) {
  const { rgba: raw, mask, w, h } = await pixelsOf(cutout, PHOTO_WIDTH);
  dropHanger(raw, mask, w, h, rowProfile(mask, w, h));
  const lit = evenLighting(raw, mask, w, h);
  const profile = rowProfile(mask, w, h);
  const src = { rgba: fillPhoto(lit, mask, w, h), w, h, profile };
  const patchBox = findPatch(mask, w, h);
  const side = patchBox.w;
  const tile = canvasOf(side * 2, side * 2);
  const photoCanvas = canvasOf(w, h);
  photoCanvas.getContext('2d').putImageData(new ImageData(src.rgba, w, h), 0, 0);
  const tctx = tile.getContext('2d');
  [[1, 1, 0, 0], [-1, 1, 2 * side, 0], [1, -1, 0, 2 * side], [-1, -1, 2 * side, 2 * side]].forEach(([sx, sy, tx, ty]) => {
    tctx.setTransform(sx, 0, 0, sy, tx, ty);
    tctx.drawImage(photoCanvas, patchBox.x, patchBox.y, side, side, 0, 0, side, side);
  });
  const fits = new Map();
  return {
    width: w,
    height: h,
    patchBox,
    patch: tile.toDataURL('image/jpeg', 0.85),
    fit({ parts, box }) {
      const key = keyOf(parts, box);
      if (fits.has(key)) return fits.get(key);
      const dw = Math.max(1, Math.ceil(box.w * FIT_SCALE));
      const dh = Math.max(1, Math.ceil(box.h * FIT_SCALE));
      const ctx = canvasOf(dw, dh).getContext('2d', { willReadFrequently: true });
      ctx.setTransform(FIT_SCALE, 0, 0, FIT_SCALE, -box.x * FIT_SCALE, -box.y * FIT_SCALE);
      for (const d of parts) ctx.fill(new Path2D(d));
      const dmask = maskOf(ctx.getImageData(0, 0, dw, dh).data);
      const out = canvasOf(dw, dh);
      out.getContext('2d').putImageData(new ImageData(fitPhoto(src, { mask: dmask, w: dw, h: dh, profile: rowProfile(dmask, dw, dh) }), dw, dh), 0, 0);
      const url = out.toDataURL('image/png');
      fits.set(key, url);
      return url;
    },
  };
}
