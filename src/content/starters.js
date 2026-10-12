// Starter outfits for each gender (spec.md, Content variation; R9, R11, R40).
// Each item is a drawn template in a starter colorway. Colors are names for
// now; the art rounds (C2, C7) give each one its drawn values.

import { NEUTRAL_COLORS } from './garments.js';

// One starter item. The id carries the gender, so a gender change makes the
// other set's items unknown and only those slots get re-picked (R14, R40).
function item(gender, name, type, color) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: `starter-${gender}-${slug}`,
    name,
    type,
    color,
    neutral: NEUTRAL_COLORS.has(color),
    source: 'starter',
  };
}

// Builds a set from rows of [name, type, color] per outfit slot, reusing one
// item when the same garment appears in several outfits.
function buildSet(gender, bands) {
  const items = new Map();
  const get = ([name, type, color]) => {
    const it = item(gender, name, type, color);
    if (!items.has(it.id)) items.set(it.id, it);
    return items.get(it.id);
  };
  const outfits = [];
  for (const [band, rows] of Object.entries(bands)) {
    rows.forEach(([top, bottom, shoes, outer], i) => {
      outfits.push({
        id: `starter-${gender}-${band}-${i + 1}`,
        band,
        top: get(top),
        bottom: get(bottom),
        shoes: get(shoes),
        outer: outer ? get(outer) : null,
      });
    });
  }
  const rainJacket = get(['Yellow hooded rain jacket', 'rainJacket', 'yellow']);
  // Boots used on snow days when the User owns no shoes and the starter
  // outfit's own shoes aren't boots.
  const snowBoots = get(['Brown boots', 'boots', 'brown']);
  return { gender, outfits, items: [...items.values()], rainJacket, snowBoots };
}

const man = buildSet('man', {
  hot: [
    [['White tee', 'tee', 'white'], ['Khaki shorts', 'shorts', 'khaki'], ['White sneakers', 'sneakers', 'white']],
    [['Light-blue short-sleeve button-up', 'buttonUpShort', 'light-blue'], ['Navy shorts', 'shorts', 'navy'], ['Grey sneakers', 'sneakers', 'grey']],
    [['Heather-grey tee', 'tee', 'heather-grey'], ['Olive shorts', 'shorts', 'olive'], ['White sneakers', 'sneakers', 'white']],
  ],
  warm: [
    [['Navy tee', 'tee', 'navy'], ['Light jeans', 'pants', 'light denim'], ['White sneakers', 'sneakers', 'white']],
    [['Sage short-sleeve button-up', 'buttonUpShort', 'sage'], ['Khaki shorts', 'shorts', 'khaki'], ['White sneakers', 'sneakers', 'white']],
    [['White long-sleeve shirt', 'longSleeveShirt', 'white'], ['Dark jeans', 'pants', 'dark denim'], ['Grey sneakers', 'sneakers', 'grey']],
  ],
  chilly: [
    [['White long-sleeve shirt', 'longSleeveShirt', 'white'], ['Dark jeans', 'pants', 'dark denim'], ['White sneakers', 'sneakers', 'white'], ['Denim jacket', 'lightJacket', 'denim']],
    [['Grey hoodie', 'hoodie', 'grey'], ['Khaki pants', 'pants', 'khaki'], ['Grey sneakers', 'sneakers', 'grey'], ['Navy light jacket', 'lightJacket', 'navy']],
    [['Navy sweater', 'sweater', 'navy'], ['Light jeans', 'pants', 'light denim'], ['White sneakers', 'sneakers', 'white'], ['Tan light jacket', 'lightJacket', 'tan']],
  ],
  cold: [
    [['Grey sweater', 'sweater', 'grey'], ['Dark jeans', 'pants', 'dark denim'], ['Brown boots', 'boots', 'brown'], ['Navy coat', 'warmCoat', 'navy']],
    [['White long-sleeve shirt', 'longSleeveShirt', 'white'], ['Black pants', 'pants', 'black'], ['Grey sneakers', 'sneakers', 'grey'], ['Charcoal coat', 'warmCoat', 'charcoal']],
    [['Maroon hoodie', 'hoodie', 'maroon'], ['Dark jeans', 'pants', 'dark denim'], ['Brown boots', 'boots', 'brown'], ['Olive coat', 'warmCoat', 'olive']],
  ],
  freezing: [
    [['Navy sweater', 'sweater', 'navy'], ['Dark jeans', 'pants', 'dark denim'], ['Brown boots', 'boots', 'brown'], ['Black coat', 'warmCoat', 'black']],
    [['Grey hoodie', 'hoodie', 'grey'], ['Black pants', 'pants', 'black'], ['Black boots', 'boots', 'black'], ['Red coat', 'warmCoat', 'red']],
    [['Cream sweater', 'sweater', 'cream'], ['Khaki pants', 'pants', 'khaki'], ['Brown boots', 'boots', 'brown'], ['Navy coat', 'warmCoat', 'navy']],
  ],
});

const woman = buildSet('woman', {
  hot: [
    [['White tee', 'tee', 'white'], ['Denim skirt', 'skirt', 'denim'], ['White sneakers', 'sneakers', 'white']],
    [['Coral short-sleeve button-up', 'buttonUpShort', 'coral'], ['White shorts', 'shorts', 'white'], ['White sneakers', 'sneakers', 'white']],
    [['Lavender tee', 'tee', 'lavender'], ['Khaki skirt', 'skirt', 'khaki'], ['Grey sneakers', 'sneakers', 'grey']],
  ],
  warm: [
    [['Sage tee', 'tee', 'sage'], ['Light jeans', 'pants', 'light denim'], ['White sneakers', 'sneakers', 'white']],
    [['White short-sleeve button-up', 'buttonUpShort', 'white'], ['Navy skirt', 'skirt', 'navy'], ['White sneakers', 'sneakers', 'white']],
    [['Rose long-sleeve shirt', 'longSleeveShirt', 'rose'], ['Light jeans', 'pants', 'light denim'], ['White sneakers', 'sneakers', 'white']],
  ],
  chilly: [
    [['Cream sweater', 'sweater', 'cream'], ['Light jeans', 'pants', 'light denim'], ['White sneakers', 'sneakers', 'white'], ['Denim jacket', 'lightJacket', 'denim']],
    [['White long-sleeve shirt', 'longSleeveShirt', 'white'], ['Black pants', 'pants', 'black'], ['Grey sneakers', 'sneakers', 'grey'], ['Tan light jacket', 'lightJacket', 'tan']],
    [['Lavender hoodie', 'hoodie', 'lavender'], ['Dark jeans', 'pants', 'dark denim'], ['White sneakers', 'sneakers', 'white'], ['Olive light jacket', 'lightJacket', 'olive']],
  ],
  cold: [
    [['Cream sweater', 'sweater', 'cream'], ['Dark jeans', 'pants', 'dark denim'], ['Brown boots', 'boots', 'brown'], ['Camel coat', 'warmCoat', 'camel']],
    [['Rose hoodie', 'hoodie', 'rose'], ['Black pants', 'pants', 'black'], ['Black boots', 'boots', 'black'], ['Charcoal coat', 'warmCoat', 'charcoal']],
    [['Navy long-sleeve shirt', 'longSleeveShirt', 'navy'], ['Light jeans', 'pants', 'light denim'], ['Brown boots', 'boots', 'brown'], ['Burgundy coat', 'warmCoat', 'burgundy']],
  ],
  freezing: [
    [['Grey sweater', 'sweater', 'grey'], ['Black pants', 'pants', 'black'], ['Black boots', 'boots', 'black'], ['Camel coat', 'warmCoat', 'camel']],
    [['Cream hoodie', 'hoodie', 'cream'], ['Dark jeans', 'pants', 'dark denim'], ['Brown boots', 'boots', 'brown'], ['Burgundy coat', 'warmCoat', 'burgundy']],
    [['Navy sweater', 'sweater', 'navy'], ['Khaki pants', 'pants', 'khaki'], ['Brown boots', 'boots', 'brown'], ['Forest-green coat', 'warmCoat', 'forest-green']],
  ],
});

export const STARTER_SETS = { man, woman };
