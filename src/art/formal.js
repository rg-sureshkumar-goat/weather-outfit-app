// Professional and formal wear (spec.md R41, drawn in C2 for the occasion
// phases): dress shirt, tie and bow tie, blazer, tuxedo jacket, suit
// trousers, and two dresses. Built on the shared fitting shapes, so each
// fits both bodies.

import { piece } from './draw.js';
import { posed, torsoSide } from './bodies.js';
import { legProfile, profileSlice } from './figure.js';
import { limb, along, curveThrough, pt, lerp } from './shapes.js';
import { P, curve, torsoPoints, torsoPath, shoulderFromNeck, setInSleeve, endBand, torsoShadow, bustLines } from './fit.js';

const dot = (p, r = 2.6) => `M ${p.x - r} ${p.y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;

function longSleeves(body, base, print, name, { extra = 14, cuffButtons = 0 } = {}) {
  return ['left', 'right'].map((side) => {
    const { d, pts, widths } = setInSleeve(body, side, 1, { extra });
    const end = pts[pts.length - 1];
    const s = side === 'left' ? -1 : 1;
    const buttons = Array.from({ length: cuffButtons }, (_, i) => dot(P(end.x + s * 6, end.y - 10 - i * 7), 1.8)).join(' ');
    return piece({
      name: `${name}-sleeve`,
      parts: [d],
      base,
      print,
      shade: side === 'right' ? [{ d: limb(pts.map((q) => P(q.x + 11, q.y)), widths.map((x) => x * 0.42), { capEnd: false }), tone: 'shadow' }] : [],
      lines: [
        { d: endBand(pts, widths, 12), tone: 'shadow', width: 2.2 },
        ...(buttons ? [{ d: buttons, tone: 'deep', width: 1.6 }] : []),
      ],
    });
  }).join('');
}

// ---- Dress shirt, tie, bow tie ----------------------------------------------------

function dressShirt(body, { base, print }) {
  const hemY = body.hip.y + 14;
  const opts = { hemY, ease: 7 * body.fit, neckWidth: 3, neckDrop: 10 };
  const { cx } = torsoPoints(body, opts);
  const n = body.neck;
  // Point collar: two folded wings meeting under the chin.
  const wing = (s) => {
    const a = posed(body, s, cx + s * 2, n.bottom + 6);
    const b = posed(body, s, cx + s * (n.half + 4), n.top + 30);
    const c = posed(body, s, cx + s * (n.half + 16), n.bottom + 2);
    const tip = posed(body, s, cx + s * 14, n.bottom + 26);
    return `M ${pt(a)} L ${pt(b)} Q ${pt(lerp(b, c, 0.5))} ${pt(c)} L ${pt(tip)} Z`;
  };
  const placketTop = posed(body, 0, cx, n.bottom + 8);
  const placketBottom = posed(body, 0, cx, hemY - 4);
  const buttons = [0, 1, 2, 3, 4].map((i) => dot(lerp(placketTop, placketBottom, 0.14 + i * 0.19), 2.2)).join(' ');
  const torso = piece({
    name: 'shirt',
    parts: [torsoPath(body, opts), wing(-1), wing(1)],
    base,
    print,
    shade: [{ d: torsoShadow(body, opts), tone: 'shadow', opacity: 0.8 }],
    lines: [
      { d: `M ${placketTop.x - 6} ${placketTop.y} L ${placketBottom.x - 6} ${placketBottom.y} M ${placketTop.x + 6} ${placketTop.y} L ${placketBottom.x + 6} ${placketBottom.y}`, tone: 'shadow', width: 1.6 },
      { d: buttons, tone: 'deep', width: 1.6 },
      ...[-1, 1].map((s) => ({ d: wing(s), tone: 'shadow', width: 1.8 })),
      ...bustLines(body),
    ],
  });
  return { torso, sleeves: longSleeves(body, base, print, 'shirt', { extra: 12, cuffButtons: 1 }), longSleeves: true, hemY };
}

// A tie from the collar to the waist; the print color draws stripes.
function tie(body, { base, print }) {
  const cx = body.head.cx;
  const knotTop = posed(body, 0, cx, body.neck.bottom + 8);
  const knotBottom = posed(body, 0, cx, body.neck.bottom + 24);
  const tip = posed(body, 0, cx, body.waist.y + 14);
  const knot = `M ${knotTop.x - 8} ${knotTop.y} L ${knotTop.x + 8} ${knotTop.y} L ${knotBottom.x + 5} ${knotBottom.y} L ${knotBottom.x - 5} ${knotBottom.y} Z`;
  const blade = `M ${knotBottom.x - 5} ${knotBottom.y - 2} L ${knotBottom.x + 5} ${knotBottom.y - 2} L ${tip.x + 13} ${tip.y - 16} L ${tip.x} ${tip.y} L ${tip.x - 13} ${tip.y - 16} Z`;
  const stripes = print
    ? [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const y = knotBottom.y + 18 + i * 22;
      return `M ${cx - 16} ${y + 8} L ${cx + 16} ${y - 8}`;
    }).join(' ')
    : '';
  return piece({
    name: 'tie',
    parts: [knot, blade],
    base,
    shade: [{ d: `M ${knotBottom.x + 1} ${knotBottom.y} L ${knotBottom.x + 5} ${knotBottom.y} L ${tip.x + 13} ${tip.y - 16} L ${tip.x} ${tip.y} Z`, tone: 'shadow', opacity: 0.6 }],
    lines: [
      ...(stripes ? [{ d: stripes, tone: 'light', width: 4, opacity: 0.6 }] : []),
      { d: `M ${knotBottom.x - 5} ${knotBottom.y} L ${knotBottom.x + 5} ${knotBottom.y}`, tone: 'deep', width: 1.6 },
    ],
  });
}

function bowTie(body, { base }) {
  const c = posed(body, 0, body.head.cx, body.neck.bottom + 14);
  const wing = (s) => `M ${c.x} ${c.y} L ${c.x + s * 22} ${c.y - 10} Q ${c.x + s * 26} ${c.y} ${c.x + s * 22} ${c.y + 10} Z`;
  return piece({
    name: 'bowtie',
    parts: [wing(-1), wing(1), `M ${c.x - 5} ${c.y - 6} L ${c.x + 5} ${c.y - 6} L ${c.x + 5} ${c.y + 6} L ${c.x - 5} ${c.y + 6} Z`],
    base,
    lines: [{ d: `M ${c.x - 18} ${c.y - 4} l 8 4 l -8 4 M ${c.x + 18} ${c.y - 4} l -8 4 l 8 4`, tone: 'light', width: 1.4, opacity: 0.6 }],
  });
}

// ---- Blazer and tuxedo ---------------------------------------------------------------

// A tailored jacket: fronts close at a button at the waist, opening in a V
// above it to show the shirt and tie, with lapels along the V. `peak`
// gives peak lapels; `satin` gives them a sheen (tuxedo).
function tailored(body, { base, print }, { name, peak = false, satin = false, buttons = 2 }) {
  const hemY = body.hip.y + 44;
  const opts = { hemY, ease: 12 * (0.5 + body.fit / 2), neckWidth: 8 };
  const { cx, l, r } = torsoPoints(body, opts);
  const n = body.neck;
  const button = posed(body, 0, cx, body.waist.y + 6);
  // The V opening: from the neck down to the button, then the fronts curve
  // away to the hem.
  const front = (s, t) => {
    const collar = posed(body, s, cx + s * (n.half + 2), n.bottom - 6);
    const hemFront = posed(body, s, cx + s * 18, hemY + 2);
    return `M ${pt(t.neck)}${shoulderFromNeck(t, s)}`
      + curveThrough(t.sideLine)
      + ` L ${pt(hemFront)} Q ${pt(P(button.x + s * 4, button.y + 30))} ${pt(P(button.x - s * 6, button.y))}`
      + ` L ${pt(collar)} Z`;
  };
  const lapel = (s) => {
    const top = posed(body, s, cx + s * (n.half + 4), n.bottom - 8);
    const notchOut = posed(body, s, cx + s * (n.half + 34), n.bottom + 18);
    const notchIn = posed(body, s, cx + s * (n.half + (peak ? 40 : 26)), n.bottom + (peak ? 14 : 30));
    const roll = posed(body, s, cx + s * 22, body.chest.y + 30);
    return `M ${pt(top)} L ${pt(notchOut)} L ${pt(notchIn)} Q ${pt(P(roll.x + s * 18, roll.y - 20))} ${pt(roll)} L ${pt(P(button.x + s * 2, button.y - 4))} L ${pt(P(top.x - s * 8, top.y + 30))} Z`;
  };
  const flap = (s) => {
    const a = posed(body, s, cx + s * 26, body.hip.y + 6);
    const b = posed(body, s, cx + s * 70, body.hip.y + 4);
    return `M ${pt(a)} L ${pt(b)} L ${pt(P(b.x, b.y + 12))} L ${pt(P(a.x, a.y + 12))} Z`;
  };
  const chestPocket = posed(body, -1, cx - 54, body.chest.y + 4);
  const buttonDots = Array.from({ length: buttons }, (_, i) => dot(P(button.x + 2, button.y + i * 30), 3.4)).join(' ');
  const torso = piece({
    name,
    parts: [front(-1, l), front(1, r)],
    base,
    print,
    shade: [{ d: torsoShadow(body, opts), tone: 'shadow' }],
    lines: [
      { d: flap(-1), tone: 'deep', width: 2 },
      { d: flap(1), tone: 'deep', width: 2 },
      { d: `M ${chestPocket.x - 16} ${chestPocket.y} L ${chestPocket.x + 14} ${chestPocket.y - 3}`, tone: 'deep', width: 2.6 },
      { d: buttonDots, tone: 'deep', width: 2 },
      { d: curve([P(l.armpit.x + 14, l.armpit.y + 20), P(l.waist.x + 18, l.waist.y + 8), P(l.hem.x + 20, hemY - 30)]), width: 1.8 },
      // Front dart.
      ...[-1, 1].map((s) => ({ d: curve([posed(body, s, cx + s * 48, body.chest.y + 40), posed(body, s, cx + s * 46, body.waist.y + 10), posed(body, s, cx + s * 48, body.hip.y)]), tone: 'shadow', width: 1.6, opacity: 0.8 })),
    ],
  }) + piece({
    name: `${name}-lapel`,
    parts: [lapel(-1), lapel(1)],
    base,
    shade: satin ? [{ d: lapel(-1), tone: 'light', opacity: 0.35 }, { d: lapel(1), tone: 'light', opacity: 0.2 }] : [{ d: lapel(1), tone: 'shadow', opacity: 0.4 }],
    lines: [...[-1, 1].map((s) => ({ d: `M ${pt(posed(body, s, cx + s * (n.half + 34), n.bottom + 18))} L ${pt(posed(body, s, cx + s * (n.half + (peak ? 40 : 26)), n.bottom + (peak ? 14 : 30)))}`, tone: 'deep', width: 1.8 }))],
  });
  return { torso, sleeves: longSleeves(body, base, print, name, { extra: 16, cuffButtons: 3 }), longSleeves: true, hemY };
}

const blazer = (body, colors) => tailored(body, colors, { name: 'blazer' });
const tuxedo = (body, colors) => tailored(body, colors, { name: 'tuxedo', peak: true, satin: true, buttons: 1 });

// ---- Suit trousers ----------------------------------------------------------------------

// Tailored trousers: a front crease down each leg, slanted side pockets, a
// slight break over the shoe. A satin side stripe when `stripe` (tuxedo).
function trousers(body, { base, print }, { stripe = false } = {}) {
  const cx = body.head.cx;
  const top = body.waist.y + 46;
  const at = (s, x, y) => posed(body, s, x, y);
  const hw = torsoSide(body, 1, top).x - posed(body, 1, cx, top).x + 1;
  const band = (s, dy = 0) => at(s, cx + s * hw, top + dy);
  const crotch = posed(body, 0, cx, body.crotchY);
  const pelvis = `M ${pt(band(-1))} L ${pt(band(1))} L ${pt(at(1, cx + body.hip.half + 2, body.hip.y + 14))} L ${pt(P(crotch.x + 6, crotch.y + 6))} L ${pt(P(crotch.x - 6, crotch.y + 6))} L ${pt(at(-1, cx - body.hip.half - 2, body.hip.y + 14))} Z`;
  const legs = ['left', 'right'].map((side) => {
    const s = side === 'left' ? -1 : 1;
    const sl = profileSlice(legProfile(body, side), 0, 1);
    const knee = body.legWidths[1] + 14;
    const pts = [P(sl.pts[0].x, at(s, sl.pts[0].x, top + 10).y), ...sl.pts];
    const widths = [sl.widths[0] + 10, ...sl.widths.map((w, i) => (sl.ts[i] >= 0.4 ? Math.max(w + 14, knee) : w + 14))];
    pts[pts.length - 1] = P(pts[pts.length - 1].x, pts[pts.length - 1].y + 8);
    return { s, pts, widths, d: limb(pts, widths, { capStart: false, capEnd: false }) };
  });
  return {
    svg: piece({
      name: 'trousers',
      parts: [pelvis, ...legs.map((g) => g.d)],
      base,
      print,
      shade: [{ d: limb(legs[1].pts.map((q) => P(q.x + 14, q.y)), legs[1].widths.map((x) => x * 0.3), { capEnd: false }), tone: 'shadow', opacity: 0.7 }],
      lines: [
        { d: `M ${pt(band(-1, 14))} L ${pt(band(1, 14))}`, tone: 'deep', width: 2 },
        { d: `M ${pt(posed(body, 0, cx + 1, top + 14))} L ${crotch.x + 1} ${crotch.y - 16}`, tone: 'deep', width: 1.8 },
        ...[-1, 1].map((s) => ({ d: `M ${pt(at(s, cx + s * (hw - 8), top + 14))} L ${pt(at(s, cx + s * (hw - 2), top + 58))}`, tone: 'deep', width: 2 })),
        // Front creases.
        ...legs.map(({ pts }) => ({ d: `M ${pt(along(pts, 0.12))}${curveThrough(pts.slice(2).map((q) => P(q.x, q.y)))}`, tone: 'light', width: 1.6, opacity: 0.7 })),
        ...(stripe ? legs.map(({ pts, widths, s }) => ({ d: `M ${pt(P(pts[1].x + s * (widths[1] / 2 - 3), pts[1].y))}${curveThrough(pts.slice(2).map((q, i) => P(q.x + s * (widths[i + 2] / 2 - 3), q.y)))}`, tone: 'light', width: 4, opacity: 0.5 })) : []),
      ],
    }),
    top,
  };
}

// ---- Dresses (one piece: they fill the top and bottom together) -----------------------------

// A fitted bodice from just above the bust to the waist with thin straps,
// then a skirt from the waist to `hemY`, flaring by `flare` px.
function dress(body, { base, print }, { name, hemY, flare, neck }) {
  const cx = body.head.cx;
  const ease = 4 * body.fit;
  const topY = body.chest.y - (neck === 'v' ? 20 : 30);
  const side = (s) => [
    torsoSide(body, s, topY, ease - 4),
    torsoSide(body, s, body.chest.y + 10, ease),
    torsoSide(body, s, (body.chest.y + body.waist.y) / 2 + 10, ease),
    torsoSide(body, s, body.waist.y, ease),
    torsoSide(body, s, body.hip.y, ease + 4),
    posed(body, s, cx + s * (body.hip.half + flare * 0.5), (body.hip.y + hemY) / 2),
    posed(body, s, cx + s * (body.hip.half + flare), hemY),
  ];
  const l = side(-1);
  const r = side(1);
  const neckline = neck === 'v'
    ? ` L ${pt(posed(body, 0, cx, body.chest.y + 26))} L ${pt(l[0])}`
    : ` Q ${pt(posed(body, 0, cx, topY + 16))} ${pt(l[0])}`;
  const d = `M ${pt(l[0])}` + curveThrough(l) + ` Q ${pt(posed(body, 0, cx, hemY + 10))} ${pt(r[r.length - 1])}`
    + curveThrough([...r].reverse()) + neckline + ' Z';
  const strap = (s) => limb([posed(body, s, cx + s * (neck === 'v' ? 34 : 26), topY + 4), posed(body, s, cx + s * body.shoulder.half * 0.6, body.shoulder.y + 1)], [neck === 'v' ? 9 : 4, neck === 'v' ? 9 : 4]);
  const waist = [torsoSide(body, -1, body.waist.y, ease), torsoSide(body, 1, body.waist.y, ease)];
  const folds = [-0.5, -0.15, 0.2, 0.55].map((f) => {
    const a = posed(body, 0, cx + f * body.hip.half * 0.8, body.hip.y + 10);
    const b = posed(body, 0, cx + f * (body.hip.half + flare) * 0.95, hemY - 6);
    return { d: `M ${pt(a)} Q ${pt(P((a.x + b.x) / 2 + f * 6, (a.y + b.y) / 2))} ${pt(b)}`, width: 1.8, opacity: 0.8 };
  });
  const torso = piece({
    name,
    parts: [d],
    base,
    print,
    shade: [
      { d: `M ${pt(r[1])}` + curveThrough(r.slice(1).map((q) => P(q.x - 26, q.y))) + ` L ${pt(r[r.length - 1])}` + curveThrough([...r.slice(1)].reverse()) + ' Z', tone: 'shadow', opacity: 0.9 },
    ],
    lines: [
      { d: `M ${pt(waist[0])} Q ${pt(posed(body, 0, cx, body.waist.y + 4))} ${pt(waist[1])}`, tone: 'deep', width: 2 },
      ...folds,
      ...bustLines(body),
    ],
  }) + piece({ name: `${name}-strap`, parts: [strap(-1), strap(1)], base, outline: 1.6 });
  return { torso, sleeves: '', sleeveless: true, hemY, onePiece: true };
}

const formalDress = (body, colors) => dress(body, colors, { name: 'formal-dress', hemY: body.legs.left[1].y - 12, flare: 22, neck: 'sweetheart' });
const banquetDress = (body, colors) => dress(body, colors, { name: 'gown', hemY: body.legs.right[2].y + 46, flare: 60, neck: 'v' });

export const FORMAL = {
  dressShirt: { slot: 'top', draw: dressShirt },
  blazer: { slot: 'outer', draw: blazer },
  tuxedo: { slot: 'outer', draw: tuxedo },
  trousers: { slot: 'bottom', draw: (b, c) => trousers(b, c) },
  tuxedoTrousers: { slot: 'bottom', draw: (b, c) => trousers(b, c, { stripe: true }) },
  formalDress: { slot: 'dress', draw: formalDress },
  banquetDress: { slot: 'dress', draw: banquetDress },
  tie: { slot: 'neckwear', draw: (b, c) => ({ svg: tie(b, c) }) },
  bowTie: { slot: 'neckwear', draw: (b, c) => ({ svg: bowTie(b, c) }) },
};
