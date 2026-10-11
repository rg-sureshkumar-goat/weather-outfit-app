// Band, weather-triggered reminders and missing-data notes (R8, R29). The
// weather icon comes straight from Open-Meteo's codes (R10, weatherCodes.js).

import { BANDS } from '../content/garments.js';
import { MISSING_NOTES } from '../content/wordings.js';

export const THRESHOLDS = {
  layerBelow: 70, // coldest feels-like, °F
  rain: 40, // % chance
  uv: 3,
  water: 80, // feels-like, °F
  waterStrong: 90,
  gust: 25, // mph
};

export function bandFor(feels) {
  return BANDS.find((b) => feels >= b.min).id;
}

// 0 is the warmest band, 4 the coldest.
export const bandIndex = (id) => BANDS.findIndex((b) => b.id === id);

// Which reminders the weather calls for, before the outfit is known. The
// outfit later decides "snow" vs "snowNoBoots" and names the layer's jacket.
// Returned in the spec's table order.
export function weatherReminders(values, band) {
  const out = [];
  const rainy = values.rain !== null && values.rain >= THRESHOLDS.rain;
  const gusty = values.gust !== null && values.gust >= THRESHOLDS.gust;

  // "Wind and rain" replaces both Umbrella and Wind (spec.md R8).
  if (rainy && !gusty) out.push('umbrella');
  if (values.uv !== null && values.uv >= THRESHOLDS.uv) out.push('sunscreen');
  if (values.feelsMax >= THRESHOLDS.waterStrong) out.push('waterStrong');
  else if (values.feelsMax >= THRESHOLDS.water) out.push('water');
  if (layerBand(values, band)) out.push('layer');
  if (gusty && !rainy) out.push('wind');
  if (gusty && rainy) out.push('windRain');
  if (values.snowTotal > 0) out.push('snow');
  return out;
}

// The colder band the evening drops into, if it calls for a layer: the
// coldest hour is below 70 °F and in a colder band than the outfit's.
export function layerBand(values, band) {
  if (values.feelsMin === null || values.feelsMin >= THRESHOLDS.layerBelow) return null;
  const evening = bandFor(values.feelsMin);
  return bandIndex(evening) > bandIndex(band) ? evening : null;
}

export const rainAndWind = (values) =>
  values.rain !== null && values.rain >= THRESHOLDS.rain && values.gust !== null && values.gust >= THRESHOLDS.gust;

// Notes for data missing for the whole day (R29): window values missing
// in every hour, or no weather code for the day (`code`).
export function missingNotes(missing) {
  return Object.keys(MISSING_NOTES)
    .filter((key) => missing[key])
    .map((key) => MISSING_NOTES[key]);
}
