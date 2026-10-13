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
const EMPTY_MORE = { more: [] };

describe('the closet on this device (R18)', () => {
  it('saves an item with its photo, lists newest first, and keeps it after a reload', async () => {
    const backend = memoryBackend();
    const closet = createCloset(backend);
    const first = await closet.add(tee);
    await new Promise((r) => setTimeout(r, 5));
    const second = await closet.add({ ...tee, type: 'pants', name: 'Dark jeans' });
    expect(first).toMatchObject({ type: 'tee', name: 'Navy tee', colors: { base: '#26344f', print: null, more: [] }, photo: 'photo-bytes' });
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
    // Other colors must be colors, and an item has at most 6 colors in all.
    await expect(closet.add({ ...tee, colors: { base: '#26344f', print: null, more: ['red'] } })).rejects.toThrow();
    const five = ['#111111', '#222222', '#333333', '#444444', '#555555'];
    expect((await closet.add({ ...tee, colors: { base: '#26344f', print: null, more: five } })).colors.more).toHaveLength(5);
    await expect(closet.add({ ...tee, colors: { base: '#26344f', print: '#b8392f', more: five } })).rejects.toThrow();
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

  it('outfits see the item without its photo, marked as the User\'s, with how the avatar draws it (R44)', async () => {
    const item = await createCloset(memoryBackend()).add(tee);
    expect(outfitItem(item)).toEqual({ id: item.id, type: 'tee', name: 'Navy tee', colors: { base: '#26344f', print: null, more: [] }, show: null, pattern: null, details: null, source: 'closet' });
  });
});

// Pixel data from [hex, count] runs.
const pixels = (runs) => new Uint8ClampedArray(runs.flatMap(([hex, n]) => Array.from({ length: n }, () => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255)).flat()));

describe('colors and name from the photo (R17)', () => {
  it('the base is the most common color; the avatar\'s print a clearly different color covering enough of the item', () => {
    expect(sampleColors(pixels([['#26344f', 100]]))).toEqual({ base: '#26344f', print: null, ...EMPTY_MORE });
    expect(sampleColors(pixels([['#26344f', 70], ['#b8392f', 30]]))).toEqual({ base: '#26344f', print: '#b8392f', ...EMPTY_MORE });
    // A small red logo is one of the item's colors, but not an all-over print.
    expect(sampleColors(pixels([['#26344f', 95], ['#b8392f', 5]]))).toEqual({ base: '#26344f', print: null, more: ['#b8392f'] });
    // Near shades of the base are the base.
    expect(sampleColors(pixels([['#26344f', 60], ['#2a3a58', 40]])).more).toEqual([]);
    // The background seen at the photo's edges is left out: the floor between
    // pant legs is not a color of the pants.
    expect(sampleColors(pixels([['#3b4a63', 70], ['#e9e6e1', 30]]), { background: '#e9e6e1' })).toEqual({ base: '#3b4a63', print: null, ...EMPTY_MORE });
    // A white item on a pale floor keeps its white: leaving the floor out
    // would leave too little of the sample.
    expect(sampleColors(pixels([['#f4f2ee', 62], ['#3a6fb0', 38]]), { background: '#e9e6e1' })).toEqual({ base: '#f4f2ee', print: '#3a6fb0', ...EMPTY_MORE });
    // Unless the item seems to fill the photo: then the edge color is the item.
    expect(sampleColors(pixels([['#26344f', 90], ['#b8392f', 10]]), { background: '#26344f' }).base).toBe('#26344f');
    // See-through pixels are ignored.
    const clear = pixels([['#26344f', 10]]);
    for (let i = 3; i < clear.length; i += 4) clear[i] = 0;
    expect(sampleColors(clear)).toEqual({ base: '#999999', print: null, ...EMPTY_MORE });
  });

  it('recognizes up to 6 colors: a thin stripe in another hue stays; shadows and tiny specks don\'t count', () => {
    // Red and white stripes with a thin blue line (4% of the item).
    expect(sampleColors(pixels([['#c0392b', 50], ['#f5f5f0', 46], ['#2e5fa8', 4]]))).toEqual({ base: '#c0392b', print: '#f5f5f0', more: ['#2e5fa8'] });
    // The Developer's flannel, as sampled from its cut-out: gray-blue where
    // navy and white threads blend, navy, white, and a blue stripe close to
    // the navy but a different hue.
    expect(sampleColors(pixels([['#68727b', 40], ['#253241', 40], ['#d8d9d6', 12], ['#2d4d63', 8]]))).toEqual({ base: '#68727b', print: '#253241', more: ['#d8d9d6', '#2d4d63'] });
    // A navy tee in uneven light, and a white tee with shadows: one color each.
    expect(sampleColors(pixels([['#30446b', 50], ['#1e2c46', 30], ['#3a5280', 20]])).more).toEqual([]);
    expect(sampleColors(pixels([['#f2f1ed', 60], ['#d0cfcb', 25], ['#b4b3b0', 15]]))).toMatchObject({ print: null, more: [] });
    // Black, white and gray stripes are three colors, not shades of one.
    expect(sampleColors(pixels([['#111111', 40], ['#f2f2f2', 35], ['#808080', 25]]))).toEqual({ base: '#111111', print: '#f2f2f2', more: ['#808080'] });
    // Specks under 3% of the item, like small buttons, don't count.
    expect(sampleColors(pixels([['#26344f', 98], ['#f0f0f0', 2]])).more).toEqual([]);
    // A busy print keeps its 6 most common colors.
    const eight = ['#d6456b', '#3f8f5a', '#f2b632', '#4a6fb5', '#8e44ad', '#e67e22', '#16a085', '#7f8c8d'];
    const busy = sampleColors(pixels(eight.map((c, i) => [c, 20 - i])));
    expect(1 + (busy.print ? 1 : 0) + busy.more.length).toBe(6);
    expect(busy.base).toBe('#d6456b');
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

describe('how an item looks on the avatar is kept with it (R18, R44)', () => {
  const plaid = {
    kind: 'plaid',
    repeat: 0.11,
    roles: { ground: '#172535', light: '#E9EAE4', accent: '#285977', extra: [] },
    sources: { ground: '#253241', light: '#d8d9d6', accent: '#2d4d63', extra: [] },
  };
  const shirt = { type: 'longSleeveShirt', name: 'Plaid shirt', colors: { base: '#68727b', print: '#253241', more: ['#d8d9d6', '#2d4d63'] }, photo: 'png', cutout: true };

  it('saves Show as, the pattern reading and the shirt\'s details, and edits change them', async () => {
    const closet = createCloset(memoryBackend());
    const item = await closet.add({ ...shirt, show: 'drawn', pattern: { ...plaid, why: 'not kept' }, details: { pockets: 2, flaps: true, buttons: '#DFDCBD' } });
    expect(item.show).toBe('drawn');
    expect(item.pattern).toEqual(plaid);
    expect(item.details).toEqual({ pockets: 2, flaps: true, buttons: '#dfdcbd' });
    const edited = await closet.update(item.id, { ...shirt, show: 'photo', pattern: plaid, details: { flaps: false, buttons: null } });
    expect(edited.show).toBe('photo');
    // No pocket choice means the standard drawing.
    expect(edited.details).toEqual({ flaps: false, buttons: null });
    expect(outfitItem(edited)).toMatchObject({ show: 'photo', pattern: plaid });
  });

  it('without a cut-out there is no Show as or reading, though a shirt keeps its pockets; invalid looks are refused', async () => {
    const closet = createCloset(memoryBackend());
    const whole = await closet.add({ ...shirt, cutout: false, show: 'drawn', pattern: plaid, details: { pockets: 1, flaps: false, buttons: null } });
    expect(whole.show).toBeNull();
    expect(whole.pattern).toBeNull();
    expect(whole.details.pockets).toBe(1);
    await expect(closet.add({ ...shirt, show: 'sketch' })).rejects.toThrow();
    await expect(closet.add({ ...shirt, pattern: { ...plaid, repeat: 0 } })).rejects.toThrow();
    await expect(closet.add({ ...shirt, pattern: { kind: 'stripes', repeat: 0.1, roles: plaid.roles, sources: plaid.sources } })).rejects.toThrow();
    await expect(closet.add({ ...shirt, details: { pockets: 3 } })).rejects.toThrow();
    await expect(closet.add({ ...shirt, details: { buttons: 'cream' } })).rejects.toThrow();
  });
});
