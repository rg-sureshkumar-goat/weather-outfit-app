// Path helpers. Limbs and garments are built from a body's skeleton points,
// so one drawing fits both bodies (spec.md R40, plan.md C2).

const fmt = (n) => Math.round(n * 10) / 10;
export const pt = (p) => `${fmt(p.x)} ${fmt(p.y)}`;

// Smooth open curve through points (Catmull-Rom as cubic Béziers). Returns
// only the curve commands, starting after the current point.
export function curveThrough(points) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

// A closed smooth shape through points.
export function smoothClosed(points) {
  const ring = [points[points.length - 1], ...points, points[0], points[1]];
  let d = `M ${pt(points[0])}`;
  for (let i = 1; i <= points.length; i++) {
    const [p0, p1, p2, p3] = [ring[i - 1], ring[i], ring[i + 1], ring[i + 2]];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return `${d} Z`;
}

// Point a fraction t of the way from a to b.
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// Point at fraction t along a polyline (by segment count, not length).
export function along(points, t) {
  const span = t * (points.length - 1);
  const i = Math.min(Math.floor(span), points.length - 2);
  return lerp(points[i], points[i + 1], span - i);
}

// Points of a polyline between fractions t0 and t1, ends included.
export function slice(points, t0, t1) {
  const out = [along(points, t0)];
  for (let i = 1; i < points.length - 1; i++) {
    const t = i / (points.length - 1);
    if (t > t0 && t < t1) out.push(points[i]);
  }
  out.push(along(points, t1));
  return out;
}

// Unit normal of the polyline at index i.
function normalAt(points, i) {
  const a = points[Math.max(i - 1, 0)];
  const b = points[Math.min(i + 1, points.length - 1)];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

// The two edges of a tube of varying width along a polyline. `widths` has
// one width per point.
export function edges(points, widths) {
  const left = [];
  const right = [];
  points.forEach((p, i) => {
    const n = normalAt(points, i);
    const h = widths[i] / 2;
    left.push({ x: p.x + n.x * h, y: p.y + n.y * h });
    right.push({ x: p.x - n.x * h, y: p.y - n.y * h });
  });
  return { left, right };
}

// A limb-like closed shape with rounded ends (arms, legs, sleeves). Set
// `capStart`/`capEnd` to false for a flat end (a hem or a cuff).
export function limb(points, widths, { capStart = true, capEnd = true } = {}) {
  const { left, right } = edges(points, widths);
  const endR = widths[widths.length - 1] / 2;
  const startR = widths[0] / 2;
  let d = `M ${pt(left[0])}${curveThrough(left)}`;
  const lastR = right[right.length - 1];
  // With the normal used in edges(), "left" is the viewer's left on a
  // downward limb, so both caps round outward with sweep flag 0.
  d += capEnd ? ` A ${fmt(endR)} ${fmt(endR)} 0 0 0 ${pt(lastR)}` : ` L ${pt(lastR)}`;
  d += curveThrough([...right].reverse());
  d += capStart ? ` A ${fmt(startR)} ${fmt(startR)} 0 0 0 ${pt(left[0])}` : ` L ${pt(left[0])}`;
  return `${d} Z`;
}
