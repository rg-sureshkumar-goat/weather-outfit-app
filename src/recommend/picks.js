// Random picks for one date, kept stable across visits (R13, R14).
//
// A date's saved picks hold only item IDs and wording numbers (R14):
//   { outfit: { top, bottom, shoes, outer, rain }, summary, reminders: { type: n }, jacket }
// The outfit, the summary wording, each reminder's wording and the layer
// jacket are each drawn separately, so they vary independently (R13).

import { outfitKey } from './outfits.js';

const SLOTS = ['top', 'bottom', 'shoes', 'outer', 'rain'];
export const WORDING_COUNT = 3;

export const pickIndex = (length, rng) => Math.floor(rng() * length);

export const idsOf = (outfit) => Object.fromEntries(SLOTS.map((s) => [s, outfit[s]?.id ?? null]));

// Keeps as much of the saved outfit as still fits. Candidates that agree with
// the saved outfit on the most slots win, and one is drawn among them. With an
// unchanged day that is exactly the saved outfit; after a deleted item, a
// gender change or a band change, only the affected slots change (R14).
export function chooseOutfit(cands, savedIds, rng) {
  if (!savedIds) return cands[pickIndex(cands.length, rng)];
  const score = (c) => SLOTS.filter((s) => (c[s]?.id ?? null) === (savedIds[s] ?? null)).length;
  const best = Math.max(...cands.map(score));
  const top = cands.filter((c) => score(c) === best);
  return top[pickIndex(top.length, rng)];
}

// Shuffle draws a different outfit; the wording stays (R14).
export function shuffleOutfit(cands, current, rng) {
  const others = cands.filter((c) => outfitKey(c) !== outfitKey(current));
  return others.length > 0 ? others[pickIndex(others.length, rng)] : current;
}

// Resolves this date's picks from the saved ones, drawing only what's missing
// or no longer valid. Reminder types can depend on the outfit (snow without
// boots), so they come from a function of it. Returns the chosen values and
// the picks to save.
export function resolvePicks({ cands, reminderTypesFor, jackets, saved = {}, rng }) {
  const outfit = chooseOutfit(cands, saved.outfit, rng);
  const reminderTypes = reminderTypesFor(outfit);

  const validNumber = (n) => Number.isInteger(n) && n >= 0 && n < WORDING_COUNT;
  const summary = validNumber(saved.summary) ? saved.summary : pickIndex(WORDING_COUNT, rng);

  const reminders = {};
  for (const type of reminderTypes) {
    const n = saved.reminders?.[type];
    reminders[type] = validNumber(n) ? n : pickIndex(WORDING_COUNT, rng);
  }

  let jacket = null;
  if (jackets.length > 0) {
    jacket = jackets.find((j) => j.id === saved.jacket) || jackets[pickIndex(jackets.length, rng)];
  }

  return {
    outfit,
    summary,
    reminderTypes,
    reminders,
    jacket,
    // Wording numbers for reminders not shown today are kept, so they come
    // back unchanged if a forecast update brings the reminder back.
    toSave: {
      outfit: idsOf(outfit),
      summary,
      reminders: { ...saved.reminders, ...reminders },
      jacket: jacket?.id ?? saved.jacket ?? null,
    },
  };
}
