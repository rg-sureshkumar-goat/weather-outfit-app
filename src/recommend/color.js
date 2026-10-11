// Color math for the "layer for later" jacket: a User's item counts as neutral
// when its sampled base color has CIE LCh chroma below 30 (spec.md, Garment
// types by band). Chroma measures colorfulness the way people see it, so
// muted navy, denim and olive count as neutral while red or coral don't.

export const NEUTRAL_CHROMA = 30;

// sRGB hex (#rrggbb) to CIE Lab, D65 white point.
function hexToLab(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const channel = (shift) => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(16), channel(8), channel(0)];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
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
