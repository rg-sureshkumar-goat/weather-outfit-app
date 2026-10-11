// Garment templates (spec.md, Assets). Each is drawn from the body's
// measurements, so one template fits both bodies (R40), and filled with the
// item's base color, an optional print and soft shading.
//
// Tops and outer layers return { torso, sleeves, hemY }: the avatar draws
// every torso, then the arms, then the outermost sleeves, so arms sit in
// front of the body but inside their sleeves. Bottoms and shoes return
// { svg }. Shoes are in shoes.js; those that show the foot take the skin.
//
// C2 draws the tee, crop top, light jacket, shorts, pants and all five
// shoes; C7 adds the other six types.

import { piece } from './draw.js';
import { SHOES } from './shoes.js';
import { halfWidthAt, posed, torsoSide } from './bodies.js';
import { legProfile, profileSlice } from './figure.js';
import { limb, along, smoothClosed, curveThrough, pt, lerp } from './shapes.js';
import { P, line, curve, torsoPoints, torsoPath, shoulderFromNeck, setInSleeve, endBand, torsoShadow, bustLines, hipBlock, legStart } from './fit.js';

// ---- Tops ------------------------------------------------------------------

// A tee-shaped top: crew neck, short set-in sleeves, a hem at `hemY`.
function teeShape(body, { base, print }, { hemY, ease, sleeveTo, name }) {
  const opts = { hemY, ease };
  const { cx, l, r } = torsoPoints(body, opts);
  const torso = piece({
    name,
    parts: [torsoPath(body, opts)],
    base,
    print,
    shade: [{ d: torsoShadow(body, opts), tone: 'shadow' }],
    lines: [
      // Ribbed crew neck.
      { d: `M ${pt(P(r.neck.x + 2, r.neck.y + 6))} Q ${cx} ${body.neck.bottom + 22} ${pt(P(l.neck.x - 2, l.neck.y + 6))}`, tone: 'shadow', width: 5 },
      // Soft folds from the armpits toward the waist, and at the hem.
      { d: curve([P(l.armpit.x + 10, l.armpit.y + 8), P(l.waist.x + 18, l.waist.y - 30), P(l.waist.x + 26, l.waist.y + 16)]), width: 2 },
      { d: curve([P(r.armpit.x - 10, r.armpit.y + 14), P(r.waist.x - 20, r.waist.y - 20), P(r.waist.x - 30, r.waist.y + 22)]), width: 2 },
      { d: curve([P(cx - 30, hemY - 4), P(cx - 18, hemY - 22), P(cx - 4, hemY - 28)]), width: 1.8, opacity: 0.8 },
      // Hem band.
      { d: `M ${pt(P(l.hem.x + 3, hemY - 8))} Q ${cx} ${hemY - 2} ${pt(P(r.hem.x - 3, hemY - 8))}`, tone: 'shadow', width: 2.2, opacity: 0.8 },
      ...bustLines(body),
    ],
  });
  const sleeves = ['left', 'right'].map((side) => {
    const { d, pts, widths } = setInSleeve(body, side, sleeveTo, { extra: 12 });
    return piece({
      name: `${name}-sleeve`,
      parts: [d],
      base,
      print,
      shade: side === 'right' ? [{ d: limb(pts.map((q) => P(q.x + 12, q.y)), widths.map((x) => x * 0.35), { capEnd: false }), tone: 'shadow', opacity: 0.8 }] : [],
      lines: [{ d: endBand(pts, widths, 6), tone: 'shadow', width: 2.4 }],
    });
  }).join('');
  return { torso, sleeves, hemY };
}

// A fitted tee on Body A ends at the hip instead of flaring over it.
const tee = (body, colors) =>
  teeShape(body, colors, { hemY: body.hip.y + (body.bust ? 4 : 22), ease: 8 * body.fit, sleeveTo: 0.22, name: 'tee' });

// A fitted, cropped tee that shows the midriff above the waistband.
const cropTop = (body, colors) =>
  teeShape(body, colors, { hemY: body.waist.y - (body.bust ? 22 : 8), ease: 5 * body.fit, sleeveTo: 0.17, name: 'crop' });

// A spaghetti-strap top: a fitted bodice from just above the bust to the
// hip, held by two thin straps. No sleeves, so the shoulders and arms show.
function spaghettiTop(body, { base, print }) {
  const cx = body.head.cx;
  const ease = 4 * body.fit;
  const topY = body.chest.y - 32;
  const hemY = body.hip.y + (body.bust ? -6 : 6);
  const side = (s) => [
    torsoSide(body, s, topY, ease - 4),
    torsoSide(body, s, body.chest.y + 10, ease),
    torsoSide(body, s, (body.chest.y + body.waist.y) / 2 + 10, ease),
    torsoSide(body, s, body.waist.y, ease),
    torsoSide(body, s, hemY, ease),
  ];
  const l = side(-1);
  const r = side(1);
  const d = `M ${pt(l[0])}` + curveThrough(l) + ` Q ${pt(posed(body, 0, cx, hemY + 6))} ${pt(r[4])}`
    + curveThrough([...r].reverse()) + ` Q ${pt(posed(body, 0, cx, topY + 14))} ${pt(l[0])} Z`;
  const strap = (s) => {
    const a = posed(body, s, cx + s * 26, topY + 4);
    const b = posed(body, s, cx + s * body.shoulder.half * 0.58, body.shoulder.y + 1);
    return limb([a, b], [4, 4]);
  };
  const torso = piece({
    name: 'spaghetti',
    parts: [d],
    base,
    print,
    shade: [{ d: torsoShadow(body, { hemY, ease }), tone: 'shadow' }],
    lines: [
      { d: `M ${pt(posed(body, -1, cx - 20, topY + 10))} Q ${pt(posed(body, 0, cx, topY + 20))} ${pt(posed(body, 1, cx + 20, topY + 10))}`, tone: 'shadow', width: 2, opacity: 0.6 },
      { d: curve([posed(body, -1, cx - 30, body.waist.y - 10), posed(body, -1, cx - 22, body.waist.y + 20), posed(body, -1, cx - 26, hemY - 6)]), width: 1.6, opacity: 0.8 },
      ...bustLines(body),
    ],
  }) + piece({ name: 'strap', parts: [strap(-1), strap(1)], base, outline: 1.6 });
  return { torso, sleeves: '', sleeveless: true, hemY };
}

// Knitwear: a crew-neck sweater and a hoodie, loose with ribbed hem,
// cuffs and collar, and full-length sleeves.
function knit(body, { base, print }, name, extras) {
  const hemY = body.hip.y + 20;
  const opts = { hemY, ease: 12 * body.fit, neckDrop: 12 };
  const { l, r, cx } = torsoPoints(body, opts);
  const ribs = (a, b, n) => Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const top = lerp(a[0], b[0], t);
    const bottom = lerp(a[1], b[1], t);
    return `M ${pt(top)} L ${pt(bottom)}`;
  }).join(' ');
  const hemTop = [P(l.hem.x + 2, hemY - 16), P(r.hem.x - 2, hemY - 16)];
  const torso = piece({
    name,
    parts: [torsoPath(body, opts)],
    base,
    print,
    shade: [{ d: torsoShadow(body, opts), tone: 'shadow' }],
    lines: [
      { d: `M ${pt(hemTop[0])} L ${pt(hemTop[1])}`, tone: 'deep', width: 2.2 },
      { d: ribs([hemTop[0], P(l.hem.x + 2, hemY)], [hemTop[1], P(r.hem.x - 2, hemY)], 16), tone: 'shadow', width: 1.6, opacity: 0.8 },
      { d: `M ${pt(P(r.neck.x + 2, r.neck.y + 6))} Q ${pt(posed(body, 0, cx, body.neck.bottom + 18))} ${pt(P(l.neck.x - 2, l.neck.y + 6))}`, tone: 'shadow', width: 6 },
      { d: curve([P(l.armpit.x + 12, l.armpit.y + 14), P(l.waist.x + 20, l.waist.y), P(l.hem.x + 22, hemY - 24)]), width: 2 },
      { d: curve([P(r.armpit.x - 12, r.armpit.y + 18), P(r.waist.x - 22, r.waist.y + 6), P(r.hem.x - 24, hemY - 22)]), width: 2 },
      ...(extras?.lines?.(body, { l, r, cx, hemY }) ?? []),
    ],
  }) + (extras?.over?.(body, { l, r, cx, hemY }, base) ?? '');
  const sleeves = ['left', 'right'].map((side) => {
    const { d, pts, widths } = setInSleeve(body, side, 1, { extra: 16 });
    return piece({
      name: `${name}-sleeve`,
      parts: [d],
      base,
      print,
      shade: side === 'right' ? [{ d: limb(pts.map((q) => P(q.x + 11, q.y)), widths.map((x) => x * 0.42), { capEnd: false }), tone: 'shadow' }] : [],
      lines: [{ d: endBand(pts, widths, 16), tone: 'deep', width: 2.2 }, { d: endBand(pts, widths, 8), tone: 'shadow', width: 1.6 }],
    });
  }).join('');
  return { torso, sleeves, longSleeves: true, hemY };
}

const sweater = (body, colors) => knit(body, colors, 'sweater', {
  // A simple cable down the front.
  lines: (b, { cx }) => [0, 1, 2, 3, 4, 5].map((i) => {
    const y = b.chest.y - 10 + i * 26;
    const c = posed(b, 0, cx, y);
    return { d: `M ${c.x - 8} ${c.y} q 8 8 16 0 M ${c.x - 8} ${c.y + 13} q 8 -8 16 0`, tone: 'shadow', width: 1.8 };
  }),
});

const hoodie = (body, colors) => knit(body, colors, 'hoodie', {
  // Kangaroo pocket and drawstrings.
  lines: (b, { cx, hemY }) => {
    const top = posed(b, 0, cx, b.waist.y + 18);
    const bottom = posed(b, 0, cx, hemY - 18);
    const pocket = `M ${top.x - 44} ${bottom.y} L ${top.x - 36} ${top.y} L ${top.x + 36} ${top.y} L ${top.x + 44} ${bottom.y}`;
    const n = posed(b, 0, cx, b.neck.bottom + 14);
    return [
      { d: pocket, tone: 'deep', width: 2.2 },
      { d: `M ${top.x - 36} ${top.y + 4} L ${top.x - 30} ${bottom.y - 2} M ${top.x + 36} ${top.y + 4} L ${top.x + 30} ${bottom.y - 2}`, tone: 'shadow', width: 1.6 },
      { d: `M ${n.x - 8} ${n.y} L ${n.x - 11} ${n.y + 58} M ${n.x + 8} ${n.y} L ${n.x + 10} ${n.y + 52}`, tone: 'light', width: 2.6 },
    ];
  },
  // The hood lies down around the neck: two thick rolls either side, open
  // at the front.
  over: (b, _, base) => {
    const cx = b.head.cx;
    const roll = (s) => {
      const a = posed(b, s, cx + s * (b.neck.half - 2), b.neck.bottom + 14);
      const top = posed(b, s, cx + s * (b.neck.half + 8), b.neck.top + 18);
      const out = posed(b, s, cx + s * (b.neck.half + 46), b.neck.bottom + 2);
      const low = posed(b, s, cx + s * (b.neck.half + 28), b.neck.bottom + 22);
      return `M ${pt(a)} Q ${pt(P(top.x - s * 6, top.y + 6))} ${pt(top)} Q ${pt(P(out.x, top.y + 4))} ${pt(out)} Q ${pt(low)} ${pt(a)} Z`;
    };
    return piece({ name: 'hood', parts: [roll(-1), roll(1)], base, shade: [{ d: roll(1), tone: 'shadow', opacity: 0.5 }] });
  },
});

// ---- Outer layers ------------------------------------------------------------

function lightJacket(body, { base, print }) {
  const hemY = body.hip.y + 52;
  const opts = { hemY, ease: 16 * (0.5 + body.fit / 2), neckWidth: 9 };
  const { cx, l, r } = torsoPoints(body, opts);
  const gap = 12;
  // Two front panels, open in the middle to show the top underneath.
  const panel = (s, t) => {
    const top = P(cx + s * (body.neck.half + 2), body.neck.bottom + 34);
    return `M ${pt(t.neck)}${shoulderFromNeck(t, s)}`
      + curveThrough(t.sideLine)
      + ` L ${pt(P(cx + s * gap, hemY + 4))} L ${pt(P(cx + s * gap, top.y + 40))} Q ${pt(P(cx + s * (gap - 2), top.y))} ${pt(top)} Z`;
  };
  const collar = (s) => smoothClosed([
    P(cx + s * (body.neck.half + 2), body.neck.top + 26),
    P(cx + s * (body.neck.half + 30), body.neck.bottom + 2),
    P(cx + s * (gap + 6), body.neck.bottom + 46),
    P(cx + s * (body.neck.half - 2), body.neck.bottom - 4),
  ]);
  const pocket = (s) => {
    const x0 = cx + s * 30;
    const x1 = cx + s * 64;
    const y = body.chest.y + 6;
    return [line(P(x0, y), P(x1, y)), `M ${x0} ${y} L ${x0} ${y + 24} L ${x1} ${y + 24} L ${x1} ${y}`];
  };
  const torso = piece({
    name: 'jacket',
    parts: [panel(-1, l), panel(1, r), collar(-1), collar(1)],
    base,
    print,
    shade: [
      { d: torsoShadow(body, opts), tone: 'shadow' },
      // The inside edge of each panel is in shadow.
      { d: `M ${cx - gap} ${body.neck.bottom + 40} L ${cx - gap - 8} ${body.neck.bottom + 50} L ${cx - gap - 8} ${hemY} L ${cx - gap} ${hemY} Z`, tone: 'shadow' },
    ],
    lines: [
      // Collar edges drawn over the panels.
      { d: `M ${pt(P(cx - body.neck.half - 30, body.neck.bottom + 2))} L ${pt(P(cx - gap - 6, body.neck.bottom + 46))}`, tone: 'deep', width: 2.2 },
      { d: `M ${pt(P(cx + body.neck.half + 30, body.neck.bottom + 2))} L ${pt(P(cx + gap + 6, body.neck.bottom + 46))}`, tone: 'deep', width: 2.2 },
      ...pocket(-1).map((d) => ({ d, tone: 'deep', width: 2 })),
      ...pocket(1).map((d) => ({ d, tone: 'deep', width: 2 })),
      // Hem band.
      { d: `M ${pt(P(l.hem.x + 2, hemY - 14))} L ${cx - gap} ${hemY - 14} M ${cx + gap} ${hemY - 14} L ${pt(P(r.hem.x - 2, hemY - 14))}`, tone: 'shadow', width: 2.4 },
      { d: curve([P(l.armpit.x + 14, l.armpit.y + 20), P(l.waist.x + 22, l.waist.y + 10), P(l.hem.x + 24, hemY - 30)]), width: 2 },
    ],
  });
  const sleeves = ['left', 'right'].map((side) => {
    const { d, pts, widths } = setInSleeve(body, side, 1, { extra: 14 });
    const elbow = along(body.arms[side], 0.5);
    return piece({
      name: 'jacket-sleeve',
      parts: [d],
      base,
      print,
      shade: side === 'right' ? [{ d: limb(pts.map((q) => P(q.x + 11, q.y)), widths.map((x) => x * 0.45), { capEnd: false }), tone: 'shadow' }] : [],
      lines: [
        { d: endBand(pts, widths, 12), tone: 'shadow', width: 2.6 },
        { d: `M ${elbow.x - 8} ${elbow.y - 6} q 8 6 14 2`, width: 2 },
      ],
    });
  }).join('');
  return { torso, sleeves, longSleeves: true, hemY };
}

// ---- Bottoms ----------------------------------------------------------------

// Hips and waistband shared by shorts and pants; `to` is how far down the
// leg the garment reaches (0 hip, 1 ankle).
function bottom(body, { base, print }, to, name) {
  const cx = body.head.cx;
  const top = body.waist.y + 50;
  const hw = halfWidthAt(body, top) + 1;
  // Every point follows the weight-shift pose: the waistband tilts with the
  // hips and the fly sits on the shifted center line.
  const at = (s, x, y) => posed(body, s, x, y);
  const mid = (y) => posed(body, 0, cx, y);
  const band = (s, dy = 0) => at(s, cx + s * hw, top + dy);
  const pelvis = hipBlock(body, top).d;
  const legs = ['left', 'right'].map((side) => {
    const s = side === 'left' ? -1 : 1;
    const prof = legProfile(body, side);
    const sl = profileSlice(prof, 0, to);
    // Shorts sit closer than pants so the two legs separate below the crotch.
    const ext = to > 0.9 ? 12 : 8;
    const knee = body.legWidths[1] + ext - 2;
    const start = legStart(body, side, sl.pts[0], sl.widths[0] + ext - 2);
    const pts = [start.pt, ...sl.pts];
    // Thighs follow the leg; below the knee straight-leg pants hang rather
    // than hugging the calf.
    const widths = [start.width, ...sl.widths.map((w, i) => (sl.ts[i] >= 0.44 ? Math.max(w + ext, knee) : w + ext))];
    // Flat at the top: a rounded start would bulge out over the hips.
    return { pts, widths, knee: along(body.legs[side], 0.5), d: limb(pts, widths, { capStart: false, capEnd: false }) };
  });
  const [L, R] = legs;
  const crotch = mid(body.crotchY);
  const lastL = L.pts[L.pts.length - 1];
  const lastR = R.pts[R.pts.length - 1];
  const svg = piece({
    name,
    parts: [pelvis, L.d, R.d],
    base,
    print,
    shade: [
      { d: limb(R.pts.map((q) => P(q.x + 16, q.y)), R.widths.map((x) => x * 0.3), { capEnd: false }), tone: 'shadow', opacity: 0.75 },
      { d: `M ${crotch.x - 16} ${crotch.y - 8} Q ${crotch.x} ${crotch.y - 2} ${crotch.x + 16} ${crotch.y - 8} L ${crotch.x + 4} ${crotch.y + 14} L ${crotch.x - 4} ${crotch.y + 14} Z`, tone: 'shadow', opacity: 0.8 },
      { d: `M ${pt(band(-1))} L ${pt(band(1))} L ${pt(band(1, 15))} L ${pt(band(-1, 15))} Z`, tone: 'light', opacity: 0.35 },
    ],
    lines: [
      { d: `M ${pt(band(-1, 15))} L ${pt(band(1, 15))}`, tone: 'deep', width: 2.2 },
      // Fly.
      { d: `M ${pt(P(mid(top + 15).x + 2, mid(top + 15).y))} L ${crotch.x + 2} ${crotch.y - 30} Q ${crotch.x + 2} ${crotch.y - 16} ${crotch.x - 10} ${crotch.y - 20}`, tone: 'deep', width: 2 },
      // Front pockets.
      ...[-1, 1].map((s) => ({ d: `M ${pt(at(s, cx + s * (hw - 12), top + 15))} Q ${pt(at(s, cx + s * (hw - 20), top + 40))} ${pt(at(s, cx + s * (hw - 34), top + 62))}`, tone: 'deep', width: 2.2 })),
      // Folds at the crotch and, for pants, at the knees.
      { d: curve([P(crotch.x - 34, crotch.y - 6), P(crotch.x - 18, crotch.y - 2), P(crotch.x - 8, crotch.y + 8)]), width: 1.8 },
      { d: curve([P(crotch.x + 36, crotch.y - 4), P(crotch.x + 20, crotch.y), P(crotch.x + 10, crotch.y + 10)]), width: 1.8 },
      ...(to > 0.9
        ? legs.flatMap(({ knee: k }) => [{ d: `M ${k.x - 12} ${k.y - 8} q 10 6 22 0`, width: 1.8 }, { d: `M ${k.x - 10} ${k.y + 6} q 8 4 18 -2`, width: 1.6, opacity: 0.8 }])
        : [
          ...legs.map(({ pts, widths }) => ({ d: endBand(pts, widths, 8), tone: 'shadow', width: 2.2 })),
          // Inseam, so shorts read as two legs even where the thighs meet.
          { d: `M ${crotch.x} ${crotch.y + 2} L ${(lastL.x + lastR.x) / 2} ${Math.max(lastL.y, lastR.y) + 4}`, tone: 'deep', width: 2.2 },
        ]),
    ],
  });
  return { svg, top };
}

const shorts = (body, colors) => bottom(body, colors, 0.33, 'shorts');
const pants = (body, colors) => bottom(body, colors, 1, 'pants');

// ---- Registry ----------------------------------------------------------------

export const TEMPLATES = {
  tee: { slot: 'top', draw: tee },
  cropTop: { slot: 'top', draw: cropTop },
  spaghettiTop: { slot: 'top', draw: spaghettiTop },
  sweater: { slot: 'top', draw: sweater },
  // A drawing for the hoodie look of the "Sweater or hoodie" type; how a
  // closet item picks it is settled in C7.
  hoodie: { slot: 'top', draw: hoodie },
  lightJacket: { slot: 'outer', draw: lightJacket },
  shorts: { slot: 'bottom', draw: shorts },
  pants: { slot: 'bottom', draw: pants },
  sneakers: { slot: 'shoes', draw: SHOES.sneakers },
  boots: { slot: 'shoes', draw: SHOES.boots },
  sandals: { slot: 'shoes', draw: SHOES.sandals },
  clogs: { slot: 'shoes', draw: SHOES.clogs },
  heels: { slot: 'shoes', draw: SHOES.heels },
  dressShoes: { slot: 'shoes', draw: SHOES.dressShoes },
};
