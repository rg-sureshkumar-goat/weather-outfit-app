// C8a: the automatic cut-out (R16). Which of MagicTouch's outlines is the
// item, on small drawn photos and masks, so no model or browser is needed.
// The model itself is checked in the browser and on the phone.

import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PROBES, binarize, regionAt, fillHoles, maskStats, scoreOutline, contrast, settle, largestRegion, overlap, chooseOutline,
} from '../src/vision/cutout.js';
import { SIZES } from '../src/vision/segmenter.js';
import { createCloset, memoryBackend } from '../src/store/closet.js';

const W = 40;
const H = 50;

// A photo W × H from a function (x, y) -> [r, g, b].
const photo = (paint) => {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      rgba.set([...paint(x, y), 255], (y * W + x) * 4);
    }
  }
  return rgba;
};
// A confidence mask from a function (x, y) -> boolean.
const confidence = (inside) => Float32Array.from({ length: W * H }, (_, i) => (inside(i % W, Math.floor(i / W)) ? 0.97 : 0.02));
const mask = (inside) => binarize(confidence(inside));
const count = (m) => m.reduce((n, v) => n + v, 0);

const FLOOR = [218, 207, 192];
const NAVY = [44, 63, 99];
// A tee-like block in the middle of the photo.
const inTee = (x, y) => x >= 10 && x < 30 && y >= 10 && y < 42;
// Pants: two legs below a waist, with a gap between the legs below y = 20.
const inPants = (x, y) => x >= 8 && x < 32 && y >= 4 && y < 46 && !(y >= 20 && x >= 18 && x < 22);

describe('where the app asks MagicTouch (R16)', () => {
  it('the photo center first, then eight points around it, all inside the photo', () => {
    expect(PROBES).toHaveLength(9);
    expect(PROBES[0]).toEqual([0.5, 0.5]);
    for (const [x, y] of PROBES) {
      expect(x).toBeGreaterThan(0.3);
      expect(x).toBeLessThan(0.7);
      expect(y).toBeGreaterThan(0.3);
      expect(y).toBeLessThan(0.7);
    }
  });
});

describe('mask helpers', () => {
  it('keeps the part of the mask that holds the point, and fills holes in it', () => {
    const twoBlobs = mask((x, y) => (x < 10 && y < 10) || inTee(x, y));
    const region = regionAt(twoBlobs, W, H, 20, 20);
    expect(count(region)).toBe(20 * 32);
    expect(regionAt(twoBlobs, W, H, 35, 5)).toBeNull();
    // A dark print MagicTouch left out of the middle becomes part of it.
    const withHole = mask((x, y) => inTee(x, y) && !(x >= 15 && x < 20 && y >= 20 && y < 25));
    expect(count(fillHoles(withHole, W, H))).toBe(20 * 32);
    // The floor between pant legs reaches the photo's edge, so it's no hole.
    expect(count(fillHoles(mask(inPants), W, H))).toBe(count(mask(inPants)));
  });

  it('measures area, box and how much of the photo edge the mask runs along', () => {
    const stats = maskStats(mask(inTee), W, H);
    expect(stats.share).toBeCloseTo((20 * 32) / (W * H));
    expect(stats.edge).toBe(0);
    expect(stats.box).toEqual({ x: 10, y: 10, w: 20, h: 32 });
    const floor = maskStats(mask((x, y) => !inTee(x, y)), W, H);
    expect(floor.edge).toBe(1);
  });

  it('keeps the largest part, and measures how much two masks overlap', () => {
    const m = largestRegion(mask((x, y) => (x < 5 && y < 5) || inTee(x, y)), W, H);
    expect(count(m)).toBe(20 * 32);
    expect(overlap(mask(inTee), mask(inTee))).toBe(1);
    expect(overlap(mask(inTee), mask((x, y) => x >= 50))).toBe(0);
  });
});

describe('a plausible outline (R16)', () => {
  const tee = photo((x, y) => (inTee(x, y) ? NAVY : FLOOR));

  it('covers 4–90% of the photo, stays off most of its edge, and looks different from the rest', () => {
    const ok = (inside) => scoreOutline(maskStats(mask(inside), W, H), contrast(mask(inside), tee)) > 0;
    expect(ok(inTee)).toBe(true);
    // A pocket-sized speck, the whole photo, and the floor around the item.
    expect(ok((x, y) => x >= 18 && x < 21 && y >= 20 && y < 23)).toBe(false);
    expect(ok(() => true)).toBe(false);
    expect(ok((x, y) => !inTee(x, y))).toBe(false);
    // On a blank photo, an outlined patch of floor looks like the rest.
    const blank = photo(() => FLOOR);
    expect(contrast(mask(inTee), blank)).toBeLessThan(10);
    expect(contrast(mask(inTee), tee)).toBeGreaterThan(40);
  });
});

describe('choosing the outline (R16)', () => {
  const answer = (point, inside) => ({ point, confidence: confidence(inside) });

  it('a tee: every point outlines it, and the floor is never chosen', () => {
    const tee = photo((x, y) => (inTee(x, y) ? NAVY : FLOOR));
    const answers = PROBES.map((p, i) => answer(p, i === 3 ? (x, y) => !inTee(x, y) : inTee));
    const out = chooseOutline(answers, W, H, tee);
    expect(out.stats.box).toEqual({ x: 10, y: 10, w: 20, h: 32 });
    expect(count(out.mask)).toBe(20 * 32);
  });

  it('a pocket outlined from one point loses to the whole shirt from the others', () => {
    const shirt = photo((x, y) => (inTee(x, y) ? NAVY : FLOOR));
    const pocket = (x, y) => x >= 16 && x < 24 && y >= 16 && y < 26; // holds the center
    const answers = PROBES.map((p, i) => answer(p, i === 0 ? pocket : inTee));
    expect(count(chooseOutline(answers, W, H, shirt).mask)).toBe(20 * 32);
  });

  it('pants: a point between the legs makes MagicTouch include the floor there; the floor is left out', () => {
    const pants = photo((x, y) => (inPants(x, y) ? NAVY : FLOOR));
    const withGap = (x, y) => x >= 8 && x < 32 && y >= 4 && y < 46;
    const answers = PROBES.map((p, i) => answer(p, i % 2 === 0 ? withGap : inPants));
    const out = chooseOutline(answers, W, H, pants);
    expect(count(out.mask)).toBe(count(mask(inPants)));
    expect(out.mask[30 * W + 20]).toBe(0); // between the legs
  });

  it('a blank photo: MagicTouch still outlines patches of floor, but none is chosen', () => {
    const blank = photo((x, y) => FLOOR.map((c) => c + ((x * 7 + y * 3) % 5) - 2));
    const answers = PROBES.map((p, i) => answer(p, (x, y) => x >= 4 + i && x < 30 && y >= 8 && y < 38));
    expect(chooseOutline(answers, W, H, blank)).toBeNull();
  });

  it('no outline holds its own point: nothing is chosen', () => {
    const tee = photo((x, y) => (inTee(x, y) ? NAVY : FLOOR));
    const elsewhere = (x, y) => x < 6 && y < 6;
    expect(chooseOutline(PROBES.map((p) => answer(p, elsewhere)), W, H, tee)).toBeNull();
  });

  it('where outlines disagree, item-colored pixels stay and background-colored ones go', () => {
    const pants = photo((x, y) => (inPants(x, y) ? NAVY : FLOOR));
    const a = mask(inPants);
    const b = mask((x, y) => x >= 8 && x < 32 && y >= 4 && y < 46); // adds the gap (floor)
    const c = mask((x, y) => inPants(x, y) && y < 40); // misses the hems (navy)
    const out = settle([a, b, c], pants);
    expect(count(out)).toBe(count(a));
  });
});

describe('model files and the closet', () => {
  it("the progress bar's sizes match the hosted runtime and model", () => {
    const wasm = 'node_modules/@mediapipe/tasks-vision/wasm';
    expect(SIZES['vision_wasm_internal.wasm']).toBe(statSync(`${wasm}/vision_wasm_internal.wasm`).size);
    expect(SIZES['vision_wasm_nosimd_internal.wasm']).toBe(statSync(`${wasm}/vision_wasm_nosimd_internal.wasm`).size);
    expect(SIZES['magic_touch.tflite']).toBe(statSync('public/models/magic_touch.tflite').size);
    // A TensorFlow Lite file, not an error page saved by mistake.
    expect(readFileSync('public/models/magic_touch.tflite').subarray(4, 8).toString()).toBe('TFL3');
  });

  it('an item remembers whether its image is a cut-out, and editing keeps it (R18, R20)', async () => {
    const closet = createCloset(memoryBackend());
    const item = await closet.add({ type: 'tee', name: 'Navy tee', colors: { base: '#26344f', print: null }, photo: 'png-bytes', cutout: true });
    expect(item.cutout).toBe(true);
    expect((await closet.update(item.id, { type: 'tee', name: 'Blue tee', colors: item.colors })).cutout).toBe(true);
    const plain = await closet.add({ type: 'tee', name: 'Tee', colors: { base: '#26344f', print: null }, photo: 'jpeg-bytes' });
    expect(plain.cutout).toBe(false);
  });
});
