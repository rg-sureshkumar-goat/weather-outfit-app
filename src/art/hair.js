// Hairstyles (R24). Each style has a back layer, drawn behind the head and
// body, and a front layer, drawn last so long hair falls over the clothes.
//
// Every point is given in head units (p(fx, fy): fx in head half-widths
// from the center, fy in head half-heights), so a style fits any head size
// and, later, any face shape (R43). Head outline for reference: crown at
// fy -1, widest at fx ±1 around fy -0.2, jaw at fy 0.72, chin at fy 1.02.
// Brows sit near fy -0.25, so hairlines stay above about fy -0.4.

import { piece, uid } from './draw.js';
import { shades } from './paint.js';
import { smoothClosed, curveThrough, limb, pt } from './shapes.js';

const at = (h) => (fx, fy) => ({ x: h.cx + h.rx * fx, y: h.cy + h.ry * fy });

// A small seeded random source, so textures look natural but never change
// between renders.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

// Adds a bump between every pair of points, pushed away from `center`, for
// curly and coily outlines.
function wavy(points, center, amount, closed = true) {
  const out = [];
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = m.x - center.x;
    const dy = m.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    out.push(a, { x: m.x + (dx / len) * amount, y: m.y + (dy / len) * amount });
  }
  if (!closed) out.push(points[points.length - 1]);
  return out;
}

// Points on an ellipse arc (angles in degrees, 0 = right, 90 = down).
function arc(center, rx, ry, from, to, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = ((from + ((to - from) * i) / (count - 1)) * Math.PI) / 180;
    return { x: center.x + rx * Math.cos(t), y: center.y + ry * Math.sin(t) };
  });
}

// Curl texture: small open loops scattered over a box, clipped to the hair
// by piece(). Half catch the light, half sit in shadow.
function curls(h, box, count, seed, size = 0.09) {
  const rand = seeded(seed);
  const r = h.rx * size;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const x = box.x0 + (box.x1 - box.x0) * rand();
    const y = box.y0 + (box.y1 - box.y0) * rand();
    const c = { x: h.cx + h.rx * x, y: h.cy + h.ry * y };
    const s = r * (0.7 + rand() * 0.6);
    lines.push({
      d: `M ${pt({ x: c.x - s, y: c.y })} a ${s} ${s} 0 1 1 ${s * 1.4} ${s * 0.9}`,
      tone: i % 2 ? 'light' : 'deep',
      width: 2,
      opacity: i % 2 ? 0.75 : 0.9,
    });
  }
  return lines;
}

// Straight strands: gentle curves from a start to an end point.
const strand = (p, [x0, y0], [xm, ym], [x1, y1], tone = 'light', width = 2.2, opacity = 0.75) => ({
  d: `M ${pt(p(x0, y0))} Q ${pt(p(xm, ym))} ${pt(p(x1, y1))}`,
  tone,
  width,
  opacity,
});

// Hair that covers the top of the head with only its hairline outlined:
// its upper edge sits inside a bigger back layer of the same color, so an
// outline there would draw a seam (afro, buzz).
function cover({ outer, hairline, color, name, texture = [], opacity = 1 }) {
  const s = shades(color);
  const d = `M ${pt(outer[0])}${curveThrough(outer)} L ${pt(hairline[0])}${curveThrough(hairline)} Z`;
  const line = `M ${pt(hairline[0])}${curveThrough(hairline)}`;
  const clip = uid(`${name}-clip`);
  const lines = texture
    .map((l) => `<path d="${l.d}" fill="none" stroke="${s[l.tone]}" stroke-width="${l.width}" stroke-linecap="round" opacity="${l.opacity ?? 1}"/>`)
    .join('');
  return `<g opacity="${opacity}"><defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`
    + `<path d="${d}" fill="${color}"/><g clip-path="url(#${clip})">${lines}</g>`
    + `<path d="${line}" fill="none" stroke="${s.line}" stroke-width="2.4" stroke-linecap="round"/></g>`;
}

// ---- Short ------------------------------------------------------------------

function bald(h) {
  // Only a soft shine on the crown; the head outline shows as it is.
  const p = at(h);
  const c = p(-0.3, -0.72);
  return { back: '', front: `<ellipse cx="${c.x}" cy="${c.y}" rx="${h.rx * 0.28}" ry="${h.ry * 0.12}" transform="rotate(-24 ${c.x} ${c.y})" fill="#ffffff" opacity="0.2"/>` };
}

function buzz(h, color) {
  const p = at(h);
  // Hugs the skull just outside the head outline, so the head's own outline
  // still shows through the short, slightly see-through hair.
  const outer = [p(-0.95, 0.02), p(-1.01, -0.25), p(-0.77, -0.82), p(-0.38, -1.0), p(0, -1.03), p(0.38, -1.0), p(0.77, -0.82), p(1.01, -0.25), p(0.95, 0.02)];
  const hairline = [p(0.9, 0.02), p(0.88, -0.3), p(0.62, -0.5), p(0.25, -0.57), p(-0.25, -0.57), p(-0.62, -0.5), p(-0.88, -0.3), p(-0.9, 0.02)];
  const rand = seeded(7);
  const texture = Array.from({ length: 70 }, () => {
    const q = p(-0.95 + rand() * 1.9, -1 + rand() * 0.95);
    return { d: `M ${pt(q)} l 1.6 -0.6`, tone: rand() > 0.5 ? 'deep' : 'light', width: 1.6, opacity: 0.7 };
  });
  return { back: '', front: cover({ outer, hairline, color, name: 'buzz', texture, opacity: 0.88 }) };
}

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
      strand(p, [-0.5, -0.9], [-0.35, -0.7], [-0.42, -0.52], 'light', 2.4, 0.8),
      strand(p, [-0.15, -1], [0, -0.78], [-0.06, -0.56], 'light', 2.2, 0.7),
      strand(p, [0.35, -0.98], [0.45, -0.75], [0.36, -0.54], 'deep', 2.2, 1),
    ],
  });
  return { back: '', front };
}

function shortCurls(h, color) {
  const p = at(h);
  // A rounded crop of tight curls, a little higher than the skull.
  const dome = arc(p(0, -0.32), h.rx * 1.08, h.ry * 0.94, 186, 354, 13);
  const hairline = [p(0.9, -0.02), p(0.82, -0.32), p(0.5, -0.5), p(0.15, -0.55), p(-0.2, -0.54), p(-0.55, -0.49), p(-0.84, -0.3), p(-0.9, -0.02)];
  const outline = wavy([...dome, ...hairline], p(0, -0.45), h.rx * 0.07);
  const front = piece({
    parts: [smoothClosed(outline)],
    base: color,
    name: 'hair',
    shade: [{ d: smoothClosed([p(0.3, -1.2), p(0.95, -0.8), p(1.08, -0.3), p(0.85, -0.1), p(0.6, -0.5)]), tone: 'shadow', opacity: 0.8 }],
    lines: curls(h, { x0: -1, x1: 1, y0: -1.25, y1: -0.45 }, 34, 11),
  });
  return { back: '', front };
}

function afro(h, color) {
  const p = at(h);
  const center = p(0, -0.42);
  // A full round shape around the whole head, wider than the shoulders of
  // the face, ending at the jaw.
  const ring = arc(center, h.rx * 1.72, h.ry * 1.36, 0, 360, 25).slice(0, 24);
  const volume = smoothClosed(wavy(ring, center, h.rx * 0.08));
  const back = piece({
    parts: [volume],
    base: color,
    name: 'hair-back',
    shade: [{ d: smoothClosed([p(0.5, -1.7), p(1.5, -1.1), p(1.75, -0.2), p(1.35, 0.7), p(0.95, 0.3), p(1.05, -0.6)]), tone: 'shadow', opacity: 0.75 }],
    lines: curls(h, { x0: -1.8, x1: 1.8, y0: -1.85, y1: 0.85 }, 120, 23, 0.1),
  });
  // Over the forehead: the hairline, with the top blending into the volume.
  const outer = [p(-0.96, 0.05), p(-1.1, -0.45), p(-0.85, -1.05), p(-0.3, -1.25), p(0.3, -1.25), p(0.85, -1.05), p(1.1, -0.45), p(0.96, 0.05)];
  const hairline = wavy([p(0.92, 0.05), p(0.86, -0.3), p(0.55, -0.5), p(0.18, -0.56), p(-0.18, -0.56), p(-0.55, -0.5), p(-0.86, -0.3), p(-0.92, 0.05)], p(0, -1), h.rx * 0.04, false);
  const front = cover({ outer, hairline, color, name: 'afro', texture: curls(h, { x0: -1.1, x1: 1.1, y0: -1.25, y1: -0.45 }, 40, 31, 0.1) });
  return { back, front };
}

// ---- Medium -------------------------------------------------------------------

// Hair to the jaw with a side part; curly or straight.
function medium(h, color, curly) {
  const p = at(h);
  const w = curly ? 1.3 : 1.18;
  const backPts = [
    p(-0.98, -0.75), p(-w + 0.06, 0), p(-w, 0.8), p(-w - 0.02, 1.4), p(-w + 0.18, 1.62), p(-0.5, 1.56), p(0, 1.5),
    p(0.5, 1.56), p(w - 0.18, 1.62), p(w + 0.02, 1.4), p(w, 0.8), p(w - 0.06, 0), p(0.98, -0.75), p(0, -1.14),
  ];
  const backD = smoothClosed(curly ? wavy(backPts, p(0, 0.3), h.rx * 0.07) : backPts);
  const back = piece({
    parts: [backD],
    base: color,
    name: 'hair-back',
    shade: [{ d: backD, tone: 'shadow', opacity: 0.55 }],
    lines: curly ? curls(h, { x0: -1.3, x1: 1.3, y0: 0.2, y1: 1.6 }, 30, 41) : [],
  });

  // The crown and two curtains over the ears, open in front of the face.
  const outer = [p(-w + 0.04, 1.38), p(-w + 0.02, 0.55), p(-1.1, -0.3), p(-0.78, -0.92), p(-0.25, -1.14), p(0.35, -1.1), p(0.85, -0.84), p(1.1, -0.32), p(w - 0.02, 0.55), p(w - 0.04, 1.38)];
  const inner = [p(0.96, 1.3), p(0.9, 0.62), p(0.84, 0.05), p(0.55, -0.48), p(0.1, -0.64), p(-0.3, -0.7), p(-0.45, -0.5), p(-0.74, -0.32), p(-0.86, 0.1), p(-0.9, 0.68), p(-0.97, 1.3)];
  const front = piece({
    parts: [smoothClosed(curly ? [...wavy(outer, p(0, 0), h.rx * 0.07, false), ...inner] : [...outer, ...inner])],
    base: color,
    name: 'hair',
    shade: [
      { d: smoothClosed([p(0.3, -1.1), p(0.9, -0.8), p(1.12, -0.3), p(0.95, 0.05), p(0.6, -0.45)]), tone: 'shadow', opacity: 0.9 },
      { d: smoothClosed([p(0.98, 0.2), p(w, 0.7), p(w - 0.04, 1.36), p(0.98, 1.3), p(0.93, 0.7)]), tone: 'shadow', opacity: 0.8 },
    ],
    lines: curly
      ? curls(h, { x0: -1.3, x1: 1.3, y0: -1.15, y1: 1.35 }, 46, 43)
      : [
        strand(p, [-0.3, -0.72], [-0.62, -0.95], [-0.95, -0.6], 'light', 2.6, 0.8),
        strand(p, [-0.95, -0.1], [-1.04, 0.6], [-1.0, 1.25]),
        strand(p, [0.95, 0.1], [1.06, 0.7], [1.04, 1.25], 'deep', 1.8, 1),
      ],
  });
  return { back, front };
}

const mediumStraight = (h, color) => medium(h, color, false);
const mediumCurly = (h, color) => medium(h, color, true);

// ---- Long ---------------------------------------------------------------------

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
  const side = smoothClosed([p(-0.98, -0.3), p(-1.1, 0.4), p(-1.04, 0.95), p(-0.9, 0.55), p(-0.84, 0.0)]);
  const front = piece({
    parts: [cap, lock, side],
    base: color,
    name: 'hair',
    shade: [
      { d: smoothClosed([p(0.3, -1.1), p(0.9, -0.8), p(1.1, -0.3), p(0.95, 0.05), p(0.6, -0.45)]), tone: 'shadow', opacity: 0.9 },
      { d: smoothClosed([p(1.06, 0.4), p(1.28, 1.8), p(1.22, 2.7), p(1.08, 2.6), p(1.1, 1.6)]), tone: 'shadow' },
    ],
    lines: [
      strand(p, [-0.3, -0.72], [-0.62, -0.95], [-0.95, -0.6], 'light', 2.6, 0.8),
      strand(p, [0.95, 0.3], [1.04, 1.2], [1.12, 2.4], 'light', 2.2, 0.7),
      strand(p, [1.1, 0.7], [1.2, 1.6], [1.18, 2.5], 'deep', 1.8, 1),
    ],
  });
  return { back, front };
}

function longCurly(h, color) {
  const p = at(h);
  const backPts = [
    p(-1.0, -0.8), p(-1.3, 0), p(-1.5, 1.0), p(-1.6, 1.9), p(-1.4, 2.7), p(-0.7, 2.95), p(0, 2.85),
    p(0.7, 2.95), p(1.4, 2.7), p(1.6, 1.9), p(1.5, 1.0), p(1.3, 0), p(1.0, -0.8), p(0, -1.2),
  ];
  const backD = smoothClosed(wavy(backPts, p(0, 1), h.rx * 0.1));
  const back = piece({
    parts: [backD],
    base: color,
    name: 'hair-back',
    shade: [{ d: backD, tone: 'shadow', opacity: 0.5 }],
    lines: curls(h, { x0: -1.6, x1: 1.6, y0: 0, y1: 2.9 }, 70, 51, 0.11),
  });

  // Crown with a middle part and curly locks over both shoulders.
  const crown = smoothClosed(wavy([
    p(-1.02, 0.15), p(-1.16, -0.45), p(-0.82, -1.0), p(-0.3, -1.2), p(0.3, -1.2), p(0.82, -1.0), p(1.16, -0.45), p(1.02, 0.15),
    p(0.86, -0.1), p(0.55, -0.48), p(0.12, -0.62), p(0, -0.55), p(-0.12, -0.62), p(-0.55, -0.48), p(-0.86, -0.1),
  ], p(0, -0.3), h.rx * 0.06));
  const lockPts = (s) => wavy([
    p(s * 0.95, -0.2), p(s * 1.2, 0.4), p(s * 1.3, 1.2), p(s * 1.42, 2.0), p(s * 1.36, 2.6),
    p(s * 1.1, 2.75), p(s * 1.0, 2.2), p(s * 0.96, 1.4), p(s * 0.88, 0.6), p(s * 0.82, 0.1),
  ], p(s * 1.1, 1.2), h.rx * 0.08);
  const front = piece({
    parts: [crown, smoothClosed(lockPts(-1)), smoothClosed(lockPts(1))],
    base: color,
    name: 'hair',
    shade: [
      { d: smoothClosed([p(0.3, -1.15), p(0.95, -0.85), p(1.15, -0.3), p(0.95, 0.05), p(0.6, -0.45)]), tone: 'shadow', opacity: 0.85 },
      { d: smoothClosed([p(1.1, 0.4), p(1.38, 1.8), p(1.3, 2.6), p(1.12, 2.5), p(1.12, 1.4)]), tone: 'shadow', opacity: 0.9 },
    ],
    lines: curls(h, { x0: -1.45, x1: 1.45, y0: -1.2, y1: 2.7 }, 80, 53, 0.1),
  });
  return { back, front };
}

// Braids or locs: rope-like strands with a chevron texture.
function braid(p, pts, width) {
  const points = pts.map(([x, y]) => p(x, y));
  const d = limb(points, points.map((_, i) => width * (1 - (i / points.length) * 0.25)));
  const lines = [];
  for (let i = 0; i < points.length - 1; i++) {
    for (let k = 0; k < 3; k++) {
      const t = k / 3;
      const c = { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
      lines.push({ d: `M ${c.x - width * 0.42} ${c.y - 3} Q ${c.x} ${c.y + 4} ${c.x + width * 0.42} ${c.y - 3}`, tone: 'deep', width: 1.6, opacity: 0.9 });
    }
  }
  return { d, lines };
}

function braids(h, color) {
  const p = at(h);
  const wBraid = h.rx * 0.22;
  // Behind: a full fall of braids past the shoulders.
  const backStrands = [-1.1, -0.75, -0.4, 0, 0.4, 0.75, 1.1].map((x) => braid(p, [[x * 0.85, -0.6], [x, 0.4], [x * 1.08, 1.4], [x * 1.12, 2.4], [x * 1.1, 2.75]], wBraid));
  const back = piece({
    parts: [smoothClosed([p(-1.0, -0.8), p(-1.3, 0.4), p(-1.3, 2.5), p(0, 2.6), p(1.3, 2.5), p(1.3, 0.4), p(1.0, -0.8), p(0, -1.15)]), ...backStrands.map((b) => b.d)],
    base: color,
    name: 'hair-back',
    shade: [{ d: smoothClosed([p(-1.3, 0.4), p(-1.3, 2.5), p(1.3, 2.5), p(1.3, 0.4), p(0, 0.6)]), tone: 'shadow', opacity: 0.6 }],
    lines: backStrands.flatMap((b) => b.lines),
  });

  // Crown with rows running back from the hairline, and two braids falling
  // forward on each side.
  const crown = smoothClosed([
    p(-0.98, 0.05), p(-1.06, -0.4), p(-0.8, -0.92), p(-0.3, -1.12), p(0.3, -1.12), p(0.8, -0.92), p(1.06, -0.4), p(0.98, 0.05),
    p(0.88, -0.2), p(0.6, -0.48), p(0.2, -0.56), p(-0.2, -0.56), p(-0.6, -0.48), p(-0.88, -0.2),
  ]);
  // Rows run back from the hairline and meet toward the crown, with small
  // stitches along each one, so they read as braided rows, not a fringe.
  const rows = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].flatMap((x) => {
    const a = p(x, -0.52 - Math.abs(x) * 0.08);
    const c = p(x * 1.02, -0.86);
    const b = p(x * 0.3, -1.08);
    const at = (t) => ({
      x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
      y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
    });
    const stitches = [0.2, 0.45, 0.7].map((t) => {
      const q = at(t);
      return { d: `M ${q.x - 3.5} ${q.y + 2} L ${q.x} ${q.y - 1.5} L ${q.x + 3.5} ${q.y + 2}`, tone: 'light', width: 1.4, opacity: 0.8 };
    });
    return [{ d: `M ${pt(a)} Q ${pt(c)} ${pt(b)}`, tone: 'deep', width: 2.2, opacity: 0.95 }, ...stitches];
  });
  const sideBraids = [-1, 1].flatMap((s) => [
    braid(p, [[s * 0.98, -0.1], [s * 1.08, 0.7], [s * 1.12, 1.5], [s * 1.14, 2.3], [s * 1.12, 2.7]], wBraid),
    braid(p, [[s * 0.9, 0.0], [s * 0.96, 0.8], [s * 0.98, 1.6], [s * 0.98, 2.35]], wBraid * 0.9),
  ]);
  const front = piece({
    parts: [crown, ...sideBraids.map((b) => b.d)],
    base: color,
    name: 'hair',
    shade: [{ d: smoothClosed([p(0.3, -1.1), p(0.9, -0.85), p(1.08, -0.35), p(0.9, -0.05), p(0.6, -0.45)]), tone: 'shadow', opacity: 0.8 }],
    lines: [...rows, ...sideBraids.flatMap((b) => b.lines)],
  });
  return { back, front };
}

// Bun or ponytail: hair pulled back smoothly into a bun on the crown.
function bun(h, color) {
  const p = at(h);
  const c = p(0.05, -1.22);
  const bunD = smoothClosed(arc(c, h.rx * 0.46, h.ry * 0.34, 0, 360, 13).slice(0, 12));
  const cap = smoothClosed([
    p(-0.95, 0.02), p(-1.03, -0.4), p(-0.78, -0.88), p(-0.3, -1.06), p(0.3, -1.06), p(0.78, -0.88), p(1.03, -0.4), p(0.95, 0.02),
    p(0.88, -0.25), p(0.62, -0.5), p(0.22, -0.6), p(-0.22, -0.6), p(-0.62, -0.5), p(-0.88, -0.25),
  ]);
  // Comb lines from the hairline up to the bun.
  const comb = [-0.7, -0.4, -0.1, 0.2, 0.5, 0.78].map((x, i) => strand(p, [x, -0.55], [x * 0.85, -0.9], [x * 0.35, -1.04], i % 2 ? 'deep' : 'light', 2, 0.8));
  const front = piece({
    parts: [bunD, cap],
    base: color,
    name: 'hair',
    shade: [
      { d: smoothClosed([p(0.3, -1.05), p(0.9, -0.82), p(1.05, -0.35), p(0.9, -0.05), p(0.6, -0.48)]), tone: 'shadow', opacity: 0.85 },
      { d: smoothClosed([p(0.22, -1.48), p(0.5, -1.25), p(0.4, -1.0), p(0.2, -1.1)]), tone: 'shadow', opacity: 0.8 },
    ],
    lines: [
      ...comb,
      { d: `M ${pt(p(-0.25, -1.25))} Q ${pt(p(0.05, -1.5))} ${pt(p(0.32, -1.24))} Q ${pt(p(0.1, -1.05))} ${pt(p(-0.1, -1.2))}`, tone: 'deep', width: 2.2 },
    ],
  });
  return { back: '', front };
}

// In the order the review screen lists them (R24).
export const HAIRSTYLES = { bald, buzz, shortCrop, shortCurls, afro, mediumStraight, mediumCurly, longStraight, longCurly, braids, bun };

export function hair(style, h, color) {
  const draw = HAIRSTYLES[style];
  if (!draw) throw new Error(`Unknown hairstyle: ${style}`);
  return draw(h, color);
}
