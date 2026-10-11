// The two body shapes (R40) as measurements and skeleton points in a
// 400 x 1000 drawing. Proportions are about 6½ heads tall (research.md,
// Revisions 2026-10-11). The pose is a natural weight shift: weight on the
// viewer-right leg, so that hip rises and the hips move over it, the
// opposite shoulder rises slightly, the free leg relaxes, and the arms hang
// a little away from the body with a soft bend. Torso widths are symmetric
// half-widths; posed() applies the tilt and shift to any torso point.
//
// "left"/"right" below always mean the viewer's left and right.

const P = (x, y) => ({ x, y });

export const BODIES = {
  // Body A: narrow shoulders, a defined waist and bust, fuller hips and
  // thighs, slimmer arms and calves, a slightly smaller head.
  A: {
    id: 'A',
    head: { cx: 200, cy: 130, rx: 48, ry: 61, jaw: 0.8 },
    neck: { top: 184, bottom: 234, half: 13 },
    shoulder: { y: 248, half: 70 },
    chest: { y: 306, half: 64 },
    waist: { y: 400, half: 50 },
    hip: { y: 480, half: 80 },
    crotchY: 530,
    bust: true,
    // How loosely tops sit (1 = regular): Body A's tops are more fitted.
    fit: 0.6,
    // Weight shift: hip tilt and shoulder tilt in px, hip shift toward the
    // standing leg.
    pose: { hipTilt: 10, shoulderTilt: 6, hipShift: 7 },
    // hip joint, knee, ankle (free leg on the viewer's left)
    legs: {
      left: [P(165, 513), P(184, 708), P(174, 902)],
      right: [P(249, 503), P(246, 708), P(240, 906)],
    },
    legWidths: [80, 40, 23],
    // shoulder joint, elbow, wrist
    arms: {
      left: [P(133, 257), P(112, 380), P(117, 484)],
      right: [P(267, 263), P(291, 382), P(286, 486)],
    },
    armWidths: [24, 19, 15],
    hand: 13,
  },
  // Body B: broad shoulders tapering to a straighter waist and hips, sturdier
  // arms and legs.
  B: {
    id: 'B',
    head: { cx: 200, cy: 126, rx: 53, ry: 65, jaw: 0.92 },
    neck: { top: 182, bottom: 232, half: 20 },
    shoulder: { y: 244, half: 90 },
    chest: { y: 302, half: 80 },
    waist: { y: 410, half: 66 },
    hip: { y: 474, half: 68 },
    crotchY: 528,
    bust: false,
    fit: 0.8,
    pose: { hipTilt: 6, shoulderTilt: 5, hipShift: 5 },
    // A wider stance than Body A, with space between the legs (Developer's
    // review, 2026-10-11).
    legs: {
      left: [P(160, 509), P(168, 708), P(154, 902)],
      right: [P(247, 503), P(252, 710), P(254, 906)],
    },
    legWidths: [70, 48, 32],
    arms: {
      left: [P(113, 258), P(93, 383), P(99, 493)],
      right: [P(287, 262), P(310, 382), P(305, 494)],
    },
    armWidths: [36, 29, 23],
    hand: 19,
  },
};

// Body outline half-width at a height. Widths ease between the shoulder,
// chest, waist and hip (smoothstep) so the sides curve instead of running
// in straight lines between them.
export function halfWidthAt(body, y) {
  const stops = [body.shoulder, body.chest, body.waist, body.hip];
  if (y <= stops[0].y) return stops[0].half;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (y <= b.y) {
      const k = (y - a.y) / (b.y - a.y);
      return a.half + (b.half - a.half) * k * k * (3 - 2 * k);
    }
  }
  return stops[stops.length - 1].half;
}

// How far down the torso a height is: 0 at the shoulders, 1 at the hips.
const torsoK = (body, y) => Math.min(1, Math.max(0, (y - body.shoulder.y) / (body.hip.y - body.shoulder.y)));

// A torso point in the weight-shift pose. s is -1 for the viewer-left side,
// 1 for the viewer-right side and 0 for the center line. The viewer-right
// shoulder sits a little lower and the viewer-right hip higher, and the
// hips shift over the standing leg.
export function posed(body, s, x, y) {
  const k = torsoK(body, y);
  const { hipTilt, shoulderTilt, hipShift } = body.pose;
  return { x: x + hipShift * k, y: y + s * (((1 - k) * shoulderTilt) / 2 - (k * hipTilt) / 2) };
}

// A point on one side of the torso at height y, `extra` px outside the body.
export function torsoSide(body, s, y, extra = 0) {
  return posed(body, s, body.head.cx + s * (halfWidthAt(body, y) + extra), y);
}

// ---- Body types (R43) -----------------------------------------------------
//
// Six named body types per gender, made from that gender's body (A or B,
// which is "Average") by changing its measurements. Garments, shoes and
// accessories are all built from these measurements, so they fit every
// type without separate drawings.
//
// Each type gives target half-widths for the shoulder, chest, waist and hip
// (px), and multipliers for limb widths. Arms and legs are moved so they
// keep the same gap from the torso as on the Average body.

const TYPE_SPECS = {
  A: {
    slim: { shoulder: 64, chest: 57, waist: 43, hip: 70, neck: 12, legs: [0.86, 0.88, 0.92], arms: 0.88 },
    average: {},
    athletic: { shoulder: 77, chest: 66, waist: 50, hip: 76, neck: 14, legs: [0.98, 1.08, 1.04], arms: 1.12 },
    hourglass: { shoulder: 74, chest: 74, waist: 46, hip: 90, neck: 13, legs: [1.06, 1.04, 1], arms: 1.02 },
    pear: { shoulder: 64, chest: 60, waist: 52, hip: 96, neck: 13, legs: [1.16, 1.1, 1.02], arms: 0.96 },
    plusSize: { shoulder: 82, chest: 86, waist: 80, hip: 104, neck: 16, legs: [1.3, 1.3, 1.16], arms: 1.32 },
  },
  B: {
    slim: { shoulder: 80, chest: 70, waist: 56, hip: 60, neck: 17, legs: [0.86, 0.84, 0.88], arms: 0.84 },
    average: {},
    athletic: { shoulder: 100, chest: 90, waist: 64, hip: 68, neck: 22, legs: [1.04, 1.1, 1.02], arms: 1.16 },
    broad: { shoulder: 106, chest: 96, waist: 78, hip: 74, neck: 23, legs: [1.06, 1.06, 1.04], arms: 1.14 },
    stocky: { shoulder: 96, chest: 92, waist: 86, hip: 82, neck: 24, legs: [1.18, 1.16, 1.1], arms: 1.14 },
    plusSize: { shoulder: 102, chest: 104, waist: 104, hip: 94, neck: 25, legs: [1.34, 1.3, 1.16], arms: 1.32 },
  },
};

// The body types in the order the review screen lists them.
export const BODY_TYPES = {
  A: ['slim', 'average', 'athletic', 'hourglass', 'pear', 'plusSize'],
  B: ['slim', 'average', 'athletic', 'broad', 'stocky', 'plusSize'],
};

// Moves a limb joint sideways so its distance from the torso edge stays as
// on the base body. `halfOld`/`halfNew` are torso half-widths at the joint's
// height; `wOld`/`wNew` the limb's width there.
function keepGap(p, cx, halfOld, halfNew, wOld, wNew) {
  const s = Math.sign(p.x - cx) || 1;
  const gap = Math.abs(p.x - cx) - halfOld - wOld / 2;
  return { x: cx + s * (halfNew + wNew / 2 + gap), y: p.y };
}

function shapeBody(base, type) {
  const spec = TYPE_SPECS[base.id][type];
  if (!spec) throw new Error(`Unknown body type: ${type}`);
  if (!spec.shoulder) return { ...base, type };
  const body = {
    ...base,
    id: base.id,
    type,
    neck: { ...base.neck, half: spec.neck },
    shoulder: { ...base.shoulder, half: spec.shoulder },
    chest: { ...base.chest, half: spec.chest },
    waist: { ...base.waist, half: spec.waist },
    hip: { ...base.hip, half: spec.hip },
    legWidths: base.legWidths.map((w, i) => w * spec.legs[i]),
    armWidths: base.armWidths.map((w) => w * spec.arms),
    hand: base.hand * Math.sqrt(spec.arms),
  };
  const cx = base.head.cx;

  // Arms: the shoulder joint moves with the shoulder; elbow and wrist keep
  // their gap from the torso at their height.
  const arm = (pts) => {
    const [sh, el, wr] = pts;
    const dS = spec.shoulder - base.shoulder.half;
    const shoulderJoint = { x: sh.x + Math.sign(sh.x - cx) * dS, y: sh.y };
    return [
      shoulderJoint,
      keepGap(el, cx, halfWidthAt(base, el.y), halfWidthAt(body, el.y), base.armWidths[1], body.armWidths[1]),
      keepGap(wr, cx, halfWidthAt(base, wr.y), halfWidthAt(body, wr.y), base.armWidths[2], body.armWidths[2]),
    ];
  };
  body.arms = { left: arm(base.arms.left), right: arm(base.arms.right) };

  // Legs: the hip joints move out with the hips, so the thighs fill the
  // hip width as on the base body; knees and ankles follow part of the way.
  const dHip = spec.hip - base.hip.half;
  const leg = (pts) => pts.map((p, i) => ({ x: p.x + Math.sign(p.x - cx) * dHip * [0.62, 0.42, 0.3][i], y: p.y }));
  body.legs = { left: leg(base.legs.left), right: leg(base.legs.right) };
  return body;
}

const shaped = new Map();

// The drawn body for a body set ('A' female, 'B' male) and a type.
export function bodyFor(set, type = 'average') {
  const key = `${set}:${type}`;
  if (!shaped.has(key)) shaped.set(key, shapeBody(BODIES[set], type));
  return shaped.get(key);
}
