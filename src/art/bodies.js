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
