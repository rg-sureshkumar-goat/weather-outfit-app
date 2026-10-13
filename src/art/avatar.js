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
import { uid, withLook } from './draw.js';
import { weaveDefs, showAs } from './weave.js';
import { itemColors } from './palette.js';
import { GARMENT_TYPES } from '../content/garments.js';
import { patternMode } from '../vision/pattern.js';

const ALL = { ...TEMPLATES, ...FORMAL, ...ACCESSORIES };

// The drawing area: the full 400 px width, so the widest body types and
// their coats fit (R43). Most screens size the avatar by its height, so it
// keeps the same size there.
export const AVATAR_VIEWBOX = '0 30 400 940';

// An item as photographed (R44): `look` is from vision/pattern.js
// photoLook(). Its photo is fitted to the whole garment (all its pieces in
// the base color, inside the box around them), over a repeating square of
// its fabric that softens the edges. Shoes, hats and scarves show only the
// repeating square.
function photoDefs(look, ids, box, parts) {
  const tw = look.patchBox.w * (box.w / look.width) * 2;
  const th = look.patchBox.h * (box.h / look.height) * 2;
  const fit = ids.fitId
    ? `<pattern id="${ids.fitId}" patternUnits="userSpaceOnUse" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"><image href="${look.fit({ parts, box })}" width="${box.w}" height="${box.h}" preserveAspectRatio="none"/></pattern>`
    : '';
  const patch = `<pattern id="${ids.patchId}" patternUnits="userSpaceOnUse" x="${box.x}" y="${box.y}" width="${tw}" height="${th}"><image href="${look.patch}" width="${tw}" height="${th}" preserveAspectRatio="none"/></pattern>`;
  return `<defs>${fit}${patch}</defs>`;
}

function drawItem(item, body, extras, photos) {
  if (!item) return null;
  const template = ALL[item.type];
  if (!template) return null;
  const photo = photos?.[item.id];
  const type = GARMENT_TYPES[item.type];
  const fit = type ? patternMode(item.type, type.group) : 'none';
  const mode = fit === 'none' ? null : showAs(item, photo);
  // A woven item's outline and shading follow its ground color.
  const colors = mode === 'weave' ? { ...itemColors(item), base: item.pattern.roles.ground, print: null } : itemColors(item);
  // Shirt details (pockets, button color) go to the drawing with the other
  // extras.
  const more = item.details ? { ...extras, details: item.details } : extras;
  if (!mode) return template.draw(body, colors, more);
  const ids = mode === 'photo'
    ? [uid('patch'), ...(fit === 'fit' ? [uid('fit')] : [])]
    : [uid('fuzz')];
  const { out, pieces } = withLook({ base: colors.base, mode, fills: ids }, () => template.draw(body, colors, more));
  const boxes = pieces.flatMap((p) => p.boxes);
  if (!out || boxes.length === 0) return out;
  const x0 = Math.min(...boxes.map((b) => b.x0));
  const y0 = Math.min(...boxes.map((b) => b.y0));
  const box = { x: x0, y: y0, w: Math.max(...boxes.map((b) => b.x1)) - x0, h: Math.max(...boxes.map((b) => b.y1)) - y0 };
  const defs = mode === 'photo'
    ? photoDefs(photo, { patchId: ids[0], fitId: ids[1] ?? null }, box, pieces.flatMap((p) => p.parts))
    : weaveDefs(item.pattern, pieces, box);
  // The definitions go with a layer that's always drawn (inner sleeves aren't).
  if (out.torso) return { ...out, torso: defs + out.torso };
  if (out.svg) return { ...out, svg: defs + out.svg };
  return out;
}

// look: { body: 'A'|'B', bodyType (bodies.js BODY_TYPES; default
//         'average'), face: 'A'|'B', features (face.js options; any may
//         be missing), skin, hair: { style, color },
//         facialHair: { beard, moustache } (face.js BEARDS, MOUSTACHES;
//         either may be missing), glasses }
// outfit: { top, bottom, shoes, outer, rain, dress, neckwear, vest, scarf, hat,
//           glasses (frame color only),
//           eyewear } items (any may be missing)
// photos:   { [item id]: vision/pattern.js photoLook() } for items shown as
//           photographed (R44); the others draw in their base and print
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

export function renderAvatar(look, outfit = {}, { title = '', photos = null } = {}) {
  const body = bodyFor(look.body, look.bodyType);
  const h = hair(look.hair.style, body.head, look.hair.color, look.features?.shape);
  const draw = (item, extras) => drawItem(item, body, extras, photos);
  const dress = draw(outfit.dress);
  const top = dress ? null : draw(outfit.top);
  const bottom = dress ? null : draw(outfit.bottom);
  const outer = draw(outfit.outer);
  const rain = draw(outfit.rain);
  // Sandals and heels show the foot, so shoes get the skin color.
  const shoes = draw(outfit.shoes, { skin: look.skin });
  const neckwear = draw(outfit.neckwear);
  const vest = draw(outfit.vest);
  const scarf = draw(outfit.scarf);
  const hat = draw(outfit.hat);
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
