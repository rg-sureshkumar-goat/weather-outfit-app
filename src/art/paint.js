// Color helpers for shading. Every garment and skin tone is drawn from one
// base color; outlines, shadows and highlights are mixed from it at render
// time, so any color the User picks gets the same soft shading.

const toRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// Mixes two colors; t = 0 gives a, t = 1 gives b.
export function mix(a, b, t) {
  const [ra, ga, ba] = toRgb(a);
  const [rb, gb, bb] = toRgb(b);
  return toHex([ra + (rb - ra) * t, ga + (gb - ga) * t, ba + (bb - ba) * t]);
}

// Relative luminance (0 dark to 1 light), used to keep outlines visible on
// very dark colors.
export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const INK = '#1e1a24';

// The shades every drawn part uses.
export function shades(base) {
  const dark = luminance(base) < 0.04;
  return {
    base,
    // Outlines are a darker version of the fill, not black, which keeps the
    // look soft. Very dark fills get a slightly lighter line instead.
    line: dark ? mix(base, '#000000', 0.55) : mix(base, INK, 0.62),
    shadow: dark ? mix(base, '#000000', 0.35) : mix(base, INK, 0.22),
    deep: dark ? mix(base, '#000000', 0.5) : mix(base, INK, 0.36),
    light: mix(base, '#ffffff', dark ? 0.12 : 0.28),
  };
}
