// The automatic cut-out (R16): which of MagicTouch's outlines is the item.
// The User never taps. The app asks MagicTouch about the photo's center and
// eight points around it, then keeps the outline that looks most like one
// garment: it holds the point it started from, covers a plausible share of
// the photo, doesn't run along the photo's edges the way a floor or a door
// does, and looks different from the rest of the photo. The other answers
// that outline the same item then settle its edge: where they disagree, a
// pixel that looks like the background is left out (a point between pant
// legs makes MagicTouch include the floor between them). Pure functions over
// mask arrays, so tests run them without a browser; vision/photo.js runs
// the model and draws the cut-out.
//
// A mask is a Uint8Array of 0 and 1, row by row, w wide and h tall.
//
// chooseOutline(answers, w, h, rgba) -> { mask, stats, point } or null
//   answers  [{ point: [x, y], confidence }], one per probe point; the point
//            is normalized (0–1), the confidence a Float32Array (0–1) w × h
//   rgba     the photo MagicTouch saw, as pixel data (ImageData.data)

import { colorDistance, hexToLab } from '../recommend/color.js';

// Where to ask: the center first, then a ring around it, so pants laid flat
// still work when the center falls between the legs.
const RING = 0.14;
export const PROBES = [[0.5, 0.5], ...Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return [0.5 + RING * Math.cos(a), 0.5 + RING * Math.sin(a)].map((v) => Math.round(v * 1000) / 1000);
})];

// An outline is plausible when it covers between 4% and 90% of the photo and
// at most this share of the photo's edge (a floor or door runs along it).
const MIN_SHARE = 0.04;
const MAX_SHARE = 0.9;
const MAX_EDGE = 0.45;
// The inside's average color must differ from the outside's by at least
// this much (Delta E). On a blank photo MagicTouch still splits the floor
// into patches, but both sides look alike (1–3 in tests, against 47–61 for
// real items).
const MIN_CONTRAST = 10;
// Two outlines are of the same item when they overlap this much
// (intersection over union).
const SAME_ITEM = 0.8;
// Where outlines of the same item disagree, a pixel this close (Delta E) to
// the background's average color is background.
const BACKGROUND_DISTANCE = 12;

export function binarize(confidence, threshold = 0.5) {
  const out = new Uint8Array(confidence.length);
  for (let i = 0; i < confidence.length; i += 1) out[i] = confidence[i] >= threshold ? 1 : 0;
  return out;
}

// Flood fill over pixels equal to `value`, from the given start indexes
// (4-connected). Returns the filled pixels as a mask.
function flood(mask, w, h, starts, value) {
  const out = new Uint8Array(w * h);
  const stack = [];
  for (const i of starts) {
    if (mask[i] === value && !out[i]) {
      out[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
    for (const j of next) {
      if (j >= 0 && j < w * h && mask[j] === value && !out[j]) {
        out[j] = 1;
        stack.push(j);
      }
    }
  }
  return out;
}

// The connected part of the mask that holds pixel (x, y), or null when
// (x, y) is outside the mask.
export function regionAt(mask, w, h, x, y) {
  const i = y * w + x;
  return mask[i] ? flood(mask, w, h, [i], 1) : null;
}

// Holes become part of the mask: background that can't be reached from the
// photo's border, such as a dark print MagicTouch left out of a light shirt.
export function fillHoles(mask, w, h) {
  const border = [];
  for (let x = 0; x < w; x += 1) border.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y += 1) border.push(y * w, y * w + w - 1);
  const outside = flood(mask, w, h, border, 0);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i += 1) out[i] = outside[i] ? 0 : 1;
  return out;
}

// Area, bounding box and how much of the photo's edge the mask covers.
export function maskStats(mask, w, h) {
  let area = 0;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!mask[y * w + x]) continue;
      area += 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  let edge = 0;
  for (let x = 0; x < w; x += 1) edge += mask[x] + mask[(h - 1) * w + x];
  for (let y = 1; y < h - 1; y += 1) edge += mask[y * w] + mask[y * w + w - 1];
  return {
    area,
    share: area / (w * h),
    edge: edge / (2 * w + 2 * (h - 2)),
    box: area ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null,
  };
}

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// How different the inside of the mask looks from the outside: the Delta E
// between their average colors.
export function contrast(mask, rgba) {
  const sums = [[0, 0, 0, 0], [0, 0, 0, 0]]; // outside, inside: r, g, b, count
  for (let i = 0; i < mask.length; i += 1) {
    const s = sums[mask[i]];
    s[0] += rgba[i * 4];
    s[1] += rgba[i * 4 + 1];
    s[2] += rgba[i * 4 + 2];
    s[3] += 1;
  }
  if (!sums[0][3] || !sums[1][3]) return 0;
  const [outside, inside] = sums.map(([r, g, b, n]) => hex(r / n, g / n, b / n));
  return colorDistance(inside, outside);
}

// 0 for an outline that can't be the item; otherwise higher for a bigger
// outline that stays clear of the photo's edges.
export function scoreOutline(stats, contrastValue) {
  if (stats.share < MIN_SHARE || stats.share > MAX_SHARE || stats.edge > MAX_EDGE) return 0;
  if (contrastValue < MIN_CONTRAST) return 0;
  return stats.share * (1 - stats.edge);
}

// The largest connected part of the mask.
export function largestRegion(mask, w, h) {
  const label = new Int32Array(w * h);
  let best = { id: 0, size: 0 };
  let id = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || label[start]) continue;
    id += 1;
    label[start] = id;
    const stack = [start];
    let size = 0;
    while (stack.length) {
      const i = stack.pop();
      size += 1;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && mask[j] && !label[j]) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    if (size > best.size) best = { id, size };
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i += 1) out[i] = label[i] === best.id && best.id ? 1 : 0;
  return out;
}

export function overlap(a, b) {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i += 1) {
    both += a[i] & b[i];
    either += a[i] | b[i];
  }
  return either ? both / either : 0;
}

// Outlines of one item, merged: where they all agree the pixel is the item;
// where only some include it, it's the item unless it looks like the
// background (the average color of what none of them include).
export function settle(masks, rgba) {
  const votes = new Uint8Array(masks[0].length);
  for (const m of masks) for (let i = 0; i < m.length; i += 1) votes[i] += m[i];
  const sum = [0, 0, 0, 0];
  for (let i = 0; i < votes.length; i += 1) {
    if (votes[i]) continue;
    sum[0] += rgba[i * 4];
    sum[1] += rgba[i * 4 + 1];
    sum[2] += rgba[i * 4 + 2];
    sum[3] += 1;
  }
  const background = sum[3] ? hexToLab(hex(sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3])) : null;
  const out = new Uint8Array(votes.length);
  for (let i = 0; i < votes.length; i += 1) {
    if (votes[i] === masks.length) out[i] = 1;
    else if (votes[i] && background) {
      const c = hexToLab(hex(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
      out[i] = Math.hypot(c.l - background.l, c.a - background.a, c.b - background.b) >= BACKGROUND_DISTANCE ? 1 : 0;
    }
  }
  return out;
}

export function chooseOutline(answers, w, h, rgba) {
  const outlines = [];
  for (const { point, confidence } of answers) {
    const x = Math.min(w - 1, Math.round(point[0] * (w - 1)));
    const y = Math.min(h - 1, Math.round(point[1] * (h - 1)));
    const region = regionAt(binarize(confidence), w, h, x, y);
    if (!region) continue;
    const mask = fillHoles(region, w, h);
    const stats = maskStats(mask, w, h);
    const score = scoreOutline(stats, contrast(mask, rgba));
    if (score > 0) outlines.push({ mask, point, score });
  }
  if (!outlines.length) return null;
  const best = outlines.reduce((a, b) => (b.score > a.score ? b : a));
  const same = outlines.filter((o) => overlap(o.mask, best.mask) >= SAME_ITEM);
  const mask = largestRegion(settle(same.map((o) => o.mask), rgba), w, h);
  return { mask, stats: maskStats(mask, w, h), point: best.point };
}
