// The character's skin, arms and hands (original artwork). The head and face
// are in face.js.
// Light comes from the upper left, so shadows sit on the viewer's right.

import { piece } from './draw.js';
import { headSkin } from './face.js';
import { posed, torsoSide } from './bodies.js';
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

// ---- Whole skin layer ------------------------------------------------------

// Everything skin-colored that sits behind the clothes: torso, legs, neck,
// ears and head. The face is drawn on the head.
export function skinBase(body, skin, set, features = {}) {
  return torsoSkin(body, skin) + legs(body, skin) + neckAndChest(body, skin) + headSkin(body.head, skin, set, features);
}
