// R8 threshold edges, R10 condition icon, R29 missing data.

import { describe, expect, it } from 'vitest';
import { windowHours, deriveValues, hourLabel } from '../src/recommend/window.js';
import { bandFor, weatherReminders, windowCondition } from '../src/recommend/rules.js';
import { buildState } from '../src/recommend/state.js';
import { makeDay, makeForecast, seededRng, MAN } from './helpers.js';

const DATE = '2026-10-12';

// Runs the window, derived values and band for one synthetic day.
function analyse(window) {
  const hours = windowHours(makeDay(DATE, window));
  const values = deriveValues(hours);
  const band = bandFor(values.feelsMax);
  return { hours, values, band, reminders: weatherReminders(values, band) };
}

// A day whose feels-like peaks at `max` (3 pm) and bottoms at `min` (9 pm).
const feelsDay = (max, min = max) => (hour) => ({ feels: hour === 15 ? max : hour === 21 ? min : Math.min(max, Math.max(min, 72)) });

describe('window (spec.md, Window)', () => {
  it('uses the 13 hours from 9 am to 9 pm, inclusive', () => {
    const { hours } = analyse({});
    expect(hours.map((h) => h.hour)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it('rounds values before the rules run: 84.5 °F feels-like is Hot', () => {
    expect(analyse(feelsDay(84.5)).band).toBe('hot');
    expect(analyse(feelsDay(84.4)).band).toBe('warm');
  });

  it('labels times like "3 pm"', () => {
    expect([9, 12, 15, 21].map(hourLabel)).toEqual(['9 am', '12 pm', '3 pm', '9 pm']);
  });
});

describe('bands (R8)', () => {
  it.each([
    [85, 'hot'], [84, 'warm'], [70, 'warm'], [69, 'chilly'],
    [55, 'chilly'], [54, 'cold'], [35, 'cold'], [34, 'freezing'],
  ])('warmest feels-like %i °F is %s', (feels, band) => {
    expect(analyse(feelsDay(feels)).band).toBe(band);
  });
});

describe('reminders at each threshold edge (R8)', () => {
  const has = (window, type) => analyse(window).reminders.includes(type);

  it('umbrella: 39% no, 40% yes', () => {
    expect(has({ rain: 39 }, 'umbrella')).toBe(false);
    expect(has({ rain: 40 }, 'umbrella')).toBe(true);
  });

  it('sunscreen: UV 2 no, UV 3 yes', () => {
    expect(has({ uv: 2 }, 'sunscreen')).toBe(false);
    expect(has({ uv: 3 }, 'sunscreen')).toBe(true);
  });

  it('water: 79 °F none, 80 °F water, 89 °F water, 90 °F the stronger wording only', () => {
    expect(analyse(feelsDay(79)).reminders).not.toContain('water');
    expect(analyse(feelsDay(80)).reminders).toContain('water');
    expect(analyse(feelsDay(89)).reminders).toContain('water');
    const at90 = analyse(feelsDay(90)).reminders;
    expect(at90).toContain('waterStrong');
    expect(at90).not.toContain('water');
  });

  it('layer for later: coldest 70 °F no, 69 °F yes (outfit warmer than Chilly)', () => {
    expect(has(feelsDay(86, 70), 'layer')).toBe(false);
    expect(has(feelsDay(86, 69), 'layer')).toBe(true);
    expect(has(feelsDay(72, 69), 'layer')).toBe(true);
  });

  it('layer for later: not when the coldest hour is in the same band as the outfit', () => {
    expect(has(feelsDay(65, 56), 'layer')).toBe(false); // Chilly all day
    expect(has(feelsDay(65, 54), 'layer')).toBe(true); // Chilly, evening Cold
  });

  it('wind: gusts 24 mph no, 25 mph yes', () => {
    expect(has({ gust: 24 }, 'wind')).toBe(false);
    expect(has({ gust: 25 }, 'wind')).toBe(true);
  });

  it('wind and rain: gusts 25 mph with 40% rain shows only "Wind and rain"', () => {
    const r = analyse({ gust: 25, rain: 40 }).reminders;
    expect(r).toContain('windRain');
    expect(r).not.toContain('umbrella');
    expect(r).not.toContain('wind');
  });

  it('wind and rain: needs both; 39% rain with 25 mph gusts is plain wind', () => {
    const r = analyse({ gust: 25, rain: 39 }).reminders;
    expect(r).toEqual(['wind']);
  });

  it('snow: none at 0, yes at any amount (0.01 in), which is not rounded away', () => {
    expect(has({ snow: 0 }, 'snow')).toBe(false);
    expect(has((h) => ({ snow: h === 14 ? 0.01 : 0 }), 'snow')).toBe(true);
    expect(analyse((h) => ({ snow: h === 14 ? 0.01 : 0 })).values.snowTime).toBe('2 pm');
  });

  it('reminders come in the spec table order', () => {
    const r = analyse((h) => ({ rain: 50, uv: 8, feels: h === 15 ? 92 : h === 21 ? 65 : 80 })).reminders;
    expect(r).toEqual(['umbrella', 'sunscreen', 'waterStrong', 'layer']);
  });
});

describe('condition icon (R10)', () => {
  const codes = (list) => (hour) => ({ code: list[hour - 9] });
  const condition = (list) => windowCondition(windowHours(makeDay(DATE, codes(list))));
  const repeat = (code, n) => Array(n).fill(code);

  it('3 rain hours and 10 clear hours shows rain', () => {
    expect(condition([...repeat(61, 3), ...repeat(0, 10)])).toBe('rain');
  });

  it('2 rain hours is not enough: the most frequent (clear) shows', () => {
    expect(condition([...repeat(61, 2), ...repeat(0, 11)])).toBe('clear');
  });

  it('8 rain hours and 3 storm hours shows storm (most severe wins)', () => {
    expect(condition([...repeat(61, 8), ...repeat(95, 3), ...repeat(0, 2)])).toBe('storm');
  });

  it('3 snow and 3 rain hours shows snow', () => {
    expect(condition([...repeat(71, 3), ...repeat(61, 3), ...repeat(0, 7)])).toBe('snow');
  });

  it('a tie for most frequent goes to the more severe: cloudy over clear', () => {
    expect(condition([...repeat(3, 6), ...repeat(0, 6), 45])).toBe('cloudy');
  });

  it('maps every WMO code group from the spec', () => {
    const one = (code) => condition(repeat(code, 13));
    expect([0, 1, 2, 3, 45, 48, 51, 67, 80, 82, 71, 77, 85, 86, 95, 99].map(one)).toEqual([
      'clear', 'partlyCloudy', 'partlyCloudy', 'cloudy', 'fog', 'fog', 'rain', 'rain', 'rain', 'rain',
      'snow', 'snow', 'snow', 'snow', 'storm', 'storm',
    ]);
  });
});

describe('missing data (R29)', () => {
  const state = (days, date = DATE) =>
    buildState({ forecast: makeForecast(days), date, location: {}, avatar: MAN, rng: seededRng(1) }).state;

  it('no UV all day: no sunscreen reminder, plus the note', () => {
    const s = state([makeDay(DATE, { uv: null })]);
    expect(s.reminders.map((r) => r.type)).not.toContain('sunscreen');
    expect(s.notes).toContain("UV data isn't available for this day.");
  });

  it('UV missing for some hours: the rule uses the hours that exist', () => {
    const s = state([makeDay(DATE, (h) => ({ uv: h < 12 ? null : h === 13 ? 5 : 1 }))]);
    expect(s.reminders.map((r) => r.type)).toContain('sunscreen');
    expect(s.values.uvTime).toBe('1 pm');
    expect(s.notes).toEqual([]);
  });

  it('a missing day 7 is unavailable', () => {
    const days = Array.from({ length: 6 }, (_, i) => makeDay(`2026-10-${12 + i}`));
    expect(state(days, '2026-10-18').available).toBe(false);
    expect(state(days, '2026-10-17').available).toBe(true);
  });

  it('a day with no feels-like value in any window hour is unavailable', () => {
    expect(state([makeDay(DATE, { feels: null })]).available).toBe(false);
  });
});
