// C7: the closet's on-device storage (R18), the colors and name suggested
// from a photo (R17), what each type suits, and the outfit rules using the
// User's items (R9, R14, R20).

import { describe, expect, it } from 'vitest';
import { createCloset, memoryBackend, ClosetFullError, outfitItem, NAME_MAX } from '../src/store/closet.js';
import { sampleColors } from '../src/vision/colors.js';
import { colorName, suggestName } from '../src/content/colorNames.js';
import { suitsFor, GARMENT_TYPES, TYPE_GROUPS } from '../src/content/garments.js';
import { candidates } from '../src/recommend/outfits.js';
import { chooseOutfit, idsOf } from '../src/recommend/picks.js';
import { STARTER_SETS } from '../src/content/starters.js';
import { seededRng as seededRandom } from './helpers.js';

const tee = { type: 'tee', name: 'Navy tee', colors: { base: '#26344F', print: null }, photo: 'photo-bytes' };

describe('the closet on this device (R18)', () => {
  it('saves an item with its photo, lists newest first, and keeps it after a reload', async () => {
    const backend = memoryBackend();
    const closet = createCloset(backend);
    const first = await closet.add(tee);
    await new Promise((r) => setTimeout(r, 5));
    const second = await closet.add({ ...tee, type: 'pants', name: 'Dark jeans' });
    expect(first).toMatchObject({ type: 'tee', name: 'Navy tee', colors: { base: '#26344f', print: null }, photo: 'photo-bytes' });
    expect(first.id).toMatch(/^item-/);
    expect(first.added).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // A reload: a new closet over the same storage.
    const again = await createCloset(backend).list();
    expect(again.map((i) => i.id)).toEqual([second.id, first.id]);
  });

  it('edits type, name and colors, keeping the photo and date; delete removes it', async () => {
    const closet = createCloset(memoryBackend());
    const item = await closet.add(tee);
    const edited = await closet.update(item.id, { type: 'longSleeve', name: '  Navy long tee  ', colors: { base: '#26344f', print: '#b8392f' } });
    expect(edited).toMatchObject({ id: item.id, type: 'longSleeve', name: 'Navy long tee', colors: { print: '#b8392f' }, photo: 'photo-bytes', added: item.added });
    await closet.remove(item.id);
    expect(await closet.list()).toEqual([]);
  });

  it('refuses unknown types, missing colors and empty names, and trims long names', async () => {
    const closet = createCloset(memoryBackend());
    await expect(closet.add({ ...tee, type: 'kilt' })).rejects.toThrow();
    await expect(closet.add({ ...tee, colors: { base: 'navy' } })).rejects.toThrow();
    await expect(closet.add({ ...tee, name: '   ' })).rejects.toThrow();
    expect((await closet.add({ ...tee, name: 'x'.repeat(90) })).name).toHaveLength(NAME_MAX);
  });

  it('when storage is full, says so and nothing is half-saved', async () => {
    const backend = memoryBackend();
    const full = { ...backend, put: async () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } };
    await expect(createCloset(full).add(tee)).rejects.toBeInstanceOf(ClosetFullError);
    expect(await createCloset(backend).list()).toEqual([]);
  });

  it('"Delete all my data" empties the closet (R35)', async () => {
    const backend = memoryBackend();
    const closet = createCloset(backend);
    await closet.add(tee);
    await closet.clear();
    expect(await createCloset(backend).list()).toEqual([]);
  });

  it('outfits see the item without its photo, marked as the User\'s', async () => {
    const item = await createCloset(memoryBackend()).add(tee);
    expect(outfitItem(item)).toEqual({ id: item.id, type: 'tee', name: 'Navy tee', colors: { base: '#26344f', print: null }, source: 'closet' });
  });
});

// Pixel data from [hex, count] runs.
const pixels = (runs) => new Uint8ClampedArray(runs.flatMap(([hex, n]) => Array.from({ length: n }, () => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255)).flat()));

describe('colors and name from the photo (R17)', () => {
  it('the base is the most common color; a print needs a clearly different color covering enough of the photo', () => {
    expect(sampleColors(pixels([['#26344f', 100]]))).toEqual({ base: '#26344f', print: null });
    expect(sampleColors(pixels([['#26344f', 70], ['#b8392f', 30]]))).toEqual({ base: '#26344f', print: '#b8392f' });
    // A small spot is not a print, and near shades of the base merge into it.
    expect(sampleColors(pixels([['#26344f', 95], ['#b8392f', 5]])).print).toBeNull();
    expect(sampleColors(pixels([['#26344f', 60], ['#2a3a58', 40]])).print).toBeNull();
    // The background seen at the photo's edges is left out: the floor between
    // pant legs is not a print.
    expect(sampleColors(pixels([['#3b4a63', 70], ['#e9e6e1', 30]]), { background: '#e9e6e1' })).toEqual({ base: '#3b4a63', print: null });
    // A white item on a pale floor keeps its white: leaving the floor out
    // would leave too little of the sample.
    expect(sampleColors(pixels([['#f4f2ee', 62], ['#3a6fb0', 38]]), { background: '#e9e6e1' })).toEqual({ base: '#f4f2ee', print: '#3a6fb0' });
    // Unless the item seems to fill the photo: then the edge color is the item.
    expect(sampleColors(pixels([['#26344f', 90], ['#b8392f', 10]]), { background: '#26344f' }).base).toBe('#26344f');
    // See-through pixels are ignored.
    const clear = pixels([['#26344f', 10]]);
    for (let i = 3; i < clear.length; i += 4) clear[i] = 0;
    expect(sampleColors(clear)).toEqual({ base: '#999999', print: null });
  });

  it('suggests a name from the nearest everyday color and the type', () => {
    expect(colorName('#2a3550')).toBe('Navy');
    expect(colorName('#b03a30')).toBe('Red');
    expect(suggestName('tee', '#26344f')).toBe('Navy tee');
    expect(suggestName('buttonUpShort', '#a5c3e0')).toBe('Light blue short-sleeve button-up');
  });

  it('every type says what it suits: bands from the table, or what decides when it\'s worn', () => {
    expect(suitsFor('tee')).toEqual({ kind: 'bands', bands: ['Hot', 'Warm'] });
    expect(suitsFor('turtleneck').bands).toEqual(['Chilly', 'Cold', 'Freezing']);
    expect(suitsFor('lightJacket').bands).toEqual(['Chilly']);
    expect(suitsFor('rainJacket').kind).toBe('rain');
    expect(suitsFor('blazer').kind).toBe('occasion');
    expect(suitsFor('beanie').kind).toBe('accessory');
    for (const type of Object.keys(GARMENT_TYPES)) {
      const s = suitsFor(type);
      expect(s.kind === 'bands' ? s.bands.length > 0 : true, type).toBe(true);
    }
    expect(TYPE_GROUPS).toHaveLength(6);
  });
});

describe('outfits use the User\'s items (R9, R14, R20)', () => {
  const starterSet = STARTER_SETS.woman;
  const myTee = { id: 'item-1', type: 'tee', name: 'Navy tee', colors: { base: '#26344f', print: null }, source: 'closet' };

  it('after adding a tee, a saved Hot outfit swaps only its top for the tee', () => {
    const before = chooseOutfit(candidates({ band: 'hot', closet: [], starterSet }), null, seededRandom(1));
    const after = chooseOutfit(candidates({ band: 'hot', closet: [myTee], starterSet }), idsOf(before), seededRandom(2));
    expect(after.top.id).toBe('item-1');
    expect([after.bottom.id, after.shoes.id]).toEqual([before.bottom.id, before.shoes.id]);
  });

  it('deleting the tee re-picks only that slot', () => {
    const withTee = chooseOutfit(candidates({ band: 'hot', closet: [myTee], starterSet }), null, seededRandom(3));
    const afterDelete = chooseOutfit(candidates({ band: 'hot', closet: [], starterSet }), idsOf(withTee), seededRandom(4));
    expect(afterDelete.top.id).not.toBe('item-1');
    expect([afterDelete.bottom.id, afterDelete.shoes.id]).toEqual([withTee.bottom.id, withTee.shoes.id]);
  });

  it('occasion types and accessories in the closet never enter an everyday outfit', () => {
    const blazer = { ...myTee, id: 'item-2', type: 'blazer' };
    const cap = { ...myTee, id: 'item-3', type: 'cap' };
    for (const band of ['hot', 'warm', 'chilly', 'cold', 'freezing']) {
      for (const c of candidates({ band, closet: [blazer, cap], starterSet })) {
        expect(Object.values(c).map((i) => i?.id)).not.toContain('item-2');
        expect(Object.values(c).map((i) => i?.id)).not.toContain('item-3');
      }
    }
  });
});
