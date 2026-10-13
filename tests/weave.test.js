// C8b step 3: drawn patterns (R44). The standard layouts from a reading, how
// each piece's pattern is turned, and how the avatar and the rack draw an
// item shown as Drawn, next to one shown as its photo.

import { describe, expect, it } from 'vitest';
import { settOf, axisOf, showAs } from '../src/art/weave.js';
import { renderAvatar } from '../src/art/avatar.js';
import { rackHeader } from '../src/art/rack.js';
import { bodyFor } from '../src/art/bodies.js';
import { collarWing } from '../src/art/fit.js';
import { defaultAvatar, lookOf } from '../src/store/avatar.js';

const flannel = { kind: 'plaid', repeat: 0.11, roles: { ground: '#172535', light: '#e9eae4', accent: '#285977', extra: [] } };
const widths = (stripes) => stripes.reduce((s, [, w]) => s + w, 0);

describe('standard layouts from a reading (R44)', () => {
  it('a plaid takes the flannel\'s proportions, the warp mirroring the weft; without a fourth color the extra line is a light one', () => {
    const s = settOf(flannel);
    expect(widths(s.warp)).toBe(130);
    expect(widths(s.weft)).toBe(130);
    expect(s.weft[0]).toEqual(['G', 60]);
    expect(s.warp.slice(1)).toEqual([...s.weft.slice(1)].reverse());
    expect(s.weft.some(([c]) => c === 'E')).toBe(false);
    expect(s.yarns).toEqual({ G: '#172535', L: '#e9eae4', A: '#285977', E: '#e9eae4' });
    const four = settOf({ ...flannel, roles: { ...flannel.roles, extra: ['#a3242c'] } });
    expect(four.weft.some(([c]) => c === 'E')).toBe(true);
    expect(four.yarns.E).toBe('#a3242c');
  });

  it('a check is half and half both ways; stripes vary one way only', () => {
    const check = settOf({ kind: 'check', repeat: 0.1, roles: { ground: '#a3232b', light: '#1c1b1f', accent: null, extra: [] } });
    expect(check.warp).toEqual([['G', 50], ['L', 50]]);
    expect(check.weft).toEqual(check.warp);
    const down = settOf({ kind: 'stripes', along: 'down', repeat: 0.1, roles: flannel.roles });
    expect(down.warp.length).toBeGreaterThan(1);
    expect(down.weft).toHaveLength(1);
    const across = settOf({ kind: 'stripes', along: 'across', repeat: 0.1, roles: flannel.roles });
    expect(across.warp).toHaveLength(1);
    expect(across.weft.length).toBeGreaterThan(1);
  });
});

describe('each piece\'s pattern direction (R44)', () => {
  it('an upright piece runs straight down; a slanted sleeve turns with it', () => {
    const upright = axisOf(['M 100 100 L 120 100 L 120 200 L 100 200 Z']);
    expect(upright.long).toBeGreaterThan(2);
    expect(Math.abs(upright.turn)).toBeLessThan(1);
    // A sleeve hanging down and out to the right, 15° from straight down.
    const t = (15 * Math.PI) / 180;
    const p = (along, side) => `${(100 + along * Math.sin(t) + side * Math.cos(t)).toFixed(2)} ${(100 + along * Math.cos(t) - side * Math.sin(t)).toFixed(2)}`;
    const sleeve = axisOf([`M ${p(0, -10)} L ${p(0, 10)} L ${p(100, 10)} L ${p(100, -10)} Z`]);
    // Its pattern's "down" (0, 1) turned by `turn` degrees points along it.
    const r = (sleeve.turn * Math.PI) / 180;
    expect(-Math.sin(r)).toBeCloseTo(Math.sin(t), 2);
    expect(Math.cos(r)).toBeCloseTo(Math.cos(t), 2);
    // Its top end is the shoulder end.
    expect(sleeve.top[1]).toBeLessThan(110);
  });
});

describe('the avatar wears an item drawn in its pattern (R44)', () => {
  const look = lookOf(defaultAvatar('man'));
  const shirt = { id: 'mine', type: 'longSleeveShirt', colors: { base: '#68727b', print: '#253241', more: ['#d8d9d6', '#2d4d63'] }, source: 'closet', show: 'drawn', pattern: flannel };

  it('the shirt fills with its plaid; its sleeves turn along the arms and the torso stays upright', () => {
    const svg = renderAvatar(look, { top: shirt });
    const transforms = [...svg.matchAll(/<pattern id="qd-shirt-long(-sleeve)?-weave-\d+"[^>]*patternTransform="([^"]*)"/g)];
    expect(transforms.length).toBe(3); // the torso and both sleeves
    const torso = transforms.find((m) => !m[1]);
    expect(torso[2]).not.toContain('rotate');
    expect(transforms.filter((m) => m[1]).every((m) => m[2].includes('rotate'))).toBe(true);
    // One brushed fuzz for the garment.
    expect(svg.match(/<pattern id="qd-fuzz-\d+"/g)).toHaveLength(1);
  });

  it('unlike a photo, a drawn shirt keeps its collar points, buttons and pocket, in its ground color\'s lines', () => {
    const body = bodyFor(look.body, look.bodyType);
    const svg = renderAvatar(look, { top: shirt });
    for (const s of [-1, 1]) expect(svg).toContain(collarWing(body, s));
    expect(svg).toContain('a 2.4 2.4 0 1 0');
    // Shading darkens the pattern rather than covering it.
    expect(svg).toContain('mix-blend-mode:multiply');
  });

  it('the item\'s choice decides: Drawn with a woven reading draws it; Drawn and solid, or not yet read, draws its colors; Photo shows the photo', () => {
    const photo = { patch: 'P', fit: () => 'F' };
    expect(showAs(shirt, photo)).toBe('weave');
    expect(showAs({ ...shirt, pattern: { kind: 'solid' } }, photo)).toBeNull();
    expect(showAs({ ...shirt, pattern: { kind: 'other' } }, photo)).toBeNull();
    expect(showAs({ ...shirt, show: 'photo' }, photo)).toBe('photo');
    expect(showAs({ ...shirt, show: 'photo' }, undefined)).toBeNull();
    // Saved before there was a choice: its photo, when it has one.
    const { show, ...older } = shirt;
    expect(showAs(older, photo)).toBe('photo');
    expect(showAs(older, undefined)).toBeNull();
  });

  it('the rack fills a drawn item with its pattern', () => {
    const svg = rackHeader([shirt], { width: 340 });
    expect(svg).toMatch(/<pattern id="qd-icon-weave-\d+"/);
    expect(rackHeader([{ ...shirt, show: 'photo' }], { width: 340 })).not.toMatch(/icon-weave/);
  });
});
