// Band, weather-triggered reminders and the condition icon (R8, R10, R29).

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

// Notes for values missing across the whole window (R29).
export function missingNotes(values) {
  return Object.keys(MISSING_NOTES)
    .filter((key) => values.missing[key])
    .map((key) => MISSING_NOTES[key]);
}

// WMO weather codes to the 7 icon conditions (spec.md, Condition codes).
export function conditionForCode(code) {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partlyCloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return null;
}

// Most severe first; used to break ties (spec.md R10).
export const SEVERITY = ['storm', 'snow', 'rain', 'fog', 'cloudy', 'partlyCloudy', 'clear'];
const WET = new Set(['storm', 'snow', 'rain']);

// The window's condition: rain, storm or snow wins with 3 or more hours;
// otherwise the most frequent. Ties go to the most severe.
export function windowCondition(hours) {
  const counts = new Map();
  for (const h of hours) {
    const c = conditionForCode(h.code);
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  if (counts.size === 0) return null;

  const wet = SEVERITY.filter((c) => WET.has(c) && (counts.get(c) || 0) >= 3);
  if (wet.length > 0) return wet[0];

  const most = Math.max(...counts.values());
  return SEVERITY.find((c) => counts.get(c) === most);
}
