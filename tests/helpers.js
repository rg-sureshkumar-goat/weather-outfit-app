// Shared test helpers: a seeded random source, synthetic forecasts, saved
// fixtures and an in-memory stand-in for localStorage.

import { readFileSync } from 'node:fs';
import { parseForecast } from '../src/weather/openMeteo.js';

// mulberry32: a small seeded generator, so random draws repeat exactly.
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FIXTURES = ['austin-tx', 'seattle-wa', 'chicago-il', 'minneapolis-mn', 'anchorage-ak', 'honolulu-hi'];

export function loadFixture(name) {
  const json = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
  return parseForecast(json);
}

// A calm 75 °F hour; tests override what they need.
const CALM = { temp: 75, feels: 75, rain: 0, uv: 0, gust: 5, snow: 0 };

// One synthetic day, "Clear sky" (code 0) unless `day` says otherwise.
// `window` is either an object applied to every 9 am to 9 pm hour, or a
// function (hour) => overrides.
export function makeDay(date, window = {}, day = {}) {
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const inWindow = hour >= 9 && hour <= 21;
    const extra = inWindow ? (typeof window === 'function' ? window(hour) : window) : {};
    return { time: `${date}T${String(hour).padStart(2, '0')}:00`, hour, ...CALM, ...extra };
  });
  return { date, high: 80, low: 60, code: 0, hours, ...day };
}

// A parsed forecast made of synthetic days; the first day is today.
export function makeForecast(days) {
  return {
    timezone: 'America/Chicago',
    now: `${days[0].date}T08:00`,
    today: days[0].date,
    current: { temp: 72.4, feels: 73.6, code: 1 },
    days,
  };
}

export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    get size() {
      return map.size;
    },
  };
}

export const MAN = { gender: 'man' };
export const WOMAN = { gender: 'woman' };

// A closet item as the Add item flow will save it (R17, R18).
export const closetItem = (id, type, base = '#888888', name = id) => ({
  id,
  type,
  name,
  colors: { base },
  source: 'closet',
});
