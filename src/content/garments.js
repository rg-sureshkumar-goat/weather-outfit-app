// Garment types and which ones suit each band (spec.md, Garment types by band).

// The 34 garment types a closet item can have (R17), in the order the type
// picker (P4c, L4) and the Closet (R19) list them, by group. Grown on
// 2026-10-11 from 12: crop top, spaghetti-strap top, sandals, clogs and
// heels; Sweater and Hoodie as separate types; six long-sleeve types in
// place of one; five occasion types; and six accessories.
// - `short` fits the small tiles beside the avatar on the phone.
// - `use: 'occasion'` types are worn only for occasions (R41; C7a, C7b) and
//   `use: 'accessory'` ones follow R42's weather rules (C7d): no everyday
//   band below lists them. Glasses only color the avatar's frames when its
//   Glasses setting is on.
// The keys match the drawings in art/garments.js, formal.js and
// accessories.js.
export const TYPE_GROUPS = [
  ['tops', 'Tops'],
  ['bottoms', 'Bottoms'],
  ['dresses', 'Dresses'],
  ['overgarments', 'Overgarments'],
  ['shoes', 'Shoes'],
  ['accessories', 'Accessories'],
];

export const GARMENT_TYPES = {
  // Tops
  tee: { label: 'Tee', short: 'Tee', slot: 'top', group: 'tops' },
  buttonUpShort: { label: 'Short-sleeve button-up', short: 'Button-up', slot: 'top', group: 'tops' },
  longSleeve: { label: 'Long-sleeve tee', short: 'Long tee', slot: 'top', group: 'tops' },
  longSleeveShirt: { label: 'Long-sleeve button shirt', short: 'Shirt', slot: 'top', group: 'tops' },
  longSleevePolo: { label: 'Long-sleeve polo', short: 'Polo', slot: 'top', group: 'tops' },
  blouse: { label: 'Blouse', short: 'Blouse', slot: 'top', group: 'tops' },
  turtleneck: { label: 'Turtleneck', short: 'Turtleneck', slot: 'top', group: 'tops' },
  cropTop: { label: 'Crop top', short: 'Crop top', slot: 'top', group: 'tops' },
  spaghettiTop: { label: 'Spaghetti-strap top', short: 'Strap top', slot: 'top', group: 'tops' },
  dressShirt: { label: 'Dress shirt', short: 'Dress shirt', slot: 'top', group: 'tops', use: 'occasion' },
  // Bottoms
  pants: { label: 'Pants', short: 'Pants', slot: 'bottom', group: 'bottoms' },
  shorts: { label: 'Shorts', short: 'Shorts', slot: 'bottom', group: 'bottoms' },
  skirt: { label: 'Skirt', short: 'Skirt', slot: 'bottom', group: 'bottoms' },
  trousers: { label: 'Suit pants', short: 'Suit pants', slot: 'bottom', group: 'bottoms', use: 'occasion' },
  // Dresses fill the top and bottom together.
  formalDress: { label: 'Formal dress', short: 'Formal dress', slot: 'dress', group: 'dresses', use: 'occasion' },
  partyDress: { label: 'Party dress', short: 'Party dress', slot: 'dress', group: 'dresses', use: 'occasion' },
  // Overgarments. Sweaters and hoodies are listed here but worn as the top
  // layer in outfits (Garment types by band).
  sweater: { label: 'Sweater', short: 'Sweater', slot: 'top', group: 'overgarments' },
  hoodie: { label: 'Hoodie', short: 'Hoodie', slot: 'top', group: 'overgarments' },
  lightJacket: { label: 'Light jacket', short: 'Jacket', slot: 'outer', group: 'overgarments' },
  warmCoat: { label: 'Warm coat', short: 'Coat', slot: 'outer', group: 'overgarments' },
  rainJacket: { label: 'Hooded rain jacket', short: 'Rain jacket', slot: 'rain', group: 'overgarments' },
  blazer: { label: 'Blazer', short: 'Blazer', slot: 'outer', group: 'overgarments', use: 'occasion' },
  suitVest: { label: 'Suit vest', short: 'Vest', slot: 'vest', group: 'overgarments', use: 'occasion' },
  // Shoes
  sneakers: { label: 'Sneakers', short: 'Sneakers', slot: 'shoes', group: 'shoes' },
  boots: { label: 'Boots', short: 'Boots', slot: 'shoes', group: 'shoes' },
  sandals: { label: 'Sandals', short: 'Sandals', slot: 'shoes', group: 'shoes' },
  clogs: { label: 'Clogs', short: 'Clogs', slot: 'shoes', group: 'shoes' },
  heels: { label: 'Heels', short: 'Heels', slot: 'shoes', group: 'shoes' },
  // Accessories
  glasses: { label: 'Glasses', short: 'Glasses', slot: 'glasses', group: 'accessories', use: 'accessory' },
  sunglasses: { label: 'Sunglasses', short: 'Sunglasses', slot: 'eyewear', group: 'accessories', use: 'accessory' },
  cap: { label: 'Cap', short: 'Cap', slot: 'hat', group: 'accessories', use: 'accessory' },
  sunHat: { label: 'Sun hat', short: 'Sun hat', slot: 'hat', group: 'accessories', use: 'accessory' },
  beanie: { label: 'Beanie', short: 'Beanie', slot: 'hat', group: 'accessories', use: 'accessory' },
  scarf: { label: 'Scarf', short: 'Scarf', slot: 'scarf', group: 'accessories', use: 'accessory' },
};

// Bands from warmest to coldest. A band applies when the highest feels-like
// temperature is at or above its minimum (research.md, Decisions).
export const BANDS = [
  { id: 'hot', label: 'Hot', min: 85 },
  { id: 'warm', label: 'Warm', min: 70 },
  { id: 'chilly', label: 'Chilly', min: 55 },
  { id: 'cold', label: 'Cold', min: 35 },
  { id: 'freezing', label: 'Freezing', min: -Infinity },
];

// On a snow day with no boots in the closet, the User's shoes are tried in
// this order, closed shoes first; sandals only if nothing else
// (spec.md, Snow days; Developer's decision 2026-10-11).
export const SNOW_SHOE_ORDER = ['sneakers', 'clogs', 'heels', 'sandals'];

// Eligible types per slot for each band. `outer` is the single outer-layer
// type the band calls for, or null when it needs none.
export const ELIGIBLE = {
  hot: { top: ['tee', 'buttonUpShort', 'cropTop', 'spaghettiTop'], bottom: ['shorts', 'skirt'], shoes: ['sneakers', 'sandals', 'clogs', 'heels'], outer: null },
  warm: { top: ['tee', 'buttonUpShort', 'longSleeve', 'longSleeveShirt', 'longSleevePolo', 'blouse', 'cropTop', 'spaghettiTop'], bottom: ['shorts', 'skirt', 'pants'], shoes: ['sneakers', 'sandals', 'clogs', 'heels'], outer: null },
  chilly: { top: ['longSleeve', 'longSleeveShirt', 'longSleevePolo', 'blouse', 'turtleneck', 'sweater', 'hoodie'], bottom: ['pants'], shoes: ['sneakers', 'clogs', 'heels'], outer: 'lightJacket' },
  cold: { top: ['longSleeve', 'longSleeveShirt', 'longSleevePolo', 'blouse', 'turtleneck', 'sweater', 'hoodie'], bottom: ['pants'], shoes: ['sneakers', 'boots'], outer: 'warmCoat' },
  freezing: { top: ['longSleeve', 'longSleeveShirt', 'turtleneck', 'sweater', 'hoodie'], bottom: ['pants'], shoes: ['boots'], outer: 'warmCoat' },
};

// Starter colors that count as neutral for the "layer for later" jacket
// (spec.md, Garment types by band).
export const NEUTRAL_COLORS = new Set([
  'white', 'cream', 'grey', 'heather-grey', 'charcoal', 'black', 'navy',
  'tan', 'khaki', 'camel', 'olive', 'denim', 'light denim', 'dark denim', 'brown',
]);

// What a type suits, for the confirm step and item detail (R17): the bands
// that list it, or what decides when it's worn.
//   { kind: 'bands', bands: ['Hot', 'Warm'] } · { kind: 'rain' } ·
//   { kind: 'occasion' } · { kind: 'accessory' }
export function suitsFor(type) {
  const use = GARMENT_TYPES[type]?.use;
  if (use === 'occasion' || use === 'accessory') return { kind: use, bands: [] };
  if (type === 'rainJacket') return { kind: 'rain', bands: [] };
  const bands = BANDS.filter(({ id }) => {
    const e = ELIGIBLE[id];
    return [...e.top, ...e.bottom, ...e.shoes].includes(type) || e.outer === type;
  }).map((b) => b.label);
  return { kind: 'bands', bands };
}
