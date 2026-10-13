// C8b step 2: reading an item's pattern for the drawn look (R44). Generated
// garments, with a slight lean and some noise like a photo's: a solid, a
// plaid, a check, stripes both ways and a chest graphic; then the colors'
// parts and their clearer versions. The Developer's flannel and green shirt
// are checked in the browser.

import { describe, expect, it } from 'vitest';
import { readPixels, rolesOf, clearColors, selfMatch, periodOf, followColorEdit } from '../src/vision/reading.js';
import { colorDistance, hexToLab } from '../src/recommend/color.js';
import { seededRng } from './helpers.js';

const W = 320;
const H = 420;
const NAVY = '#1c2b45';
const WHITE = '#e9e8de';
const SKY = '#2c78a7';
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Two yarns crossing in a weave read as their average.
const mix = (a, b) => rgb(a).map((v, i) => (v + rgb(b)[i]) / 2);

// A garment-shaped item (a body with a narrow collar band on top) on a clear
// background. paint(u, v) gives the color at fabric position (u, v), which
// leans 2° like a hanging shirt; every pixel gets a little noise.
function garment(paint, seed = 1) {
  const random = seededRng(seed);
  const out = new Uint8ClampedArray(W * H * 4);
  const lean = (2 * Math.PI) / 180;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const inside = y >= 30 ? x >= 30 && x < W - 30 : y >= 10 && x >= 120 && x < W - 120;
      if (!inside) continue;
      const u = x * Math.cos(lean) + y * Math.sin(lean);
      const v = y * Math.cos(lean) - x * Math.sin(lean);
      const c = paint(u, v);
      const n = (random() - 0.5) * 10;
      out.set([c[0] + n, c[1] + n, c[2] + n, 255], (y * W + x) * 4);
    }
  }
  return out;
}

// Stripes along one axis, from [color, width] pairs, repeating.
const stripeAt = (sett, pos) => {
  const size = sett.reduce((s, [, w]) => s + w, 0);
  let p = ((pos % size) + size) % size;
  for (const [c, w] of sett) {
    if (p < w) return c;
    p -= w;
  }
  return sett[0][0];
};
const woven = (warp, weft) => (u, v) => {
  const a = stripeAt(warp, u);
  const b = stripeAt(weft, v);
  return a === b ? rgb(a) : mix(a, b);
};
// The flannel's own proportions, at a 52 px repeat.
const PLAID = [[NAVY, 24], [WHITE, 4], [NAVY, 3], [WHITE, 2], [NAVY, 1], [WHITE, 9], [SKY, 5], [NAVY, 1], [WHITE, 3]];
const flannelColors = { base: '#68727b', print: '#253241', more: ['#d8d9d6', '#2d4d63'] };

describe('what kind of pattern an item has (R44)', () => {
  it('a plain item, folds and noise aside, is solid', () => {
    const r = readPixels(garment(() => rgb('#65694a')), W, H, { base: '#65694a', print: null, more: [] });
    expect(r.kind).toBe('solid');
  });

  it('a plaid repeating both ways in three colors is a plaid, at its own repeat size', () => {
    const r = readPixels(garment(woven(PLAID, PLAID)), W, H, flannelColors);
    expect(r.kind).toBe('plaid');
    // 52 px of a 400 px tall item (the collar band counts toward its height).
    expect(r.repeat).toBeGreaterThan((52 / 400) * 0.92);
    expect(r.repeat).toBeLessThan((52 / 400) * 1.08);
  });

  it('two colors repeating both ways are a check', () => {
    const r = readPixels(garment(woven([['#a3232b', 20], ['#1c1b1f', 20]], [['#a3232b', 20], ['#1c1b1f', 20]])), W, H, { base: '#a3232b', print: '#1c1b1f', more: ['#5f1f25'] });
    expect(r.kind).toBe('check');
  });

  it('stripes repeating one way are stripes, running down or across', () => {
    const sett = [[WHITE, 18], ['#22345a', 8], [WHITE, 3], ['#b8322c', 3]];
    const colors = { base: WHITE, print: '#22345a', more: ['#b8322c'] };
    const down = readPixels(garment((u) => rgb(stripeAt(sett, u))), W, H, colors);
    expect(down.kind).toBe('stripes');
    expect(down.along).toBe('down');
    const across = readPixels(garment((u, v) => rgb(stripeAt(sett, v))), W, H, colors);
    expect(across.kind).toBe('stripes');
    expect(across.along).toBe('across');
  });

  it('a plain shirt with a big chest graphic is "other", so it shows as its photo', () => {
    const r = readPixels(garment((u, v) => (Math.hypot(u - 160, v - 140) < 75 ? rgb('#f2c230') : rgb(NAVY))), W, H, { base: NAVY, print: '#f2c230', more: [] });
    expect(r.kind).toBe('other');
  });

  it('a repeating print that isn\'t woven (polka dots) is "other" too', () => {
    const dots = (u, v) => (Math.hypot(((u % 40) + 40) % 40 - 20, ((v % 40) + 40) % 40 - 20) < 9 ? rgb(WHITE) : rgb('#b8322c'));
    const r = readPixels(garment(dots), W, H, { base: '#b8322c', print: WHITE, more: [] });
    expect(r.kind).toBe('other');
    expect(r.why).toMatch(/not woven/);
  });
});

describe('the repeat (R44)', () => {
  it('is found where a profile best matches itself', () => {
    const profile = Array.from({ length: 200 }, (_, i) => (i % 40 < 10 ? [80, 0, 0] : [20, 0, -10]));
    expect(periodOf([selfMatch(profile)]).period).toBeCloseTo(40, 0);
    // A plain profile has none.
    expect(periodOf([selfMatch(Array.from({ length: 200 }, () => [50, 0, 0]))]).period).toBeNull();
  });
});

describe('the colors\' parts (R44)', () => {
  it('the flannel: navy ground, white bands, sky-blue accent; the gray of white crossing navy is left out', () => {
    expect(rolesOf(flannelColors)).toEqual({ ground: '#253241', light: '#d8d9d6', accent: '#2d4d63', extra: [] });
  });

  it('a fourth color becomes a thin extra line', () => {
    const r = rolesOf({ base: '#1f4a38', print: '#d8b23a', more: ['#1d2840', '#a3242c'] });
    expect(r.ground).toBe('#1f4a38');
    expect(r.light).toBe('#d8b23a');
    expect(r.accent).toBe('#a3242c');
    expect(r.extra).toEqual(['#1d2840']);
  });

  it('a thin accent is taken from its clearest pixels, not its blended average', () => {
    const lab = (h) => {
      const { l, a, b } = hexToLab(h);
      return [l, a, b];
    };
    const blend = (a, b) => `#${mix(a, b).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    // Mostly navy, with sky blue seen mostly where it crosses navy.
    const pixels = [
      ...Array(700).fill(lab(NAVY)),
      ...Array(200).fill(lab(blend(SKY, NAVY))),
      ...Array(20).fill(lab(SKY)),
      ...Array(80).fill(lab(WHITE)),
    ];
    const found = blend(blend(SKY, NAVY), SKY); // what an average reports
    const clear = clearColors(pixels, [NAVY, WHITE, found], [found]);
    expect(colorDistance(clear[found], SKY)).toBeLessThan(colorDistance(found, SKY));
    expect(colorDistance(clear[found], SKY)).toBeLessThan(3);
  });
});

describe('color edits carry into a drawn pattern (R17, R44)', () => {
  const reading = {
    kind: 'plaid',
    repeat: 0.11,
    roles: { ground: '#172535', light: '#e9eae4', accent: '#285977', extra: ['#a3242c'] },
    sources: { ground: '#253241', light: '#d8d9d6', accent: '#2d4d63', extra: ['#a0222b'] },
  };

  it('changing the white to yellow turns the bands yellow; the other parts stay', () => {
    const yellow = followColorEdit(reading, '#d8d9d6', '#f2c230');
    expect(yellow.roles).toEqual({ ...reading.roles, light: '#f2c230' });
    expect(yellow.sources.light).toBe('#f2c230');
    // A second edit of the same color follows on.
    expect(followColorEdit(yellow, '#f2c230', '#ffffff').roles.light).toBe('#ffffff');
  });

  it('a removed color leaves its part, except the ground, which stays', () => {
    expect(followColorEdit(reading, '#2d4d63', null).roles.accent).toBeNull();
    expect(followColorEdit(reading, '#a0222b', null).roles.extra).toEqual([]);
    expect(followColorEdit(reading, '#253241', null).roles.ground).toBe('#172535');
    // A color the pattern doesn't use changes nothing.
    expect(followColorEdit(reading, '#123456', '#654321')).toEqual(reading);
  });
});
