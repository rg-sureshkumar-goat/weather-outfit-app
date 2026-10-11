// Today's display data: the 7-day week (R5, R29), date and outfit wording
// (R33), the sky backdrop, and a saved day that holds null (R14).

import { describe, expect, it } from 'vitest';
import { weekOverview, WEEK_LENGTH } from '../src/recommend/week.js';
import { buildState } from '../src/recommend/state.js';
import { dayLabels, listNames, skyFor, outfitDescription } from '../src/screens/format.js';
import { FIXTURES, loadFixture, makeDay, makeForecast, seededRng, MAN } from './helpers.js';

const AUSTIN = { name: 'Austin, TX', latitude: 30.27, longitude: -97.74 };

describe('the week (R5, R29)', () => {
  it.each(FIXTURES)('%s: today plus six days, all available', (name) => {
    const week = weekOverview(loadFixture(name));
    expect(week).toHaveLength(WEEK_LENGTH);
    expect(week[0].isToday).toBe(true);
    expect(week.filter((d) => d.isToday)).toHaveLength(1);
    expect(week.every((d) => d.available && d.weather && Number.isFinite(d.high))).toBe(true);
  });

  it('a missing day 7 is still listed, and disabled', () => {
    const week = weekOverview(loadFixture('synthetic-missing-day'));
    expect(week).toHaveLength(WEEK_LENGTH);
    expect(week.slice(0, 6).every((d) => d.available)).toBe(true);
    expect(week[6]).toMatchObject({ available: false, weather: null, high: null });
  });

  it('days follow on from today, across a month end', () => {
    const week = weekOverview(makeForecast([makeDay('2026-10-29')]));
    expect(week.map((d) => d.date)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
    expect(week.slice(1).every((d) => !d.available)).toBe(true);
  });

  it('a day with no feels-like value in the window is disabled', () => {
    const blank = makeDay('2026-10-13', { feels: null });
    const week = weekOverview(makeForecast([makeDay('2026-10-12'), blank]));
    expect(week[1].available).toBe(false);
  });

  it('the strip shows the same peak rain chance as the recommendation', () => {
    const forecast = makeForecast([makeDay('2026-10-12', (h) => ({ rain: h === 16 ? 45 : 10 }))]);
    const { state } = buildState({ forecast, date: '2026-10-12', location: AUSTIN, avatar: MAN, rng: seededRng(1) });
    expect(weekOverview(forecast)[0].rain).toBe(state.values.rain);
  });
});

describe('display wording (R33)', () => {
  it('formats a calendar date without the device time zone shifting it', () => {
    expect(dayLabels('2026-10-03')).toEqual({ short: 'Sat', dayNum: 3, medium: 'Sat, Oct 3', long: 'Saturday, Oct 3' });
  });

  it('lists names the way a sentence would', () => {
    expect(listNames(['a'])).toBe('a');
    expect(listNames(['a', 'b'])).toBe('a and b');
    expect(listNames(['a', 'b', 'c'])).toBe('a, b and c');
  });

  it('describes the avatar from the same state as the Wearing list', () => {
    const forecast = loadFixture('austin-tx');
    const { state } = buildState({ forecast, date: forecast.today, location: AUSTIN, avatar: MAN, rng: seededRng(2) });
    const text = outfitDescription(state);
    expect(text.startsWith('The avatar is wearing ')).toBe(true);
    for (const w of state.wearing) expect(text.toLowerCase()).toContain(w.item.name.toLowerCase());
  });

  it('picks the sky backdrop from the day\'s icon family, neutral when there is none', () => {
    expect(skyFor('clear')).toBe('clear');
    expect(skyFor('partlyCloudy')).toBe('clear');
    expect(skyFor('fog')).toBe('overcast');
    expect(skyFor('drizzle')).toBe('rain');
    expect(skyFor('thunderstorm')).toBe('rain');
    expect(skyFor('snow')).toBe('snow');
    expect(skyFor(undefined)).toBe('overcast');
  });

  it('the strip shows each day\'s own code from the saved Austin forecast', () => {
    const forecast = loadFixture('austin-tx');
    const week = weekOverview(forecast);
    week.forEach((d, i) => expect(d.weather.code).toBe(forecast.days[i].code));
  });
});

describe('saved picks holding null (R14)', () => {
  it('draws fresh picks instead of failing', () => {
    const forecast = loadFixture('austin-tx');
    const { state, picks } = buildState({ forecast, date: forecast.today, location: AUSTIN, avatar: MAN, saved: null, rng: seededRng(4) });
    expect(state.available).toBe(true);
    expect(picks.outfit.top).toBeTruthy();
  });
});
