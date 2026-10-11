// Hairstyles (R24). Each style has a back layer, drawn behind the head and
// body, and a front layer, drawn last so long hair falls over the clothes.
// C2 draws the two gender defaults; C5 adds the other nine.

import { piece } from './draw.js';
import { smoothClosed } from './shapes.js';

const at = (h) => (fx, fy) => ({ x: h.cx + h.rx * fx, y: h.cy + h.ry * fy });

function shortCrop(h, color) {
  const p = at(h);
  const cap = smoothClosed([
    p(-0.93, 0.02), p(-1.04, -0.38), p(-0.8, -0.86), p(-0.3, -1.1), p(0.3, -1.12), p(0.82, -0.86),
    p(1.05, -0.38), p(0.94, 0.02), p(0.86, -0.22), p(0.6, -0.5), p(0.22, -0.55), p(-0.2, -0.52), p(-0.62, -0.46), p(-0.86, -0.22),
  ]);
  const front = piece({
    parts: [cap],
    base: color,
    name: 'hair',
    shade: [{ d: smoothClosed([p(0.2, -1.1), p(0.85, -0.85), p(1.06, -0.38), p(0.9, -0.1), p(0.7, -0.52)]), tone: 'shadow', opacity: 0.9 }],
    lines: [
      { d: `M ${p(-0.5, -0.9).x} ${p(-0.5, -0.9).y} Q ${p(-0.35, -0.7).x} ${p(-0.35, -0.7).y} ${p(-0.42, -0.52).x} ${p(-0.42, -0.52).y}`, tone: 'light', width: 2.4, opacity: 0.8 },
      { d: `M ${p(-0.15, -1).x} ${p(-0.15, -1).y} Q ${p(0, -0.78).x} ${p(0, -0.78).y} ${p(-0.06, -0.56).x} ${p(-0.06, -0.56).y}`, tone: 'light', width: 2.2, opacity: 0.7 },
      { d: `M ${p(0.35, -0.98).x} ${p(0.35, -0.98).y} Q ${p(0.45, -0.75).x} ${p(0.45, -0.75).y} ${p(0.36, -0.54).x} ${p(0.36, -0.54).y}`, tone: 'deep', width: 2.2 },
    ],
  });
  return { back: '', front };
}

function longStraight(h, color) {
  const p = at(h);
  // Behind the head and shoulders, falling past the shoulders.
  const backD = smoothClosed([
    p(-0.98, -0.75), p(-1.15, 0), p(-1.25, 1.0), p(-1.35, 1.9), p(-1.2, 2.7), p(-0.6, 2.9), p(0, 2.8),
    p(0.6, 2.9), p(1.2, 2.7), p(1.35, 1.9), p(1.25, 1.0), p(1.15, 0), p(0.98, -0.75), p(0, -1.12),
  ]);
  const back = piece({ parts: [backD], base: color, name: 'hair-back', shade: [{ d: backD, tone: 'shadow', opacity: 0.5 }] });

  // Crown with a side part, sweeping across the forehead.
  const cap = smoothClosed([
    p(-1.0, 0.1), p(-1.08, -0.45), p(-0.75, -0.95), p(-0.25, -1.13), p(0.35, -1.1), p(0.85, -0.82), p(1.08, -0.35),
    p(1.0, 0.1), p(0.84, -0.12), p(0.55, -0.5), p(0.0, -0.66), p(-0.3, -0.72), p(-0.42, -0.52), p(-0.72, -0.4), p(-0.9, -0.1),
  ]);
  // One lock falls forward over the viewer-right shoulder; on the other
  // side a short strand frames the cheek and the rest stays behind.
  const lock = smoothClosed([
    p(0.96, -0.3), p(1.12, 0.3), p(1.2, 1.1), p(1.32, 1.8), p(1.3, 2.5), p(1.12, 3.0),
    p(1.0, 2.6), p(0.98, 1.9), p(0.88, 1.1), p(0.8, 0.4),
  ]);
  const strand = smoothClosed([p(-0.98, -0.3), p(-1.1, 0.4), p(-1.04, 0.95), p(-0.9, 0.55), p(-0.84, 0.0)]);
  const front = piece({
    parts: [cap, lock, strand],
    base: color,
    name: 'hair',
    shade: [
      { d: smoothClosed([p(0.3, -1.1), p(0.9, -0.8), p(1.1, -0.3), p(0.95, 0.05), p(0.6, -0.45)]), tone: 'shadow', opacity: 0.9 },
      { d: smoothClosed([p(1.06, 0.4), p(1.28, 1.8), p(1.22, 2.7), p(1.08, 2.6), p(1.1, 1.6)]), tone: 'shadow' },
    ],
    lines: [
      { d: `M ${p(-0.3, -0.72).x} ${p(-0.3, -0.72).y} Q ${p(-0.62, -0.95).x} ${p(-0.62, -0.95).y} ${p(-0.95, -0.6).x} ${p(-0.95, -0.6).y}`, tone: 'light', width: 2.6, opacity: 0.8 },
      { d: `M ${p(0.95, 0.3).x} ${p(0.95, 0.3).y} Q ${p(1.04, 1.2).x} ${p(1.04, 1.2).y} ${p(1.12, 2.4).x} ${p(1.12, 2.4).y}`, tone: 'light', width: 2.2, opacity: 0.7 },
      { d: `M ${p(1.1, 0.7).x} ${p(1.1, 0.7).y} Q ${p(1.2, 1.6).x} ${p(1.2, 1.6).y} ${p(1.18, 2.5).x} ${p(1.18, 2.5).y}`, tone: 'deep', width: 1.8 },
    ],
  });
  return { back, front };
}

export const HAIRSTYLES = { shortCrop, longStraight };

export function hair(style, h, color) {
  const draw = HAIRSTYLES[style];
  if (!draw) throw new Error(`Unknown hairstyle: ${style}`);
  return draw(h, color);
}
