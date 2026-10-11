// C2 art: palette values, every template on both bodies, and the fixed
// layer order (plan.md C2).

import { describe, expect, it } from 'vitest';
import { renderAvatar } from '../src/art/avatar.js';
import { TEMPLATES } from '../src/art/garments.js';
import { FORMAL } from '../src/art/formal.js';
import { ACCESSORIES } from '../src/art/accessories.js';
import { MONK_TONES, HAIR_COLORS, STARTER_COLORS } from '../src/art/palette.js';
import { STARTER_SETS } from '../src/content/starters.js';

const item = (type, base) => ({ type, colors: { base }, source: 'closet' });
const look = (body, extra = {}) => ({ body, face: body, skin: MONK_TONES[5], hair: { style: body === 'A' ? 'longStraight' : 'shortCrop', color: HAIR_COLORS.brown }, ...extra });

describe('palette', () => {
  it('uses the official Monk Skin Tone Scale values (skintone.google, checked 2026-10-11)', () => {
    expect(MONK_TONES).toEqual([
      '#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96',
      '#a07e56', '#825c43', '#604134', '#3a312a', '#292420',
    ]);
  });

  it('offers 8 hair colors', () => {
    expect(Object.keys(HAIR_COLORS)).toHaveLength(8);
  });

  it('has a drawn value for every starter color in both sets', () => {
    const colors = Object.values(STARTER_SETS).flatMap((set) => set.items.map((i) => i.color));
    colors.forEach((c) => expect(STARTER_COLORS[c], c).toMatch(/^#[0-9a-f]{6}$/));
  });
});

describe('renderAvatar', () => {
  const outfits = [
    { top: item('tee', '#336699'), bottom: item('shorts', '#c8b48a'), shoes: item('sneakers', '#f4f2ee') },
    { top: item('tee', '#336699'), bottom: item('pants', '#33465f'), shoes: item('sneakers', '#9da3aa'), outer: item('lightJacket', '#b98f62') },
    { top: { type: 'tee', colors: { base: '#666947', print: '#4a5030' }, source: 'closet' }, bottom: item('pants', '#2b2d31'), shoes: item('sneakers', '#f4f2ee') },
  ];

  it.each(['A', 'B'])('Body %s: every C2 template draws with no broken numbers', (body) => {
    for (const outfit of outfits) {
      for (const skin of MONK_TONES) {
        const svg = renderAvatar(look(body, { skin }), outfit);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('has templates for the casual, formal and accessory pieces drawn in C2', () => {
    const all = Object.keys({ ...TEMPLATES, ...FORMAL, ...ACCESSORIES });
    for (const key of [
      'tee', 'cropTop', 'spaghettiTop', 'sweater', 'hoodie', 'lightJacket', 'shorts', 'pants',
      'sneakers', 'boots', 'sandals', 'clogs', 'heels', 'dressShoes',
      'dressShirt', 'blazer', 'tuxedo', 'trousers', 'tuxedoTrousers', 'formalDress', 'banquetDress', 'tie', 'bowTie',
      'cap', 'sunHat', 'beanie', 'scarf', 'sunglasses',
    ]) expect(all, key).toContain(key);
  });

  it.each(['A', 'B'])('Body %s: every template draws in its slot with no broken numbers', (body) => {
    const registries = { ...TEMPLATES, ...FORMAL, ...ACCESSORIES };
    for (const [type, { slot }] of Object.entries(registries)) {
      for (const skin of [MONK_TONES[0], MONK_TONES[9]]) {
        const svg = renderAvatar(look(body, { skin, glasses: true }), { top: item('tee', '#ffffff'), bottom: item('pants', '#333333'), shoes: item('sneakers', '#ffffff'), [slot]: item(type, '#7a5233') });
        expect(svg, `${type} on Body ${body}`).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('a dress fills the top and bottom: no tee or pants are drawn under it', () => {
    const svg = renderAvatar(look('A'), { top: item('tee', '#ffffff'), bottom: item('pants', '#333333'), dress: item('banquetDress', '#7c2436'), shoes: item('heels', '#7c2436') });
    expect(svg).toContain('qd-gown-clip');
    expect(svg).not.toContain('qd-tee-clip');
    expect(svg).not.toContain('qd-pants-clip');
  });

  it('hats are drawn over the hair, and sunglasses replace glasses', () => {
    const marks = { hair: '#0b0b01', cap: '#0b0b02' };
    const svg = renderAvatar(look('A', { glasses: true, hair: { style: 'longStraight', color: marks.hair } }), { hat: item('cap', marks.cap), eyewear: item('sunglasses', '#111111') });
    expect(svg.lastIndexOf(`fill="${marks.cap}"`)).toBeGreaterThan(svg.lastIndexOf(`fill="${marks.hair}"`));
    expect(svg).toContain('#1d1f26'); // tinted lenses
    expect(svg.match(/fill="#ffffff" opacity="0.12"/g)).toBeNull(); // no clear glasses lenses
  });

  it.each(['A', 'B'])('Body %s: crop top and every shoe type draw with no broken numbers', (body) => {
    for (const shoe of ['sneakers', 'boots', 'sandals', 'clogs', 'heels']) {
      for (const skin of [MONK_TONES[0], MONK_TONES[9]]) {
        const svg = renderAvatar(look(body, { skin }), { top: item('cropTop', '#d98c9a'), bottom: item('shorts', '#4f6f96'), shoes: item(shoe, '#7a5233') });
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('sandals and heels show the foot in the wearer\'s skin color; sneakers do not', () => {
    const skin = '#7a1234';
    const wearing = (shoe) => renderAvatar(look('A', { skin }), { top: item('tee', '#ffffff'), bottom: item('pants', '#000000'), shoes: item(shoe, '#336699') });
    expect(wearing('sandals').match(/qd-foot-clip/g)?.length).toBeGreaterThan(0);
    expect(wearing('heels').match(/qd-foot-clip/g)?.length).toBeGreaterThan(0);
    expect(wearing('sneakers')).not.toContain('qd-foot-clip');
  });

  it('keeps the fixed layer order: bottom, top, outer, then hair in front', () => {
    const marks = { bottom: '#0a0a01', top: '#0a0a02', outer: '#0a0a03', hair: '#0a0a04' };
    const svg = renderAvatar(
      look('A', { hair: { style: 'longStraight', color: marks.hair } }),
      { bottom: item('pants', marks.bottom), top: item('tee', marks.top), outer: item('lightJacket', marks.outer), shoes: item('sneakers', '#ffffff') },
    );
    const first = (c) => svg.indexOf(`fill="${c}"`);
    expect(first(marks.bottom)).toBeLessThan(first(marks.top));
    expect(first(marks.top)).toBeLessThan(first(marks.outer));
    expect(svg.lastIndexOf(`fill="${marks.hair}"`)).toBeGreaterThan(svg.lastIndexOf(`fill="${marks.outer}"`));
  });

  it('draws only the outermost sleeves, and both hands', () => {
    const withJacket = renderAvatar(look('B'), outfits[1]);
    expect(withJacket).toContain('jacket-sleeve');
    expect(withJacket).not.toContain('tee-sleeve');
    expect(withJacket.match(/<clipPath id="qd-hand-clip/g)).toHaveLength(2);

    const teeOnly = renderAvatar(look('B'), outfits[0]);
    expect(teeOnly).toContain('tee-sleeve');
    expect(teeOnly.match(/<clipPath id="qd-hand-clip/g)).toHaveLength(2);
  });

  it('has an accessible name when given a title, and is hidden otherwise', () => {
    expect(renderAvatar(look('A'), outfits[0], { title: 'White tee, khaki shorts' })).toContain('<title>White tee, khaki shorts</title>');
    expect(renderAvatar(look('A'), outfits[0])).toContain('aria-hidden="true"');
  });
});

// C5 art round 2: every hairstyle on both bodies and faces, and the
// facial-hair options (R24). That facial hair is Male only (R40) is a rule
// on the saved avatar values, tested with them.
describe('hair and facial hair (R24, R40)', () => {
  const STYLES = ['bald', 'buzz', 'shortCrop', 'shortCurls', 'afro', 'mediumStraight', 'mediumCurly', 'longStraight', 'longCurly', 'braids', 'bun'];

  it('offers all 11 hairstyles in the order R24 lists them', async () => {
    const { HAIRSTYLES } = await import('../src/art/hair.js');
    expect(Object.keys(HAIRSTYLES)).toEqual(STYLES);
  });

  it('draws every hairstyle on both bodies in every hair color, with unique ids', () => {
    for (const style of STYLES) {
      for (const body of ['A', 'B']) {
        for (const color of Object.values(HAIR_COLORS)) {
          const svg = renderAvatar(look(body, { hair: { style, color } }), {});
          expect(svg.startsWith('<svg')).toBe(true);
          expect(svg).not.toContain('NaN');
          const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
    }
  });

  it('only bald draws no hair shapes; every other style draws hair in its own color', () => {
    const color = '#8a3a20';
    for (const style of STYLES) {
      const svg = renderAvatar(look('B', { hair: { style, color } }), {});
      if (style === 'bald') expect(svg).not.toContain(`fill="${color}"`);
      else expect(svg).toContain(`fill="${color}"`);
    }
  });

  it('stubble and beard are drawn in the hair color; none adds nothing', () => {
    const color = '#61402b';
    for (const body of ['B']) {
      const base = renderAvatar(look(body, { hair: { style: 'bald', color }, facialHair: 'none' }), {});
      const stubble = renderAvatar(look(body, { hair: { style: 'bald', color }, facialHair: 'stubble' }), {});
      const beard = renderAvatar(look(body, { hair: { style: 'bald', color }, facialHair: 'beard' }), {});
      expect(base).not.toContain(`fill="${color}"`);
      expect(stubble).toContain('qd-stubble');
      expect(stubble).toContain(`fill="${color}"`);
      expect(beard).toContain('qd-beard');
      expect(beard).toContain(`fill="${color}"`);
    }
  });
});

// C6a body types (R43): 6 named types per gender, every drawing on all 12.
describe('body types (R43)', () => {
  it('offers the 6 named types per gender from the spec', async () => {
    const { BODY_TYPES } = await import('../src/art/bodies.js');
    expect(BODY_TYPES.A).toEqual(['slim', 'average', 'athletic', 'hourglass', 'pear', 'plusSize']);
    expect(BODY_TYPES.B).toEqual(['slim', 'average', 'athletic', 'broad', 'stocky', 'plusSize']);
  });

  it('Average is today\'s body, unchanged', async () => {
    const { BODIES, bodyFor } = await import('../src/art/bodies.js');
    for (const set of ['A', 'B']) expect({ ...bodyFor(set, 'average'), type: undefined }).toEqual({ ...BODIES[set], type: undefined });
  });

  it('draws every garment, shoe and accessory on all 12 bodies, with unique ids', async () => {
    const { BODY_TYPES } = await import('../src/art/bodies.js');
    const all = { ...TEMPLATES, ...FORMAL, ...ACCESSORIES };
    for (const set of ['A', 'B']) {
      for (const bodyType of BODY_TYPES[set]) {
        for (const [type, t] of Object.entries(all)) {
          const svg = renderAvatar(look(set, { bodyType }), { [t.slot]: item(type, '#7a5233') });
          expect(svg, `${set} ${bodyType} ${type}`).not.toContain('NaN');
          const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
    }
  });

  it('every body, arms and hands included, fits inside the drawing area', async () => {
    const { BODY_TYPES, bodyFor } = await import('../src/art/bodies.js');
    const { armProfile } = await import('../src/art/figure.js');
    const { AVATAR_VIEWBOX } = await import('../src/art/avatar.js');
    const [x0, , w] = AVATAR_VIEWBOX.split(' ').map(Number);
    for (const set of ['A', 'B']) {
      for (const type of BODY_TYPES[set]) {
        const b = bodyFor(set, type);
        for (const side of ['left', 'right']) {
          const p = armProfile(b, side);
          p.pts.forEach((q, i) => {
            expect(q.x - p.widths[i] / 2, `${set} ${type}`).toBeGreaterThan(x0 + 10);
            expect(q.x + p.widths[i] / 2, `${set} ${type}`).toBeLessThan(x0 + w - 10);
          });
        }
      }
    }
  });

  it('bottoms start each leg at the hip line, never wider than the hips there', async () => {
    const { BODY_TYPES, bodyFor, torsoSide } = await import('../src/art/bodies.js');
    const { legStart } = await import('../src/art/fit.js');
    for (const set of ['A', 'B']) {
      for (const type of BODY_TYPES[set]) {
        const b = bodyFor(set, type);
        for (const side of ['left', 'right']) {
          const s = side === 'left' ? -1 : 1;
          const joint = b.legs[side][0];
          const { pt: p, width } = legStart(b, side, joint, 200);
          const edge = torsoSide(b, s, b.hip.y, 2).x;
          expect(Math.abs(p.x + (s * width) / 2 - edge), `${set} ${type} ${side}`).toBeLessThan(0.5);
        }
      }
    }
  });
});

// C6b face options (R43): every choice on both faces, defaults unchanged.
describe('face options (R43)', () => {
  it('offers the options and counts the spec lists', async () => {
    const f = await import('../src/art/face.js');
    expect(Object.keys(f.FACE_SHAPES)).toEqual(['oval', 'round', 'square', 'heart', 'oblong', 'diamond', 'triangle', 'rectangle']);
    expect(Object.keys(f.EYE_SHAPES)).toEqual(['almond', 'round', 'hooded', 'monolid', 'upturned', 'downturned', 'deepSet', 'closeSet']);
    expect(Object.keys(f.EYE_COLORS)).toEqual(['darkBrown', 'brown', 'amber', 'hazel', 'green', 'blue', 'lightBlue', 'grey']);
    expect(Object.keys(f.BROWS)).toEqual(['straight', 'softArch', 'highArch', 'rounded', 'thick', 'thin', 'bushy', 'angled']);
    expect(f.NOSES).toEqual(['straight', 'button', 'rounded', 'wide', 'narrow', 'upturned', 'aquiline', 'flat']);
    expect(Object.keys(f.MOUTHS)).toEqual(['medium', 'full', 'thin', 'wide', 'small', 'heartShaped', 'fullLower', 'fullUpper']);
    expect(Object.keys(f.EARS)).toEqual(['average', 'small', 'large', 'round', 'pointed', 'closeToHead', 'protruding', 'attachedLobes']);
    expect(f.LASHES).toEqual(['natural', 'medium', 'long']);
    expect(Object.keys(f.FRECKLES)).toEqual(['none', 'light', 'medium', 'heavy']);
    expect(Object.keys(f.BEAUTY_MARKS)).toEqual(['none', 'cheek', 'chin', 'aboveLip']);
    expect(f.FACE_LINES).toEqual(['none', 'smile', 'forehead', 'crowsFeet', 'all']);
    expect(Object.keys(f.LIP_COLORS)).toHaveLength(9);
    expect(Object.keys(f.EYESHADOWS)).toHaveLength(9);
    expect(f.EYELINERS).toEqual(['none', 'thin', 'winged']);
    expect(Object.keys(f.BLUSHES)).toHaveLength(5);
  });

  it('with no options, each face draws its approved defaults', async () => {
    const { FACE_DEFAULTS } = await import('../src/art/face.js');
    const norm = (s) => s.replace(/qd-([a-z-]+)-\d+/g, 'qd-$1-N');
    for (const set of ['A', 'B']) {
      const plain = renderAvatar(look(set), {});
      const explicit = renderAvatar(look(set, { features: FACE_DEFAULTS[set] }), {});
      expect(norm(explicit)).toBe(norm(plain));
    }
  });

  it('draws every choice of every feature on both faces, with unique ids', async () => {
    const f = await import('../src/art/face.js');
    const choices = {
      shape: Object.keys(f.FACE_SHAPES), eyeShape: Object.keys(f.EYE_SHAPES), eyeColor: Object.keys(f.EYE_COLORS),
      brows: Object.keys(f.BROWS), nose: f.NOSES, mouth: Object.keys(f.MOUTHS), ears: Object.keys(f.EARS),
      lashes: f.LASHES, freckles: Object.keys(f.FRECKLES), mark: Object.keys(f.BEAUTY_MARKS), lines: f.FACE_LINES,
      lips: Object.keys(f.LIP_COLORS), eyeshadow: Object.keys(f.EYESHADOWS), eyeliner: f.EYELINERS, blush: Object.keys(f.BLUSHES),
    };
    for (const set of ['A', 'B']) {
      for (const [feature, options] of Object.entries(choices)) {
        const seen = new Set();
        for (const option of options) {
          const svg = renderAvatar(look(set, { features: { [feature]: option }, facialHair: set === 'B' ? 'beard' : 'none' }), {});
          expect(svg, `${set} ${feature} ${option}`).not.toContain('NaN');
          const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
          expect(new Set(ids).size).toBe(ids.length);
          seen.add(svg.replace(/qd-([a-z-]+)-\d+/g, 'N'));
        }
        // Every choice draws something different.
        expect(seen.size, `${set} ${feature}`).toBe(options.length);
      }
    }
  });

  it("the beard follows the face shape's jaw", () => {
    const beard = (shape) => renderAvatar(look('B', { features: { shape }, facialHair: 'beard' }), {}).match(/<g><defs><clipPath id="qd-beard-clip-\d+"><path d="([^"]+)"/)[1];
    expect(beard('round')).not.toBe(beard('heart'));
  });
});
