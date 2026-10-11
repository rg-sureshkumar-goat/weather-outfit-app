// Outfit candidates for a band (R9, R11; spec.md, Garment types by band and
// "How candidates are built").
//
// An outfit is { top, bottom, shoes, outer, rain }, each an item or null.
// Closet items look like { id, type, name, colors, source: 'closet' }.

import { ELIGIBLE, SNOW_SHOE_ORDER } from '../content/garments.js';
import { isNeutral } from './color.js';

const SLOTS = ['top', 'bottom', 'shoes', 'outer', 'rain'];

export const outfitKey = (outfit) => SLOTS.map((s) => outfit[s]?.id ?? '-').join('|');

// Every combination of one item per slot, in order.
function combinations(pools) {
  return SLOTS.reduce(
    (combos, slot) => combos.flatMap((c) => pools[slot].map((item) => ({ ...c, [slot]: item }))),
    [{}],
  );
}

// The User's items for each slot on this day. `null` in a pool means the slot
// stays empty (no outer layer, no rain jacket).
function closetPools(closet, band, { snowDay, rainWind }) {
  const rules = ELIGIBLE[band];
  const ofType = (types) => closet.filter((it) => types.includes(it.type));

  let shoes = ofType(rules.shoes);
  if (snowDay) {
    // Snow days: the User's own shoes always win, in any band: boots first,
    // then the first type they own in SNOW_SHOE_ORDER (spec.md, Snow days).
    const tiers = [['boots'], ...SNOW_SHOE_ORDER.map((t) => [t])];
    shoes = tiers.map(ofType).find((tier) => tier.length > 0) || [];
  }

  // On a rain-and-wind day the rain jacket replaces the light jacket, is
  // added on Hot and Warm days, and goes over the coat on Cold and Freezing.
  const outerType = rainWind && band === 'chilly' ? null : rules.outer;

  return {
    top: ofType(rules.top),
    bottom: ofType(rules.bottom),
    shoes,
    outer: outerType ? ofType([outerType]) : [null],
    rain: rainWind ? ofType(['rainJacket']) : [null],
  };
}

// The starter outfit's item for a slot, adjusted for the day.
function starterSlot(outfit, slot, set, { snowDay, rainWind, band }) {
  if (slot === 'rain') return rainWind ? set.rainJacket : null;
  if (slot === 'outer' && rainWind && band === 'chilly') return null;
  if (slot === 'shoes' && snowDay && outfit.shoes.type !== 'boots') return set.snowBoots;
  return outfit[slot];
}

// Builds the candidate list, the User's items first:
// 1. combinations of the User's own items, when they fill every slot;
// 2. if fewer than 3 distinct outfits, each starter outfit with the User's
//    items replacing the matching slots;
// 3. if still fewer than 3, whole starter outfits are mixed in.
// On a snow day when the User owns shoes, the shoes always come from the
// closet, even in step 3.
export function candidates({ band, closet = [], starterSet, snowDay = false, rainWind = false }) {
  const day = { snowDay, rainWind, band };
  const pools = closetPools(closet, band, day);
  const filled = (slot) => pools[slot].length > 0;
  const closetShoesForced = snowDay && filled('shoes');

  const seen = new Map();
  const add = (outfit) => {
    const key = outfitKey(outfit);
    if (!seen.has(key)) seen.set(key, outfit);
  };

  if (SLOTS.every(filled)) combinations(pools).forEach(add);

  const starters = starterSet.outfits.filter((o) => o.band === band);
  if (seen.size < 3) {
    for (const outfit of starters) {
      const mixed = Object.fromEntries(
        SLOTS.map((slot) => [slot, filled(slot) ? pools[slot] : [starterSlot(outfit, slot, starterSet, day)]]),
      );
      combinations(mixed).forEach(add);
    }
  }

  if (seen.size < 3) {
    for (const outfit of starters) {
      const whole = Object.fromEntries(
        SLOTS.map((slot) => [
          slot,
          slot === 'shoes' && closetShoesForced ? pools.shoes : [starterSlot(outfit, slot, starterSet, day)],
        ]),
      );
      combinations(whole).forEach(add);
      if (seen.size >= 3) break;
    }
  }

  return [...seen.values()];
}

// Jackets for "layer for later": the weight the evening's band needs, in the
// spec's order of preference. Returns the best non-empty tier.
export function layerJackets({ eveningBand, closet = [], starterSet }) {
  const type = ELIGIBLE[eveningBand].outer;
  const own = closet.filter((it) => it.type === type);
  const starters = starterSet.items.filter((it) => it.type === type);
  const tiers = [
    own.filter(isNeutral),
    own,
    starters.filter(isNeutral),
    starters,
  ];
  return tiers.find((tier) => tier.length > 0) || [];
}
