// Accessories (spec.md R42, drawn in C2): cap, sun hat, beanie, scarf,
// sunglasses, and the glasses avatar option (R24). Hats sit on the head over
// the hair; eyewear sits over the eyes; the scarf wraps the neck over the
// clothes.

import { piece } from './draw.js';
import { posed } from './bodies.js';
import { smoothClosed, pt } from './shapes.js';

const at = (h) => (fx, fy) => ({ x: h.cx + h.rx * fx, y: h.cy + h.ry * fy });

// ---- Hats ----------------------------------------------------------------------

function cap(body, { base, print }) {
  const p = at(body.head);
  const crown = smoothClosed([p(-1.06, -0.32), p(-0.95, -0.82), p(-0.45, -1.16), p(0.2, -1.2), p(0.78, -0.98), p(1.08, -0.5), p(1.08, -0.3), p(0, -0.42)]);
  // The brim points forward and a little to the viewer's right.
  const brim = smoothClosed([p(-0.9, -0.36), p(-0.2, -0.46), p(0.7, -0.44), p(1.32, -0.3), p(1.24, -0.16), p(0.6, -0.2), p(-0.2, -0.24), p(-0.86, -0.26)]);
  return piece({
    name: 'cap',
    parts: [crown],
    base,
    print,
    shade: [{ d: smoothClosed([p(0.3, -1.16), p(0.9, -0.9), p(1.1, -0.4), p(0.6, -0.42), p(0.5, -0.9)]), tone: 'shadow' }],
    lines: [
      { d: `M ${pt(p(-0.05, -1.2))} Q ${pt(p(0.02, -0.8))} ${pt(p(0, -0.44))}`, tone: 'deep', width: 1.8 },
      { d: `M ${pt(p(-0.6, -1.06))} Q ${pt(p(-0.5, -0.72))} ${pt(p(-0.56, -0.4))}`, tone: 'shadow', width: 1.6 },
      { d: `M ${pt(p(-0.04, -1.22))} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`, tone: 'deep', width: 2 },
    ],
  }) + piece({ name: 'brim', parts: [brim], base, shade: [{ d: brim, tone: 'deep', opacity: 0.35 }] });
}

function sunHat(body, { base, print }) {
  const p = at(body.head);
  const brim = smoothClosed([p(-2.1, -0.32), p(-1.4, -0.56), p(0, -0.64), p(1.4, -0.56), p(2.1, -0.32), p(1.5, -0.08), p(0, -0.02), p(-1.5, -0.08)]);
  const crown = smoothClosed([p(-0.98, -0.42), p(-0.92, -0.96), p(-0.4, -1.28), p(0.4, -1.28), p(0.92, -0.96), p(0.98, -0.42), p(0, -0.36)]);
  return piece({ name: 'hat-brim', parts: [brim], base, print, shade: [{ d: smoothClosed([p(0, -0.2), p(1.5, -0.3), p(2.1, -0.32), p(1.5, -0.08), p(0, -0.02)]), tone: 'shadow', opacity: 0.8 }], lines: [{ d: `M ${pt(p(-1.6, -0.3))} Q ${pt(p(0, -0.22))} ${pt(p(1.6, -0.3))}`, tone: 'shadow', width: 1.6, opacity: 0.7 }] })
    + piece({
      name: 'hat-crown',
      parts: [crown],
      base,
      print,
      shade: [{ d: smoothClosed([p(0.3, -1.26), p(0.92, -0.96), p(0.98, -0.42), p(0.5, -0.4)]), tone: 'shadow' }],
      lines: [{ d: `M ${pt(p(-0.97, -0.56))} Q ${pt(p(0, -0.46))} ${pt(p(0.97, -0.56))}`, tone: 'deep', width: 7, opacity: 0.85 }],
    });
}

function beanie(body, { base, print }) {
  const p = at(body.head);
  const dome = smoothClosed([p(-1.06, -0.18), p(-1.02, -0.72), p(-0.6, -1.14), p(0, -1.26), p(0.6, -1.14), p(1.02, -0.72), p(1.06, -0.18), p(0, -0.3)]);
  const cuff = smoothClosed([p(-1.1, -0.42), p(0, -0.56), p(1.1, -0.42), p(1.1, -0.1), p(0, -0.22), p(-1.1, -0.1)]);
  const ribs = Array.from({ length: 11 }, (_, i) => {
    const f = -0.9 + i * 0.18;
    return `M ${pt(p(f, -0.5))} L ${pt(p(f, -0.18))}`;
  }).join(' ');
  return piece({ name: 'beanie', parts: [dome], base, print, shade: [{ d: smoothClosed([p(0.3, -1.2), p(1.0, -0.72), p(1.06, -0.3), p(0.6, -0.4)]), tone: 'shadow' }], lines: [0, 1, 2, 3].map((i) => ({ d: `M ${pt(p(-0.6 + i * 0.4, -1.1 + Math.abs(i - 1.5) * 0.08))} Q ${pt(p(-0.6 + i * 0.4, -0.8))} ${pt(p(-0.65 + i * 0.43, -0.5))}`, tone: 'shadow', width: 1.6 })) })
    + piece({ name: 'beanie-cuff', parts: [cuff], base, lines: [{ d: ribs, tone: 'shadow', width: 1.6 }] });
}

// ---- Scarf ---------------------------------------------------------------------

// Wrapped once around the neck, one end hanging down the front and one over
// the viewer-right shoulder. The print color draws stripes.
function scarf(body, { base, print }) {
  const cx = body.head.cx;
  const n = body.neck;
  const q = (s, x, y) => posed(body, s, cx + x, y);
  const wrap = smoothClosed([q(-1, -n.half - 14, n.bottom - 30), q(0, 0, n.bottom - 18), q(1, n.half + 14, n.bottom - 30), q(1, n.half + 22, n.bottom - 4), q(0, 0, n.bottom + 14), q(-1, -n.half - 22, n.bottom - 4)]);
  const front = smoothClosed([q(-1, -10, n.bottom + 4), q(-1, 8, n.bottom + 2), q(-1, 4, body.chest.y + 60), q(-1, -20, body.chest.y + 62), q(-1, -22, n.bottom + 20)]);
  const back = smoothClosed([q(1, n.half + 6, n.bottom - 8), q(1, n.half + 30, n.bottom - 2), q(1, n.half + 40, body.chest.y - 6), q(1, n.half + 22, body.chest.y - 2)]);
  const fringe = Array.from({ length: 6 }, (_, i) => {
    const a = q(-1, -19 + i * 4.6, body.chest.y + 61);
    return `M ${pt(a)} l 0 9`;
  }).join(' ');
  const stripes = print
    ? [0, 1].map((i) => `M ${pt(q(-1, -21, body.chest.y + 30 + i * 12))} L ${pt(q(-1, 5, body.chest.y + 28 + i * 12))}`).join(' ')
    : '';
  return piece({
    name: 'scarf',
    parts: [back, wrap, front],
    base,
    shade: [{ d: wrap, tone: 'shadow', opacity: 0.35 }, { d: back, tone: 'shadow', opacity: 0.6 }],
    lines: [
      { d: `M ${pt(q(-1, -n.half - 10, n.bottom - 14))} Q ${pt(q(0, 0, n.bottom - 2))} ${pt(q(1, n.half + 10, n.bottom - 14))}`, tone: 'shadow', width: 2 },
      { d: fringe, tone: 'deep', width: 2 },
      ...(stripes ? [{ d: stripes, tone: 'light', width: 5, opacity: 0.5 }] : []),
    ],
  });
}

// ---- Eyewear -------------------------------------------------------------------

// Rounded rectangular frames over the eyes, with temples running back to
// the ears. Glasses have clear lenses; sunglasses are tinted.
function eyewear(body, frame, tinted) {
  const h = body.head;
  const sc = h.rx / 53;
  const ey = h.cy + 6 * sc;
  const rim = (side) => {
    const ex = h.cx + side * 21 * sc;
    const w = 15 * sc;
    const t = 12 * sc;
    const b = 11 * sc;
    return `M ${ex - w} ${ey - t + 4} Q ${ex - w} ${ey - t} ${ex - w + 4} ${ey - t} L ${ex + w - 4} ${ey - t} Q ${ex + w} ${ey - t} ${ex + w} ${ey - t + 4} L ${ex + w - 1} ${ey + b - 5} Q ${ex + w - 2} ${ey + b} ${ex + w - 7} ${ey + b} L ${ex - w + 7} ${ey + b} Q ${ex - w + 2} ${ey + b} ${ex - w + 1} ${ey + b - 5} Z`;
  };
  const lens = (side) => `<path d="${rim(side)}" fill="${tinted ? '#1d1f26' : '#ffffff'}" opacity="${tinted ? 0.86 : 0.12}"/>`;
  const glint = (side) => tinted
    ? `<path d="M ${h.cx + side * 21 * sc - 9 * sc} ${ey - 6 * sc} l ${7 * sc} ${-3 * sc}" stroke="#ffffff" stroke-width="${2.2 * sc}" stroke-linecap="round" opacity="0.7"/>`
    : '';
  const stroke = `fill="none" stroke="${frame}" stroke-width="${2.8 * sc}" stroke-linejoin="round"`;
  const bridge = `M ${h.cx - 6 * sc} ${ey - 6 * sc} Q ${h.cx} ${ey - 10 * sc} ${h.cx + 6 * sc} ${ey - 6 * sc}`;
  const temples = [-1, 1].map((side) => `M ${h.cx + side * 36 * sc} ${ey - 8 * sc} L ${h.cx + side * h.rx * 0.98} ${ey - 6 * sc}`).join(' ');
  return `<g>${lens(-1)}${lens(1)}<path d="${rim(-1)} ${rim(1)} ${bridge} ${temples}" ${stroke} stroke-linecap="round"/>${glint(-1)}${glint(1)}</g>`;
}

export const glasses = (body, color = '#2c2a2e') => eyewear(body, color, false);
const sunglasses = (body, { base }) => ({ svg: eyewear(body, base, true) });

export const ACCESSORIES = {
  cap: { slot: 'hat', draw: (b, c) => ({ svg: cap(b, c) }) },
  sunHat: { slot: 'hat', draw: (b, c) => ({ svg: sunHat(b, c) }) },
  beanie: { slot: 'hat', draw: (b, c) => ({ svg: beanie(b, c) }) },
  scarf: { slot: 'scarf', draw: (b, c) => ({ svg: scarf(b, c) }) },
  sunglasses: { slot: 'eyewear', draw: sunglasses },
};
