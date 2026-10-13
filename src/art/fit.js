// Shared fitting shapes for garment templates: the torso outline of tops,
// jackets and dresses, set-in sleeves, hems and shading. Everything is built
// from the body's measurements and weight-shift pose, so one template fits
// both bodies (R40).

import { halfWidthAt, posed, torsoSide } from './bodies.js';
import { armProfile, profileSlice } from './figure.js';
import { limb, edges, curveThrough, pt, lerp } from './shapes.js';

export const P = (x, y) => ({ x, y });
export const line = (a, b) => `M ${pt(a)} L ${pt(b)}`;
export const curve = (pts) => `M ${pt(pts[0])}${curveThrough(pts)}`;

// ---- Shared shapes ----------------------------------------------------------

// The outline of a top or jacket body. `ease` is how loose it sits. The
// side runs through the armpit, ribs, waist and hips so it follows the
// body's curves rather than joining a few corners.
export function torsoPoints(body, { hemY, ease, neckWidth = 6 }) {
  const cx = body.head.cx;
  const side = (s) => {
    // Every point follows the body's weight-shift pose (bodies.js posed()).
    const at = (y) => torsoSide(body, s, y, ease);
    const ribsY = (body.chest.y + body.waist.y) / 2 + 10;
    const hipsY = (body.waist.y + hemY) / 2;
    const pts = {
      neck: posed(body, s, cx + s * (body.neck.half + neckWidth), body.neck.bottom - 12),
      shoulder: posed(body, s, cx + s * (body.shoulder.half + ease * 0.4), body.shoulder.y + 8),
      armpit: posed(body, s, cx + s * (body.chest.half + ease), body.shoulder.y + 62),
      // Body A's tops round out over the bust before narrowing to the ribs.
      bust: body.bust ? at(body.chest.y + 10) : null,
      ribs: at(ribsY),
      waist: at(body.waist.y),
      hips: at(hipsY),
      hem: at(hemY),
    };
    // The side line from armpit to hem; hips only when the hem is well below
    // the waist.
    pts.sideLine = [pts.shoulder, pts.armpit, ...(pts.bust && hemY > pts.bust.y + 20 ? [pts.bust] : []), ...(hemY > ribsY + 10 ? [pts.ribs] : []), ...(hemY > body.waist.y + 10 ? [pts.waist] : []), ...(hemY > body.waist.y + 30 ? [pts.hips] : []), pts.hem];
    return pts;
  };
  return { cx, l: side(-1), r: side(1) };
}

// From the neck down a sloped shoulder: a gentle dip over the trapezius,
// then rounding over the shoulder point.
export const shoulderFromNeck = (t, s) =>
  ` C ${pt(P(t.neck.x + s * 16, t.neck.y + 2))} ${pt(P(t.shoulder.x - s * 18, t.shoulder.y - 8))} ${pt(t.shoulder)}`;
export const neckFromShoulder = (t, s) =>
  ` C ${pt(P(t.shoulder.x - s * 18, t.shoulder.y - 8))} ${pt(P(t.neck.x + s * 16, t.neck.y + 2))} ${pt(t.neck)}`;

export function torsoPath(body, opts) {
  const { cx, l, r } = torsoPoints(body, opts);
  const neckDrop = opts.neckDrop ?? 16;
  return `M ${pt(l.neck)}${shoulderFromNeck(l, -1)}`
    + curveThrough(l.sideLine)
    + ` Q ${pt(posed(body, 0, cx, opts.hemY + 6))} ${pt(r.hem)}`
    + curveThrough([...r.sideLine].reverse())
    + neckFromShoulder(r, 1)
    + ` Q ${pt(posed(body, 0, cx, body.neck.bottom + neckDrop))} ${pt(l.neck)} Z`;
}

// A set-in sleeve: it starts on the shoulder line, follows the arm to
// fraction `to` (0 shoulder, 1 wrist) and closes with a seam back to the
// shoulder, so the shoulder keeps a natural line. Returns the path
// plus the arm points and widths for bands and shading.
export function setInSleeve(body, side, to, { extra }) {
  const s = side === 'left' ? -1 : 1;
  const cx = body.head.cx;
  const sl = profileSlice(armProfile(body, side), 0, to);
  const pts = sl.pts;
  // Fabric skims the arm: smooth the muscle swells out of the width.
  const widths = sl.widths.map((w, i, all) => (all[Math.max(i - 1, 0)] + 2 * w + all[Math.min(i + 1, all.length - 1)]) / 4 + extra);
  const { left, right } = edges(pts, widths);
  const outer = side === 'left' ? left : right;
  const inner = side === 'left' ? right : left;
  const shoulderTop = posed(body, s, cx + s * body.shoulder.half * 0.74, body.shoulder.y + 2);
  // The torso's shoulder point; the cap rounds over it and down the outside
  // of the upper arm, joining the sleeve's outer edge a little way down so
  // the shoulder reads as round rather than square.
  const shoulderPoint = posed(body, s, cx + s * (body.shoulder.half + 2), body.shoulder.y + 10);
  const join = Math.min(2, outer.length - 1);
  const oj = outer[join];
  const i0 = inner[0];
  const d = `M ${pt(shoulderTop)} C ${pt(P(shoulderTop.x + s * 12, shoulderTop.y + 3))} ${pt(P(shoulderPoint.x - s * 2, shoulderPoint.y - 6))} ${pt(shoulderPoint)}`
    + ` C ${pt(P(shoulderPoint.x + s * 8, shoulderPoint.y + 8))} ${pt(P(oj.x + s * 2, oj.y - 16))} ${pt(oj)}`
    + curveThrough(outer.slice(join))
    + ` L ${pt(inner[inner.length - 1])}`
    + curveThrough([...inner].reverse())
    + ` Q ${pt(P((i0.x + shoulderTop.x) / 2 - s * 4, (i0.y + shoulderTop.y) / 2))} ${pt(shoulderTop)} Z`;
  return { d, pts, widths };
}

// A small filled circle, for buttons.
export const dot = (p, r = 2.6) => `M ${p.x - r} ${p.y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;

// One wing (`s` -1 left, 1 right) of a point collar, folded down from the
// neck to a tip under the chin.
export function collarWing(body, s) {
  const cx = body.head.cx;
  const n = body.neck;
  const a = posed(body, s, cx + s * 2, n.bottom + 6);
  const b = posed(body, s, cx + s * (n.half + 4), n.top + 30);
  const c = posed(body, s, cx + s * (n.half + 16), n.bottom + 2);
  const tip = posed(body, s, cx + s * 14, n.bottom + 26);
  return `M ${pt(a)} L ${pt(b)} Q ${pt(lerp(b, c, 0.5))} ${pt(c)} L ${pt(tip)} Z`;
}

// A short band across a tube at its end, for hems and cuffs.
export function endBand(points, widths, inset) {
  const { left, right } = edges(points, widths);
  const n = points.length - 1;
  const back = (e) => lerp(e[n], e[n - 1], inset / Math.hypot(e[n].x - e[n - 1].x, e[n].y - e[n - 1].y));
  return line(back(left), back(right));
}

// ---- Bottoms ------------------------------------------------------------------

// The hips of shorts, pants and trousers, from the waistband at `top` down
// to just below the hip line, following the body's side curve so no skin
// shows beside it on any body type (R43).
export function hipBlock(body, top) {
  const hipY = body.hip.y;
  const side = (s) => [top, (top + hipY) / 2, hipY, hipY + 14].map((y) => torsoSide(body, s, y, y >= hipY ? 2 : 1));
  const crotch = posed(body, 0, body.head.cx, body.crotchY);
  const L = side(-1);
  const R = side(1);
  const d = `M ${pt(L[0])} L ${pt(R[0])}${curveThrough(R)}`
    + ` L ${pt(P(crotch.x + 6, crotch.y + 6))} L ${pt(P(crotch.x - 6, crotch.y + 6))}`
    + ` L ${pt(L[L.length - 1])}${curveThrough([...L].reverse())} Z`;
  return { d, crotch };
}

// Where a leg tube of a bottom starts: at the hip line above the hip joint,
// no wider there than the hips. Starting higher, at the waistband, made the
// thighs poke out past the hips and the hem of a top on wide- and
// narrow-hipped bodies.
export function legStart(body, side, joint, width) {
  const s = side === 'left' ? -1 : 1;
  const y = body.hip.y;
  const limit = Math.abs(torsoSide(body, s, y, 2).x - joint.x);
  return { pt: P(joint.x, posed(body, s, joint.x, y).y), width: Math.min(width, 2 * limit) };
}

// The right-side shadow of a torso, light coming from the upper left.
export function torsoShadow(body, opts) {
  const { r } = torsoPoints(body, opts);
  const inset = (p, dx) => P(p.x - dx, p.y);
  return `M ${pt(r.shoulder)} L ${pt(inset(r.armpit, 20))}` + curveThrough([inset(r.armpit, 20), inset(r.waist, 22), inset(r.hem, 20)])
    + ` L ${pt(P(r.hem.x + 10, r.hem.y + 10))} L ${pt(P(r.shoulder.x + 10, r.shoulder.y))} Z`;
}

// Soft curves under the bust for Body A, so tops follow the figure.
export function bustLines(body) {
  if (!body.bust) return [];
  const cx = body.head.cx;
  const y = body.chest.y + 18;
  return [-1, 1].map((s) => ({
    d: `M ${pt(posed(body, s, cx + s * 6, y - 4))} Q ${pt(posed(body, s, cx + s * 26, y + 10))} ${pt(posed(body, s, cx + s * (body.chest.half - 6), y - 6))}`,
    tone: 'shadow',
    width: 2.6,
    opacity: 0.8,
  }));
}

// ---- Button shirt details (R44; C8b step 4) --------------------------------------

// Chest pockets on a button shirt, as detail lines for piece(): `count` 0–2
// (one sits on the viewer's right, the wearer's left, as on most shirts and
// the standard drawing; the Developer's choice, 2026-10-12), each a
// stitched pocket, with a flap closed by a button when `flaps`. On a body
// with a bust they sit higher and narrower, clear of its shaping.
// `button` colors the flap buttons (a hex color), or null for the
// drawing's own dark buttons.
export function chestPockets(body, count, flaps, button) {
  const cx = body.head.cx;
  const half = body.chest.half;
  const w = half * (body.bust ? 0.5 : 0.52);
  const h = w * (body.bust ? 1 : 0.95);
  const flapH = flaps ? w * 0.24 : 0;
  const top = body.chest.y - (body.bust ? 34 : 14);
  const pocket = (s) => {
    const mid = cx + s * half * (body.bust ? 0.6 : 0.55);
    const at = (dx, dy) => posed(body, s, mid + dx, top + dy);
    // The bag: down both sides to a slight point at the bottom.
    const bag = `M ${pt(at(-w / 2, flapH))} L ${pt(at(-w / 2, h - 5))} L ${pt(at(0, h))} L ${pt(at(w / 2, h - 5))} L ${pt(at(w / 2, flapH))}`;
    const lines = [{ d: flaps ? bag : `${bag} M ${pt(at(-w / 2, 0))} L ${pt(at(w / 2, 0))}`, tone: 'deep', width: 1.8 }];
    if (flaps) {
      const flap = `M ${pt(at(-w / 2 - 1, 0))} L ${pt(at(w / 2 + 1, 0))} L ${pt(at(w / 2 + 1, flapH - 2))} Q ${pt(at(w / 2 + 1, flapH + 1))} ${pt(at(w / 2 - 2, flapH + 1))} L ${pt(at(-w / 2 + 2, flapH + 1))} Q ${pt(at(-w / 2 - 1, flapH + 1))} ${pt(at(-w / 2 - 1, flapH - 2))} Z`;
      lines.push(
        { d: `M ${pt(at(-w / 2 + 2, flapH + 3))} L ${pt(at(w / 2 - 2, flapH + 3))}`, tone: 'shadow', width: 2.6, opacity: 0.5 },
        { d: flap, tone: 'deep', width: 1.8 },
        shirtButtons(dot(at(0, flapH * 0.55), 2.3), button),
      );
    }
    return lines;
  };
  return (count >= 2 ? [-1, 1] : count === 1 ? [1] : []).flatMap(pocket);
}

// Buttons as a detail line: dark dots in the drawing's own colors, or
// filled in the shirt's button color (`color`) with a darker rim.
export function shirtButtons(d, color) {
  return color ? { d, fill: color, stroke: rimOf(color), width: 1 } : { d, tone: 'deep', width: 1.6 };
}

const rimOf = (hex) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.55).toString(16).padStart(2, '0')).join('')}`;
