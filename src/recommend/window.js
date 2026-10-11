// The 9 am to 9 pm window and the values derived from it (spec.md, Window
// and Derived values).

export const WINDOW_START = 9;
export const WINDOW_END = 21;

const round = (v) => (v === null || v === undefined ? null : Math.round(v));

// The 13 hours from 9 am to 9 pm inclusive. Values are rounded to whole
// numbers so the numbers on screen match the rules. Snowfall is not rounded:
// it's in inches, rounding would erase light snow, and it is never shown as a
// number (spec.md Revisions, 2026-10-10).
export function windowHours(day) {
  return day.hours
    .filter((h) => h.hour >= WINDOW_START && h.hour <= WINDOW_END)
    .map((h) => ({
      ...h,
      temp: round(h.temp),
      feels: round(h.feels),
      rain: round(h.rain),
      uv: round(h.uv),
      gust: round(h.gust),
    }));
}

// "3 pm"-style labels for wordings (spec.md, Wordings).
export function hourLabel(hour) {
  const suffix = hour < 12 ? 'am' : 'pm';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

// Highest or lowest value of a field and the first hour it occurs, ignoring
// missing hours (R29). Returns null when the field is missing all window.
function extreme(hours, field, pickHigher) {
  let best = null;
  for (const h of hours) {
    const v = h[field];
    if (v === null || v === undefined) continue;
    if (best === null || (pickHigher ? v > best.value : v < best.value)) {
      best = { value: v, hour: h.hour };
    }
  }
  return best;
}

export function deriveValues(hours) {
  const feelsMax = extreme(hours, 'feels', true);
  const feelsMin = extreme(hours, 'feels', false);
  const rain = extreme(hours, 'rain', true);
  const uv = extreme(hours, 'uv', true);
  const gust = extreme(hours, 'gust', true);

  const snowHours = hours.filter((h) => h.snow !== null && h.snow !== undefined);
  const firstSnow = snowHours.find((h) => h.snow > 0);
  const missing = {
    feels: feelsMax === null,
    rain: rain === null,
    uv: uv === null,
    gust: gust === null,
    snow: snowHours.length === 0,
  };

  return {
    feelsMax: feelsMax?.value ?? null,
    maxTime: feelsMax ? hourLabel(feelsMax.hour) : null,
    feelsMin: feelsMin?.value ?? null,
    minTime: feelsMin ? hourLabel(feelsMin.hour) : null,
    rain: rain?.value ?? null,
    rainTime: rain ? hourLabel(rain.hour) : null,
    uv: uv?.value ?? null,
    uvTime: uv ? hourLabel(uv.hour) : null,
    gust: gust?.value ?? null,
    snowTotal: snowHours.reduce((sum, h) => sum + h.snow, 0),
    snowTime: firstSnow ? hourLabel(firstSnow.hour) : null,
    missing,
  };
}
