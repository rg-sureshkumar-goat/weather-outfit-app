// renderAvatar(): the whole character as one SVG string.
//
// Layer order, back to front (fixed for every slot; plan.md C2):
//   hair back · skin (torso, legs, neck, head) · face · shoes · bottom ·
//   dress or top torso · neckwear (tie) · vest · outer torso · rain torso ·
//   arms and hands · sleeves of the outermost layer only · scarf ·
//   glasses or sunglasses · hair front · hat
// Under a hat, the hair above its band is hidden (underHat).
// Inner sleeves sit inside the outer ones, so drawing them would only let
// them peek through around the armhole. A dress fills the top and bottom.

import { bodyFor } from './bodies.js';
import { skinBase, arms } from './figure.js';
import { face, faceFront } from './face.js';
import { hair } from './hair.js';
import { TEMPLATES } from './garments.js';
import { FORMAL } from './formal.js';
import { ACCESSORIES, glasses } from './accessories.js';
import { uid } from './draw.js';
import { itemColors } from './palette.js';

const ALL = { ...TEMPLATES, ...FORMAL, ...ACCESSORIES };

// The drawing area: the full 400 px width, so the widest body types and
// their coats fit (R43). Most screens size the avatar by its height, so it
// keeps the same size there.
export const AVATAR_VIEWBOX = '0 30 400 940';

function drawItem(item, body, extras) {
  if (!item) return null;
  const template = ALL[item.type];
  if (!template) return null;
  return template.draw(body, itemColors(item), extras);
}

// look: { body: 'A'|'B', bodyType (bodies.js BODY_TYPES; default
//         'average'), face: 'A'|'B', features (face.js options; any may
//         be missing), skin, hair: { style, color },
//         facialHair: { beard, moustache } (face.js BEARDS, MOUSTACHES;
//         either may be missing), glasses }
// outfit: { top, bottom, shoes, outer, rain, dress, neckwear, vest, scarf, hat,
//           glasses (frame color only),
//           eyewear } items (any may be missing)
// Hair under a hat: everything above the hat's band, within the hat, is
// hidden. Outside the hat the edge slopes down and away, so thick hair (an
// afro) puffs out below the hat instead of ending in a flat cut.
function underHat(head, band, svg) {
  if (!band || !svg) return svg;
  const { cx, cy, rx, ry } = head;
  const y = cy + ry * band.y;
  const hw = rx * band.half;
  const far = rx * 2.6;
  const d = `M ${cx - hw} ${y} L ${cx + hw} ${y}`
    + ` C ${cx + hw + rx * 0.35} ${y} ${cx + rx * 1.9} ${y + ry * 0.3} ${cx + far} ${y + ry * 0.95} L ${cx + far} 2000 L ${cx - far} 2000 L ${cx - far} ${y + ry * 0.95}`
    + ` C ${cx - rx * 1.9} ${y + ry * 0.3} ${cx - hw - rx * 0.35} ${y} ${cx - hw} ${y} Z`;
  const id = uid('under-hat');
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${svg}</g>`;
}

export function renderAvatar(look, outfit = {}, { title = '' } = {}) {
  const body = bodyFor(look.body, look.bodyType);
  const h = hair(look.hair.style, body.head, look.hair.color, look.features?.shape);
  const dress = drawItem(outfit.dress, body);
  const top = dress ? null : drawItem(outfit.top, body);
  const bottom = dress ? null : drawItem(outfit.bottom, body);
  const outer = drawItem(outfit.outer, body);
  const rain = drawItem(outfit.rain, body);
  // Sandals and heels show the foot, so shoes get the skin color.
  const shoes = drawItem(outfit.shoes, body, { skin: look.skin });
  const neckwear = drawItem(outfit.neckwear, body);
  const vest = drawItem(outfit.vest, body);
  const scarf = drawItem(outfit.scarf, body);
  const hat = drawItem(outfit.hat, body);
  const band = hat?.band;
  const eyewear = drawItem(outfit.eyewear, body);

  const sleeveLayer = rain || outer || dress || top;
  // Bare shoulders (spaghetti top, dress, nothing on top) show the whole
  // arm from the shoulder; long sleeves hide everything but the hands.
  const armStyle = sleeveLayer?.longSleeves
    ? { handsOnly: true }
    : { fromShoulder: !sleeveLayer || Boolean(sleeveLayer.sleeveless) };

  const layers = [
    underHat(body.head, band, h.back),
    skinBase(body, look.skin, look.face, look.features),
    face(body.head, { skin: look.skin, hairColor: look.hair.color, set: look.face, features: look.features }),
    shoes?.svg,
    bottom?.svg,
    (dress || top)?.torso,
    neckwear?.svg,
    vest?.svg,
    outer?.torso,
    rain?.torso,
    arms(body, look.skin, armStyle),
    sleeveLayer?.sleeves,
    scarf?.svg,
    // Beard, mouth and moustache over the clothes, so long beards hang over them.
    faceFront(body.head, { skin: look.skin, hairColor: look.hair.color, set: look.face, facialHair: look.facialHair, features: look.features }),
    // Sunglasses replace glasses; with the Glasses setting on, a closet pair
    // of glasses colors the frames.
    eyewear?.svg ?? (look.glasses ? (drawItem(outfit.glasses, body)?.svg ?? glasses(body)) : ''),
    underHat(body.head, band, h.front),
    hat?.svg,
  ];

  const ground = `<ellipse cx="204" cy="${body.legs.right[2].y + 46}" rx="96" ry="12" fill="#1e1a24" opacity="0.12"/>`;
  const label = title ? `<title>${title}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${AVATAR_VIEWBOX}" role="img"${title ? '' : ' aria-hidden="true"'}>${label}${ground}${layers.filter(Boolean).join('')}</svg>`;
}
