// renderAvatar(): the whole character as one SVG string.
//
// Layer order, back to front (fixed for every slot; plan.md C2):
//   hair back · skin (torso, legs, neck, head) · face · shoes · bottom ·
//   dress or top torso · neckwear (tie) · outer torso · rain torso ·
//   arms and hands · sleeves of the outermost layer only · scarf ·
//   glasses or sunglasses · hair front · hat
// Inner sleeves sit inside the outer ones, so drawing them would only let
// them peek through around the armhole. A dress fills the top and bottom.

import { BODIES } from './bodies.js';
import { skinBase, face, arms } from './figure.js';
import { hair } from './hair.js';
import { TEMPLATES } from './garments.js';
import { FORMAL } from './formal.js';
import { ACCESSORIES, glasses } from './accessories.js';
import { itemColors } from './palette.js';

const ALL = { ...TEMPLATES, ...FORMAL, ...ACCESSORIES };

// Until C7 draws every garment type, the types without a template borrow
// the closest one drawn so far.
const STAND_INS = {
  buttonUpShort: 'tee',
  longSleeve: 'dressShirt',
  warmCoat: 'blazer',
  rainJacket: 'lightJacket',
  skirt: 'shorts',
};

function drawItem(item, body, extras) {
  if (!item) return null;
  const template = ALL[item.type] || ALL[STAND_INS[item.type]];
  if (!template) return null;
  return template.draw(body, itemColors(item), extras);
}

// look: { body: 'A'|'B', face: 'A'|'B', skin, hair: { style, color },
//         facialHair: 'none'|'stubble'|'beard', glasses }
// outfit: { top, bottom, shoes, outer, rain, dress, neckwear, scarf, hat,
//           eyewear } items (any may be missing)
export function renderAvatar(look, outfit = {}, { title = '' } = {}) {
  const body = BODIES[look.body];
  const h = hair(look.hair.style, body.head, look.hair.color);
  const dress = drawItem(outfit.dress, body);
  const top = dress ? null : drawItem(outfit.top, body);
  const bottom = dress ? null : drawItem(outfit.bottom, body);
  const outer = drawItem(outfit.outer, body);
  const rain = drawItem(outfit.rain, body);
  // Sandals and heels show the foot, so shoes get the skin color.
  const shoes = drawItem(outfit.shoes, body, { skin: look.skin });
  const neckwear = drawItem(outfit.neckwear, body);
  const scarf = drawItem(outfit.scarf, body);
  const hat = drawItem(outfit.hat, body);
  const eyewear = drawItem(outfit.eyewear, body);

  const sleeveLayer = rain || outer || dress || top;
  // Bare shoulders (spaghetti top, dress, nothing on top) show the whole
  // arm from the shoulder; long sleeves hide everything but the hands.
  const armStyle = sleeveLayer?.longSleeves
    ? { handsOnly: true }
    : { fromShoulder: !sleeveLayer || Boolean(sleeveLayer.sleeveless) };

  const layers = [
    h.back,
    skinBase(body, look.skin),
    face(body.head, look.skin, look.hair.color, look.face, look.facialHair),
    shoes?.svg,
    bottom?.svg,
    (dress || top)?.torso,
    neckwear?.svg,
    outer?.torso,
    rain?.torso,
    arms(body, look.skin, armStyle),
    sleeveLayer?.sleeves,
    scarf?.svg,
    eyewear?.svg ?? (look.glasses ? glasses(body) : ''),
    h.front,
    hat?.svg,
  ];

  const ground = `<ellipse cx="204" cy="${body.legs.right[2].y + 46}" rx="96" ry="12" fill="#1e1a24" opacity="0.12"/>`;
  const label = title ? `<title>${title}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 30 320 940" role="img"${title ? '' : ' aria-hidden="true"'}>${label}${ground}${layers.filter(Boolean).join('')}</svg>`;
}
