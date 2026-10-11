// The character's skin, head, face, arms and hands (original artwork).
// Light comes from the upper left, so shadows sit on the viewer's right.

import { piece, uid } from './draw.js';
import { posed, torsoSide } from './bodies.js';
import { shades, mix } from './paint.js';
import { limb, smoothClosed, along, pt, curveThrough } from './shapes.js';

// ---- Torso -----------------------------------------------------------------

// The skin of the torso from the shoulders to the hips, under every top. A
// crop top shows the midriff, so it gets a navel and soft shading.
function torsoSkin(body, skin) {
  const { head, neck, shoulder, chest, waist, hip, crotchY } = body;
  const cx = head.cx;
  const side = (s) => [
    posed(body, s, cx + s * (shoulder.half - 4), shoulder.y + 12),
    posed(body, s, cx + s * (chest.half - 4), shoulder.y + 60),
    torsoSide(body, s, (chest.y + waist.y) / 2, -2),
    torsoSide(body, s, waist.y, 1),
    torsoSide(body, s, (waist.y + hip.y) / 2),
    torsoSide(body, s, hip.y, -2),
    posed(body, s, cx + s * (hip.half - 10), crotchY),
  ];
  const l = side(-1);
  const r = side(1);
  const nl = posed(body, -1, cx - neck.half - 6, neck.bottom - 6);
  const nr = posed(body, 1, cx + neck.half + 6, neck.bottom - 6);
  const d = `M ${pt(nl)} Q ${l[0].x + 20} ${l[0].y - 8} ${pt(l[0])}` + curveThrough(l)
    + ` L ${pt(r[r.length - 1])}` + curveThrough([...r].reverse())
    + ` Q ${r[0].x - 20} ${r[0].y - 8} ${pt(nr)} Z`;
  const navel = posed(body, 0, cx, waist.y + 22);
  const chestMid = posed(body, 0, cx, chest.y + 40);
  const rw = torsoSide(body, 1, waist.y);
  const rc = torsoSide(body, 1, chest.y);
  const rh = torsoSide(body, 1, hip.y);
  return piece({
    parts: [d],
    base: skin,
    name: 'torso',
    shade: [
      { d: `M ${rc.x - 18} ${rc.y} Q ${rw.x - 10} ${rw.y} ${rh.x - 16} ${rh.y} L ${rh.x + 6} ${rh.y} L ${rc.x + 6} ${rc.y} Z`, tone: 'shadow', opacity: 0.7 },
    ],
    lines: [
      { d: `M ${navel.x - 2} ${navel.y - 4} q 2 6 4 0`, tone: 'deep', width: 2 },
      { d: `M ${chestMid.x} ${chestMid.y} L ${navel.x} ${navel.y - 12}`, tone: 'shadow', width: 1.6, opacity: body.bust ? 0 : 0.5 },
    ],
  });
}

// ---- Head -----------------------------------------------------------------

// Head outline: a rounded crown narrowing to the jaw. `jaw` < 1 gives a
// softer, narrower chin.
export function headPath(h) {
  const { cx, cy, rx, ry, jaw } = h;
  const p = (fx, fy) => ({ x: cx + rx * fx, y: cy + ry * fy });
  return smoothClosed([
    p(0, -1), p(0.74, -0.8), p(1, -0.2), p(0.97, 0.3), p(0.8 * jaw, 0.72),
    p(0.36, 0.97), p(0, 1.02), p(-0.36, 0.97), p(-0.8 * jaw, 0.72),
    p(-0.97, 0.3), p(-1, -0.2), p(-0.74, -0.8),
  ]);
}

function ears(h, skin) {
  const ear = (side) => {
    const x = h.cx + side * h.rx * 0.97;
    const y = h.cy + h.ry * 0.1;
    const d = `M ${x} ${y - 15} C ${x + side * 13} ${y - 18} ${x + side * 14} ${y + 8} ${x + side * 2} ${y + 15} Z`;
    return piece({ parts: [d], base: skin, outline: 2, name: 'ear', lines: [{ d: `M ${x + side * 3} ${y - 8} C ${x + side * 9} ${y - 8} ${x + side * 9} ${y + 4} ${x + side * 3} ${y + 7}`, tone: 'shadow', width: 2.4 }] });
  };
  return ear(-1) + ear(1);
}

// Neck and the skin of the chest, drawn under every top.
function neckAndChest(body, skin) {
  const { head, neck } = body;
  const cx = head.cx;
  // Slightly narrower under the jaw, flaring into the shoulders at the base.
  const t = neck.half * 0.92;
  const neckD = `M ${cx - t} ${neck.top} L ${cx + t} ${neck.top}`
    + ` C ${cx + neck.half} ${neck.bottom - 22} ${cx + neck.half + 4} ${neck.bottom - 8} ${cx + neck.half + 20} ${neck.bottom + 2}`
    + ` L ${cx - neck.half - 20} ${neck.bottom + 2}`
    + ` C ${cx - neck.half - 4} ${neck.bottom - 8} ${cx - neck.half} ${neck.bottom - 22} ${cx - t} ${neck.top} Z`;
  // Only the skin a neckline can reveal; kept well inside every top.
  const chestD = smoothClosed([
    { x: cx - neck.half - 8, y: neck.bottom - 8 }, { x: cx - neck.half - 30, y: neck.bottom + 16 }, { x: cx, y: neck.bottom + 40 },
    { x: cx + neck.half + 30, y: neck.bottom + 16 }, { x: cx + neck.half + 8, y: neck.bottom - 8 },
  ]);
  return piece({
    parts: [neckD, chestD],
    base: skin,
    name: 'neck',
    // Shadow under the jaw.
    shade: [{ d: `M ${cx - neck.half - 4} ${neck.top} L ${cx + neck.half + 4} ${neck.top} L ${cx + neck.half + 4} ${neck.top + 24} Q ${cx} ${neck.top + 34} ${cx - neck.half - 4} ${neck.top + 18} Z`, tone: 'shadow' }],
  });
}

// ---- Limb profiles -----------------------------------------------------------

// A limb's width at stations along it: t is the fraction of its length
// (0 first joint, 0.5 the middle joint, 1 the end). The stations give arms
// and legs their natural taper and swell instead of straight tubes.
function profile(joints, stations, side) {
  // Viewer-left limbs face outward to the left, viewer-right to the right.
  const out = side === 'left' ? -1 : 1;
  return {
    joints,
    ts: stations.map(([t]) => t),
    pts: stations.map(([t, , shift = 0]) => {
      const p = along(joints, t);
      return { x: p.x + out * shift, y: p.y };
    }),
    widths: stations.map(([, w]) => w),
    out,
    shifts: stations.map(([, , shift = 0]) => shift),
  };
}

// Shoulder muscle, biceps taper, narrow elbow, a forearm swell on the outer
// side, wrist. Stations: [t, width, outward shift].
export function armProfile(body, side) {
  const [u, f, w] = body.armWidths;
  return profile(body.arms[side], [
    [0, u * 1.02], [0.08, u * 1.06, 1], [0.22, u * 0.95, -1], [0.4, u * 0.78],
    [0.5, f * 0.9], [0.6, f * 1.08, 1.5], [0.8, f * 0.86], [1, w],
  ], side);
}

// Full thigh with inner-thigh fullness, tapering to the knee, an outer calf
// curve below it, slim ankle.
export function legProfile(body, side) {
  const [h, k, a] = body.legWidths;
  return profile(body.legs[side], [
    [0, h], [0.14, h * 0.95, -2], [0.3, h * 0.8, -1], [0.44, k * 1.1], [0.5, k],
    [0.58, k * 1.1, 1], [0.68, k * 1.17, 2], [0.84, k * 0.86, -0.5], [0.96, a * 1.06], [1, a],
  ], side);
}

export function widthAt(prof, t) {
  const { ts, widths } = prof;
  for (let i = 0; i < ts.length - 1; i++) {
    if (t <= ts[i + 1]) return widths[i] + ((widths[i + 1] - widths[i]) * (t - ts[i])) / (ts[i + 1] - ts[i]);
  }
  return widths[widths.length - 1];
}

// The part of a profile from t0 to t1, with interpolated ends.
function shiftAt(prof, t) {
  const { ts, shifts } = prof;
  for (let i = 0; i < ts.length - 1; i++) {
    if (t <= ts[i + 1]) return shifts[i] + ((shifts[i + 1] - shifts[i]) * (t - ts[i])) / (ts[i + 1] - ts[i]);
  }
  return shifts[shifts.length - 1];
}

export function profileSlice(prof, t0, t1) {
  const ts = [t0, ...prof.ts.filter((t) => t > t0 && t < t1), t1];
  const pts = ts.map((t) => {
    const p = along(prof.joints, t);
    return { x: p.x + prof.out * shiftAt(prof, t), y: p.y };
  });
  return { ts, pts, widths: ts.map((t) => widthAt(prof, t)) };
}

function legs(body, skin) {
  const profs = ['left', 'right'].map((side) => legProfile(body, side));
  const r = profileSlice(profs[1], 0.05, 0.95);
  return piece({
    parts: profs.map((p) => limb(p.pts, p.widths)),
    base: skin,
    name: 'legs',
    // A soft shadow down the outer side of the viewer-right leg.
    shade: [{ d: limb(r.pts.map((q) => ({ x: q.x + 12, y: q.y })), r.widths.map((w) => w * 0.28)), tone: 'shadow', opacity: 0.7 }],
  });
}

// Arms are drawn above the torso of every top (where they overlap its
// sides) and below the sleeves. With long sleeves, only the hands show.
// `fromShoulder` draws the whole arm for bare shoulders.
export function arms(body, skin, { handsOnly = false, fromShoulder = false } = {}) {
  const hands = hand(body, skin, 'left') + hand(body, skin, 'right');
  if (handsOnly) return hands;
  // Under a sleeve, start below the shoulder joint so the sleeve always
  // covers the top of the arm (otherwise the shoulder can show above it).
  const parts = ['left', 'right'].map((side) => {
    const { pts, widths } = profileSlice(armProfile(body, side), fromShoulder ? 0 : 0.12, 1);
    return limb(pts, widths);
  });
  return piece({ parts, base: skin, name: 'arms' }) + hands;
}

// A relaxed hand hanging at the end of an arm, thumb turned toward the body.
function hand(body, skin, side) {
  const [, elbow, wrist] = body.arms[side];
  const len = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
  const u = { x: (wrist.x - elbow.x) / len, y: (wrist.y - elbow.y) / len };
  // For a downward arm this normal points to the viewer's left, which is
  // toward the body for the right arm; the left arm mirrors it.
  const flip = side === 'right' ? 1 : -1;
  const n = { x: -u.y * flip, y: u.x * flip };
  const L = body.hand * 2.3;
  const W = body.hand;
  const at = (a, b) => ({ x: wrist.x + u.x * a * L + n.x * b * W, y: wrist.y + u.y * a * L + n.y * b * W });
  const palm = smoothClosed([at(-0.05, -0.55), at(0.35, -0.68), at(0.8, -0.5), at(1, -0.1), at(0.9, 0.3), at(0.62, 0.48), at(0.5, 0.86), at(0.3, 0.78), at(0.18, 0.55), at(-0.05, 0.5)]);
  const finger = (b) => `M ${pt(at(0.55, b))}${curveThrough([at(0.55, b), at(0.86, b * 0.8)])}`;
  return piece({ parts: [palm], base: skin, name: 'hand', outline: 2, lines: [{ d: finger(-0.2), tone: 'shadow', width: 1.8 }, { d: finger(0.1), tone: 'shadow', width: 1.8 }] });
}

// ---- Face -----------------------------------------------------------------

// Two face-detail sets (R40). A: arched brows, outer lashes, fuller lips.
// B: straighter, heavier brows and a firmer mouth line. Both share the same
// expressive eyes and open smile.
const EYE_COLOR = '#2a1d17';

export function face(h, skin, hairColor, set) {
  const sc = h.rx / 53;
  const { cx, cy } = h;
  const s = shades(skin);
  const lip = set === 'A' ? mix(skin, '#b5485a', 0.38) : s.deep;
  let out = '';

  // Cheeks
  const blush = mix(skin, '#e05a5f', 0.5);
  [-1, 1].forEach((side) => {
    out += `<ellipse cx="${cx + side * 31 * sc}" cy="${cy + 30 * sc}" rx="${11 * sc}" ry="${6 * sc}" fill="${blush}" opacity="0.28"/>`;
  });

  // Eyes: rounded, big irises with two catchlights, a lid line on top.
  [-1, 1].forEach((side) => {
    const ex = cx + side * 21 * sc;
    const ey = cy + 6 * sc;
    const w = (set === 'A' ? 13 : 12.5) * sc;
    const top = (set === 'A' ? 12 : 11) * sc;
    const bottom = 8 * sc;
    const eye = `M ${ex - w} ${ey} C ${ex - w * 0.7} ${ey - top} ${ex + w * 0.7} ${ey - top} ${ex + w} ${ey} C ${ex + w * 0.6} ${ey + bottom} ${ex - w * 0.6} ${ey + bottom} ${ex - w} ${ey} Z`;
    const id = uid('eye');
    const ix = ex + side * 1.5 * sc;
    out += `<clipPath id="${id}"><path d="${eye}"/></clipPath>`;
    out += `<path d="${eye}" fill="#fbfaf7"/>`;
    out += `<g clip-path="url(#${id})"><circle cx="${ix}" cy="${ey + 0.5 * sc}" r="${8.6 * sc}" fill="${EYE_COLOR}"/>`
      + `<circle cx="${ix}" cy="${ey + 0.5 * sc}" r="${4.4 * sc}" fill="#0d0a09"/>`
      + `<circle cx="${ix + 3 * sc}" cy="${ey - 3 * sc}" r="${2.6 * sc}" fill="#fff"/>`
      + `<circle cx="${ix - 3 * sc}" cy="${ey + 3.4 * sc}" r="${1.2 * sc}" fill="#fff" opacity="0.8"/>`
      + `<path d="M ${ex - w} ${ey - top * 0.55} L ${ex + w} ${ey - top * 0.55}" stroke="${s.shadow}" stroke-width="${3 * sc}" opacity="0.35"/></g>`;
    // Upper lid line and a soft crease above it.
    out += `<path d="M ${ex - w - 1 * sc} ${ey + 0.5 * sc} C ${ex - w * 0.7} ${ey - top - 0.5 * sc} ${ex + w * 0.7} ${ey - top - 0.5 * sc} ${ex + w + 1 * sc} ${ey}" fill="none" stroke="#2a201c" stroke-width="${2.6 * sc}" stroke-linecap="round"/>`;
    out += `<path d="M ${ex - w * 0.7} ${ey - top - 4 * sc} Q ${ex} ${ey - top - 8 * sc} ${ex + w * 0.75} ${ey - top - 3.5 * sc}" fill="none" stroke="${s.shadow}" stroke-width="${1.6 * sc}" stroke-linecap="round"/>`;
    if (set === 'A') {
      const ox = ex + side * w;
      out += `<path d="M ${ox} ${ey - 1 * sc} l ${side * 4.5 * sc} ${-3.5 * sc} M ${ox - side * 2.5 * sc} ${ey - 4 * sc} l ${side * 4 * sc} ${-4 * sc}" stroke="#2a201c" stroke-width="${1.8 * sc}" stroke-linecap="round"/>`;
    }
    // Brows in the hair color, a little darker so light hair still shows.
    const brow = mix(hairColor, '#1e1a24', 0.25);
    const by = ey - top - 9 * sc;
    const browD = set === 'A'
      ? `M ${ex - side * 11 * sc} ${by + 3 * sc} Q ${ex + side * 1 * sc} ${by - 6 * sc} ${ex + side * 13 * sc} ${by + 1.5 * sc}`
      : `M ${ex - side * 12 * sc} ${by + 1 * sc} Q ${ex + side * 1 * sc} ${by - 3.5 * sc} ${ex + side * 13 * sc} ${by + 1 * sc}`;
    out += `<path d="${browD}" fill="none" stroke="${brow}" stroke-width="${(set === 'A' ? 4 : 5.8) * sc}" stroke-linecap="round"/>`;
  });

  // Nose: a short curve with a soft shadow on the viewer's right.
  out += `<path d="M ${cx + 4 * sc} ${cy + 15 * sc} Q ${cx + 9 * sc} ${cy + 27 * sc} ${cx + 3 * sc} ${cy + 31 * sc} Q ${cx - 2 * sc} ${cy + 33 * sc} ${cx - 6 * sc} ${cy + 30 * sc}" fill="none" stroke="${s.deep}" stroke-width="${2.2 * sc}" stroke-linecap="round"/>`;
  out += `<ellipse cx="${cx + 5 * sc}" cy="${cy + 24 * sc}" rx="${3 * sc}" ry="${6 * sc}" fill="${s.shadow}" opacity="0.5"/>`;

  // Open smile: teeth on top, a darker mouth below.
  const my = cy + 42 * sc;
  const mw = (set === 'A' ? 17 : 19) * sc;
  const mouth = `M ${cx - mw} ${my} Q ${cx} ${my + 3 * sc} ${cx + mw} ${my} Q ${cx + mw * 0.7} ${my + 17 * sc} ${cx} ${my + 18 * sc} Q ${cx - mw * 0.7} ${my + 17 * sc} ${cx - mw} ${my} Z`;
  const mid = uid('mouth');
  out += `<clipPath id="${mid}"><path d="${mouth}"/></clipPath>`;
  out += `<path d="${mouth}" fill="#5b2229"/>`;
  out += `<g clip-path="url(#${mid})"><path d="M ${cx - mw} ${my - 2} L ${cx + mw} ${my - 2} L ${cx + mw} ${my + 6 * sc} Q ${cx} ${my + 9 * sc} ${cx - mw} ${my + 6 * sc} Z" fill="#fbf8f2"/>`
    + `<ellipse cx="${cx}" cy="${my + 17 * sc}" rx="${mw * 0.55}" ry="${6 * sc}" fill="#c4545e"/></g>`;
  out += `<path d="${mouth}" fill="none" stroke="${lip}" stroke-width="${(set === 'A' ? 2.8 : 2.2) * sc}" stroke-linejoin="round"/>`;
  if (set === 'A') {
    out += `<path d="M ${cx - mw * 0.55} ${my + 20.5 * sc} Q ${cx} ${my + 24 * sc} ${cx + mw * 0.55} ${my + 20.5 * sc}" fill="none" stroke="${lip}" stroke-width="${2.6 * sc}" stroke-linecap="round" opacity="0.7"/>`;
  }
  // Smile creases at the corners.
  [-1, 1].forEach((side) => {
    out += `<path d="M ${cx + side * (mw + 3 * sc)} ${my - 5 * sc} q ${side * 3 * sc} ${5 * sc} ${side * 0.5 * sc} ${9 * sc}" fill="none" stroke="${s.shadow}" stroke-width="${1.8 * sc}" stroke-linecap="round"/>`;
  });
  return out;
}

// ---- Whole skin layer ------------------------------------------------------

// Everything skin-colored that sits behind the clothes: torso, legs, neck,
// ears and head. The face is drawn on the head.
export function skinBase(body, skin) {
  const h = body.head;
  const head = piece({
    parts: [headPath(h)],
    base: skin,
    name: 'head',
    shade: [
      { d: `M ${h.cx + h.rx * 0.45} ${h.cy - h.ry} C ${h.cx + h.rx * 1.2} ${h.cy - h.ry * 0.4} ${h.cx + h.rx * 1.1} ${h.cy + h.ry * 0.8} ${h.cx + h.rx * 0.2} ${h.cy + h.ry * 1.1} C ${h.cx + h.rx * 0.95} ${h.cy + h.ry * 0.4} ${h.cx + h.rx * 0.95} ${h.cy - h.ry * 0.3} ${h.cx + h.rx * 0.45} ${h.cy - h.ry} Z`, tone: 'shadow', opacity: 0.55 },
    ],
  });
  return torsoSkin(body, skin) + legs(body, skin) + neckAndChest(body, skin) + ears(h, skin) + head;
}
