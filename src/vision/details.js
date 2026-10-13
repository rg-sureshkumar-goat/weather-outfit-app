// A button shirt's button color from its cut-out (R44; plan.md C8b step 4),
// so the drawing shows its real buttons. When the app isn't sure, it says
// so (null) and the shirt keeps its drawing's own buttons. Chest pockets
// are the User's choice: reading them from photos failed (spec.md
// Revisions, 2026-10-12).
//
// readButtons(rgba, w, h, colors) -> { buttons: '#rrggbb' or null, why }
// readShirtButtons(cutout, colors) -> the same from a cut-out (a browser
//                                    canvas reads it)
//   colors   the item's recognized colors (vision/colors.js sampleColors)
//
// How: buttons are small round spots standing out from the fabric around
// them on every side (a stripe doesn't: along it, the color stays), in a
// color that isn't one of the fabric's own (where a plaid's white crosses
// white, it makes a spot too). A line of at least three, evenly spaced down
// the middle, is the placket, and their color is the buttons'. Buttons close
// to a fabric color (the Developer's flannel's gray ones) go unread.

import { rgbToLab, hexToLab, labToHex } from '../recommend/color.js';
import { evenLighting, dropHanger, rowProfile, pixelsOf } from './pattern.js';

// A button's radius, as a share of the garment's height.
const BUTTON = 0.008;
// A spot must differ from the fabric around it by this much (Delta E) in
// every direction, vary inside by at most SPOT_EVEN, and differ from each of
// the fabric's colors by FABRIC_APART.
const SPOT_CONTRAST = 16;
const SPOT_EVEN = 14;
const FABRIC_APART = 12;
// The placket: at least this many buttons in a line, within this share of
// the widest row from the item's middle, each gap within SPACING_SPREAD of a
// whole number of the shortest (a fold can hide a button).
const MIN_BUTTONS = 3;
const PLACKET_SPAN = 0.08;
const SPACING_SPREAD = 0.4;
// A button matches the placket's first within this (Delta E).
const BUTTON_MATCH = 15;

const dE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

// Running sums of a grid, so any box's total comes from four reads.
function integral(values, w, h) {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let row = 0;
    for (let x = 0; x < w; x += 1) {
      row += values[y * w + x];
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
    }
  }
  return (x0, y0, x1, y1) => {
    const a = Math.max(0, Math.min(w, x0));
    const b = Math.max(0, Math.min(h, y0));
    const c = Math.max(0, Math.min(w, x1));
    const d = Math.max(0, Math.min(h, y1));
    if (c <= a || d <= b) return 0;
    return sum[d * (w + 1) + c] - sum[b * (w + 1) + c] - sum[d * (w + 1) + a] + sum[b * (w + 1) + a];
  };
}

// Round, even spots that stand out on every side: [{ x, y, score, lab }],
// strongest first, none closer than 3 radii to a stronger one.
export function findSpots(lab, mask, w, h, r, area, fabric = []) {
  const channel = (k) => integral(Float64Array.from({ length: w * h }, (_, i) => (mask[i] ? lab[i * 3 + k] : 0)), w, h);
  const sums = [0, 1, 2].map(channel);
  const squares = integral(Float64Array.from({ length: w * h }, (_, i) => (mask[i] ? lab[i * 3] ** 2 : 0)), w, h);
  const count = integral(Float64Array.from(mask), w, h);
  const half = Math.max(1, Math.round(r * 0.6));
  const boxMean = (x, y, s) => {
    const n = count(x - s, y - s, x + s + 1, y + s + 1);
    if (n < (2 * s + 1) ** 2) return null; // the box leaves the item
    return sums.map((f) => f(x - s, y - s, x + s + 1, y + s + 1) / n);
  };
  const dirs = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
  const spots = [];
  const step = Math.max(1, Math.round(r / 3));
  for (let y = area.y0; y < area.y1; y += step) {
    for (let x = area.x0; x < area.x1; x += step) {
      const center = boxMean(x, y, half);
      if (!center) continue;
      const n = (2 * half + 1) ** 2;
      const spread = Math.sqrt(Math.max(0, squares(x - half, y - half, x + half + 1, y + half + 1) / n - center[0] ** 2));
      if (spread > SPOT_EVEN) continue;
      let score = Infinity;
      for (const [dx, dy] of dirs) {
        const ring = boxMean(Math.round(x + dx * r * 2), Math.round(y + dy * r * 2), half);
        if (!ring) {
          score = 0;
          break;
        }
        score = Math.min(score, dE(center, ring));
      }
      if (score >= SPOT_CONTRAST && fabric.every((f) => dE(center, f) >= FABRIC_APART)) spots.push({ x, y, score, lab: center });
    }
  }
  spots.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const s of spots) if (kept.every((k) => Math.hypot(k.x - s.x, k.y - s.y) > r * 3)) kept.push(s);
  return kept;
}

// The placket: the longest evenly spaced line of spots down the middle.
export function placketOf(spots, middle, widest, r) {
  const near = spots.filter((s) => Math.abs(s.x - middle(s.y)) <= widest * PLACKET_SPAN);
  let best = [];
  for (const a of near) {
    for (const b of near) {
      if (b.y <= a.y + r * 4) continue;
      const along = (s) => a.x + ((s.y - a.y) * (b.x - a.x)) / (b.y - a.y);
      const line = near.filter((s) => Math.abs(s.x - along(s)) <= r * 1.5 && dE(s.lab, a.lab) < BUTTON_MATCH);
      if (line.length > best.length) best = line;
    }
  }
  if (best.length < MIN_BUTTONS) return null;
  best.sort((p, q) => p.y - q.y);
  const gaps = best.slice(1).map((s, i) => s.y - best[i].y);
  // A gap of about twice the spacing is a button hidden by a fold; more
  // spread than that isn't a placket.
  const unit = Math.min(...gaps);
  const even = gaps.every((g) => Math.abs(g / unit - Math.round(g / unit)) <= SPACING_SPREAD);
  return even ? best : null;
}

export function readButtons(rgba, w, h, colors = {}) {
  const raw = Uint8ClampedArray.from(rgba);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i += 1) mask[i] = raw[i * 4 + 3] >= 128 ? 1 : 0;
  dropHanger(raw, mask, w, h, rowProfile(mask, w, h));
  const lit = evenLighting(raw, mask, w, h);
  const profile = rowProfile(mask, w, h);
  const H = profile.bottom - profile.top;
  if (H < 40) return { buttons: null, why: 'too small to read' };
  const lab = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i += 1) {
    if (!mask[i]) continue;
    const c = rgbToLab(lit[i * 4], lit[i * 4 + 1], lit[i * 4 + 2]);
    lab[i * 3] = c.l;
    lab[i * 3 + 1] = c.a;
    lab[i * 3 + 2] = c.b;
  }
  const middle = (y) => {
    const row = Math.min(profile.bottom, Math.max(profile.top, Math.round(y)));
    return (profile.left[row] + profile.right[row]) / 2;
  };
  const r = Math.max(3, Math.round(H * BUTTON));
  const fabric = [colors.base, colors.print, ...(colors.more ?? [])].filter(Boolean).map((hex) => {
    const c = hexToLab(hex);
    return [c.l, c.a, c.b];
  });
  const spots = findSpots(lab, mask, w, h, r, { x0: 0, y0: Math.round(profile.top + H * 0.08), x1: w, y1: Math.round(profile.bottom - H * 0.04) }, fabric);
  const placket = placketOf(spots, middle, profile.widest, r);
  if (!placket) return { buttons: null, why: `${spots.length} spots, no placket` };
  // The buttons' color, from the photo as taken, at the middle of each.
  const button = [0, 1, 2].map((k) => {
    const values = placket.map((s) => {
      const i = Math.round(s.y) * w + Math.round(s.x);
      const c = rgbToLab(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]);
      return [c.l, c.a, c.b][k];
    }).sort((a, b) => a - b);
    return values[values.length >> 1];
  });
  return { buttons: labToHex({ l: button[0], a: button[1], b: button[2] }), why: `${spots.length} spots, ${placket.length} buttons`, debug: { placket, spots, r } };
}

export async function readShirtButtons(cutout, colors) {
  const { rgba, w, h } = await pixelsOf(cutout, 960);
  return readButtons(rgba, w, h, colors);
}
