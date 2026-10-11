// buildState(): one recommendation state per location and date (R7).
//
// A pure function: the same forecast, closet, avatar, saved picks and random
// source always give the same state. Screens draw only from this state and
// never read weather or storage themselves (spec.md, Flow).

import { BANDS } from '../content/garments.js';
import { STARTER_SETS } from '../content/starters.js';
import { REMINDER_BY_TYPE, SUMMARIES, fill } from '../content/wordings.js';
import { windowHours, deriveValues } from './window.js';
import { bandFor, weatherReminders, layerBand, rainAndWind, missingNotes, windowCondition } from './rules.js';
import { candidates, layerJackets } from './outfits.js';
import { resolvePicks, chooseOutfit, shuffleOutfit, idsOf } from './picks.js';

const round = (v) => (v === null || v === undefined ? null : Math.round(v));

// Starter names read mid-sentence in lower case ("your white tee"). The
// User's own names are shown as typed.
const inSentence = (item) =>
  item.source === 'starter' ? item.name.charAt(0).toLowerCase() + item.name.slice(1) : item.name;

const sourceLabel = (item) => (item.source === 'starter' ? 'Starter item' : 'Your closet');

// Everything about the day that doesn't depend on random picks.
function dayContext({ forecast, date, closet, avatar }) {
  const day = forecast.days.find((d) => d.date === date);
  if (!day) return null;
  const hours = windowHours(day);
  const values = deriveValues(hours);
  // No feels-like value in any window hour: the day is unavailable (R29).
  if (values.missing.feels) return null;

  const band = bandFor(values.feelsMax);
  const starterSet = STARTER_SETS[avatar.gender];
  const snowDay = values.snowTotal > 0;
  const rainWind = rainAndWind(values);
  const eveningBand = layerBand(values, band);
  return {
    day,
    hours,
    values,
    band,
    snowDay,
    weatherTypes: weatherReminders(values, band),
    cands: candidates({ band, closet, starterSet, snowDay, rainWind }),
    jackets: eveningBand ? layerJackets({ eveningBand, closet, starterSet }) : [],
  };
}

// Snow uses its "no boots" wordings when the outfit's shoes aren't boots.
const typesFor = (ctx) => (outfit) =>
  ctx.weatherTypes.map((t) => (t === 'snow' && outfit.shoes.type !== 'boots' ? 'snowNoBoots' : t));

export function buildState({ forecast, date, location, closet = [], avatar, saved, rng = Math.random }) {
  const isToday = date === forecast.today;
  const base = {
    location,
    date,
    isToday,
    label: isToday ? 'Now' : 'Forecast',
    updatedAt: forecast.now,
    avatar,
  };

  const ctx = dayContext({ forecast, date, closet, avatar });
  if (!ctx) return { state: { ...base, available: false }, picks: saved ?? null };

  const { values, band } = ctx;
  const picked = resolvePicks({
    cands: ctx.cands,
    reminderTypesFor: typesFor(ctx),
    jackets: ctx.jackets,
    saved,
    rng,
  });
  const { outfit } = picked;

  const names = {
    top: inSentence(outfit.top),
    bottom: inSentence(outfit.bottom),
    shoes: inSentence(outfit.shoes),
    // {outer} names the coat when the rain jacket is worn over it, and the
    // rain jacket when it replaces the light jacket.
    outer: outfit.outer ? inSentence(outfit.outer) : outfit.rain ? inSentence(outfit.rain) : null,
    jacket: picked.jacket ? inSentence(picked.jacket) : null,
  };
  const fillValues = { ...values, ...names };

  const summaryWording = SUMMARIES[band][picked.summary];
  const reminders = picked.reminderTypes.map((type) => {
    const def = REMINDER_BY_TYPE[type];
    const wording = picked.reminders[type];
    return { type, title: def.title, icon: def.icon, wording, text: fill(def.lines[wording], fillValues) };
  });

  // Head to toe, as the "Wearing" list reads.
  const wearing = ['rain', 'outer', 'top', 'bottom', 'shoes']
    .filter((slot) => outfit[slot])
    .map((slot) => ({ slot, item: outfit[slot], label: sourceLabel(outfit[slot]) }));

  const state = {
    ...base,
    available: true,
    display: {
      temp: isToday ? round(forecast.current.temp) : null,
      feels: isToday ? round(forecast.current.feels) : null,
      high: round(ctx.day.high),
      low: round(ctx.day.low),
    },
    band,
    bandLabel: BANDS.find((b) => b.id === band).label,
    condition: windowCondition(ctx.hours),
    values,
    summary: { wording: picked.summary, title: summaryWording.title, text: fill(summaryWording.line, fillValues) },
    reminders,
    layerJacket: picked.jacket,
    outfit,
    wearing,
    notes: missingNotes(values),
  };
  return { state, picks: picked.toSave };
}

// Shuffle: a different outfit becomes the date's outfit; wording stays (R14).
// Returns the picks to save; build the state again from them.
export function shuffle({ forecast, date, closet = [], avatar, saved, rng = Math.random }) {
  const ctx = dayContext({ forecast, date, closet, avatar });
  if (!ctx) return saved ?? null;
  const current = chooseOutfit(ctx.cands, saved?.outfit, rng);
  return { ...saved, outfit: idsOf(shuffleOutfit(ctx.cands, current, rng)) };
}
