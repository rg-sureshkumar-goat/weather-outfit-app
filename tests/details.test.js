// C8b step 4: a button shirt's details (R44). The button color read from
// generated shirts, and the chest pockets the User picks, as the avatar
// draws them. The Developer's flannel and green shirt are checked in the
// browser.

import { describe, expect, it } from 'vitest';
import { readButtons } from '../src/vision/details.js';
import { renderAvatar } from '../src/art/avatar.js';
import { defaultAvatar, lookOf } from '../src/store/avatar.js';
import { colorDistance } from '../src/recommend/color.js';
import { seededRng } from './helpers.js';

const W = 300;
const H = 400;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const OLIVE = '#65694a';
const CREAM = '#dfdcbd';

// A shirt front (x 30–270, y 20–390) in `fabric(x, y)`, with buttons of
// radius 4 down the middle every 60 px, in `button`, and a little noise.
function shirt(fabric, button, seed = 3) {
  const random = seededRng(seed);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (x < 30 || x >= W - 30 || y < 20 || y >= H - 10) continue;
      // Buttons at y = 70, 130, … 310.
      const k = Math.round((y - 70) / 60);
      const onButton = button && k >= 0 && k <= 4 && Math.hypot(x - 150, y - (70 + 60 * k)) <= 4;
      const c = rgb(onButton ? button : fabric(x, y));
      const n = (random() - 0.5) * 6;
      out.set([c[0] + n, c[1] + n, c[2] + n, 255], (y * W + x) * 4);
    }
  }
  return out;
}

describe('the button color (R44)', () => {
  it('cream buttons down a plain olive shirt are read', () => {
    const r = readButtons(shirt(() => OLIVE, CREAM), W, H, { base: OLIVE, print: null, more: [] });
    expect(r.buttons).not.toBeNull();
    expect(colorDistance(r.buttons, CREAM)).toBeLessThan(6);
  });

  it('with no buttons, or buttons in one of the fabric\'s own colors, the app isn\'t sure', () => {
    expect(readButtons(shirt(() => OLIVE, null), W, H, { base: OLIVE, print: null, more: [] }).buttons).toBeNull();
    // A plaid's white crossings make spots too, but in the fabric's white.
    const plaid = (x, y) => ((x % 40 < 8) && (y % 40 < 8) ? '#e9e8de' : (x % 40 < 8 || y % 40 < 8 ? '#8f939a' : '#1c2b45'));
    expect(readButtons(shirt(plaid, '#e9e8de'), W, H, { base: '#1c2b45', print: '#e9e8de', more: ['#8f939a'] }).buttons).toBeNull();
  });
});

describe('chest pockets, as the User picks them (R44)', () => {
  const man = lookOf(defaultAvatar('man'));
  const woman = lookOf(defaultAvatar('woman'));
  const shirtItem = (details) => ({ id: 'mine', type: 'longSleeveShirt', colors: { base: OLIVE, print: null }, source: 'closet', ...(details ? { details } : {}) });
  const flapButtons = (svg) => (svg.match(new RegExp(`fill="${CREAM}"`, 'g')) || []).length;

  it('two pockets with flaps get a button each, in the shirt\'s button color', () => {
    const plain = renderAvatar(man, { top: shirtItem({ pockets: 2, flaps: true, buttons: CREAM }) });
    const none = renderAvatar(man, { top: shirtItem({ pockets: 0, flaps: false, buttons: CREAM }) });
    // The placket's and cuffs' buttons are cream either way; the flaps add two.
    expect(flapButtons(plain) - flapButtons(none)).toBe(2);
  });

  it('none, one or two pockets draw that many; with no choice, the standard drawing stays', () => {
    const pockets = (details, look = man) => renderAvatar(look, { top: shirtItem(details) }).length;
    const none = pockets({ pockets: 0, flaps: false });
    const one = pockets({ pockets: 1, flaps: false });
    const two = pockets({ pockets: 2, flaps: false });
    expect(one).toBeGreaterThan(none);
    expect(two).toBeGreaterThan(one);
    // The female body draws pockets too when picked, though its standard
    // drawing has none.
    expect(pockets({ pockets: 2, flaps: true }, woman)).toBeGreaterThan(pockets(undefined, woman));
  });
});
