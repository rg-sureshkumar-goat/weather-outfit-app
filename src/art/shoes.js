// Shoe templates (spec.md, Assets): sneakers, boots, sandals, clogs and
// heels, drawn in a three-quarter view with the toes turned slightly out.
// Each foot is drawn in local units: X(dx) runs from the heel (negative)
// toward the toe (positive), y is measured down from the ankle. Shoes that
// show the foot draw it in the wearer's skin color.

import { piece } from './draw.js';
import { smoothClosed, pt } from './shapes.js';

const P = (x, y) => ({ x, y });
const SOLE = '#f3f1ec';
const RUBBER = '#3a3330';

// Helpers for one foot: s = -1 points the toe to the viewer's left.
function frame(ankle, s) {
  const Q = (dx, dy) => P(ankle.x + s * dx, ankle.y + dy);
  const path = (pts) => smoothClosed(pts.map(([dx, dy]) => Q(dx, dy)));
  const line = (pts) => `M ${pts.map(([dx, dy]) => pt(Q(dx, dy))).join(' L ')}`;
  return { Q, path, line };
}

// A bare foot in three-quarter view, for sandals and heels. `arch` lifts the
// heel (for heels); toes stay on the ground.
function bareFoot(f, skin, arch = 0) {
  const { path, line } = f;
  const foot = path([
    [-12, -6], [12, -4], [28, 8 + arch * 0.3], [46, 22 + arch * 0.1], [58, 30], [60, 37], [52, 40],
    [20, 39 - arch * 0.2], [-14, 34 - arch], [-20, 20 - arch], [-16, 4],
  ]);
  const toes = [[46, 31, 52, 38], [50, 27, 57, 34], [40, 33, 46, 39]].map(([a, b, c, d]) => line([[a, b], [c, d]])).join(' ');
  return piece({ name: 'foot', parts: [foot], base: skin, outline: 2, lines: [{ d: toes, tone: 'shadow', width: 1.6 }] });
}

// ---- Sneakers -----------------------------------------------------------------

function sneakerFoot(ankle, s, base, print) {
  const f = frame(ankle, s);
  const { path, line, Q } = f;
  const sock = piece({ name: 'sock', base: SOLE, outline: 2, parts: [path([[-13, -26], [13, -26], [14, 2], [-14, 2]])] });
  // Upper: padded collar, tongue, lace throat, toe box.
  const upper = path([[-24, 26], [-25, 8], [-18, -6], [-6, -2], [2, -15], [11, -13], [15, -4], [30, 8], [46, 15], [58, 24], [61, 31], [-22, 32]]);
  // Midsole: thicker at the heel, tapering and turning up at the toe.
  const midsole = path([[-27, 22], [-6, 26], [30, 28], [56, 28], [64, 32], [60, 40], [20, 40], [-26, 40]]);
  const outsole = path([[-27, 38], [20, 39], [60, 38], [62, 42], [56, 46], [-22, 46], [-28, 44]]);
  const laces = [0, 1, 2, 3].map((i) => {
    const a = [3 + i * 7, -9 + i * 5];
    return `${line([[a[0] - 3, a[1] + 4], [a[0] + 7, a[1] - 1]])} ${line([[a[0] - 2, a[1] - 2], [a[0] + 6, a[1] + 5]])}`;
  }).join(' ');
  const eyelets = [0, 1, 2, 3].map((i) => `M ${pt(Q(1 + i * 7, -5 + i * 5))} m -1.2 0 a 1.2 1.2 0 1 0 2.4 0 a 1.2 1.2 0 1 0 -2.4 0`).join(' ');
  return sock
    + piece({
      name: 'sneaker',
      parts: [upper],
      base,
      print,
      shade: [
        // Mudguard band along the bottom of the upper, and the heel tab.
        { d: path([[-24, 22], [10, 24], [40, 22], [60, 26], [60, 33], [-24, 33]]), tone: 'shadow', opacity: 0.55 },
        { d: path([[-26, 4], [-19, 2], [-17, 22], [-25, 22]]), tone: 'deep', opacity: 0.8 },
        // Lace throat.
        { d: path([[0, -12], [12, -11], [32, 8], [24, 12], [6, 0]]), tone: 'shadow', opacity: 0.5 },
      ],
      lines: [
        { d: laces, tone: 'light', width: 2.2 },
        { d: eyelets, tone: 'deep', width: 1.6 },
        // Toe cap, side panel and collar padding.
        { d: line([[42, 13], [44, 22], [52, 30]]), tone: 'deep', width: 1.6 },
        { d: line([[-20, 22], [-4, 14], [14, 4], [24, 8]]), tone: 'deep', width: 1.8 },
        { d: line([[-22, -2], [-14, 4], [-6, 2]]), tone: 'shadow', width: 2.4 },
      ],
    })
    + piece({ name: 'midsole', parts: [midsole], base: SOLE, outline: 2, lines: [{ d: line([[-20, 33], [40, 34]]), tone: 'shadow', width: 1.4, opacity: 0.7 }] })
    + piece({ name: 'outsole', parts: [outsole], base: '#cfcac2', outline: 2 });
}

// ---- Boots ----------------------------------------------------------------------

function bootFoot(ankle, s, base, print) {
  const { path, line, Q } = frame(ankle, s);
  // Shaft rises above the ankle; pants usually cover it.
  const upper = path([[-22, 30], [-24, -10], [-20, -44], [14, -44], [16, -10], [30, 6], [48, 14], [60, 24], [62, 32], [-24, 34]]);
  const sole = path([[-28, 30], [62, 30], [66, 36], [62, 48], [-26, 48], [-30, 40]]);
  const hooks = [0, 1, 2, 3].map((i) => `M ${pt(Q(8, -36 + i * 9))} m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0`).join(' ');
  const laces = [0, 1, 2].map((i) => line([[-2, -34 + i * 9], [10, -28 + i * 9]])).join(' ');
  return piece({
    name: 'boot',
    parts: [upper],
    base,
    print,
    shade: [
      { d: path([[-24, -44], [-14, -44], [-14, 30], [-24, 30]]), tone: 'shadow', opacity: 0.5 },
      { d: path([[34, 8], [50, 14], [62, 24], [62, 32], [36, 32]]), tone: 'light', opacity: 0.35 },
    ],
    lines: [
      { d: hooks, tone: 'deep', width: 1.8 },
      { d: laces, tone: 'light', width: 2.4 },
      // Collar padding, toe cap and the welt above the sole.
      { d: line([[-22, -40], [14, -40]]), tone: 'deep', width: 2.6 },
      { d: line([[38, 10], [40, 22], [50, 30]]), tone: 'deep', width: 1.8 },
      { d: line([[-22, 27], [60, 27]]), tone: 'deep', width: 1.6, opacity: 0.8 },
    ],
  })
    + piece({
      name: 'boot-sole',
      parts: [sole],
      base: RUBBER,
      outline: 2,
      lines: [{ d: [0, 1, 2, 3, 4, 5].map((i) => line([[-20 + i * 14, 44], [-16 + i * 14, 48]])).join(' '), tone: 'light', width: 2 }],
    });
}

// ---- Sandals ----------------------------------------------------------------------

function sandalFoot(ankle, s, base, print, skin) {
  const { path, line } = frame(ankle, s);
  const sole = path([[-22, 34], [20, 37], [56, 34], [64, 38], [58, 44], [-18, 44], [-26, 40]]);
  // Two straps over the toes and instep, and one around the ankle.
  const straps = [
    path([[22, 10], [30, 6], [44, 26], [38, 30]]),
    path([[-6, -2], [4, -6], [18, 30], [8, 32]]),
    path([[-18, -6], [-12, -10], [10, -6], [10, 0], [-14, -2]]),
  ];
  return bareFoot(frame(ankle, s), skin)
    + piece({ name: 'sandal-sole', parts: [sole], base, outline: 2, shade: [{ d: sole, tone: 'shadow', opacity: 0.35 }] })
    + piece({ name: 'sandal-straps', parts: straps, base, print, lines: [{ d: line([[-2, 0], [10, 30]]), tone: 'light', width: 1.4, opacity: 0.7 }] });
}

// ---- Clogs ------------------------------------------------------------------------

// A generic foam clog: roomy rounded toe with vent holes, heel strap, thick
// sole, all in one color. Not modeled on any brand.
function clogFoot(ankle, s, base, print) {
  const { path, line, Q } = frame(ankle, s);
  const upper = path([[-18, 30], [-16, 8], [-6, -2], [14, -4], [34, 4], [52, 14], [64, 26], [64, 34], [-20, 34]]);
  const sole = path([[-24, 30], [64, 30], [68, 38], [62, 46], [-20, 46], [-26, 40]]);
  const strap = path([[-10, 10], [-24, 12], [-30, 22], [-24, 26], [-10, 20]]);
  const holes = [[18, 4], [28, 8], [38, 12], [24, 14], [34, 18], [44, 20], [50, 24]]
    .map(([dx, dy]) => `M ${pt(Q(dx, dy))} m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0`).join(' ');
  return piece({
    name: 'clog',
    parts: [upper, strap],
    base,
    print,
    shade: [{ d: path([[-20, 22], [30, 24], [64, 28], [64, 34], [-20, 34]]), tone: 'shadow', opacity: 0.5 }],
    lines: [
      { d: holes, tone: 'deep', width: 2.6 },
      { d: `M ${pt(Q(-10, 15))} m -2.4 0 a 2.4 2.4 0 1 0 4.8 0 a 2.4 2.4 0 1 0 -4.8 0`, tone: 'light', width: 2 },
      { d: line([[-6, 0], [14, -2], [30, 4]]), tone: 'light', width: 2, opacity: 0.7 },
    ],
  })
    + piece({ name: 'clog-sole', parts: [sole], base, outline: 2, shade: [{ d: sole, tone: 'deep', opacity: 0.45 }] });
}

// ---- Heels ------------------------------------------------------------------------

// A pump with a pointed toe and a slim heel; the foot is arched, so the
// heel of the foot sits above the ground on the shoe's heel.
function heelFoot(ankle, s, base, print, skin) {
  const { path, line } = frame(ankle, s);
  const arch = 12;
  const shoe = path([[-20, 8], [-12, 20], [8, 26], [26, 22], [44, 28], [66, 38], [60, 42], [20, 40], [-14, 30], [-22, 22]]);
  const heel = path([[-20, 26], [-12, 30], [-14, 50], [-18, 50]]);
  const sole = line([[-14, 31], [20, 40], [60, 42]]);
  return bareFoot(frame(ankle, s), skin, arch)
    + piece({ name: 'heel-spike', parts: [heel], base, print, outline: 2, shade: [{ d: heel, tone: 'deep', opacity: 0.5 }] })
    + piece({
      name: 'heel',
      parts: [shoe],
      base,
      print,
      shade: [{ d: path([[-20, 18], [20, 28], [60, 38], [60, 42], [20, 40], [-20, 26]]), tone: 'shadow', opacity: 0.55 }],
      lines: [
        { d: sole, tone: 'deep', width: 1.8 },
        { d: line([[-10, 14], [10, 18], [26, 16]]), tone: 'light', width: 1.8, opacity: 0.8 },
      ],
    });
}

// ---- Dress shoes ----------------------------------------------------------------------

// Oxfords for suits: a sleek, low upper with a long rounded toe, a closed
// lace panel, a stitched welt, a low block heel and a thin dark sole.
function oxfordFoot(ankle, s, base, print) {
  const { path, line, Q } = frame(ankle, s);
  const upper = path([[-22, 32], [-22, 10], [-14, 0], [6, -4], [22, 4], [44, 16], [62, 26], [66, 32], [60, 36], [-20, 36]]);
  const sole = path([[-24, 34], [62, 34], [68, 38], [60, 42], [-10, 42], [-12, 46], [-24, 46]]);
  const eyelets = [0, 1, 2].map((i) => `M ${pt(Q(4 + i * 7, 0 + i * 3))} m -1.1 0 a 1.1 1.1 0 1 0 2.2 0 a 1.1 1.1 0 1 0 -2.2 0`).join(' ');
  return piece({
    name: 'oxford',
    parts: [upper],
    base,
    print,
    shade: [
      { d: path([[-22, 24], [20, 26], [62, 28], [62, 36], [-22, 36]]), tone: 'shadow', opacity: 0.5 },
      { d: path([[30, 8], [46, 16], [60, 24], [50, 24], [36, 16]]), tone: 'light', opacity: 0.6 },
    ],
    lines: [
      { d: line([[0, -2], [24, 10]]), tone: 'deep', width: 1.6 },
      { d: eyelets, tone: 'light', width: 1.4 },
      { d: line([[2, 2], [10, -2], [18, 2], [26, 6]]), tone: 'light', width: 1.2, opacity: 0.8 },
      // Toe cap and the heel counter seam.
      { d: line([[40, 12], [42, 22], [50, 32]]), tone: 'deep', width: 1.6 },
      { d: line([[-12, 2], [-8, 18], [-16, 32]]), tone: 'deep', width: 1.4 },
    ],
  }) + piece({ name: 'oxford-sole', parts: [sole], base: RUBBER, outline: 1.8 });
}

// ---- Registry -----------------------------------------------------------------------

const pair = (drawFoot) => (body, { base, print }, { skin } = {}) => ({
  svg: drawFoot(body.legs.left[2], -1, base, print, skin) + drawFoot(body.legs.right[2], 1, base, print, skin),
});

export const SHOES = {
  sneakers: pair(sneakerFoot),
  boots: pair(bootFoot),
  sandals: pair(sandalFoot),
  clogs: pair(clogFoot),
  heels: pair(heelFoot),
  dressShoes: pair(oxfordFoot),
};
