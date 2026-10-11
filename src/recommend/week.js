// The week at a glance for the date strip (phone) and week list (laptop):
// each day's weather code from Open-Meteo, high and low, and the peak rain
// chance from the same 9 am–9 pm window as the recommendation (R5, R10, R29).

import { windowHours, deriveValues } from './window.js';
import { describeWeather } from '../content/weatherCodes.js';

// Today plus six forecast days, always shown even if some are missing (R5).
export const WEEK_LENGTH = 7;

const round = (v) => (v === null || v === undefined ? null : Math.round(v));

// Calendar arithmetic on YYYY-MM-DD dates, in UTC so no time zone shifts the day.
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export function weekOverview(forecast) {
  const byDate = new Map(forecast.days.map((day) => [day.date, day]));
  return Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const date = addDays(forecast.today, i);
    const day = byDate.get(date);
    const isToday = i === 0;
    // A day the forecast didn't return is disabled in the strip (R29).
    if (!day) return { date, isToday, available: false, weather: null, high: null, low: null, rain: null };
    const hours = windowHours(day);
    const values = deriveValues(hours);
    return {
      date,
      isToday,
      // A day with no feels-like value in the window can't be recommended
      // for, so it's disabled too (R29).
      available: !values.missing.feels,
      weather: describeWeather(day.code),
      high: round(day.high),
      low: round(day.low),
      rain: values.rain,
    };
  });
}
