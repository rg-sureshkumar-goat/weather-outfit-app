// Reading an item's pattern from its cut-out (R44; plan.md C8b step 2), so
// the avatar can draw it in the app's 2D style: what kind of pattern it is,
// how big its repeat is, and which of its colors plays which part.
//
// readPattern(cutout, colors) -> reading       (needs a browser canvas)
// readPixels(rgba, w, h, colors) -> reading    (the same from pixels)
//   colors    the item's recognized colors (vision/colors.js sampleColors)
//   reading   {
//     kind:   'solid' | 'plaid' | 'check' | 'stripes' | 'other'
//     why:    what decided it, in a few words, for checking
//     along:  stripes only: 'down' (vertical stripes) or 'across'
//     repeat: patterns only: one repeat's length as a share of the item's
//             height, so the drawing keeps the item's own scale
//     roles:  patterns only: { ground, light, accent, extra: [] } as hex
//     sources: the recognized colors the roles came from (same shape), so a
//             color edit (R17) can follow into the pattern (followColorEdit)
//   }
//
// How:
// - Solid: nearly all of the item is close to its typical color (folds and
//   shadows aside).
// - Otherwise the app reads the lower body's left and right fronts, below
//   chest pockets and away from the placket and sleeves. Each is
//   straightened by the lean of its own stripe edges. A woven pattern can be
//   rebuilt from its fronts' column and row averages alone; a print (a
//   graphic, logo or floral) can't, so it's "other" and shows as its photo.
//   A woven pattern repeating with colors varying both ways is a plaid (3
//   or more colors) or a check (2); varying one way, stripes. A front is
//   often narrower than a repeat is wide, so a clear repeat down with colors
//   varying across counts as both ways, as most plaids repeat alike.
// - Roles come from the recognized colors (rolesOf), each then re-measured
//   from its clearest pixels (clearColors).
//
// The exact order of a plaid's stripes isn't read: on the Developer's
// hanging flannel it failed three ways (spec.md Revisions, 2026-10-12), so
// the art draws a standard pattern in these roles.

import { rgbToLab, hexToLab, labToHex } from '../recommend/color.js';
import { evenLighting, dropHanger, rowProfile, pixelsOf } from './pattern.js';

// The cut-out is read at up to this width, where thin stripes still have
// pixels of their own.
const READ_WIDTH = 960;
// A pixel this far from the item's typical color (Delta E) differs from it.
const FAR = 14;
// An item is solid when under this share of it differs (a label, buttons,
// deep folds), and its fronts' windows under WINDOW_SOLID.
const SOLID_SHARE = 0.08;
const WINDOW_SOLID = 0.1;
// The windows: rows from 62% to 90% of the item's height; columns from 5% to
// 34% of its widest row on each side of the middle.
const WINDOW_ROWS = [0.62, 0.9];
const WINDOW_COLS = [0.05, 0.34];
// Garments rarely hang more than this far off straight (degrees); edges
// are measured on lightness blurred over BLUR pixels each way, so the
// twill's fine diagonal grain doesn't count as a stripe edge.
const MAX_LEAN = 8;
const BLUR = 3;
// A repeat counts when a front matches itself shifted by it at least this
// well (1 = perfectly). Colors vary a way when its averages carry at least
// ENERGY_SHARE of the other way's color variation (plain stripes' other
// way barely varies).
const MATCH = 0.35;
const ENERGY_SHARE = 0.15;
const MIN_LAG = 6;
// Woven: rebuilding the fronts from their column and row averages leaves at
// most this share of their color variation unexplained.
const WOVEN = 0.5;
// A color within this Delta E of the line between two others, and no more
// colorful than they are, is only those two crossing.
const MIX_DISTANCE = 6;
// Colors at least this colorful (chroma) are measured by colorfulness.
const CHROMATIC = 14;

const dE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const labArr = (hex) => {
  const { l, a, b } = hexToLab(hex);
  return [l, a, b];
};
const hexOf = ([l, a, b]) => labToHex({ l, a, b });
const mean = (list) => {
  const s = [0, 0, 0];
  for (const p of list) for (let k = 0; k < 3; k += 1) s[k] += p[k];
  return s.map((v) => v / Math.max(1, list.length));
};

// ---- Windows and their straightening -----------------------------------------

// The two windows: the lower body's left and right fronts, each shrunk until
// it lies wholly inside the item.
export function frontWindows(mask, w, h, profile) {
  const { top, bottom, widest } = profile;
  const y0 = Math.round(top + (bottom - top) * WINDOW_ROWS[0]);
  const y1 = Math.round(top + (bottom - top) * WINDOW_ROWS[1]);
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    if (!Number.isNaN(profile.left[y])) {
      sum += (profile.left[y] + profile.right[y]) / 2;
      n += 1;
    }
  }
  const cx = n ? sum / n : w / 2;
  const inside = (win) => {
    for (let y = win.y0; y < win.y1; y += 2) for (let x = win.x0; x < win.x1; x += 2) if (!mask[y * w + x]) return false;
    return true;
  };
  return [-1, 1].map((s) => {
    const a = Math.round(cx + s * WINDOW_COLS[0] * widest);
    const b = Math.round(cx + s * WINDOW_COLS[1] * widest);
    const win = { x0: Math.max(0, Math.min(a, b)), x1: Math.min(w, Math.max(a, b)), y0, y1 };
    // Shrink from the outer side (the sleeve) and the bottom (the hem).
    for (let k = 0; k < 60 && win.x1 - win.x0 > 8 && win.y1 - win.y0 > 8 && !inside(win); k += 1) {
      if (s < 0) win.x0 += 3;
      else win.x1 -= 3;
      win.y1 -= 2;
    }
    return win;
  });
}

// A box blur of `r` pixels each way, across then down.
export function blurred(values, w, h, r) {
  const across = new Float32Array(values.length);
  const out = new Float32Array(values.length);
  const at = (arr, x, y) => arr[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y += 1) {
    let s = 0;
    for (let x = -r; x <= r; x += 1) s += at(values, x, y);
    for (let x = 0; x < w; x += 1) {
      across[y * w + x] = s / (2 * r + 1);
      s += at(values, x + r + 1, y) - at(values, x - r, y);
    }
  }
  for (let x = 0; x < w; x += 1) {
    let s = 0;
    for (let y = -r; y <= r; y += 1) s += at(across, x, y);
    for (let y = 0; y < h; y += 1) {
      out[y * w + x] = s / (2 * r + 1);
      s += at(across, x, y + r + 1) - at(across, x, y - r);
    }
  }
  return out;
}

// How a window's stripes lean: vertical ones by `down` degrees from straight
// down and horizontal ones by `across` from level, each the angle most of
// the edge strength agrees on (from lightness L, already blurred).
export function leanOf(L, w, win) {
  const bins = 4 * 2 * 20 + 1; // quarter degrees over ±20°
  const vertical = new Float64Array(bins);
  const horizontal = new Float64Array(bins);
  for (let y = win.y0 + 1; y < win.y1 - 1; y += 1) {
    for (let x = win.x0 + 1; x < win.x1 - 1; x += 1) {
      const i = y * w + x;
      const gx = L[i + 1 - w] + 2 * L[i + 1] + L[i + 1 + w] - L[i - 1 - w] - 2 * L[i - 1] - L[i - 1 + w];
      const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
      const m = gx * gx + gy * gy;
      if (m < 100) continue;
      const a = (((Math.atan2(gy, gx) * 180) / Math.PI) + 360) % 180; // 0–180°
      // A vertical stripe's edge has its gradient near 0° or 180°; a
      // horizontal stripe's near 90°.
      if (a < MAX_LEAN || a > 180 - MAX_LEAN) vertical[Math.round((-(a > 90 ? a - 180 : a) + 20) * 4)] += Math.sqrt(m);
      else if (Math.abs(a - 90) < MAX_LEAN) horizontal[Math.round((a - 90 + 20) * 4)] += Math.sqrt(m);
    }
  }
  const peak = (hist) => {
    let best = Math.round(20 * 4);
    let bestValue = -1;
    for (let i = 0; i < bins; i += 1) {
      let s = 0;
      for (let d = -3; d <= 3; d += 1) s += (hist[i + d] ?? 0) * (4 - Math.abs(d));
      if (s > bestValue) {
        bestValue = s;
        best = i;
      }
    }
    return best / 4 - 20;
  };
  return { down: peak(vertical), across: peak(horizontal) };
}

// The window resampled so its stripes run straight: each pixel (u, v) of the
// result reads the photo at a point sheared by the leans. Lab per pixel,
// with `ok` marking pixels inside the item.
export function straighten(lab, mask, w, h, win, { down, across }) {
  const sv = Math.tan((down * Math.PI) / 180);
  const sh = Math.tan((across * Math.PI) / 180);
  const ww = win.x1 - win.x0;
  const hh = win.y1 - win.y0;
  const mx = Math.ceil((Math.abs(sv) * hh) / 2) + 1;
  const my = Math.ceil((Math.abs(sh) * ww) / 2) + 1;
  const W = Math.max(1, ww - 2 * mx);
  const H = Math.max(1, hh - 2 * my);
  const cx = (win.x0 + win.x1) / 2;
  const cy = (win.y0 + win.y1) / 2;
  const out = new Float32Array(W * H * 3);
  const ok = new Uint8Array(W * H);
  for (let v = 0; v < H; v += 1) {
    for (let u = 0; u < W; u += 1) {
      const du = u - W / 2;
      const dv = v - H / 2;
      const x = cx + du + dv * sv;
      const y = cy + dv + du * sh;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      if (xi < 0 || yi < 0 || xi + 1 >= w || yi + 1 >= h) continue;
      const i = yi * w + xi;
      if (!(mask[i] && mask[i + 1] && mask[i + w] && mask[i + w + 1])) continue;
      const fx = x - xi;
      const fy = y - yi;
      for (let k = 0; k < 3; k += 1) {
        const top = lab[i * 3 + k] * (1 - fx) + lab[(i + 1) * 3 + k] * fx;
        const low = lab[(i + w) * 3 + k] * (1 - fx) + lab[(i + w + 1) * 3 + k] * fx;
        out[(v * W + u) * 3 + k] = top * (1 - fy) + low * fy;
      }
      ok[v * W + u] = 1;
    }
  }
  return { lab: out, ok, W, H };
}

// The average color of each column (axis 'x') or row ('y') of a
// straightened window; null where it has no pixels.
export function profileOf({ lab, ok, W, H }, axis) {
  const n = axis === 'x' ? W : H;
  const m = axis === 'x' ? H : W;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const s = [0, 0, 0];
    let k = 0;
    for (let j = 0; j < m; j += 1) {
      const p = axis === 'x' ? j * W + i : i * W + j;
      if (!ok[p]) continue;
      for (let c = 0; c < 3; c += 1) s[c] += lab[p * 3 + c];
      k += 1;
    }
    out.push(k ? s.map((v) => v / k) : null);
  }
  return out;
}

// ---- Repeats -----------------------------------------------------------------

// How well a profile matches itself shifted by each lag (1 = perfectly), up
// to 72% of its length, and how much its color varies (energy).
export function selfMatch(profile) {
  const pts = profile.filter(Boolean);
  const n = pts.length;
  if (n < 2 * MIN_LAG) return { ac: [], energy: 0, n };
  const avg = mean(pts);
  const v = pts.map((p) => p.map((x, k) => x - avg[k]));
  const energy = v.reduce((s, p) => s + p[0] ** 2 + p[1] ** 2 + p[2] ** 2, 0) / n;
  const ac = [];
  for (let lag = 0; lag < Math.floor(n * 0.72); lag += 1) {
    let s = 0;
    for (let i = 0; i + lag < n; i += 1) s += v[i][0] * v[i + lag][0] + v[i][1] * v[i + lag][1] + v[i][2] * v[i + lag][2];
    ac.push(s / (n - lag) / (energy || 1));
  }
  return { ac, energy, n };
}

// The repeat from one or more windows' self-matches (averaged over the lags
// they share): the strongest peak once the match near lag 0 has fallen
// away, or a shorter one nearly as strong that it's a multiple of, refined
// to a fraction of a pixel.
export function periodOf(curves) {
  const used = curves.filter((c) => c.ac.length && c.energy > 1e-6);
  if (!used.length) return { period: null, strength: 0, ac: [], energy: 0 };
  const len = Math.min(...used.map((c) => c.ac.length));
  const total = used.reduce((s, c) => s + c.n, 0);
  const ac = Array.from({ length: len }, (_, i) => used.reduce((s, c) => s + c.ac[i] * c.n, 0) / total);
  const energy = used.reduce((s, c) => s + c.energy * c.n, 0) / total;
  let lag = MIN_LAG;
  while (lag < len - 1 && ac[lag] > 0.2) lag += 1;
  const isPeak = (i) => ac[i] >= ac[i - 1] && ac[i] >= ac[i + 1];
  let best = -1;
  for (let i = lag; i < len - 1; i += 1) if (isPeak(i) && (best < 0 || ac[i] > ac[best] + 0.05)) best = i;
  if (best < 0) return { period: null, strength: 0, ac, energy };
  for (let i = lag; i < best; i += 1) {
    if (isPeak(i) && ac[i] > ac[best] * 0.85 && best % i < 3) {
      best = i;
      break;
    }
  }
  const [y0, y1, y2] = [ac[best - 1], ac[best], ac[best + 1]];
  const shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2)) || 0;
  return { period: best + Math.max(-0.5, Math.min(0.5, shift)), strength: y1, ac, energy };
}

// How much of a straightened front's color variation its column and row
// averages leave unexplained (0 = none): low for a weave, where each color
// comes from a stripe down crossing a stripe across; high for a print.
export function unexplained(front) {
  const cols = profileOf(front, 'x');
  const rows = profileOf(front, 'y');
  const { lab, ok, W, H } = front;
  const all = [];
  for (let p = 0; p < W * H; p += 1) if (ok[p]) all.push([lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2]]);
  const avg = mean(all);
  let rest = 0;
  let total = 0;
  for (let v = 0; v < H; v += 1) {
    for (let u = 0; u < W; u += 1) {
      const p = v * W + u;
      if (!ok[p] || !cols[u] || !rows[v]) continue;
      for (let k = 0; k < 3; k += 1) {
        const x = lab[p * 3 + k];
        rest += (x - (cols[u][k] + rows[v][k] - avg[k])) ** 2;
        total += (x - avg[k]) ** 2;
      }
    }
  }
  return total ? rest / total : 0;
}

// ---- Colors ------------------------------------------------------------------

// The colors' parts in a drawn pattern, from the recognized colors (most
// common first):
// - colors that are only two others crossing (white over navy reads gray)
//   are left out
// - ground: the most common color left
// - light: the one farthest from the ground in lightness (the bands)
// - accent: the most colorful one left (one stripe)
// - extra: any others (thin lines)
export function rolesOf(colors) {
  const list = [colors.base, colors.print, ...(colors.more ?? [])].filter(Boolean);
  const lab = list.map(labArr);
  const chroma = (c) => Math.hypot(c[1], c[2]);
  const isMix = (i) => lab.some((p, j) => lab.some((q, k) => {
    if (j === i || k === i || j >= k) return false;
    const c = lab[i];
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const t = ((c[0] - p[0]) * d[0] + (c[1] - p[1]) * d[1] + (c[2] - p[2]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1);
    if (t < 0.15 || t > 0.85) return false;
    return dE([p[0] + t * d[0], p[1] + t * d[1], p[2] + t * d[2]], c) < MIX_DISTANCE && chroma(c) <= Math.max(chroma(p), chroma(q)) + 2;
  }));
  const kept = list.map((hex, i) => ({ hex, lab: lab[i] })).filter((_, i) => !isMix(i));
  const [ground, ...rest] = kept;
  const light = [...rest].sort((a, b) => Math.abs(b.lab[0] - ground.lab[0]) - Math.abs(a.lab[0] - ground.lab[0]))[0] ?? null;
  const others = rest.filter((c) => c !== light);
  const accent = [...others].sort((a, b) => chroma(b.lab) - chroma(a.lab))[0] ?? null;
  return {
    ground: ground.hex,
    light: light?.hex ?? null,
    accent: accent?.hex ?? null,
    extra: others.filter((c) => c !== accent).map((c) => c.hex),
  };
}

// Each color re-measured from its clearest pixels. A recognized color is an
// average that pulls toward its neighbors where thin stripes and the weave
// blend them. Every pixel joins its nearest color; a pure yarn sits at an
// end of the item's color range, so within each color the pixels reaching
// furthest from the item's average toward it are the clearest (for a
// colorful color, the most colorful). Those between the 70th and 95th
// percentile are averaged, past the deepest shadows and glare. A colorful
// color in a thin stripe (in `thin`) is nearly always blended, so it comes
// from its most colorful 2%.
//   pixels   Lab colors of the item's pixels
//   colors   the item's recognized colors (hex), mixes included, so blended
//            pixels join their own color rather than a pure one
// Returns { [hex]: clearer hex }.
export function clearColors(pixels, colors, thin = []) {
  const labs = colors.map(labArr);
  const avg = mean(pixels);
  const groups = colors.map(() => []);
  for (const p of pixels) {
    let k = 0;
    for (let j = 1; j < labs.length; j += 1) if (dE(p, labs[j]) < dE(p, labs[k])) k = j;
    groups[k].push(p);
  }
  const out = {};
  colors.forEach((hex, k) => {
    const dir = labs[k].map((v, j) => v - avg[j]);
    const len = Math.hypot(...dir) || 1;
    const colorful = Math.hypot(labs[k][1], labs[k][2]) >= CHROMATIC;
    const score = (p) => (colorful ? Math.hypot(p[1], p[2]) : ((p[0] - avg[0]) * dir[0] + (p[1] - avg[1]) * dir[1] + (p[2] - avg[2]) * dir[2]) / len);
    const sorted = groups[k].map((p) => ({ p, s: score(p) })).sort((a, b) => a.s - b.s);
    const [from, to] = colorful && thin.includes(hex) ? [0.98, 0.999] : [0.7, 0.95];
    const lo = Math.floor(sorted.length * from);
    const part = sorted.slice(lo, Math.max(lo + 1, Math.floor(sorted.length * to)));
    out[hex] = part.length ? hexOf(mean(part.map((x) => x.p))) : hex;
  });
  return out;
}

// ---- The reading -----------------------------------------------------------------

export function readPixels(rgba, w, h, colors) {
  const raw = Uint8ClampedArray.from(rgba);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i += 1) mask[i] = raw[i * 4 + 3] >= 128 ? 1 : 0;
  dropHanger(raw, mask, w, h, rowProfile(mask, w, h));
  const lit = evenLighting(raw, mask, w, h);
  const profile = rowProfile(mask, w, h);

  // Lab of the evened photo, for its structure; and of every other pixel as
  // taken, for its colors and how much of it differs.
  const lab = new Float32Array(w * h * 3);
  const L = new Float32Array(w * h);
  const pixels = [];
  const itemLab = [];
  for (let i = 0; i < w * h; i += 1) {
    if (!mask[i]) continue;
    const e = rgbToLab(lit[i * 4], lit[i * 4 + 1], lit[i * 4 + 2]);
    lab[i * 3] = e.l;
    lab[i * 3 + 1] = e.a;
    lab[i * 3 + 2] = e.b;
    L[i] = e.l;
    if (i % 2) continue;
    itemLab.push([e.l, e.a, e.b]);
    const r = rgbToLab(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]);
    pixels.push([r.l, r.a, r.b]);
  }
  if (!pixels.length) return { kind: 'other', why: 'no item pixels' };

  // How much of the item, and of its fronts, differs from its typical color.
  // The typical color: the middle value of each channel (number arrays sort
  // fast).
  const typical = [0, 1, 2].map((k) => Float32Array.from(itemLab, (p) => p[k]).sort()[itemLab.length >> 1]);
  const differs = (list) => list.filter((p) => dE(p, typical) > FAR).length / Math.max(1, list.length);
  const wins = frontWindows(mask, w, h, profile);
  const soft = blurred(L, w, h, BLUR);
  const fronts = wins.map((win) => straighten(lab, mask, w, h, win, leanOf(soft, w, win)));
  const frontPixels = fronts.flatMap((f) => Array.from({ length: f.W * f.H }, (_, p) => (f.ok[p] ? [f.lab[p * 3], f.lab[p * 3 + 1], f.lab[p * 3 + 2]] : null)).filter(Boolean));
  const itemShare = differs(itemLab);
  const frontShare = differs(frontPixels);
  if (itemShare < SOLID_SHARE && frontShare < WINDOW_SOLID) {
    return { kind: 'solid', why: `${Math.round(itemShare * 100)}% of the item differs from its main color` };
  }

  // Repeats across (from the columns) and down (from the rows), from both
  // fronts together, and whether the colors vary each way.
  const across = periodOf(fronts.map((f) => selfMatch(profileOf(f, 'x'))));
  const down = periodOf(fronts.map((f) => selfMatch(profileOf(f, 'y'))));
  const strong = (per) => per.period !== null && per.strength >= MATCH;
  const variesAcross = across.energy >= down.energy * ENERGY_SHARE;
  const variesDown = down.energy >= across.energy * ENERGY_SHARE;
  const repeats = (strong(across) && variesAcross) || (strong(down) && variesDown);
  const rest = fronts.reduce((s, f) => s + unexplained(f), 0) / fronts.length;
  const why = `repeat ${strong(across) ? across.period.toFixed(1) : '-'} px across (match ${across.strength.toFixed(2)}), ${strong(down) ? down.period.toFixed(1) : '-'} px down (${down.strength.toFixed(2)}); ${Math.round(rest * 100)}% unexplained by stripes`;
  if (!repeats) return { kind: 'other', why: `no repeat: ${why}` };
  if (rest > WOVEN) return { kind: 'other', why: `not woven: ${why}` };

  const roles = rolesOf(colors);
  const listed = [roles.ground, roles.light, roles.accent, ...roles.extra].filter(Boolean);
  const all = [colors.base, colors.print, ...(colors.more ?? [])].filter(Boolean);
  const clear = clearColors(pixels, all, [roles.accent, ...roles.extra].filter(Boolean));
  const clearRoles = { ground: clear[roles.ground], light: roles.light && clear[roles.light], accent: roles.accent && clear[roles.accent], extra: roles.extra.map((c) => clear[c]) };
  // The repeat's size from the way it matched best (a garment's drape
  // squeezes the other way more).
  const height = Math.max(1, profile.bottom - profile.top);
  const best = [across, down].filter(strong).sort((a, b) => b.strength - a.strength)[0];
  const base = { why, repeat: best.period / height, roles: clearRoles, sources: roles };
  if (variesAcross && variesDown) return { ...base, kind: listed.length >= 3 ? 'plaid' : 'check' };
  // Stripes whose colors vary across the item run down it.
  return { ...base, kind: 'stripes', along: variesAcross ? 'down' : 'across' };
}

// A color edit (R17) carried into a drawn pattern: every role that came
// from color `from` takes color `to`; a removed color (`to` null) leaves the
// roles it played, except the ground, which stays.
export function followColorEdit(pattern, from, to) {
  if (!pattern?.roles || !pattern.sources || !from) return pattern;
  const roles = { ...pattern.roles, extra: [...(pattern.roles.extra ?? [])] };
  const sources = { ...pattern.sources, extra: [...(pattern.sources.extra ?? [])] };
  for (const key of ['ground', 'light', 'accent']) {
    if (sources[key] !== from) continue;
    if (to || key === 'ground') {
      roles[key] = to ?? roles[key];
      sources[key] = to ?? sources[key];
    } else {
      roles[key] = null;
      sources[key] = null;
    }
  }
  const kept = sources.extra.map((s, i) => [s, roles.extra[i]]).filter(([s]) => s !== from || to);
  return {
    ...pattern,
    roles: { ...roles, extra: kept.map(([s, r]) => (s === from ? to : r)) },
    sources: { ...sources, extra: kept.map(([s]) => (s === from ? to : s)) },
  };
}

export async function readPattern(cutout, colors) {
  const { rgba, w, h } = await pixelsOf(cutout, READ_WIDTH);
  return readPixels(rgba, w, h, colors);
}
