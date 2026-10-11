// Garment types and which ones suit each band (spec.md, Garment types by band).

// The 17 garment types a closet item can have (R17; five added 2026-10-11).
// `short` fits the small tiles beside the avatar on the phone.
export const GARMENT_TYPES = {
  tee: { label: 'Tee', short: 'Tee', slot: 'top' },
  buttonUpShort: { label: 'Short-sleeve button-up', short: 'Button-up', slot: 'top' },
  longSleeve: { label: 'Long-sleeve shirt', short: 'Long sleeve', slot: 'top' },
  sweater: { label: 'Sweater or hoodie', short: 'Pullover', slot: 'top' },
  cropTop: { label: 'Crop top', short: 'Crop top', slot: 'top' },
  spaghettiTop: { label: 'Spaghetti-strap top', short: 'Strap top', slot: 'top' },
  lightJacket: { label: 'Light jacket', short: 'Jacket', slot: 'outer' },
  warmCoat: { label: 'Warm coat', short: 'Coat', slot: 'outer' },
  rainJacket: { label: 'Hooded rain jacket', short: 'Rain jacket', slot: 'rain' },
  pants: { label: 'Pants', short: 'Pants', slot: 'bottom' },
  shorts: { label: 'Shorts', short: 'Shorts', slot: 'bottom' },
  skirt: { label: 'Skirt', short: 'Skirt', slot: 'bottom' },
  sneakers: { label: 'Sneakers', short: 'Sneakers', slot: 'shoes' },
  boots: { label: 'Boots', short: 'Boots', slot: 'shoes' },
  sandals: { label: 'Sandals', short: 'Sandals', slot: 'shoes' },
  clogs: { label: 'Clogs', short: 'Clogs', slot: 'shoes' },
  heels: { label: 'Heels', short: 'Heels', slot: 'shoes' },
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
  warm: { top: ['tee', 'buttonUpShort', 'longSleeve', 'cropTop', 'spaghettiTop'], bottom: ['shorts', 'skirt', 'pants'], shoes: ['sneakers', 'sandals', 'clogs', 'heels'], outer: null },
  chilly: { top: ['longSleeve', 'sweater'], bottom: ['pants'], shoes: ['sneakers', 'clogs', 'heels'], outer: 'lightJacket' },
  cold: { top: ['longSleeve', 'sweater'], bottom: ['pants'], shoes: ['sneakers', 'boots'], outer: 'warmCoat' },
  freezing: { top: ['longSleeve', 'sweater'], bottom: ['pants'], shoes: ['boots'], outer: 'warmCoat' },
};

// Starter colors that count as neutral for the "layer for later" jacket
// (spec.md, Garment types by band).
export const NEUTRAL_COLORS = new Set([
  'white', 'cream', 'grey', 'heather-grey', 'charcoal', 'black', 'navy',
  'tan', 'khaki', 'camel', 'olive', 'denim', 'light denim', 'dark denim', 'brown',
]);
