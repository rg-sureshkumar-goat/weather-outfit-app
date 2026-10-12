// Local-only art review page (art.html, plan.md C2, C5, C6a, C6b and C6c).
// The C6c hair, beards and moustaches on every face shape come first, then
// the C6b face options,
// then the C6a body types: all 12 bodies (R43)
// in a range of outfits. Art round 2 (C5) follows: all 11 hairstyles on both bodies and in all 8 hair
// colors, stubble, beard and glasses. Round 1 follows: both bodies in all 10
// Monk tones wearing starter items, the new garment types, knitwear,
// accessories and formal wear.

import '@fontsource-variable/nunito';
import { renderAvatar, AVATAR_VIEWBOX } from './avatar.js';
import { HAIRSTYLES } from './hair.js';
import { BODY_TYPES } from './bodies.js';
import * as FACE from './face.js';
import { HAIRSTYLE_NAMES, BODY_TYPE_NAMES } from '../content/avatarOptions.js';
import { MONK_TONES, HAIR_COLORS } from './palette.js';
import { STARTER_SETS } from '../content/starters.js';
import { GARMENT_TYPES, TYPE_GROUPS } from '../content/garments.js';
import { TYPE_ICON_PATHS } from './typeIcons.js';
import { rackHeader } from './rack.js';

const LOOKS = {
  man: { body: 'B', face: 'B', hair: 'shortCrop' },
  woman: { body: 'A', face: 'A', hair: 'longStraight' },
};
const HAIR_CYCLE = Object.values(HAIR_COLORS);

const label = (o) => [o.outer, o.top, o.bottom, o.shoes].filter(Boolean).map((i) => i.name).join(' · ');

// Outfits made from the gender set's own starter items, using only the
// garment types drawn so far. Full starter outfits follow once C7 draws the
// other seven types.
function starterItemOutfits(gender) {
  const items = STARTER_SETS[gender].items;
  const ofType = (type) => items.filter((i) => i.type === type);
  const [tees, bottoms, sneakers, jackets] = [ofType('tee'), [...ofType('shorts'), ...ofType('pants')], ofType('sneakers'), ofType('lightJacket')];
  return MONK_TONES.map((_, i) => ({
    top: tees[i % tees.length],
    bottom: bottoms[(i * 2 + 1) % bottoms.length],
    shoes: sneakers[i % sneakers.length],
    outer: i % 3 === 2 ? jackets[i % jackets.length] : null,
  }));
}

function figure(gender, tone, outfit, hairColor) {
  const l = LOOKS[gender];
  const look = { body: l.body, face: l.face, skin: MONK_TONES[tone], hair: { style: l.hair, color: hairColor } };
  return `<figure>${renderAvatar(look, outfit)}<figcaption><b>Body ${l.body} · Monk ${tone + 1}</b>${label(outfit)}</figcaption></figure>`;
}

const woman = starterItemOutfits('woman');
const man = starterItemOutfits('man');
const tones = MONK_TONES.map((_, tone) =>
  figure('woman', tone, woman[tone], HAIR_CYCLE[tone % 8]) + figure('man', tone, man[tone], HAIR_CYCLE[(tone + 3) % 8]),
).join('');

const hairRow = (gender) => Object.entries(HAIR_COLORS).map(([name, color], i) => {
  const l = LOOKS[gender];
  const look = { body: l.body, face: l.face, skin: MONK_TONES[(i * 3) % 10], hair: { style: l.hair, color } };
  const svg = renderAvatar(look, {}).replace(`viewBox="${AVATAR_VIEWBOX}"`, 'viewBox="110 40 180 200"');
  return `<figure class="head">${svg}<figcaption>${name}</figcaption></figure>`;
}).join('');

// The four types added on 2026-10-11 (crop top, sandals, clogs, heels) and
// boots, on both bodies.
const own = (type, base, name) => ({ type, name, colors: { base }, source: 'closet' });
const NEW_TYPES = [
  ['woman', 3, { top: own('cropTop', '#d98c9a', 'Rose crop top'), bottom: STARTER_SETS.woman.items.find((i) => i.name === 'Light jeans'), shoes: own('sneakers', '#f4f2ee', 'White sneakers') }],
  ['man', 6, { top: own('cropTop', '#2b2d31', 'Black crop top'), bottom: STARTER_SETS.man.items.find((i) => i.name === 'Khaki shorts'), shoes: own('sandals', '#7a5233', 'Brown sandals') }],
  ['woman', 7, { top: own('cropTop', '#f2c230', 'Yellow crop top'), bottom: STARTER_SETS.woman.items.find((i) => i.name === 'White shorts'), shoes: own('heels', '#b8392f', 'Red heels') }],
  ['man', 2, { top: STARTER_SETS.man.items.find((i) => i.name === 'Navy tee'), bottom: STARTER_SETS.man.items.find((i) => i.name === 'Olive shorts'), shoes: own('clogs', '#2f5a3f', 'Green clogs') }],
  ['woman', 1, { top: STARTER_SETS.woman.items.find((i) => i.name === 'White tee'), bottom: STARTER_SETS.woman.items.find((i) => i.name === 'Black pants'), shoes: own('clogs', '#f4f2ee', 'White clogs') }],
  ['man', 4, { top: STARTER_SETS.man.items.find((i) => i.name === 'Heather-grey tee'), bottom: STARTER_SETS.man.items.find((i) => i.name === 'Dark jeans'), shoes: own('boots', '#7a5233', 'Brown boots'), outer: STARTER_SETS.man.items.find((i) => i.name === 'Navy light jacket') }],
].map(([gender, tone, outfit]) => figure(gender, tone, outfit, HAIR_CYCLE[(tone + 1) % 8])).join('');

// Knitwear, the spaghetti-strap top, accessories, and professional and
// formal wear (drawn in C2 for the occasion and accessory phases, R41, R42).
const looks = {
  A: (tone, hairColor, extra = {}) => ({ body: 'A', face: 'A', skin: MONK_TONES[tone], hair: { style: 'longStraight', color: hairColor }, ...extra }),
  B: (tone, hairColor, extra = {}) => ({ body: 'B', face: 'B', skin: MONK_TONES[tone], hair: { style: 'shortCrop', color: hairColor }, ...extra }),
};
const o = (type, base, print = null) => ({ type, colors: { base, print }, source: 'closet' });
const showcase = (rows) => rows.map(([look, outfit, caption]) => `<figure>${renderAvatar(look, outfit)}<figcaption>${caption}</figcaption></figure>`).join('');
const CASUAL_EXTRAS = showcase([
  [looks.A(3, HAIR_COLORS.darkBrown), { top: o('spaghettiTop', '#ee7f6b'), bottom: o('shorts', '#f4f2ee'), shoes: o('sandals', '#b98f62'), hat: o('sunHat', '#e9d9a8'), eyewear: o('sunglasses', '#2b2d31') }, 'Spaghetti-strap top, sun hat, sunglasses, sandals'],
  [looks.B(6, HAIR_COLORS.black), { top: o('hoodie', '#6e2b33'), bottom: o('pants', '#8fb0d2'), shoes: o('sneakers', '#f4f2ee'), hat: o('cap', '#26344f') }, 'Hoodie, jeans, cap'],
  [looks.A(8, HAIR_COLORS.black), { top: o('sweater', '#efe4cf'), bottom: o('pants', '#33465f'), shoes: o('boots', '#7a5233'), hat: o('beanie', '#b8392f'), scarf: o('scarf', '#b8392f', '#f4f2ee') }, 'Sweater, beanie, scarf, boots'],
  [looks.B(2, HAIR_COLORS.brown, { glasses: true }), { top: o('sweater', '#2f5a3f'), bottom: o('trousers', '#c8b48a'), shoes: o('sneakers', '#26344f') }, 'Sweater, glasses, chinos'],
  [looks.B(4, HAIR_COLORS.auburn), { top: o('tee', '#f4f2ee'), bottom: o('pants', '#33465f'), shoes: o('clogs', '#2b2d31'), eyewear: o('sunglasses', '#7a5233'), outer: o('blazer', '#7c8a9a') }, 'Casual blazer over a tee, sunglasses, clogs'],
]);
const FORMAL_LOOKS = showcase([
  [looks.B(7, HAIR_COLORS.black), { top: o('dressShirt', '#f4f2ee'), neckwear: o('tie', '#7c2436', '#c19a6b'), outer: o('blazer', '#26344f'), bottom: o('trousers', '#26344f'), shoes: o('dressShoes', '#3b2a20') }, 'Navy suit, shirt and tie'],
  [looks.B(1, HAIR_COLORS.black), { top: o('dressShirt', '#ffffff'), neckwear: o('bowTie', '#111114'), outer: o('tuxedo', '#17181c'), bottom: o('tuxedoTrousers', '#17181c'), shoes: o('dressShoes', '#111114') }, 'Tuxedo and bow tie'],
  [looks.A(5, HAIR_COLORS.darkBrown), { top: o('dressShirt', '#f4f2ee'), outer: o('blazer', '#2b2d31'), bottom: o('trousers', '#2b2d31'), shoes: o('heels', '#2b2d31') }, 'Black suit and heels'],
  [looks.A(2, HAIR_COLORS.blonde), { dress: o('formalDress', '#26344f'), shoes: o('heels', '#c19a6b') }, 'Formal (knee-length) dress'],
  [looks.A(9, HAIR_COLORS.black), { dress: o('banquetDress', '#7c2436'), shoes: o('heels', '#7c2436') }, 'Banquet gown'],
]);

// ---- C6b: face options (R43) ----------------------------------------------------

const FACE_ROWS = [
  ['Face shape', 'shape', Object.keys(FACE.FACE_SHAPES)],
  ['Eye shape', 'eyeShape', Object.keys(FACE.EYE_SHAPES)],
  ['Eye color', 'eyeColor', Object.keys(FACE.EYE_COLORS)],
  ['Eyebrows', 'brows', Object.keys(FACE.BROWS)],
  ['Nose', 'nose', FACE.NOSES],
  ['Mouth', 'mouth', Object.keys(FACE.MOUTHS)],
  ['Ears', 'ears', Object.keys(FACE.EARS)],
  ['Eyelashes', 'lashes', FACE.LASHES],
  ['Freckles', 'freckles', Object.keys(FACE.FRECKLES)],
  ['Beauty mark', 'mark', Object.keys(FACE.BEAUTY_MARKS)],
  ['Face lines', 'lines', FACE.FACE_LINES],
  ['Lip color', 'lips', Object.keys(FACE.LIP_COLORS)],
  ['Eyeshadow', 'eyeshadow', Object.keys(FACE.EYESHADOWS)],
  ['Eyeliner', 'eyeliner', FACE.EYELINERS],
  ['Blush', 'blush', Object.keys(FACE.BLUSHES)],
];
const FACE_VIEW = 'viewBox="100 40 200 210"';
const faceRow = ([title, feature, options], r) => `
  <h3>${title}</h3>
  <section class="heads">${['A', 'B'].flatMap((set) => options.map((option, i) => {
    const hair = feature === 'ears' ? 'bald' : set === 'A' ? 'bun' : 'buzz';
    const look = { body: set, face: set, skin: MONK_TONES[(i * 3 + r + (set === 'B' ? 5 : 0)) % 10], hair: { style: hair, color: HAIR_CYCLE[(i + r) % 8] }, features: { [feature]: option } };
    const svg = renderAvatar(look, {}).replace(`viewBox="${AVATAR_VIEWBOX}"`, FACE_VIEW);
    return `<figure class="head">${svg}<figcaption>${set === 'A' ? 'F' : 'M'} · ${option}</figcaption></figure>`;
  })).join('')}</section>`;
const FACE_SECTION = FACE_ROWS.map(faceRow).join('');

// ---- C6c: hair on every face shape (R43) ---------------------------------------

// One row per face set, the 8 shapes in the same columns, so each style can be
// compared shape by shape.
const SHAPES = Object.keys(FACE.FACE_SHAPES);
const fittedHead = (set, shape, style, i, r, facialHair) => {
  const look = { body: set, face: set, skin: MONK_TONES[(i * 3 + r + (set === 'B' ? 5 : 0)) % 10], hair: { style, color: HAIR_CYCLE[(i + r) % 8] }, features: { shape }, facialHair };
  return `<figure class="head">${renderAvatar(look, {}).replace(`viewBox="${AVATAR_VIEWBOX}"`, FACE_VIEW)}<figcaption>${set === 'A' ? 'F' : 'M'} · ${shape}</figcaption></figure>`;
};
const FIT_ROWS = Object.keys(HAIRSTYLES).map((style, r) => `
  <h3>${HAIRSTYLE_NAMES[style]}</h3>
  <section class="heads eight">${['A', 'B'].flatMap((set) => SHAPES.map((shape, i) => fittedHead(set, shape, style, i, r))).join('')}</section>`).join('');

// Every beard and every moustache on the 8 face shapes (Male only, R40).
const facialRow = (title, choice, r) => `
  <h3>${title}</h3>
  <section class="heads eight">${SHAPES.map((shape, i) => fittedHead('B', shape, 'shortCrop', i, r, choice)).join('')}</section>`;
const FIT_BEARDS = FACE.BEARDS.filter((b) => b !== 'none').map((beard, r) => facialRow(`Beard · ${beard}`, { beard, moustache: 'none' }, r)).join('');
const FIT_MOUSTACHES = FACE.MOUSTACHES.filter((m) => m !== 'none').map((moustache, r) => facialRow(`Moustache · ${moustache}`, { beard: 'none', moustache }, r + 3)).join('');

// Sample combinations, then the long styles over clothes: the beard, mouth
// and moustache are drawn after the clothes and scarf.
const LONG_VIEW = 'viewBox="100 40 200 290"';
const manItem = (name) => STARTER_SETS.man.items.find((i) => i.name === name);
const bearded = (beard, moustache, i, outfit, caption) => {
  const look = { body: 'B', face: 'B', skin: MONK_TONES[(i * 3 + 2) % 10], hair: { style: 'shortCrop', color: HAIR_CYCLE[(i + 1) % 8] }, facialHair: { beard, moustache } };
  return `<figure class="head">${renderAvatar(look, outfit).replace(`viewBox="${AVATAR_VIEWBOX}"`, LONG_VIEW)}<figcaption>${caption}</figcaption></figure>`;
};
const tee = { top: manItem('Heather-grey tee') };
const FIT_COMBOS = [
  ['goatee', 'chevron'], ['anchor', 'pencil'], ['circle', 'classic'], ['muttonChops', 'classic'], ['shortBoxed', 'classic'], ['full', 'classic'],
  ['long', 'walrus'], ['garibaldi', 'handlebar'], ['ducktail', 'classic'], ['soulPatch', 'handlebar'], ['heavyStubble', 'horseshoe'], ['chinStrap', 'pencil'], ['soulPatch', 'fuManchu'],
].map(([beard, moustache], i) => bearded(beard, moustache, i, tee, `${beard} + ${moustache}`)).join('');
const OUTFITS = [
  ['tee', tee],
  ['hoodie', { top: manItem('Grey hoodie') }],
  ['button-up', { top: manItem('Light-blue short-sleeve button-up') }],
  ['coat and scarf', { top: manItem('Navy sweater'), outer: manItem('Navy coat'), scarf: own('scarf', '#5d7a99', 'Blue scarf') }],
];
const FIT_OVER_CLOTHES = [['long', 'none'], ['garibaldi', 'classic'], ['ducktail', 'chevron'], ['none', 'fuManchu']]
  .flatMap(([beard, moustache], r) => OUTFITS.map(([name, outfit], i) => bearded(beard, moustache, r * 4 + i, outfit, `${beard} + ${moustache} · ${name}`))).join('');

// ---- C6a: body types (R43) ------------------------------------------------------

const BODY_OUTFITS = [
  ['Tee and shorts', { top: o('tee', '#b5b7b9'), bottom: o('shorts', '#26344f'), shoes: o('sneakers', '#f4f2ee') }],
  ['Crop top and pants', { top: o('cropTop', '#d98c9a'), bottom: o('pants', '#4f6f96'), shoes: o('sandals', '#7a5233') }],
  ['Light jacket', { top: o('tee', '#f4f2ee'), outer: o('lightJacket', '#6b7148'), bottom: o('pants', '#33465f'), shoes: o('sneakers', '#26344f') }],
  ['Suit', { top: o('dressShirt', '#f4f2ee'), neckwear: o('tie', '#7c2436', '#c19a6b'), outer: o('blazer', '#26344f'), bottom: o('trousers', '#26344f'), shoes: o('dressShoes', '#3b2a20') }],
  ['Formal dress', { dress: o('formalDress', '#26344f'), shoes: o('heels', '#c19a6b') }],
];
const BODY_ROWS = ['A', 'B'].map((set) => BODY_OUTFITS.map(([label, outfit], r) => `
  <h3>${set === 'A' ? 'Female' : 'Male'} · ${label}</h3>
  <section class="grid six">${BODY_TYPES[set].map((type, i) => {
    const look = { body: set, bodyType: type, face: set, skin: MONK_TONES[(i * 2 + r + (set === 'B' ? 1 : 0)) % 10], hair: { style: set === 'A' ? 'longStraight' : 'shortCrop', color: HAIR_CYCLE[(i + r) % 8] } };
    return `<figure>${renderAvatar(look, outfit)}<figcaption><b>${BODY_TYPE_NAMES[type]}</b></figcaption></figure>`;
  }).join('')}</section>`).join('')).join('');

// ---- Art round 2 (C5): hairstyles, facial hair, glasses ----------------------

const STYLE_NAMES = HAIRSTYLE_NAMES;
const HEAD_VIEW = 'viewBox="85 15 230 250"';
const headOnly = (look) => renderAvatar(look, {}).replace(`viewBox="${AVATAR_VIEWBOX}"`, HEAD_VIEW);
const lookFor = (gender, tone, style, color, extra = {}) => ({
  body: gender === 'woman' ? 'A' : 'B', face: gender === 'woman' ? 'A' : 'B', skin: MONK_TONES[tone], hair: { style, color }, ...extra,
});

// Every style on both bodies, in a starter outfit, so long hair over the
// shoulders can be checked.
const womanItems = starterItemOutfits('woman');
const manItems = starterItemOutfits('man');
const STYLE_FIGURES = Object.keys(HAIRSTYLES).map((style, i) => {
  const color = HAIR_CYCLE[(i * 3) % 8];
  return [['woman', womanItems], ['man', manItems]].map(([g, items]) => {
    const tone = (i * 7 + (g === 'man' ? 4 : 1)) % 10;
    return `<figure>${renderAvatar(lookFor(g, tone, style, color), items[(i + (g === 'man' ? 3 : 0)) % 10])}<figcaption><b>${STYLE_NAMES[style]}</b>${g === 'woman' ? 'Female' : 'Male'} · Monk ${tone + 1}</figcaption></figure>`;
  }).join('');
}).join('');

// Each style in all 8 colors, alternating faces and skin tones.
const STYLE_COLOR_ROWS = Object.keys(HAIRSTYLES).map((style, i) => `
  <h3>${STYLE_NAMES[style]}</h3>
  <section class="heads">${Object.entries(HAIR_COLORS).map(([name, color], k) => {
    const g = (i + k) % 2 ? 'man' : 'woman';
    return `<figure class="head">${headOnly(lookFor(g, (k * 3 + i) % 10, style, color))}<figcaption>${name}</figcaption></figure>`;
  }).join('')}</section>`).join('');

// Facial hair (Male only, R40) and glasses (both), as approved in round 2:
// stubble is now Light stubble, and the beard is Full with a Classic moustache.
const NONE = { beard: 'none', moustache: 'none' };
const STUBBLE = { beard: 'lightStubble', moustache: 'none' };
const BEARD = { beard: 'full', moustache: 'classic' };
const FACIAL = [
  ['man', 1, 'shortCrop', 'black', NONE, false], ['man', 1, 'shortCrop', 'black', STUBBLE, false], ['man', 1, 'shortCrop', 'black', BEARD, false],
  ['man', 6, 'buzz', 'darkBrown', STUBBLE, true], ['man', 8, 'afro', 'black', BEARD, false], ['man', 3, 'mediumStraight', 'auburn', BEARD, true],
  ['man', 9, 'bald', 'grey', BEARD, true], ['man', 4, 'braids', 'brown', STUBBLE, false],
  ['woman', 2, 'longStraight', 'blonde', NONE, true], ['woman', 7, 'bun', 'black', NONE, true], ['woman', 5, 'shortCurls', 'darkBrown', NONE, true], ['woman', 0, 'mediumCurly', 'platinum', NONE, true],
].map(([g, tone, style, color, facialHair, glasses]) => `<figure class="head">${headOnly(lookFor(g, tone, style, HAIR_COLORS[color], { facialHair, glasses }))}<figcaption>${g === 'woman' ? 'Female' : 'Male'} · ${facialHair.beard} · ${facialHair.moustache}${glasses ? ' · glasses' : ''}</figcaption></figure>`).join('');

// ---- C7 art: art round 3 (R17, R19) --------------------------------------------

// The new garments on all 12 bodies, each worn with suitable clothes.
const closetItem = (type, base, print = null) => ({ type, colors: { base, print }, source: 'closet' });
const NEW_GARMENTS = [
  ['Long-sleeve tee', { top: closetItem('longSleeve', '#d98c9a'), bottom: closetItem('pants', '#3b4a63'), shoes: closetItem('sneakers', '#f4f2ee') }],
  ['Long-sleeve button shirt, with a print color', { top: closetItem('longSleeveShirt', '#f4f2ee', '#b8392f'), bottom: closetItem('pants', '#3b4a63'), shoes: closetItem('sneakers', '#f4f2ee') }],
  ['Long-sleeve polo', { top: closetItem('longSleevePolo', '#2f3b52'), bottom: closetItem('pants', '#c8b48a'), shoes: closetItem('sneakers', '#f4f2ee') }],
  ['Blouse', { top: closetItem('blouse', '#e8a0a8'), bottom: closetItem('pants', '#2b2d31'), shoes: closetItem('heels', '#2b2d31') }],
  ['Turtleneck', { top: closetItem('turtleneck', '#2f5a3f'), bottom: closetItem('pants', '#5d7a99'), shoes: closetItem('boots', '#5a3e2b') }],
  ['Short-sleeve button-up', { top: closetItem('buttonUpShort', '#a9c6e3'), bottom: closetItem('shorts', '#c8b48a'), shoes: closetItem('sneakers', '#f4f2ee') }],
  ['Skirt', { top: closetItem('tee', '#f4f2ee'), bottom: closetItem('skirt', '#5d7a99'), shoes: closetItem('sneakers', '#f4f2ee') }],
  ['Warm coat', { top: closetItem('sweater', '#9aa0a6'), outer: closetItem('warmCoat', '#c19a6b'), bottom: closetItem('pants', '#2b2d31'), shoes: closetItem('boots', '#5a3e2b') }],
  ['Hooded rain jacket, over the warm coat', { top: closetItem('sweater', '#9aa0a6'), outer: closetItem('warmCoat', '#2f3b52'), rain: closetItem('rainJacket', '#f2c230'), bottom: closetItem('pants', '#2b2d31'), shoes: closetItem('boots', '#2b2d31') }],
  ['Party dress (occasions)', { dress: closetItem('partyDress', '#7d3c6e'), shoes: closetItem('heels', '#2b2d31') }],
  ['Suit vest over a dress shirt and tie, with suit pants (occasions)', { top: closetItem('dressShirt', '#f4f2ee'), neckwear: closetItem('tie', '#3a4f7a'), vest: closetItem('suitVest', '#4a4d52'), bottom: closetItem('trousers', '#4a4d52'), shoes: closetItem('dressShoes', '#2b2d31') }],
  ['Suit vest under a blazer (occasions)', { top: closetItem('dressShirt', '#f4f2ee'), neckwear: closetItem('tie', '#7a2e3a'), vest: closetItem('suitVest', '#2f3b52'), outer: closetItem('blazer', '#2f3b52'), bottom: closetItem('trousers', '#2f3b52'), shoes: closetItem('dressShoes', '#2b2d31') }],
];
const NEW_GARMENT_ROWS = NEW_GARMENTS.map(([title, outfit], r) => `
  <h3>${title}</h3>
  <section class="grid twelve">${['A', 'B'].flatMap((set) => BODY_TYPES[set].map((type, i) => {
    const look = { body: set, face: set, bodyType: type, skin: MONK_TONES[(i * 3 + r + (set === 'B' ? 5 : 0)) % 10], hair: { style: set === 'A' ? 'longStraight' : 'shortCrop', color: HAIR_CYCLE[(i + r) % 8] } };
    return `<figure>${renderAvatar(look, outfit)}<figcaption>${set === 'A' ? 'F' : 'M'} · ${BODY_TYPE_NAMES[type]}</figcaption></figure>`;
  })).join('')}</section>`).join('');

// All 30 starter outfits, 15 per gender, labelled by band.
const STARTER_ROWS = ['woman', 'man'].map((gender) => {
  const set = STARTER_SETS[gender];
  const l = LOOKS[gender];
  return `
  <h3>${gender === 'woman' ? 'Female' : 'Male'} set</h3>
  <section class="grid">${set.outfits.map((o, i) => {
    const look = { body: l.body, face: l.face, skin: MONK_TONES[(i * 2 + (gender === 'man' ? 1 : 0)) % 10], hair: { style: l.hair, color: HAIR_CYCLE[i % 8] } };
    const outfit = { top: o.top, bottom: o.bottom, shoes: o.shoes, outer: o.outer };
    return `<figure>${renderAvatar(look, outfit)}<figcaption><b>${o.band} ${o.id.split('-').pop()}</b>${label(outfit)}</figcaption></figure>`;
  }).join('')}<figure>${renderAvatar({ body: l.body, face: l.face, skin: MONK_TONES[4], hair: { style: l.hair, color: HAIR_COLORS.black } }, { top: set.outfits[0].top, bottom: set.outfits[0].bottom, shoes: set.outfits[0].shoes, rain: set.rainJacket })}<figcaption><b>Rain jacket</b>${set.rainJacket.name}</figcaption></figure></section>`;
}).join('');

// The 34 garment-type icons in the type picker's six groups, and the
// Closet's rack header.
const TYPE_ICONS = TYPE_GROUPS.map(([group, title]) => `
  <h3>${title}</h3>
  <section class="icons">${Object.entries(GARMENT_TYPES).filter(([, t]) => t.group === group).map(([type, t]) =>
    `<figure class="type-icon"><svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#1f2a37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TYPE_ICON_PATHS[type]}</svg><figcaption>${t.label}</figcaption></figure>`).join('')}</section>`).join('');

// The six accessory types on the avatar; a closet pair of glasses colors
// the frames when the Glasses setting is on.
const ACCESSORY_LOOKS = [
  ['Glasses (red frames), setting on', { glasses: true }, { glasses: closetItem('glasses', '#b8392f') }],
  ['Sunglasses', {}, { eyewear: closetItem('sunglasses', '#2b2d31') }],
  ['Cap', {}, { hat: closetItem('cap', '#26344f') }],
  ['Sun hat', {}, { hat: closetItem('sunHat', '#e8d9b5') }],
  ['Beanie', {}, { hat: closetItem('beanie', '#b8392f') }],
  ['Scarf, over a coat', {}, { outer: closetItem('warmCoat', '#2f3b52'), scarf: closetItem('scarf', '#b8392f', '#f4f2ee') }],
].map(([title, extra, items], i) => {
  const set = i % 2 ? 'B' : 'A';
  const look = { body: set, face: set, skin: MONK_TONES[(i * 3 + 2) % 10], hair: { style: set === 'A' ? 'longStraight' : 'shortCrop', color: HAIR_CYCLE[i % 8] }, ...extra };
  return `<figure class="head">${renderAvatar(look, { top: closetItem('tee', '#f4f2ee'), ...items }).replace(`viewBox="${AVATAR_VIEWBOX}"`, 'viewBox="80 0 240 330"')}<figcaption>${title}</figcaption></figure>`;
}).join('');
const rackItem = (type, base) => ({ type, colors: { base } });
const RACKS = [
  ['Newest three: tee, skirt, warm coat', [rackItem('tee', '#2f3b52'), rackItem('skirt', '#c8b48a'), rackItem('warmCoat', '#c19a6b')]],
  ['Shoes stand on the floor', [rackItem('sneakers', '#f4f2ee'), rackItem('hoodie', '#7a2e3a'), rackItem('pants', '#5d7a99')]],
  ['Spaghetti-strap top, rain jacket, boots', [rackItem('spaghettiTop', '#d98c9a'), rackItem('rainJacket', '#f2c230'), rackItem('boots', '#5a3e2b')]],
  ['One item', [rackItem('longSleeve', '#3d6b3e')]],
  ['Empty closet', []],
].map(([title, items]) => `<figure class="rack">${rackHeader(items)}<figcaption>${title}</figcaption></figure>`).join('');

document.querySelector('#art').innerHTML = `
  <header>
    <h1>Quick Dresser · art review</h1>
    <p>Original artwork created for this project. Monk Skin Tone Scale by Ellis Monk (CC BY 4.0). Local review page only.</p>
  </header>
  <h2>C7 art · The new garments on all 12 bodies (R17, R43)</h2>
  ${NEW_GARMENT_ROWS}
  <h2>C7 art · All 30 starter outfits, plus each set's rain jacket</h2>
  ${STARTER_ROWS}
  <h2>C7 art · The six accessory types</h2>
  <section class="heads">${ACCESSORY_LOOKS}</section>
  <h2>C7 art · The 34 garment-type icons, in the type picker's six groups (P4c, L4)</h2>
  ${TYPE_ICONS}
  <h2>C7 art · The Closet's rack header (P3, L3)</h2>
  <section class="racks">${RACKS}</section>
  <h2 class="round">C6c (approved)</h2>
  <h2>C6c · All 11 hairstyles on all 8 face shapes (R43)</h2>
  ${FIT_ROWS}
  <h2>C6c · The 14 beards on all 8 face shapes (Male only)</h2>
  ${FIT_BEARDS}
  <h2>C6c · The 8 moustaches on all 8 face shapes (Male only)</h2>
  ${FIT_MOUSTACHES}
  <h2>C6c · Beard and moustache combinations</h2>
  <section class="heads">${FIT_COMBOS}</section>
  <h2>C6c · Long styles over the clothes and scarf</h2>
  <section class="heads">${FIT_OVER_CLOTHES}</section>
  <h2 class="round">C6b (approved)</h2>
  <h2>C6b · Face options (R43), each on both faces</h2>
  ${FACE_SECTION}
  <h2 class="round">C6a (approved)</h2>
  <h2>C6a · The 12 body types (R43), every outfit fitted from measurements</h2>
  ${BODY_ROWS}
  <h2 class="round">Round 2 (approved)</h2>
  <h2>Round 2 · All 11 hairstyles on both bodies</h2>
  <section class="grid">${STYLE_FIGURES}</section>
  <h2>Round 2 · Each hairstyle in all 8 hair colors</h2>
  ${STYLE_COLOR_ROWS}
  <h2>Round 2 · Facial hair (none, stubble, beard; Male only) and glasses</h2>
  <section class="heads">${FACIAL}</section>
  <h2 class="round">Round 1 (approved)</h2>
  <h2>Both bodies in all 10 Monk tones, wearing their set's starter items</h2>
  <section class="grid">${tones}</section>
  <h2>Crop top, sandals, clogs, heels and boots on both bodies (types added 2026-10-11)</h2>
  <section class="grid">${NEW_TYPES}</section>
  <h2>Spaghetti-strap top, knitwear and accessories</h2>
  <section class="grid">${CASUAL_EXTRAS}</section>
  <h2>Professional and formal (occasion phases, R41)</h2>
  <section class="grid">${FORMAL_LOOKS}</section>
  <h2>Hair colors · Long straight (Body A) and Short crop (Body B)</h2>
  <section class="heads">${hairRow('woman')}${hairRow('man')}</section>
`;

const style = document.createElement('style');
style.textContent = `
  body { margin: 0; padding: 20px; background: #efe9e1; color: #1f2a37; font-family: 'Nunito Variable', system-ui, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 26px; font-weight: 800; }
  h2 { margin: 26px 0 10px; font-size: 18px; font-weight: 700; }
  h2.round { margin-top: 44px; padding-top: 18px; border-top: 2px solid #c9bfb2; font-size: 22px; }
  h3 { margin: 14px 0 6px; font-size: 15px; font-weight: 700; }
  header p { margin: 0; color: #4b5563; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .grid.six { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  figure { margin: 0; background: linear-gradient(#d9e6f2, #f6f1e9); border-radius: 14px; padding-bottom: 8px; }
  figure svg { display: block; width: 100%; height: auto; }
  figcaption { padding: 0 10px; font-size: 12px; line-height: 1.35; display: grid; gap: 2px; }
  .heads { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
  .head figcaption { text-align: center; }
  .heads.eight { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .grid.twelve { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .type-icon { display: grid; justify-items: center; gap: 6px; padding: 16px 6px 10px; background: #fff; }
  .type-icon svg { width: 56px; height: 56px; }
  .type-icon figcaption { text-align: center; font-weight: 700; }
  .racks { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .rack { padding: 8px; background: #fffdf9; }
`;
document.head.append(style);
