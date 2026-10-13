// Drawn patterns (R44; plan.md C8b step 3): an item's plaid, check or stripes
// in the app's 2D style, from its reading (vision/reading.js). The exact
// stripes of a real plaid can't be read reliably, so each kind is a standard
// layout in the item's own colors at its own repeat size, approved in the
// art round (2026-10-12):
// - plaid: the Developer's flannel's proportions, a ground block and a band
//   group of light bands, thin ground lines, one accent stripe and, with a
//   fourth color, one extra line
// - check: ground and light, half and half
// - stripes: a ground, a light band and an accent line, running down or
//   across
// Where two colors cross, a twill of the two shows (fine diagonal ribs, which
// read as their mix); a faint rib covers the rest, and a light brushed fuzz
// covers the whole fabric.
//
// weaveDefs(pattern, pieces, box) -> SVG <defs> for one garment
//   pattern  { kind, along, repeat, roles } (vision/reading.js)
//   pieces   [{ ids: [patternId, fuzzId], parts }] from draw.js withLook()
//   box      the whole garment's box, { x, y, w, h }
// iconWeave(pattern, size) -> { defs, fill } for a small icon (the rack)
// showAs(item, photo) -> 'weave' | 'photo' | null

import { uid } from './draw.js';

// The plaid's band group, in the flannel's measured widths (130 units a
// repeat, the first 60 a ground block). E becomes L without a fourth color.
const PLAID_GROUP = [['L', 11], ['G', 8], ['E', 4], ['G', 3], ['L', 24], ['A', 12], ['G', 3], ['L', 5]];
const PLAID_BLOCK = 60;
// Where the placket falls in the plaid (40 units into a ground block), and
// where the chest pockets' line falls (the middle of the accent stripe), as
// on the flannel.
const PLAID_PLACKET = 40;
const PLAID_CHEST = PLAID_BLOCK + 11 + 8 + 4 + 3 + 24 + 6;
// The chest line's height on a garment, as a share of its box.
const CHEST_LINE = 0.28;
// The twill's rib spacing, in avatar units.
const TWILL = 1.3;
// A piece this many times longer than wide, and turned more than
// TURN_DEGREES from upright, has its pattern turned along it (a sleeve, a
// leg).
const LONG = 2;
const TURN_DEGREES = 3;

const total = (stripes) => stripes.reduce((s, [, w]) => s + w, 0);

// How an item with a cut-out shows (R44): 'weave', drawn in its plaid, check
// or stripes; 'photo', its photo (vision/pattern.js photoLook(), when made);
// or null, drawn in its base and print. The User's choice (item.show)
// decides; an item saved before there was a choice shows its photo.
const WOVEN = new Set(['plaid', 'check', 'stripes']);
export function showAs(item, photo) {
  if (item.show === 'drawn') return WOVEN.has(item.pattern?.kind) ? 'weave' : null;
  return photo ? 'photo' : null;
}

// The standard layout for a reading: yarn colors by letter, warp stripes
// (left to right) and weft stripes (top to bottom), and where the placket
// and the chest line fall in them (shares of each repeat).
export function settOf({ kind, along, roles }) {
  const yarns = {
    G: roles.ground,
    L: roles.light ?? roles.ground,
    A: roles.accent ?? roles.light ?? roles.ground,
    E: roles.extra?.[0] ?? roles.light ?? roles.ground,
  };
  if (kind === 'check') {
    const half = [['G', 50], ['L', 50]];
    return { yarns, warp: half, weft: half, placketAt: 0.25, chestAt: 0.75 };
  }
  if (kind === 'stripes') {
    const stripes = [['G', 62], ['L', 22], ['G', 6], ['A', 10]];
    const plain = [['G', 100]];
    return along === 'across'
      ? { yarns, warp: plain, weft: stripes, placketAt: 0, chestAt: 0.5 }
      : { yarns, warp: stripes, weft: plain, placketAt: 0.3, chestAt: 0 };
  }
  const group = roles.extra?.length ? PLAID_GROUP : PLAID_GROUP.map(([c, w]) => [c === 'E' ? 'L' : c, w]);
  return {
    yarns,
    warp: [['G', PLAID_BLOCK], ...[...group].reverse()],
    weft: [['G', PLAID_BLOCK], ...group],
    placketAt: PLAID_PLACKET / (PLAID_BLOCK + total(group)),
    chestAt: PLAID_CHEST / (PLAID_BLOCK + total(group)),
  };
}

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mixOf = (a, b) => hexOf(rgbOf(a).map((v, i) => (v + rgbOf(b)[i]) / 2));

// One repeat of the pattern as an SVG <pattern> (in its own units, one per
// stripe width), with the twills it uses. `scale` is avatar units per
// pattern unit; `transform` places and turns it.
function tile(id, sett, scale, transform) {
  const { yarns, warp, weft } = sett;
  const period = TWILL / scale;
  const twills = new Map();
  const twillOf = (a, b) => {
    const key = [a, b].sort().join('');
    if (!twills.has(key)) twills.set(key, `${id}-${key}`);
    return twills.get(key);
  };
  let rects = '';
  let x = 0;
  for (const [down, width] of warp) {
    let y = 0;
    for (const [across, height] of weft) {
      const same = down === across || yarns[down] === yarns[across];
      rects += `<rect x="${x}" y="${y}" width="${width + 0.05}" height="${height + 0.05}" fill="${same ? yarns[down] : `url(#${twillOf(down, across)})`}"/>`;
      y += height;
    }
    x += width;
  }
  const ribs = [...twills].map(([key, tid]) => {
    const [a, b] = key.split('');
    return `<pattern id="${tid}" patternUnits="userSpaceOnUse" width="${period}" height="${period}" patternTransform="rotate(-45)">`
      + `<rect width="${period}" height="${period}" fill="${mixOf(yarns[a], yarns[b])}"/>`
      + `<rect width="${period * 0.42}" height="${period}" fill="${yarns[a]}" opacity="0.32"/>`
      + `<rect x="${period * 0.5}" width="${period * 0.42}" height="${period}" fill="${yarns[b]}" opacity="0.32"/></pattern>`;
  }).join('');
  const rib = `<pattern id="${id}-rib" patternUnits="userSpaceOnUse" width="${period}" height="${period}" patternTransform="rotate(-45)"><rect width="${period * 0.35}" height="${period}" fill="#000" opacity="0.05"/></pattern>`;
  const w = total(warp);
  const h = total(weft);
  return `${ribs}${rib}<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}" patternTransform="${transform}">${rects}<rect width="${w}" height="${h}" fill="url(#${id}-rib)"/></pattern>`;
}

// The brushed fuzz: short light and dark fibers, mostly along the weave, at
// low opacity, in a 24-unit square. Drawn once from a fixed seed, so every
// avatar shows the same fabric.
const FUZZ_SIZE = 24;
const FUZZ = (() => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let out = '';
  for (let i = 0; i < 90; i += 1) {
    const x = random() * FUZZ_SIZE;
    const y = random() * FUZZ_SIZE;
    const v = random();
    const turn = (random() - 0.5) * 50 + (random() > 0.5 ? 0 : 90);
    const len = 0.4 + random() * 0.9;
    const a = (turn * Math.PI) / 180;
    out += `<path d="M${x.toFixed(2)} ${y.toFixed(2)}l${(Math.cos(a) * len).toFixed(2)} ${(Math.sin(a) * len).toFixed(2)}" stroke="${v > 0.5 ? '#fff' : '#000'}" stroke-width="0.35" stroke-linecap="round" opacity="${(Math.abs(v - 0.5) * 0.5).toFixed(2)}"/>`;
  }
  return out;
})();
const fuzz = (id) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${FUZZ_SIZE}" height="${FUZZ_SIZE}">${FUZZ}</pattern>`;

// The points a path passes through or bends toward.
function pointsOf(d) {
  const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}

// A piece's long axis: its middle, the direction it runs (degrees from
// straight down), how much longer than wide it is, and its top end.
export function axisOf(parts) {
  const pts = parts.flatMap(pointsOf);
  if (pts.length < 3) return null;
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const [x, y] of pts) {
    xx += (x - mx) ** 2;
    yy += (y - my) ** 2;
    xy += (x - mx) * (y - my);
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy); // of the long axis, from the x axis
  const spread = (t) => pts.reduce((s, [x, y]) => s + ((x - mx) * Math.cos(t) + (y - my) * Math.sin(t)) ** 2, 0);
  const long = Math.sqrt(spread(angle) / Math.max(1e-6, spread(angle + Math.PI / 2)));
  let dir = [Math.cos(angle), Math.sin(angle)];
  if (dir[1] < 0) dir = [-dir[0], -dir[1]]; // pointing down the piece
  const reach = Math.min(...pts.map(([x, y]) => (x - mx) * dir[0] + (y - my) * dir[1]));
  return {
    middle: [mx, my],
    turn: (Math.atan2(dir[0], dir[1]) * -180) / Math.PI,
    long,
    top: [mx + dir[0] * reach, my + dir[1] * reach],
  };
}

export function weaveDefs(pattern, pieces, box) {
  const sett = settOf(pattern);
  const across = total(sett.warp);
  const down = total(sett.weft);
  // One repeat is `repeat` of the garment's height, as in the photo.
  const scale = (pattern.repeat * box.h) / Math.max(across, down);
  const ox = box.x + box.w / 2 - sett.placketAt * across * scale;
  const oy = box.y + CHEST_LINE * box.h - sett.chestAt * down * scale;
  let defs = '';
  const fuzzIds = new Set();
  for (const { ids: [id, fuzzId], parts } of pieces) {
    const axis = axisOf(parts);
    const turned = axis && axis.long >= LONG && Math.abs(axis.turn) > TURN_DEGREES;
    // Upright pieces share the garment's placement, so the pattern meets
    // across them; a sleeve or leg starts its own at its top end.
    const transform = turned
      ? `translate(${axis.top[0].toFixed(2)} ${axis.top[1].toFixed(2)}) rotate(${axis.turn.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${(-across * 0.3).toFixed(2)} 0)`
      : `translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${scale.toFixed(4)})`;
    defs += tile(id, sett, scale, transform);
    if (fuzzId && !fuzzIds.has(fuzzId)) {
      fuzzIds.add(fuzzId);
      defs += fuzz(fuzzId);
    }
  }
  return `<defs>${defs}</defs>`;
}

// The pattern on a small icon `size` units tall (the Closet's rack).
export function iconWeave(pattern, size) {
  const sett = settOf(pattern);
  const id = uid('icon-weave');
  const scale = (pattern.repeat * size) / Math.max(total(sett.warp), total(sett.weft));
  return { defs: `<defs>${tile(id, sett, scale, `scale(${scale.toFixed(4)})`)}</defs>`, fill: `url(#${id})` };
}
