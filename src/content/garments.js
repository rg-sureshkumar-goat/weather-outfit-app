// Garment types and which ones suit each band (spec.md, Garment types by band).

// The 12 garment types a closet item can have (R17).
export const GARMENT_TYPES = {
  tee: { label: 'Tee', slot: 'top' },
  buttonUpShort: { label: 'Short-sleeve button-up', slot: 'top' },
  longSleeve: { label: 'Long-sleeve shirt', slot: 'top' },
  sweater: { label: 'Sweater or hoodie', slot: 'top' },
  lightJacket: { label: 'Light jacket', slot: 'outer' },
  warmCoat: { label: 'Warm coat', slot: 'outer' },
  rainJacket: { label: 'Hooded rain jacket', slot: 'rain' },
  pants: { label: 'Pants', slot: 'bottom' },
  shorts: { label: 'Shorts', slot: 'bottom' },
  skirt: { label: 'Skirt', slot: 'bottom' },
  sneakers: { label: 'Sneakers', slot: 'shoes' },
  boots: { label: 'Boots', slot: 'shoes' },
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

// Eligible types per slot for each band. `outer` is the single outer-layer
// type the band calls for, or null when it needs none.
export const ELIGIBLE = {
  hot: { top: ['tee', 'buttonUpShort'], bottom: ['shorts', 'skirt'], shoes: ['sneakers'], outer: null },
  warm: { top: ['tee', 'buttonUpShort', 'longSleeve'], bottom: ['shorts', 'skirt', 'pants'], shoes: ['sneakers'], outer: null },
  chilly: { top: ['longSleeve', 'sweater'], bottom: ['pants'], shoes: ['sneakers'], outer: 'lightJacket' },
  cold: { top: ['longSleeve', 'sweater'], bottom: ['pants'], shoes: ['sneakers', 'boots'], outer: 'warmCoat' },
  freezing: { top: ['longSleeve', 'sweater'], bottom: ['pants'], shoes: ['boots'], outer: 'warmCoat' },
};

// Starter colors that count as neutral for the "layer for later" jacket
// (spec.md, Garment types by band).
export const NEUTRAL_COLORS = new Set([
  'white', 'cream', 'grey', 'heather-grey', 'charcoal', 'black', 'navy',
  'tan', 'khaki', 'camel', 'olive', 'denim', 'light denim', 'dark denim', 'brown',
]);
