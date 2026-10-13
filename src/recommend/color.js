// Color math for the "layer for later" jacket: a User's item counts as neutral
// when its sampled base color has CIE LCh chroma below 30 (spec.md, Garment
// types by band). Chroma measures colorfulness the way people see it, so
// muted navy, denim and olive count as neutral while red or coral don't.

export const NEUTRAL_CHROMA = 30;

// sRGB hex (#rrggbb) to CIE Lab, D65 white point. Also used to sample and
// name the colors of a closet photo (vision/colors.js, content/colorNames.js).
export function hexToLab(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

// The same for 0–255 channels, for reading a photo pixel by pixel
// (vision/reading.js).
export function rgbToLab(r255, g255, b255) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(r255), channel(g255), channel(b255)];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

// CIE Lab back to sRGB hex, clamped to what sRGB can show.
export function labToHex({ l, a, b }) {
  const fy = (l + 16) / 116;
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const x = inv(fy + a / 500) * 0.95047;
  const y = inv(fy);
  const z = inv(fy - b / 200) * 1.08883;
  const linear = [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.204 * y + 1.057 * z];
  const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  return `#${linear.map((v) => Math.round(255 * Math.min(1, Math.max(0, gamma(Math.max(0, v))))).toString(16).padStart(2, '0')).join('')}`;
}

export function chroma(hex) {
  const { a, b } = hexToLab(hex);
  return Math.hypot(a, b);
}

// Starter items carry a neutral flag from their color name; the User's items
// are judged from their sampled base color.
export function isNeutral(item) {
  if (item.source === 'starter') return item.neutral;
  return item.colors?.base ? chroma(item.colors.base) < NEUTRAL_CHROMA : false;
}

// How different two colors look: the distance between them in CIE Lab
// (Delta E 1976). About 2 is barely noticeable; over 20 is clearly
// different.
export function colorDistance(hexA, hexB) {
  const a = hexToLab(hexA);
  const b = hexToLab(hexB);
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}
