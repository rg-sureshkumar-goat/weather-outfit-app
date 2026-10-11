// The face (R24, R40, R43): head outline and ears, eyes, brows, nose, mouth,
// facial hair and the extras (eyelashes, freckles, beauty mark, face lines,
// makeup). Original artwork. Each feature is a named option; with no options
// given, each face set (A female, B male) draws the approved C2 face.
//
// Points on the face are in px from the head center, multiplied by `sc`
// (the head's size relative to face B); the head outline uses head units,
// like the hairstyles: p(fx, fy) with fx in head half-widths and fy in head
// half-heights.

import { piece, uid } from './draw.js';
import { shades, mix } from './paint.js';
import { smoothClosed } from './shapes.js';

// ---- Options ------------------------------------------------------------------

// Face shapes. Widths at the temples, cheekbones, jaw and chin, and the
// chin's depth. The jaw is a multiple of the face set's own jaw, so the
// female and male faces keep their character in every shape. The crown is
// the same for every shape, so hairstyles sit on all of them.
export const FACE_SHAPES = {
  oval: { temple: 1.0, cheek: 0.97, jaw: 1.0, chin: 0.36, chinY: 1.02 },
  round: { temple: 1.0, cheek: 1.0, jaw: 1.14, chin: 0.48, chinY: 0.98 },
  square: { temple: 1.0, cheek: 0.98, jaw: 1.2, chin: 0.5, chinY: 1.0, corner: true },
  heart: { temple: 1.03, cheek: 0.96, jaw: 0.84, chin: 0.22, chinY: 1.05 },
  oblong: { temple: 0.95, cheek: 0.92, jaw: 0.98, chin: 0.36, chinY: 1.1 },
  diamond: { temple: 0.9, cheek: 1.0, jaw: 0.84, chin: 0.26, chinY: 1.04 },
  triangle: { temple: 0.9, cheek: 0.95, jaw: 1.2, chin: 0.46, chinY: 1.0 },
  rectangle: { temple: 0.96, cheek: 0.94, jaw: 1.18, chin: 0.46, chinY: 1.09, corner: true },
};

// Eye shapes, as changes to the face set's own eyes: width, lid height,
// lower-lid depth, tilt of the outer corner (up is positive), the crease
// above the lid, and the distance between the eyes.
export const EYE_SHAPES = {
  almond: {},
  round: { w: 0.94, top: 1.18, bottom: 1.22 },
  hooded: { top: 0.9, crease: 'hooded' },
  monolid: { w: 1.04, top: 0.8, bottom: 0.84, crease: 'none' },
  upturned: { tilt: 3.2 },
  downturned: { tilt: -3.2 },
  deepSet: { top: 0.92, crease: 'deep' },
  closeSet: { spacing: 17.5 },
};

export const EYE_COLORS = {
  darkBrown: '#2a1d17',
  brown: '#5b3a24',
  amber: '#8f5f1d',
  hazel: '#6e6234',
  green: '#3d6b3e',
  blue: '#3e6fa0',
  lightBlue: '#7fa7cc',
  grey: '#76808a',
};

// Eyebrows: inner end, arch (control point) and outer end as [x, y] offsets
// from the brow's center (x toward the outer side), the stroke width, and
// an angled peak or a fuzzy edge.
export const BROWS = {
  straight: { inner: [-12, 1], arch: [1, -3.5], outer: [13, 1], width: 5.8 },
  softArch: { inner: [-11, 3], arch: [1, -6], outer: [13, 1.5], width: 4 },
  highArch: { inner: [-11, 3.5], arch: [4, -10], outer: [13, 2.5], width: 4 },
  rounded: { inner: [-11, 2.5], arch: [0, -8], outer: [12, 3], width: 4.6 },
  thick: { inner: [-12, 1.5], arch: [1, -5], outer: [13, 1.5], width: 7.6 },
  thin: { inner: [-10, 2.5], arch: [1, -5], outer: [12, 1.5], width: 2.6 },
  bushy: { inner: [-12.5, 1], arch: [1, -4.5], outer: [13.5, 1.5], width: 7, fuzzy: true },
  angled: { inner: [-11, 1.5], arch: [5, -3], outer: [14, 2.5], width: 4.8, angled: true },
};

export const NOSES = ['straight', 'button', 'rounded', 'wide', 'narrow', 'upturned', 'aquiline', 'flat'];

// Mouths: half-width, opening depth, outline width, and how full the upper
// and lower lips are (their thickness at the center, in px; 0 is just the
// outline). Lips are filled shapes that share the opening's edges and taper
// to nothing at the corners, so they never reach past the mouth.
export const MOUTHS = {
  medium: { w: 19, depth: 18, line: 2.2, upper: 0, lower: 0 },
  full: { w: 17, depth: 18, line: 2.8, upper: 1.5, lower: 3.5 },
  thin: { w: 18, depth: 13, line: 1.8, upper: 0, lower: 0 },
  wide: { w: 23, depth: 17, line: 2.2, upper: 0, lower: 0 },
  small: { w: 13.5, depth: 14, line: 2.2, upper: 0, lower: 0 },
  heartShaped: { w: 17, depth: 17, line: 2.6, upper: 3, lower: 3.5, bow: true },
  fullLower: { w: 18, depth: 18, line: 2.4, upper: 1.5, lower: 5.5 },
  fullUpper: { w: 18, depth: 18, line: 2.4, upper: 4, lower: 2.5 },
};

// With lipstick, every mouth shows at least this much lip.
const LIPSTICK_MIN = { upper: 2, lower: 3 };

// Ears: size, how far they stand out, and a pointed top, rounder shape or
// attached lobe.
export const EARS = {
  average: {},
  small: { size: 0.8 },
  large: { size: 1.22 },
  round: { round: true },
  pointed: { pointed: true },
  closeToHead: { out: 0.6 },
  protruding: { out: 1.4 },
  attachedLobes: { attached: true },
};

export const LASHES = ['natural', 'medium', 'long'];
export const FRECKLES = { none: 0, light: 12, medium: 24, heavy: 42 };
export const BEAUTY_MARKS = { none: null, cheek: [24, 26], chin: [-9, 56], aboveLip: [12, 36] };
export const FACE_LINES = ['none', 'smile', 'forehead', 'crowsFeet', 'all'];

// Makeup colors.
export const LIP_COLORS = { none: null, nude: '#c98b7a', pink: '#d9668b', rose: '#c2566b', red: '#c2262e', berry: '#8c2a4d', coral: '#f07a5a', plum: '#6e2a4f', brown: '#8a4b3a' };
export const EYESHADOWS = { none: null, taupe: '#8d7b6c', bronze: '#a4693a', gold: '#c9a24a', rose: '#c7788a', plum: '#7d4c7a', navy: '#3a4f7a', green: '#5f7d52', smoky: '#5c5c66' };
export const EYELINERS = ['none', 'thin', 'winged'];
export const BLUSHES = { none: null, peach: '#f2a07b', pink: '#ec8aa3', rose: '#d9667a', berry: '#b2476b' };

// What each face set draws when no option is chosen: the approved C2 faces.
export const FACE_DEFAULTS = {
  A: { shape: 'oval', eyeShape: 'almond', eyeColor: 'darkBrown', brows: 'softArch', nose: 'straight', mouth: 'full', ears: 'average', lashes: 'medium', freckles: 'none', mark: 'none', lines: 'none', lips: 'none', eyeshadow: 'none', eyeliner: 'none', blush: 'none' },
  B: { shape: 'oval', eyeShape: 'almond', eyeColor: 'darkBrown', brows: 'straight', nose: 'straight', mouth: 'medium', ears: 'average', lashes: 'natural', freckles: 'none', mark: 'none', lines: 'none', lips: 'none', eyeshadow: 'none', eyeliner: 'none', blush: 'none' },
};

export const faceOptions = (set, features = {}) => ({ ...FACE_DEFAULTS[set] ?? FACE_DEFAULTS.B, ...features });

// A seeded random source, so freckles never move between renders.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

// ---- Head and ears ------------------------------------------------------------

// The head's outline widths for a shape: temple, cheek, jaw, chin, chin depth.
function geometry(h, shapeName) {
  const shape = FACE_SHAPES[shapeName] ?? FACE_SHAPES.oval;
  const p = (fx, fy) => ({ x: h.cx + h.rx * fx, y: h.cy + h.ry * fy });
  return { p, shape, T: shape.temple, C: shape.cheek, J: 0.8 * h.jaw * shape.jaw, N: shape.chin, Y: shape.chinY };
}

// Head outline: a rounded crown narrowing to the jaw and chin.
export function headPath(h, shapeName = 'oval') {
  const { p, shape, T, C, J, N, Y } = geometry(h, shapeName);
  const right = [p(T, -0.2), p(C, 0.3), p(J, 0.72), ...(shape.corner ? [p(J * 0.9, 0.87)] : []), p(N, Y - 0.05)];
  const left = [...right].reverse().map((q) => ({ x: 2 * h.cx - q.x, y: q.y }));
  return smoothClosed([p(0, -1), p(0.74, -0.8), ...right, p(0, Y), ...left, p(-0.74, -0.8)]);
}

function ears(h, skin, shapeName, earName) {
  const { T, C } = geometry(h, shapeName);
  const e = EARS[earName] ?? {};
  // The ears sit on the side of the head between the temple and cheekbone.
  const at = 0.97 + (T - 1) * 0.4 + (C - 0.97) * 0.6;
  const k = e.size ?? 1;
  const o = (e.out ?? 1) * k;
  const ear = (s) => {
    const x = h.cx + s * h.rx * at;
    const y = h.cy + h.ry * 0.1;
    let d;
    if (e.round) d = `M ${x} ${y - 15 * k} C ${x + s * 15 * o} ${y - 15 * k} ${x + s * 15 * o} ${y + 12 * k} ${x + s * 2} ${y + 14 * k} Z`;
    else if (e.pointed) d = `M ${x} ${y - 14 * k} Q ${x + s * 6 * o} ${y - 21 * k} ${x + s * 11 * o} ${y - 20.5 * k} Q ${x + s * 14.5 * o} ${y - 12 * k} ${x + s * 13.5 * o} ${y - 1 * k} C ${x + s * 12.5 * o} ${y + 9 * k} ${x + s * 7 * o} ${y + 15 * k} ${x + s * 2} ${y + 15 * k} Z`;
    else if (e.attached) d = `M ${x} ${y - 15 * k} C ${x + s * 13 * o} ${y - 18 * k} ${x + s * 13 * o} ${y + 6 * k} ${x + s * 1} ${y + 11 * k} Z`;
    else d = `M ${x} ${y - 15 * k} C ${x + s * 13 * o} ${y - 18 * k} ${x + s * 14 * o} ${y + 8 * k} ${x + s * 2} ${y + 15 * k} Z`;
    const inner = `M ${x + s * 3} ${y - 8 * k} C ${x + s * 9 * o} ${y - 8 * k} ${x + s * 9 * o} ${y + 4 * k} ${x + s * 3} ${y + 7 * k}`;
    return piece({ parts: [d], base: skin, outline: 2, name: 'ear', lines: [{ d: inner, tone: 'shadow', width: 2.4 }] });
  };
  return ear(-1) + ear(1);
}

// The ears and head, drawn with the rest of the skin behind the clothes.
export function headSkin(h, skin, set, features = {}) {
  const opts = faceOptions(set, features);
  const head = piece({
    parts: [headPath(h, opts.shape)],
    base: skin,
    name: 'head',
    shade: [
      { d: `M ${h.cx + h.rx * 0.45} ${h.cy - h.ry} C ${h.cx + h.rx * 1.2} ${h.cy - h.ry * 0.4} ${h.cx + h.rx * 1.1} ${h.cy + h.ry * 0.8} ${h.cx + h.rx * 0.2} ${h.cy + h.ry * 1.1} C ${h.cx + h.rx * 0.95} ${h.cy + h.ry * 0.4} ${h.cx + h.rx * 0.95} ${h.cy - h.ry * 0.3} ${h.cx + h.rx * 0.45} ${h.cy - h.ry} Z`, tone: 'shadow', opacity: 0.55 },
    ],
  });
  return ears(h, skin, opts.shape, opts.ears) + head;
}

// ---- Facial hair --------------------------------------------------------------

// Facial hair (R24), in the hair color, Male only (R40, enforced on the
// saved values). Stubble is a see-through shadow with fine dots; a beard is
// a full shape from the sideburns around the jaw, with a mustache under the
// nose. Both follow the face shape's jaw. The mouth is drawn on top of both.
function facialHair(h, hairColor, kind, shapeName) {
  if (!kind || kind === 'none') return '';
  const { p, T, C, J, N, Y } = geometry(h, shapeName);
  const inner = [p(0.86, 0.04), p(0.8, 0.36), p(0.58, 0.5), p(0.28, 0.5), p(0, 0.53), p(-0.28, 0.5), p(-0.58, 0.5), p(-0.8, 0.36), p(-0.86, 0.04)];
  const mirror = (pts) => [...pts, ...[...pts].reverse().slice(1).map((q) => ({ x: 2 * h.cx - q.x, y: q.y }))];
  if (kind === 'stubble') {
    // Stays just inside the jaw line, so none of it shows on the neck.
    const jawLine = mirror([p(-T * 0.95, 0.0), p(-C * 0.99, 0.3), p(-J * 0.975, 0.71), p(-N * 0.972, Y - 0.07), p(0, Y - 0.02)]);
    const d = smoothClosed([...jawLine, ...inner]);
    const id = uid('stubble');
    const rand = seeded(12345);
    let dots = '';
    for (let i = 0; i < 110; i++) {
      const q = p(-0.96 + rand() * 1.92, rand() * Y);
      dots += `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="0.9" fill="${hairColor}" opacity="0.55"/>`;
    }
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${hairColor}" opacity="0.2"/><g clip-path="url(#${id})">${dots}</g>`;
  }
  const outer = mirror([p(-T * 0.97, 0.0), p(-C * 1.031, 0.32), p(-(J * 1.05 + 0.04), 0.78), p(-N * 1.167, Y + 0.06), p(0, Y + 0.13)]);
  const d = smoothClosed([...outer, ...inner]);
  // Beard: soft strokes for texture and a shadow on the viewer's right.
  const strokes = [];
  for (let i = 0; i < 26; i++) {
    const fx = -0.9 + (i / 25) * 1.8;
    const top = Math.abs(fx) > 0.6 ? 0.2 : 0.62;
    const a = p(fx, top + ((i * 0.37) % 0.3));
    strokes.push({ d: `M ${a.x} ${a.y} q ${fx * 2} 7 ${fx * 3} 13`, tone: i % 3 ? 'deep' : 'light', width: 1.6, opacity: 0.8 });
  }
  return piece({
    parts: [d],
    base: hairColor,
    name: 'beard',
    outline: 2,
    shade: [{ d: smoothClosed([p(0.35, 0.95), p(0.9, 0.5), p(1.0, 0.1), p(0.8, 0.4), p(0.4, 0.75)]), tone: 'shadow', opacity: 0.8 }],
    lines: strokes,
  });
}

// ---- Eyes, lashes, brows ------------------------------------------------------

const LID = '#2a201c';

function eye(h, side, set, opts, s) {
  const sc = h.rx / 53;
  const shape = EYE_SHAPES[opts.eyeShape] ?? {};
  const iris = EYE_COLORS[opts.eyeColor] ?? EYE_COLORS.darkBrown;
  const ex = h.cx + side * (shape.spacing ?? 21) * sc;
  const ey = h.cy + 6 * sc;
  const baseTop = (set === 'A' ? 12 : 11) * sc;
  const w = (set === 'A' ? 13 : 12.5) * sc * (shape.w ?? 1);
  const top = baseTop * (shape.top ?? 1);
  const bottom = 8 * sc * (shape.bottom ?? 1);
  // The outer corner rises (or drops) by the tilt; the inner corner moves a
  // little the other way.
  const tilt = (shape.tilt ?? 0) * sc;
  const outerY = ey - tilt;
  const innerY = ey + tilt * 0.4;
  const L = { x: ex - w, y: side < 0 ? outerY : innerY };
  const R = { x: ex + w, y: side < 0 ? innerY : outerY };
  const mid = (L.y + R.y) / 2 - ey;
  const crease = shape.crease ?? 'normal';
  const outer = side < 0 ? L : R;
  let out = '';

  // Eyeshadow on the lid, under everything else.
  const shadowColor = EYESHADOWS[opts.eyeshadow];
  if (shadowColor) {
    out += `<path d="M ${L.x - 3.5 * sc} ${L.y + 0.5 * sc} Q ${ex} ${ey - top - 22 * sc + mid} ${R.x + 3.5 * sc} ${R.y + 0.5 * sc} Q ${ex} ${ey - top + mid} ${L.x - 3.5 * sc} ${L.y + 0.5 * sc} Z" fill="${mix(shadowColor, s.base, 0.1)}" opacity="0.9"/>`;
  }
  if (crease === 'deep') {
    // A crescent of shadow between the lid and the brow bone.
    out += `<path d="M ${L.x - 2 * sc} ${L.y - 1 * sc} Q ${ex} ${ey - top - 12 * sc + mid} ${R.x + 2 * sc} ${R.y - 1 * sc} Q ${ex} ${ey - top - 1 * sc + mid} ${L.x - 2 * sc} ${L.y - 1 * sc} Z" fill="${s.shadow}" opacity="0.6"/>`;
  }
  const d = `M ${L.x} ${L.y} C ${ex - w * 0.7} ${ey - top + mid} ${ex + w * 0.7} ${ey - top + mid} ${R.x} ${R.y} C ${ex + w * 0.6} ${ey + bottom + mid} ${ex - w * 0.6} ${ey + bottom + mid} ${L.x} ${L.y} Z`;
  const id = uid('eye');
  const ix = ex + side * 1.5 * sc;
  // Under a hooded lid the highlight sits lower, so it stays below the lid.
  const hy = crease === 'hooded' ? 2.5 * sc : 0;
  out += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
  out += `<path d="${d}" fill="#fbfaf7"/>`;
  out += `<g clip-path="url(#${id})"><circle cx="${ix}" cy="${ey + 0.5 * sc}" r="${8.6 * sc}" fill="${iris}"/>`
    + `<circle cx="${ix}" cy="${ey + 0.5 * sc}" r="${4.4 * sc}" fill="#0d0a09"/>`
    + `<circle cx="${ix + 3 * sc}" cy="${ey - 3 * sc + hy}" r="${2.6 * sc}" fill="#fff"/>`
    + `<circle cx="${ix - 3 * sc}" cy="${ey + 3.4 * sc}" r="${1.2 * sc}" fill="#fff" opacity="0.8"/>`
    + `<path d="M ${ex - w} ${ey - top * 0.55} L ${ex + w} ${ey - top * 0.55}" stroke="${s.shadow}" stroke-width="${3 * sc}" opacity="0.35"/></g>`;
  // Upper lid line, heavier with eyeliner.
  const liner = opts.eyeliner === 'none' ? 2.6 : 3.6;
  out += `<path d="M ${L.x - 1 * sc} ${L.y + 0.5 * sc} C ${ex - w * 0.7} ${ey - top - 0.5 * sc + mid} ${ex + w * 0.7} ${ey - top - 0.5 * sc + mid} ${R.x + 1 * sc} ${R.y}" fill="none" stroke="${LID}" stroke-width="${liner * sc}" stroke-linecap="round"/>`;
  if (opts.eyeliner === 'winged') {
    out += `<path d="M ${outer.x - side * 3 * sc} ${outer.y - 1.5 * sc} L ${outer.x + side * 6 * sc} ${outer.y - 5 * sc} L ${outer.x} ${outer.y + 0.5 * sc} Z" fill="${LID}"/>`;
  }
  if (crease === 'hooded') {
    // A fold of skin lowers over the lid; its edge becomes the lid line.
    const edge = `M ${L.x - 1.5 * sc} ${L.y + 0.5 * sc} Q ${ex} ${ey - top * 1.25 + mid} ${R.x + 1.5 * sc} ${R.y}`;
    // The fold is a crescent from its edge up over the lid line, tinted with
    // eyeshadow when there is some.
    out += `<path d="${edge} Q ${ex} ${ey - top - 9 * sc + mid} ${L.x - 1.5 * sc} ${L.y + 0.5 * sc} Z" fill="${shadowColor ? mix(shadowColor, s.base, 0.1) : s.base}"/>`;
    out += `<path d="${edge}" fill="none" stroke="${LID}" stroke-width="${2.8 * sc}" stroke-linecap="round"/>`;
    out += `<path d="M ${ex - w * 0.8} ${ey - top * 0.95 + mid} Q ${ex} ${ey - top * 1.25 + mid} ${ex + w * 0.85} ${ey - top * 0.9 + mid}" fill="none" stroke="${s.shadow}" stroke-width="${1.6 * sc}" stroke-linecap="round"/>`;
  } else if (crease !== 'none') {
    const lift = crease === 'deep' ? 1.5 * sc : 0;
    out += `<path d="M ${ex - w * 0.7} ${ey - top - 4 * sc - lift} Q ${ex} ${ey - top - 8 * sc - lift} ${ex + w * 0.75} ${ey - top - 3.5 * sc - lift}" fill="none" stroke="${crease === 'deep' ? s.deep : s.shadow}" stroke-width="${1.6 * sc}" stroke-linecap="round"/>`;
  }

  // Lashes at the outer corner: none, two flicks, or three longer ones.
  if (opts.lashes === 'medium') {
    out += `<path d="M ${outer.x} ${outer.y - 1 * sc} l ${side * 4.5 * sc} ${-3.5 * sc} M ${outer.x - side * 2.5 * sc} ${outer.y - 4 * sc} l ${side * 4 * sc} ${-4 * sc}" stroke="${LID}" stroke-width="${1.8 * sc}" stroke-linecap="round"/>`;
  } else if (opts.lashes === 'long') {
    out += `<path d="M ${outer.x} ${outer.y - 1 * sc} l ${side * 6.5 * sc} ${-4 * sc} M ${outer.x - side * 2.5 * sc} ${outer.y - 4 * sc} l ${side * 5.5 * sc} ${-5.5 * sc} M ${outer.x - side * 6 * sc} ${outer.y - 6.5 * sc} l ${side * 3.5 * sc} ${-6 * sc}" stroke="${LID}" stroke-width="${2.1 * sc}" stroke-linecap="round"/>`;
  }
  return { svg: out, ex, ey, outer, baseTop };
}

function brow(h, side, opts, hairColor, e) {
  const sc = h.rx / 53;
  const b = BROWS[opts.brows] ?? BROWS.straight;
  const color = mix(hairColor, '#1e1a24', 0.25);
  // The brow keeps the face set's height whatever the eye shape, and
  // follows the eyes sideways.
  const by = e.ey - e.baseTop - 9 * sc;
  const at = ([x, y]) => `${e.ex + side * x * sc} ${by + y * sc}`;
  const d = b.angled ? `M ${at(b.inner)} L ${at(b.arch)} L ${at(b.outer)}` : `M ${at(b.inner)} Q ${at(b.arch)} ${at(b.outer)}`;
  const join = b.angled ? ' stroke-linejoin="round"' : '';
  let out = '';
  out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${b.width * sc}" stroke-linecap="round"${join}/>`;
  if (b.fuzzy) {
    // Short hairs along the brow's curve, slanting outward, alternating
    // above and below its edge.
    const q = (t, k) => (1 - t) ** 2 * b.inner[k] + 2 * (1 - t) * t * b.arch[k] + t ** 2 * b.outer[k];
    for (let i = 0; i < 9; i++) {
      const t = 0.06 + i * 0.11;
      const x = q(t, 0);
      const y = q(t, 1) + (i % 2 ? 2.6 : -2.6);
      out += `<path d="M ${e.ex + side * x * sc} ${by + y * sc} l ${side * 3 * sc} ${(i % 2 ? 0.6 : -1.6) * sc}" stroke="${color}" stroke-width="${1.5 * sc}" stroke-linecap="round" opacity="0.85"/>`;
    }
  }
  return out;
}

// ---- Nose -------------------------------------------------------------------------

// Each nose: the line on the viewer's right side and base, and the shadow.
function nose(h, name, s) {
  const sc = h.rx / 53;
  const P = (x, y) => `${h.cx + x * sc} ${h.cy + y * sc}`;
  const line = (d, width = 2.2) => `<path d="${d}" fill="none" stroke="${s.deep}" stroke-width="${width * sc}" stroke-linecap="round"/>`;
  const shade = (x, y, rx, ry, opacity = 0.5) => `<ellipse cx="${h.cx + x * sc}" cy="${h.cy + y * sc}" rx="${rx * sc}" ry="${ry * sc}" fill="${s.shadow}" opacity="${opacity}"/>`;
  const nostril = (x, y) => `<ellipse cx="${h.cx + x * sc}" cy="${h.cy + y * sc}" rx="${1.8 * sc}" ry="${1.2 * sc}" fill="${s.deep}" opacity="0.8"/>`;
  switch (name) {
    case 'button':
      return line(`M ${P(3, 21)} Q ${P(7, 28)} ${P(2, 30.5)} Q ${P(-2, 32)} ${P(-5, 29.5)}`) + shade(4, 26, 3, 4, 0.45);
    case 'rounded':
      return line(`M ${P(5, 15)} Q ${P(12, 28)} ${P(4, 32)} Q ${P(-1, 34)} ${P(-8, 30.5)}`) + shade(6, 26, 4.5, 6.5);
    case 'wide':
      return line(`M ${P(4, 15)} Q ${P(7, 24)} ${P(8, 28)}`) + line(`M ${P(-10, 29)} Q ${P(-7, 34.5)} ${P(0, 33)} Q ${P(7, 34.5)} ${P(10, 29)}`) + shade(5, 24, 3, 6) + nostril(-5, 31) + nostril(5, 31);
    case 'narrow':
      return line(`M ${P(3, 14)} Q ${P(6.5, 27)} ${P(2, 31)} Q ${P(-1, 32)} ${P(-4, 30)}`, 2) + shade(3.5, 24, 2, 6, 0.45);
    case 'upturned':
      return line(`M ${P(4, 15)} Q ${P(6, 24)} ${P(5, 28)} Q ${P(3, 31.5)} ${P(-5, 29)}`) + shade(4.5, 22, 2.5, 5) + nostril(-1.5, 30.5) + nostril(3, 30.5);
    case 'aquiline':
      return line(`M ${P(2, 12)} Q ${P(11, 18)} ${P(7, 26)} Q ${P(5, 31)} ${P(3, 31.5)} Q ${P(-2, 33)} ${P(-6, 30)}`) + shade(6, 21, 3, 6);
    case 'flat':
      return line(`M ${P(-9, 30)} Q ${P(0, 35)} ${P(9, 30)}`) + line(`M ${P(4, 20)} Q ${P(6, 25)} ${P(5, 28)}`, 1.8) + shade(4, 25, 3, 4, 0.4) + nostril(-4.5, 31) + nostril(4.5, 31);
    default:
      return line(`M ${P(4, 15)} Q ${P(9, 27)} ${P(3, 31)} Q ${P(-2, 33)} ${P(-6, 30)}`) + shade(5, 24, 3, 6);
  }
}

// ---- Mouth ------------------------------------------------------------------------

function mouth(h, set, opts, s, skin) {
  const sc = h.rx / 53;
  const { cx, cy } = h;
  const m = MOUTHS[opts.mouth] ?? MOUTHS.medium;
  const lipstick = LIP_COLORS[opts.lips];
  // Natural lip color comes from the face set; lipstick replaces it.
  const lip = lipstick ?? (set === 'A' ? mix(skin, '#b5485a', 0.38) : s.deep);
  const fill = lipstick ?? mix(skin, '#b5485a', set === 'A' ? 0.38 : 0.22);
  const upper = (lipstick ? Math.max(m.upper, LIPSTICK_MIN.upper) : m.upper) * sc;
  const lower = (lipstick ? Math.max(m.lower, LIPSTICK_MIN.lower) : m.lower) * sc;
  const my = cy + 42 * sc;
  const mw = m.w * sc;
  const dp = m.depth * sc;
  const L = `${cx - mw} ${my}`;
  const R = `${cx + mw} ${my}`;

  // The opening's top and bottom edges, left to right.
  const topEdge = m.bow
    ? `Q ${cx - mw * 0.45} ${my - 2 * sc} ${cx} ${my + 2.5 * sc} Q ${cx + mw * 0.45} ${my - 2 * sc} ${R}`
    : `Q ${cx} ${my + 3 * sc} ${R}`;
  const bottomEdgeRL = `Q ${cx + mw * 0.7} ${my + dp - sc} ${cx} ${my + dp} Q ${cx - mw * 0.7} ${my + dp - sc} ${L}`;
  const shape = `M ${L} ${topEdge} ${bottomEdgeRL} Z`;

  const id = uid('mouth');
  let out = `<clipPath id="${id}"><path d="${shape}"/></clipPath>`;
  out += `<path d="${shape}" fill="#5b2229"/>`;
  out += `<g clip-path="url(#${id})"><path d="M ${cx - mw} ${my - 2} L ${cx + mw} ${my - 2} L ${cx + mw} ${my + 6 * sc} Q ${cx} ${my + 9 * sc} ${cx - mw} ${my + 6 * sc} Z" fill="#fbf8f2"/>`
    + `<ellipse cx="${cx}" cy="${my + dp - sc}" rx="${mw * 0.55}" ry="${6 * sc}" fill="#c4545e"/></g>`;

  const edge = mix(fill, '#1e1a24', 0.3);
  // Natural lips are a soft tint with no edge line; lipstick is solid with a
  // fine darker edge.
  const lipOpacity = lipstick ? 1 : 0.6;
  const edgeLine = (d) => (lipstick ? `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${1.2 * sc}" stroke-linecap="round"/>` : '');
  if (upper > 0) {
    // From the left corner along the opening's top edge, then back along
    // the upper lip's outline, which rises by `upper` at the center (with a
    // Cupid's bow for the heart shape). Both meet at the corners.
    const outline = m.bow
      ? `Q ${cx + mw * 0.45} ${my - 2 * sc - 2 * upper} ${cx} ${my + 2.5 * sc - upper * 0.7} Q ${cx - mw * 0.45} ${my - 2 * sc - 2 * upper} ${L}`
      : `Q ${cx} ${my + 3 * sc - 2 * upper} ${L}`;
    out += `<path d="M ${L} ${topEdge} ${outline} Z" fill="${fill}" opacity="${lipOpacity}"/>`;
    out += edgeLine(`M ${R} ${outline}`);
  }
  if (lower > 0) {
    // Along the opening's bottom edge from the right corner, then back along
    // the lower lip's outline, `lower` deeper at the center.
    const outline = `Q ${cx - mw * 0.7} ${my + dp - sc + lower * 1.4} ${cx} ${my + dp + lower} Q ${cx + mw * 0.7} ${my + dp - sc + lower * 1.4} ${R}`;
    out += `<path d="M ${R} ${bottomEdgeRL} ${outline} Z" fill="${fill}" opacity="${lipOpacity}"/>`;
    out += edgeLine(`M ${L} ${outline}`);
  }
  // The opening's outline, in the lip color.
  out += `<path d="${shape}" fill="none" stroke="${lip}" stroke-width="${m.line * sc}" stroke-linejoin="round"/>`;
  // Smile creases at the corners.
  [-1, 1].forEach((side) => {
    out += `<path d="M ${cx + side * (mw + 3 * sc)} ${my - 5 * sc} q ${side * 3 * sc} ${5 * sc} ${side * 0.5 * sc} ${9 * sc}" fill="none" stroke="${s.shadow}" stroke-width="${1.8 * sc}" stroke-linecap="round"/>`;
  });
  return out;
}

// ---- Skin details --------------------------------------------------------------------

function freckles(h, count, skin) {
  if (!count) return '';
  const sc = h.rx / 53;
  const rand = seeded(777);
  const color = mix(skin, '#5a3220', 0.5);
  let out = '';
  for (let i = 0; i < count; i++) {
    // Across the nose and the tops of the cheeks.
    const x = (rand() * 2 - 1) * 38;
    const y = 18 + rand() * 14 - Math.abs(x) * 0.08;
    out += `<circle cx="${(h.cx + x * sc).toFixed(1)}" cy="${(h.cy + y * sc).toFixed(1)}" r="${((0.9 + rand() * 0.7) * sc).toFixed(2)}" fill="${color}" opacity="0.75"/>`;
  }
  return out;
}

function beautyMark(h, name, skin) {
  const at = BEAUTY_MARKS[name];
  if (!at) return '';
  const sc = h.rx / 53;
  return `<circle cx="${h.cx + at[0] * sc}" cy="${h.cy + at[1] * sc}" r="${1.9 * sc}" fill="${mix(skin, '#2a1a12', 0.75)}"/>`;
}

function faceLines(h, name, s, eyes) {
  if (!name || name === 'none') return '';
  const sc = h.rx / 53;
  const P = (x, y) => `${h.cx + x * sc} ${h.cy + y * sc}`;
  const line = (d) => `<path d="${d}" fill="none" stroke="${s.shadow}" stroke-width="${1.6 * sc}" stroke-linecap="round" opacity="0.9"/>`;
  let out = '';
  if (name === 'smile' || name === 'all') {
    out += line(`M ${P(-12, 30)} Q ${P(-21, 38)} ${P(-23, 47)}`) + line(`M ${P(12, 30)} Q ${P(21, 38)} ${P(23, 47)}`);
  }
  if (name === 'forehead' || name === 'all') {
    out += line(`M ${P(-16, -27)} Q ${P(0, -30)} ${P(16, -27)}`) + line(`M ${P(-12, -33)} Q ${P(0, -36)} ${P(12, -33)}`);
  }
  if (name === 'crowsFeet' || name === 'all') {
    eyes.forEach((e) => {
      const s2 = Math.sign(e.outer.x - e.ex);
      const ox = e.outer.x + s2 * 3 * sc;
      out += line(`M ${ox} ${e.outer.y - 2 * sc} l ${s2 * 5 * sc} ${-2.5 * sc} M ${ox} ${e.outer.y + 1 * sc} l ${s2 * 5.5 * sc} 0 M ${ox} ${e.outer.y + 4 * sc} l ${s2 * 5 * sc} ${2.5 * sc}`);
    });
  }
  return out;
}

// ---- The face -------------------------------------------------------------------

// { skin, hairColor, set: 'A'|'B', facialHair, features }
export function face(h, { skin, hairColor, set, facialHair: facialHairKind = 'none', features = {} }) {
  const opts = faceOptions(set, features);
  const sc = h.rx / 53;
  const { cx, cy } = h;
  const s = shades(skin);
  let out = '';

  // Cheeks: a soft natural flush, or blush.
  const blushColor = BLUSHES[opts.blush];
  [-1, 1].forEach((side) => {
    out += blushColor
      ? `<ellipse cx="${cx + side * 31 * sc}" cy="${cy + 29 * sc}" rx="${13 * sc}" ry="${7.5 * sc}" fill="${blushColor}" opacity="0.45"/>`
      : `<ellipse cx="${cx + side * 31 * sc}" cy="${cy + 30 * sc}" rx="${11 * sc}" ry="${6 * sc}" fill="${mix(skin, '#e05a5f', 0.5)}" opacity="0.28"/>`;
  });
  out += freckles(h, FRECKLES[opts.freckles] ?? 0, skin);

  // Each eye with its lid and lashes, then its brow.
  const eyes = [-1, 1].map((side) => {
    const e = eye(h, side, set, opts, s);
    out += e.svg + brow(h, side, opts, hairColor, e);
    return e;
  });

  out += nose(h, opts.nose, s);
  out += faceLines(h, opts.lines, s, eyes);
  out += beautyMark(h, opts.mark, skin);
  out += facialHair(h, hairColor, facialHairKind, opts.shape);
  out += mouth(h, set, opts, s, skin);
  return out;
}
