// A closet photo's colors (R17): the base and print colors, sampled from
// the photo's pixels on the device. Until the cut-out (C8) the sample comes
// from the middle of the photo, where the item usually is.
//
// sampleColors(rgba, { background }) -> { base, print }
//   rgba    pixel data (r, g, b, a, r, g, b, a, …), e.g. ImageData.data
//   background  the photo's background color (from its edges), left out of
//               the sample unless the item seems to fill the photo
//   base    the most common color, as #rrggbb
//   print   the next most common color that looks clearly different and
//           covers enough of the sample to be a print, or null

import { colorDistance } from '../recommend/color.js';

// Pixels are grouped into color bins 32 levels wide per channel; each bin's
// color is the average of its pixels.
const BIN = 5;
// A print must look clearly different from the base (Delta E) and cover at
// least this share of the sample.
const PRINT_DISTANCE = 25;
const PRINT_SHARE = 0.12;
// Colors this close to the background are the background; it's left out
// only when what's left still covers at least half the sample, so a white
// item on a pale floor keeps its white (the cut-out, C8, settles it).
const BACKGROUND_DISTANCE = 14;
const MIN_ITEM_SHARE = 0.5;

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export function sampleColors(rgba, { step = 1, background = null } = {}) {
  const bins = new Map();
  let total = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4 * step) {
    if (rgba[i + 3] < 128) continue; // see-through pixels aren't the item
    const key = ((rgba[i] >> BIN) << 6) | ((rgba[i + 1] >> BIN) << 3) | (rgba[i + 2] >> BIN);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += rgba[i];
    bin.g += rgba[i + 1];
    bin.b += rgba[i + 2];
    bins.set(key, bin);
    total += 1;
  }
  if (total === 0) return { base: '#999999', print: null };
  let ranked = [...bins.values()]
    .sort((x, y) => y.n - x.n)
    .map((bin) => ({ share: bin.n / total, color: hex(bin.r / bin.n, bin.g / bin.n, bin.b / bin.n) }));
  if (background) {
    const item = ranked.filter((c) => colorDistance(c.color, background) >= BACKGROUND_DISTANCE);
    const share = item.reduce((sum, c) => sum + c.share, 0);
    if (share >= MIN_ITEM_SHARE) ranked = item.map((c) => ({ ...c, share: c.share / share }));
  }
  const base = ranked[0].color;
  // Neighboring bins of the base color count toward it, not as a print.
  const others = ranked.slice(1).filter((c) => colorDistance(c.color, base) >= PRINT_DISTANCE);
  // Bins close to one another add up, so a print split across two
  // neighboring bins still counts.
  const print = others.find((c) => others.filter((o) => colorDistance(o.color, c.color) < PRINT_DISTANCE).reduce((sum, o) => sum + o.share, 0) >= PRINT_SHARE);
  return { base, print: print?.color ?? null };
}

// The edges of an image (a band 4% deep on each side), as pixel data: where
// the background shows in a photo of one item.
export function edgePixels(ctx, w, h) {
  const d = Math.max(1, Math.round(Math.min(w, h) * 0.04));
  const strips = [[0, 0, w, d], [0, h - d, w, d], [0, d, d, h - 2 * d], [w - d, d, d, h - 2 * d]]
    .filter(([, , sw, sh]) => sw > 0 && sh > 0)
    .map(([x, y, sw, sh]) => ctx.getImageData(x, y, sw, sh).data);
  const out = new Uint8ClampedArray(strips.reduce((n, s) => n + s.length, 0));
  let at = 0;
  for (const s of strips) {
    out.set(s, at);
    at += s.length;
  }
  return out;
}

// The middle half of an image, as pixel data, from a canvas 2D context of
// width w and height h.
export const centerPixels = (ctx, w, h) => ctx.getImageData(Math.floor(w / 4), Math.floor(h / 4), Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2))).data;
