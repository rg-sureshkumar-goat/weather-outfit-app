// C8b: the item as photographed on the avatar (R44). The outline read row by
// row, the fit covering the whole drawing, holes and hangers, even lighting,
// on small drawn images; then how the avatar wears a photo look. The photos
// themselves are checked in the browser and on the phone.

import { describe, expect, it } from 'vitest';
import { findPatch, rowProfile, sleeveEnd, fitPhoto, fillPhoto, dropHanger, evenLighting, patternMode } from '../src/vision/pattern.js';
import { renderAvatar } from '../src/art/avatar.js';
import { bodyFor } from '../src/art/bodies.js';
import { collarWing } from '../src/art/fit.js';
import { defaultAvatar, lookOf } from '../src/store/avatar.js';

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// RGBA w × h from (x, y) -> '#rrggbb' or null (clear).
const image = (w, h, paint) => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const c = paint(x, y);
    if (c) out.set([...rgb(c), 255], (y * w + x) * 4);
  }
  return out;
};
const maskOf = (rgba) => Uint8Array.from({ length: rgba.length / 4 }, (_, i) => (rgba[i * 4 + 3] >= 128 ? 1 : 0));
const lightness = (rgba, i) => 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];

const NAVY = '#253241';
const RED = '#c0392b';
const BLUE = '#2e5fa8';

describe('reading the photo\'s outline (R44)', () => {
  // A shirt mask: a thin hanger hook (rows 0–4), then the shirt (rows 5–59).
  const W = 40;
  const H = 60;
  const shirt = (x, y) => (y < 5 ? x >= 19 && x < 21 : x >= 4 && x < 36);

  it('a thin hook above the garment isn\'t its top; short sleeves are found where the outline narrows', () => {
    const profile = rowProfile(Uint8Array.from({ length: W * H }, (_, i) => (shirt(i % W, Math.floor(i / W)) ? 1 : 0)), W, H);
    expect(profile.top).toBe(5);
    expect(profile.bottom).toBe(59);
    const tee = rowProfile(Uint8Array.from({ length: W * H }, (_, i) => {
      const x = i % W;
      const y = Math.floor(i / W);
      return (y < 20 ? x >= 0 && x < 40 : x >= 10 && x < 30) ? 1 : 0;
    }), W, H);
    expect(sleeveEnd(tee)).toBeGreaterThan(14);
    expect(sleeveEnd(tee)).toBeLessThan(26);
    expect(sleeveEnd(rowProfile(new Uint8Array(W * H).fill(1), W, H))).toBeNull();
  });

  it('the repeated square lies wholly inside the item', () => {
    // A T shape: sleeves across the top, a body below.
    const t = Uint8Array.from({ length: 60 * 60 }, (_, i) => {
      const x = i % 60;
      const y = Math.floor(i / 60);
      return y < 15 || (x >= 15 && x < 45) ? 1 : 0;
    });
    const p = findPatch(t, 60, 60);
    for (let y = p.y; y < p.y + p.h; y += 1) for (let x = p.x; x < p.x + p.w; x += 1) expect(t[y * 60 + x]).toBe(1);
  });

  it('a hanger in a color unlike the shirt is taken out; a flat-laid collar in the shirt\'s color stays', () => {
    const hung = image(W, H, (x, y) => {
      if (y < 5) return x >= 19 && x < 21 ? '#f0f0f0' : null; // hook
      if (y < 9 && x >= 17 && x < 23) return '#f0f0f0'; // hanger inside the collar
      return x >= 4 && x < 36 ? NAVY : null;
    });
    const mask = maskOf(hung);
    expect(dropHanger(hung, mask, W, H, rowProfile(mask, W, H))).toBeGreaterThan(10);
    expect(mask[7 * W + 20]).toBe(0);
    expect(mask[30 * W + 20]).toBe(1);
    const flat = image(W, H, (x, y) => (y < 5 ? (x >= 18 && x < 22 ? NAVY : null) : x >= 4 && x < 36 ? NAVY : null));
    const flatMask = maskOf(flat);
    expect(dropHanger(flat, flatMask, W, H, rowProfile(flatMask, W, H))).toBe(0);
  });
});

describe('fitting the photo to the drawing (R44)', () => {
  const W = 40;
  const H = 60;

  it('every clear pixel takes the color of the nearest pixel of the item', () => {
    const rgba = image(5, 1, (x) => [RED, null, null, null, BLUE][x]);
    const filled = fillPhoto(rgba, maskOf(rgba), 5, 1);
    expect([...filled.slice(4, 8)]).toEqual([...rgb(RED), 255]);
    expect([...filled.slice(12, 16)]).toEqual([...rgb(BLUE), 255]);
  });

  it('every pixel of the drawing gets a color, even where the photo has a hole, and left stays left', () => {
    // The photo: red on the left, blue on the right, a hole in the middle,
    // a hook above.
    const photo = image(W, H, (x, y) => {
      if (y < 5) return x >= 19 && x < 21 ? RED : null;
      if (x < 4 || x >= 36) return null;
      if (x >= 16 && x < 24 && y > 20 && y < 30) return null;
      return x < 20 ? RED : BLUE;
    });
    const mask = maskOf(photo);
    const src = { rgba: fillPhoto(photo, mask, W, H), w: W, h: H, profile: rowProfile(mask, W, H) };
    // The drawing: a wider, shorter shape with collar points above.
    const dw = 50;
    const dh = 40;
    const dmask = Uint8Array.from({ length: dw * dh }, (_, i) => {
      const x = i % dw;
      const y = Math.floor(i / dw);
      return (y < 4 ? (x >= 18 && x < 22) || (x >= 28 && x < 32) : x >= 2 && x < 48) ? 1 : 0;
    });
    const fitted = fitPhoto(src, { mask: dmask, w: dw, h: dh, profile: rowProfile(dmask, dw, dh) });
    for (let i = 0; i < dmask.length; i += 1) expect(fitted[i * 4 + 3]).toBe(dmask[i] ? 255 : 0);
    const at = (x, y) => [...fitted.slice((y * dw + x) * 4, (y * dw + x) * 4 + 3)];
    expect(at(5, 20)).toEqual(rgb(RED));
    expect(at(44, 20)).toEqual(rgb(BLUE));
  });

  it('even lighting narrows a light-to-dark wash across the item, and keeps its color', () => {
    const w = 80;
    const h = 20;
    // One blue, lit from the left: twice as bright there as on the right.
    const rgba = image(w, h, (x) => {
      const f = 1 - (x / (w - 1)) * 0.5;
      return `#${[40, 90, 170].map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
    });
    const out = evenLighting(rgba, maskOf(rgba), w, h);
    const row = 10 * w;
    const before = lightness(rgba, row) - lightness(rgba, row + w - 1);
    const after = lightness(out, row) - lightness(out, row + w - 1);
    expect(after).toBeLessThan(before * 0.75);
    // Brightness changes, not color: blue stays the strongest channel.
    expect(out[(row + 5) * 4 + 2]).toBeGreaterThan(out[(row + 5) * 4]);
  });
});

describe('the avatar wears the item as photographed (R44)', () => {
  const look = lookOf(defaultAvatar('man'));
  const fake = () => {
    const calls = [];
    return {
      calls,
      width: 100,
      height: 120,
      patchBox: { x: 30, y: 60, w: 30, h: 30 },
      patch: 'data:image/png;base64,PATCH',
      fit: (garment) => {
        calls.push(garment);
        return 'data:image/png;base64,FIT';
      },
    };
  };
  const shirt = { id: 'mine', type: 'longSleeveShirt', colors: { base: '#65694a', print: null }, source: 'closet' };

  it('the photo is fitted to the whole garment, over a repeating square of its fabric', () => {
    const f = fake();
    const svg = renderAvatar(look, { top: shirt }, { photos: { mine: f } });
    expect(svg).toContain('data:image/png;base64,FIT');
    expect(svg).toContain('data:image/png;base64,PATCH');
    expect(f.calls).toHaveLength(1);
    // The torso and both sleeves: one box around them all.
    expect(f.calls[0].parts.length).toBeGreaterThanOrEqual(3);
    expect(f.calls[0].box.w).toBeGreaterThan(100);
  });

  it('a photographed shirt leaves off the drawn collar points, buttons and pocket, so its own show', () => {
    const body = bodyFor(look.body, look.bodyType);
    const wings = [collarWing(body, -1), collarWing(body, 1)];
    const plain = renderAvatar(look, { top: shirt });
    const photographed = renderAvatar(look, { top: shirt }, { photos: { mine: fake() } });
    for (const d of wings) {
      expect(plain).toContain(d);
      expect(photographed).not.toContain(d);
    }
    // Buttons are small circles (a 2.4 radius arc) on the drawn shirt.
    expect(plain).toContain('a 2.4 2.4 0 1 0');
    expect(photographed).not.toContain('a 2.4 2.4 0 1 0');
  });

  it('items without a photo look draw as before', () => {
    const plain = renderAvatar(look, { top: shirt }, { photos: { someoneElse: fake() } });
    expect(plain).not.toContain('<pattern id="qd-patch');
    expect(plain).not.toContain('FIT');
  });

  it('shoes, hats and scarves repeat a square; glasses keep their frame color', () => {
    expect(patternMode('sneakers', 'shoes')).toBe('patch');
    expect(patternMode('beanie', 'accessories')).toBe('patch');
    expect(patternMode('glasses', 'accessories')).toBe('none');
    expect(patternMode('tee', 'tops')).toBe('fit');
  });
});
