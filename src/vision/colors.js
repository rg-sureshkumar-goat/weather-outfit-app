// A closet photo's colors (R17): up to 6 colors recognized from the item's
// pixels on the device, from the cut-out, or from the middle of the photo
// when there's no cut-out (Developer's choice, 2026-10-12).
//
// sampleColors(rgba, { step, background }) -> { base, print, more }
//   rgba        pixel data (r, g, b, a, r, g, b, a, …), e.g. ImageData.data;
//               see-through pixels are left out
//   background  the photo's background color (from its edges), left out of
//               the sample unless the item seems to fill the photo
//   base        the item's main color: the one covering the most of it
//   print       a second color the avatar draws as its print: clearly
//               different from the base and covering enough of the item, or
//               null (a small logo isn't an all-over print)
//   more        the other colors recognized, most common first, so that
//               base, print and more hold at most 6 colors
//
// How: pixels are grouped by color (k-means in CIE Lab). Then, largest
// first, each group joins an earlier one it's a shade of (the same color
// under different light, so a shadow or a fold isn't a color of its own) or
// nearly matches; otherwise it's a color of its own. Groups are compared
// with each color's own shade, not an average that drifts as groups join,
// so navy can't creep through blended grays to white. A thin stripe in a
// different hue stays.

import { colorDistance, hexToLab } from '../recommend/color.js';

export const MAX_COLORS = 6;
// Color groups found before merging.
const GROUPS = 16;
// Groups closer than this are one color (Delta E).
const MERGE = 8;
// Shades of one color merge too: both near-gray (chroma under NEUTRAL), or
// the same hue (within HUE degrees) at a similar strength, as long as their
// lightness differs by less than SHADE_LIGHTNESS.
const NEUTRAL = 10;
const HUE = 8;
const STRENGTH_RATIO = 0.6;
const SHADE_LIGHTNESS = 30;
// A color must cover at least this share of the item to count.
const MIN_SHARE = 0.03;
// The avatar's print must differ clearly from the base (Delta E) and cover
// at least this share of the item.
const PRINT_DISTANCE = 25;
const PRINT_SHARE = 0.12;
// Colors this close to the background are the background; they're left out
// only when what's left still covers at least half the sample, so a white
// item on a pale floor keeps its white.
const BACKGROUND_DISTANCE = 14;
const MIN_ITEM_SHARE = 0.5;

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const labArray = (h) => {
  const { l, a, b } = hexToLab(h);
  return [l, a, b];
};
const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

// Pixels grouped into bins 8 levels wide per channel; each bin keeps its
// pixel count and average color.
function binPixels(rgba, step) {
  const bins = new Map();
  let total = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4 * step) {
    if (rgba[i + 3] < 128) continue;
    const key = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
    let bin = bins.get(key);
    if (!bin) bins.set(key, (bin = { n: 0, r: 0, g: 0, b: 0 }));
    bin.n += 1;
    bin.r += rgba[i];
    bin.g += rgba[i + 1];
    bin.b += rgba[i + 2];
    total += 1;
  }
  const points = [...bins.values()].map((bin) => ({ ...bin, lab: labArray(hex(bin.r / bin.n, bin.g / bin.n, bin.b / bin.n)) }));
  return { points, total };
}

// k-means over the bins, weighted by pixel count. The first center is the
// most common bin; each next one is the bin that's both common and far from
// the centers so far, so the result is the same every time.
function kMeans(points, k) {
  const centers = [points.reduce((a, b) => (b.n > a.n ? b : a)).lab];
  while (centers.length < k) {
    let best = null;
    let bestScore = 0;
    for (const p of points) {
      const score = Math.min(...centers.map((c) => dist2(p.lab, c))) * p.n;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (!best) break; // every bin already sits on a center
    centers.push(best.lab);
  }
  let groups = [];
  for (let round = 0; round < 15; round += 1) {
    groups = centers.map(() => ({ n: 0, r: 0, g: 0, b: 0, lab: [0, 0, 0] }));
    for (const p of points) {
      let nearest = 0;
      centers.forEach((c, j) => {
        if (dist2(p.lab, c) < dist2(p.lab, centers[nearest])) nearest = j;
      });
      add(groups[nearest], p);
    }
    groups.forEach((g, j) => {
      if (g.n) centers[j] = g.lab;
    });
  }
  return groups.filter((g) => g.n);
}

// Adds a bin or group into a group: pixel counts and color sums add up, and
// the Lab color is their weighted average.
function add(group, p) {
  const n = group.n + p.n;
  group.lab = group.lab.map((v, i) => (v * group.n + p.lab[i] * p.n) / n);
  group.n = n;
  group.r += p.r;
  group.g += p.g;
  group.b += p.b;
}

const colorOf = (g) => hex(g.r / g.n, g.g / g.n, g.b / g.n);

const chroma = (lab) => Math.hypot(lab[1], lab[2]);
const hueGap = (p, q) => {
  const d = Math.abs(Math.atan2(p[2], p[1]) - Math.atan2(q[2], q[1])) * (180 / Math.PI);
  return d > 180 ? 360 - d : d;
};

// Two colors are shades of one color under different light.
export function shadesOfOne(p, q) {
  if (Math.abs(p[0] - q[0]) >= SHADE_LIGHTNESS) return false;
  const cp = chroma(p);
  const cq = chroma(q);
  if (cp < NEUTRAL && cq < NEUTRAL) return true;
  return hueGap(p, q) < HUE && Math.min(cp, cq) / Math.max(cp, cq) >= STRENGTH_RATIO;
}

// Largest first, each group joins the closest earlier color it's a shade of
// or nearly matches, or becomes a color of its own.
function mergeShades(groups) {
  const colors = [];
  for (const g of [...groups].sort((a, b) => b.n - a.n)) {
    const matches = colors.filter((c) => shadesOfOne(c.own, g.lab) || Math.sqrt(dist2(c.own, g.lab)) < MERGE);
    if (matches.length) add(matches.reduce((a, b) => (dist2(b.own, g.lab) < dist2(a.own, g.lab) ? b : a)), g);
    else colors.push({ ...g, own: g.lab });
  }
  return colors;
}

export function sampleColors(rgba, { step = 1, background = null } = {}) {
  const { points, total } = binPixels(rgba, step);
  if (total === 0) return { base: '#999999', print: null, more: [] };
  let colors = mergeShades(kMeans(points, GROUPS))
    .map((g) => ({ color: colorOf(g), share: g.n / total }))
    .sort((a, b) => b.share - a.share);
  if (background) {
    const item = colors.filter((c) => colorDistance(c.color, background) >= BACKGROUND_DISTANCE);
    const share = item.reduce((sum, c) => sum + c.share, 0);
    if (share >= MIN_ITEM_SHARE) colors = item.map((c) => ({ ...c, share: c.share / share }));
  }
  const [main, ...rest] = colors;
  const others = rest.filter((c) => c.share >= MIN_SHARE);
  const print = others.find((c) => c.share >= PRINT_SHARE && colorDistance(c.color, main.color) >= PRINT_DISTANCE);
  const more = others.filter((c) => c !== print).slice(0, MAX_COLORS - (print ? 2 : 1));
  return { base: main.color, print: print?.color ?? null, more: more.map((c) => c.color) };
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
