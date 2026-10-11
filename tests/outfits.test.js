// R9, R11, R40 outfit candidates, plus the rain jacket, snow day and
// layer-for-later rules settled on 2026-10-10 (spec.md, Garment types by band).

import { describe, expect, it } from 'vitest';
import { ELIGIBLE, BANDS } from '../src/content/garments.js';
import { STARTER_SETS } from '../src/content/starters.js';
import { candidates, layerJackets, outfitKey } from '../src/recommend/outfits.js';
import { chroma } from '../src/recommend/color.js';
import { closetItem } from './helpers.js';

const BAND_IDS = BANDS.map((b) => b.id);
const GENDERS = ['man', 'woman'];
const set = (g) => STARTER_SETS[g];
const typesOf = (cands, slot) => new Set(cands.map((c) => c[slot]?.type ?? null));

describe('starter sets (spec.md, Content variation)', () => {
  it.each(GENDERS)('%s: 3 distinct outfits per band, every item eligible for its band', (g) => {
    for (const band of BAND_IDS) {
      const outfits = set(g).outfits.filter((o) => o.band === band);
      expect(outfits).toHaveLength(3);
      expect(new Set(outfits.map(outfitKey)).size).toBe(3);
      for (const o of outfits) {
        expect(ELIGIBLE[band].top).toContain(o.top.type);
        expect(ELIGIBLE[band].bottom).toContain(o.bottom.type);
        expect(ELIGIBLE[band].shoes).toContain(o.shoes.type);
        expect(o.outer?.type ?? null).toBe(ELIGIBLE[band].outer);
      }
    }
  });

  it('the two sets share no item IDs, so a gender change is detectable (R40)', () => {
    const man = new Set(set('man').items.map((i) => i.id));
    expect(set('woman').items.some((i) => man.has(i.id))).toBe(false);
  });

  it('skirts appear only on Hot and Warm days', () => {
    const skirtBands = set('woman').outfits.filter((o) => o.bottom.type === 'skirt').map((o) => o.band);
    expect(new Set(skirtBands)).toEqual(new Set(['hot', 'warm']));
  });
});

describe('candidates (R9, R11)', () => {
  it.each(GENDERS)('%s, empty closet: each band offers exactly its 3 starter outfits', (g) => {
    for (const band of BAND_IDS) {
      const cands = candidates({ band, closet: [], starterSet: set(g) });
      const starterKeys = set(g).outfits.filter((o) => o.band === band).map(outfitKey);
      expect(cands.map(outfitKey)).toEqual(starterKeys);
    }
  });

  it('one tee: Hot uses it in every candidate, and outfits still vary', () => {
    const tee = closetItem('my-tee', 'tee');
    const cands = candidates({ band: 'hot', closet: [tee], starterSet: set('man') });
    expect(cands).toHaveLength(3);
    cands.forEach((c) => expect(c.top).toBe(tee));
    expect(new Set(cands.map(outfitKey)).size).toBe(3);
  });

  it("the User's items come first, and starters fill only the empty slots", () => {
    const tee = closetItem('my-tee', 'tee');
    const cands = candidates({ band: 'hot', closet: [tee], starterSet: set('man') });
    cands.forEach((c) => {
      expect(c.bottom.source).toBe('starter');
      expect(c.shoes.source).toBe('starter');
    });
  });

  it('a closet that makes 3+ outfits on its own: starters drop out', () => {
    const closet = [
      closetItem('tee-a', 'tee'), closetItem('tee-b', 'tee'),
      closetItem('shorts-a', 'shorts'), closetItem('shorts-b', 'shorts'),
      closetItem('sneakers', 'sneakers'),
    ];
    const cands = candidates({ band: 'hot', closet, starterSet: set('man') });
    expect(cands).toHaveLength(4);
    cands.forEach((c) => ['top', 'bottom', 'shoes'].forEach((s) => expect(c[s].source).toBe('closet')));
  });

  it('a closet that makes only 1 outfit: whole starter outfits are mixed in until there are 3', () => {
    const closet = [closetItem('tee', 'tee'), closetItem('shorts', 'shorts'), closetItem('sneakers', 'sneakers')];
    const cands = candidates({ band: 'hot', closet, starterSet: set('man') });
    expect(cands).toHaveLength(3);
    expect(cands[0].top.source).toBe('closet');
    expect(cands.slice(1).every((c) => c.top.source === 'starter')).toBe(true);
  });

  it.each([
    ['cropTop', 'top', ['hot', 'warm']],
    ['spaghettiTop', 'top', ['hot', 'warm']],
    ['sandals', 'shoes', ['hot', 'warm']],
    ['clogs', 'shoes', ['hot', 'warm', 'chilly']],
    ['heels', 'shoes', ['hot', 'warm', 'chilly']],
  ])('%s is used only on %s days in its bands (added 2026-10-11)', (type, slot, bands) => {
    const mine = closetItem(`my-${type}`, type);
    for (const band of BAND_IDS) {
      const used = candidates({ band, closet: [mine], starterSet: set('woman') }).some((c) => c[slot]?.id === mine.id);
      expect(used, band).toBe(bands.includes(band));
    }
  });

  it('items only join bands their type suits: a tee is not used on a Chilly day', () => {
    const cands = candidates({ band: 'chilly', closet: [closetItem('tee', 'tee')], starterSet: set('man') });
    expect(cands.some((c) => c.top.id === 'tee')).toBe(false);
  });
});

describe('hooded rain jacket on rain-and-wind days', () => {
  const rainWind = (band, closet = []) => candidates({ band, closet, starterSet: set('man'), rainWind: true });

  it('Hot and Warm: added', () => {
    for (const band of ['hot', 'warm']) {
      rainWind(band).forEach((c) => {
        expect(c.rain.type).toBe('rainJacket');
        expect(c.outer).toBeNull();
      });
    }
  });

  it('Chilly: replaces the light jacket', () => {
    rainWind('chilly').forEach((c) => {
      expect(c.rain.type).toBe('rainJacket');
      expect(c.outer).toBeNull();
    });
  });

  it('Cold and Freezing: worn over the warm coat', () => {
    for (const band of ['cold', 'freezing']) {
      rainWind(band).forEach((c) => {
        expect(c.rain.type).toBe('rainJacket');
        expect(c.outer.type).toBe('warmCoat');
      });
    }
  });

  it("the User's own rain jacket comes first", () => {
    const mine = closetItem('my-rain', 'rainJacket');
    rainWind('warm', [mine]).forEach((c) => expect(c.rain).toBe(mine));
  });
});

describe('snow days (spec.md, Snow days)', () => {
  const snow = (band, closet = [], g = 'man') => candidates({ band, closet, starterSet: set(g), snowDay: true });

  it('no shoes in the closet: starter boots, even where the starter outfit had sneakers', () => {
    // Man Cold outfit 2 normally has grey sneakers.
    expect(typesOf(snow('cold'), 'shoes')).toEqual(new Set(['boots']));
  });

  it('the User owns boots: their boots, even on a Warm day', () => {
    const boots = closetItem('my-boots', 'boots');
    const cands = snow('warm', [boots, closetItem('my-sneakers', 'sneakers')]);
    cands.forEach((c) => expect(c.shoes).toBe(boots));
  });

  it('the User owns sneakers but no boots: their sneakers, even on a Freezing day', () => {
    const sneakers = closetItem('my-sneakers', 'sneakers');
    const cands = snow('freezing', [sneakers]);
    expect(cands.length).toBeGreaterThanOrEqual(3);
    cands.forEach((c) => expect(c.shoes).toBe(sneakers));
  });

  it('no boots: closed shoes first (sneakers, then clogs, then heels), sandals last', () => {
    const sandals = closetItem('my-sandals', 'sandals');
    const heels = closetItem('my-heels', 'heels');
    const clogs = closetItem('my-clogs', 'clogs');
    const sneakers = closetItem('my-sneakers', 'sneakers');
    const shoesOf = (closet) => new Set(snow('cold', closet).map((c) => c.shoes.id));
    expect(shoesOf([sandals, heels, clogs, sneakers])).toEqual(new Set(['my-sneakers']));
    expect(shoesOf([sandals, heels, clogs])).toEqual(new Set(['my-clogs']));
    expect(shoesOf([sandals, heels])).toEqual(new Set(['my-heels']));
    expect(shoesOf([sandals])).toEqual(new Set(['my-sandals']));
  });

  it('without snow, Freezing still ignores sneakers (garment table)', () => {
    const cands = candidates({ band: 'freezing', closet: [closetItem('my-sneakers', 'sneakers')], starterSet: set('man') });
    expect(typesOf(cands, 'shoes')).toEqual(new Set(['boots']));
  });
});

describe('layer for later jacket', () => {
  const navy = closetItem('navy-jacket', 'lightJacket', '#1f2a44');
  const red = closetItem('red-jacket', 'lightJacket', '#c0392b');

  it('neutral means CIE LCh chroma below 30: muted navy, denim and olive yes; red and coral no', () => {
    expect(chroma('#1f2a44')).toBeLessThan(30);
    expect(chroma('#5b7fa6')).toBeLessThan(30);
    expect(chroma('#666947')).toBeLessThan(30);
    expect(chroma('#c0392b')).toBeGreaterThan(30);
    expect(chroma('#ff7f50')).toBeGreaterThan(30);
  });

  it("the User's neutral jackets first", () => {
    expect(layerJackets({ eveningBand: 'chilly', closet: [red, navy], starterSet: set('man') })).toEqual([navy]);
  });

  it("then the User's other jackets", () => {
    expect(layerJackets({ eveningBand: 'chilly', closet: [red], starterSet: set('man') })).toEqual([red]);
  });

  it('then starter neutral jackets of the right weight', () => {
    const light = layerJackets({ eveningBand: 'chilly', closet: [], starterSet: set('man') }).map((j) => j.name);
    expect(light).toEqual(['Denim jacket', 'Navy light jacket', 'Tan light jacket']);
    const coats = layerJackets({ eveningBand: 'cold', closet: [], starterSet: set('man') }).map((j) => j.name);
    expect(coats).not.toContain('Red coat');
    expect(coats.length).toBeGreaterThan(0);
  });

  it('a Cold evening needs a warm coat, so a light jacket in the closet is skipped', () => {
    const jackets = layerJackets({ eveningBand: 'cold', closet: [navy], starterSet: set('man') });
    jackets.forEach((j) => expect(j.type).toBe('warmCoat'));
  });
});
