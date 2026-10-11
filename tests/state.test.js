// R7 one state, R12 wordings, R13 independent picks, R14 saved picks,
// R40 gender, R5 Today after 9 pm, and every real fixture.

import { describe, expect, it } from 'vitest';
import { buildState, shuffle } from '../src/recommend/state.js';
import { outfitKey } from '../src/recommend/outfits.js';
import { REMINDERS, SUMMARIES } from '../src/content/wordings.js';
import { loadPicks, savePicks, clearPicks, PICKS_KEY } from '../src/store/picks.js';
import { FIXTURES, loadFixture, makeDay, makeForecast, seededRng, memoryStorage, closetItem, MAN, WOMAN } from './helpers.js';

const MON = '2026-10-12';
const TUE = '2026-10-13';
const AUSTIN = { name: 'Austin, TX', latitude: 30.27, longitude: -97.74 };
const SEATTLE = { name: 'Seattle, WA', latitude: 47.61, longitude: -122.33 };

// A hot, humid Monday with rain, sun and a cooler evening; a Chilly Tuesday.
const hotMonday = makeDay(MON, (h) => ({ feels: h === 15 ? 92 : h === 21 ? 66 : 85, rain: h === 16 ? 45 : 10, uv: h === 13 ? 8 : 2 }));
const chillyTuesday = makeDay(TUE, { feels: 60 });
const forecast = makeForecast([hotMonday, chillyTuesday]);

const build = (args) => buildState({ forecast, location: AUSTIN, avatar: MAN, rng: seededRng(7), ...args });

describe('one recommendation state (R7)', () => {
  it('the same inputs give the same state', () => {
    const a = build({ date: MON, rng: seededRng(3) });
    const b = build({ date: MON, rng: seededRng(3) });
    expect(a).toEqual(b);
  });

  it('fixed test weather always gives the same band and reminders, whatever the random draws', () => {
    const runs = [1, 2, 3, 4, 5].map((seed) => build({ date: MON, rng: seededRng(seed) }).state);
    runs.forEach((s) => {
      expect(s.band).toBe('hot');
      expect(s.reminders.map((r) => r.type)).toEqual(['umbrella', 'sunscreen', 'waterStrong', 'layer']);
      expect(s.condition).toBe('clear');
    });
  });

  it('the summary, reminders and Wearing list all name the same outfit', () => {
    const { state } = build({ date: MON });
    const wearingIds = state.wearing.map((w) => w.item.id);
    expect(wearingIds).toContain(state.outfit.top.id);
    expect(wearingIds).toContain(state.outfit.bottom.id);
    expect(wearingIds).toContain(state.outfit.shoes.id);
    const named = [state.outfit.top, state.outfit.bottom, state.outfit.shoes].map((i) => i.name.toLowerCase());
    // Every band summary names at least one of the outfit's items.
    expect(named.some((n) => state.summary.text.includes(n))).toBe(true);
  });

  it('labels where each worn item came from (R9)', () => {
    const tee = closetItem('my-tee', 'tee', '#888888', 'Grey tee');
    const { state } = build({ date: MON, closet: [tee] });
    const top = state.wearing.find((w) => w.slot === 'top');
    expect(top.item).toBe(tee);
    expect(top.label).toBe('Your closet');
    expect(state.wearing.find((w) => w.slot === 'bottom').label).toBe('Starter item');
  });

  it('Today shows Now with the current temperature; other days show Forecast (R5)', () => {
    const mon = build({ date: MON }).state;
    expect(mon.label).toBe('Now');
    expect(mon.display.temp).toBe(72);
    const tue = build({ date: TUE }).state;
    expect(tue.label).toBe('Forecast');
    expect(tue.display.temp).toBeNull();
    expect(tue.display.high).toBe(80);
  });

  it('after 9 pm, Today still covers the full 9 am to 9 pm window (R5)', () => {
    const austin = loadFixture('austin-tx');
    expect(austin.now.slice(11)).toBe('23:30');
    const { state } = buildState({ forecast: austin, date: austin.today, location: AUSTIN, avatar: MAN, rng: seededRng(1) });
    expect(state.available).toBe(true);
    expect(state.label).toBe('Now');
  });
});

describe('wordings (R12)', () => {
  // Scenario days that, between them, trigger every reminder type.
  const scenarios = [
    { day: hotMonday, closet: [] }, // umbrella, sunscreen, waterStrong, layer
    { day: makeDay(MON, (h) => ({ feels: h === 15 ? 82 : 75, gust: 30 })), closet: [] }, // water, wind
    { day: makeDay(MON, { feels: 60, gust: 30, rain: 60 }), closet: [] }, // windRain
    { day: makeDay(MON, { feels: 30, snow: 0.2 }), closet: [] }, // snow
    { day: makeDay(MON, { feels: 30, snow: 0.2 }), closet: [closetItem('kicks', 'sneakers', '#ffffff', 'Canvas sneakers')] }, // snowNoBoots
  ];

  it('every reminder wording appears, filled in, across repeated draws', () => {
    const seen = new Set();
    for (const { day, closet } of scenarios) {
      for (let seed = 1; seed <= 40; seed++) {
        const { state } = buildState({ forecast: makeForecast([day]), date: MON, location: AUSTIN, avatar: MAN, closet, rng: seededRng(seed) });
        state.reminders.forEach((r) => {
          expect(r.text).not.toMatch(/[{}]/);
          seen.add(`${r.type}:${r.wording}`);
        });
      }
    }
    const expected = REMINDERS.flatMap((r) => r.lines.map((_, i) => `${r.type}:${i}`));
    expect([...seen].sort()).toEqual(expected.sort());
  });

  it('every band summary wording appears, filled in, for both genders', () => {
    const feelsFor = { hot: 90, warm: 75, chilly: 60, cold: 45, freezing: 25 };
    for (const [band, feels] of Object.entries(feelsFor)) {
      for (const avatar of [MAN, WOMAN]) {
        const seen = new Set();
        for (let seed = 1; seed <= 30; seed++) {
          const { state } = buildState({ forecast: makeForecast([makeDay(MON, { feels })]), date: MON, location: AUSTIN, avatar, rng: seededRng(seed) });
          expect(state.band).toBe(band);
          expect(state.summary.text).not.toMatch(/[{}]/);
          seen.add(state.summary.wording);
        }
        expect(seen.size).toBe(SUMMARIES[band].length);
      }
    }
  });
});

describe('independent picks (R13)', () => {
  it('across 30 draws, the same outfit appears with at least two different wordings, and the reverse', () => {
    const draws = Array.from({ length: 30 }, (_, i) => build({ date: MON, rng: seededRng(100 + i) }).state);
    const wordingOf = (s) => [s.summary.wording, ...s.reminders.map((r) => r.wording)].join(',');

    const wordingsByOutfit = new Map();
    const outfitsByWording = new Map();
    for (const s of draws) {
      const o = outfitKey(s.outfit);
      const w = wordingOf(s);
      wordingsByOutfit.set(o, (wordingsByOutfit.get(o) || new Set()).add(w));
      outfitsByWording.set(s.summary.wording, (outfitsByWording.get(s.summary.wording) || new Set()).add(o));
    }
    expect(Math.max(...[...wordingsByOutfit.values()].map((s) => s.size))).toBeGreaterThanOrEqual(2);
    expect(Math.max(...[...outfitsByWording.values()].map((s) => s.size))).toBeGreaterThanOrEqual(2);
  });
});

describe('same date, same look (R14)', () => {
  // Simulates the app: load saved picks, build, save what was picked.
  function visit(storage, date, { rng = seededRng(Math.random() * 1e9), location = AUSTIN, today = MON, ...rest } = {}) {
    const saved = loadPicks(storage, location, today)[date];
    const { state, picks } = buildState({ forecast, date, location, avatar: MAN, rng, saved, ...rest });
    savePicks(storage, location, date, picks);
    return state;
  }

  it('Mon, then Tue, then Mon again: identical', () => {
    const storage = memoryStorage();
    const first = visit(storage, MON, { rng: seededRng(1) });
    visit(storage, TUE, { rng: seededRng(2) });
    const again = visit(storage, MON, { rng: seededRng(999) });
    expect(again).toEqual(first);
  });

  it('Shuffle on Mon, reload, return to Mon: the shuffled outfit stays, the wording too', () => {
    const storage = memoryStorage();
    const before = visit(storage, MON, { rng: seededRng(1) });
    const saved = loadPicks(storage, AUSTIN, MON)[MON];
    const shuffled = shuffle({ forecast, date: MON, avatar: MAN, saved, rng: seededRng(2) });
    savePicks(storage, AUSTIN, MON, shuffled);

    // "Reload": a fresh read of the same storage, with new random draws.
    const after = visit(storage, MON, { rng: seededRng(3) });
    expect(outfitKey(after.outfit)).not.toBe(outfitKey(before.outfit));
    expect(after.summary.wording).toBe(before.summary.wording);
    expect(after.reminders.map((r) => r.wording)).toEqual(before.reminders.map((r) => r.wording));
    expect(visit(storage, MON, { rng: seededRng(4) })).toEqual(after);
  });

  it('Shuffle always gives a different outfit', () => {
    const { picks } = build({ date: MON });
    for (let seed = 1; seed <= 20; seed++) {
      const next = shuffle({ forecast, date: MON, avatar: MAN, saved: picks, rng: seededRng(seed) });
      expect(next.outfit).not.toEqual(picks.outfit);
    }
  });

  it('changing location clears the saved picks', () => {
    const storage = memoryStorage();
    visit(storage, MON);
    expect(loadPicks(storage, AUSTIN, MON)[MON]).toBeDefined();
    expect(loadPicks(storage, SEATTLE, MON)).toEqual({});
    expect(storage.getItem(PICKS_KEY)).toBeNull();
  });

  it("yesterday's picks are gone the next day", () => {
    const storage = memoryStorage();
    visit(storage, MON);
    visit(storage, TUE);
    const nextDay = loadPicks(storage, AUSTIN, TUE);
    expect(Object.keys(nextDay)).toEqual([TUE]);
  });

  it('picks hold only item IDs and wording numbers', () => {
    const storage = memoryStorage();
    visit(storage, MON);
    const stored = JSON.parse(storage.getItem(PICKS_KEY));
    expect(Object.keys(stored)).toEqual(['location', 'byDate']);
    const p = stored.byDate[MON];
    expect(Object.keys(p).sort()).toEqual(['jacket', 'outfit', 'reminders', 'summary']);
    Object.values(p.outfit).forEach((id) => expect(id === null || typeof id === 'string').toBe(true));
    Object.values(p.reminders).forEach((n) => expect(Number.isInteger(n)).toBe(true));
    clearPicks(storage);
    expect(storage.size).toBe(0);
  });
});

describe('only the affected part is re-picked (R14, R40)', () => {
  const tee = closetItem('my-tee', 'tee');
  const pants = closetItem('my-pants', 'pants');
  const sneakers = closetItem('my-sneakers', 'sneakers');

  it('a deleted item: only its slot changes', () => {
    const { state: before, picks } = build({ date: MON, closet: [tee] });
    expect(before.outfit.top).toBe(tee);
    const { state: after } = build({ date: MON, closet: [], saved: picks, rng: seededRng(50) });
    expect(after.outfit.top.id).not.toBe(tee.id);
    expect(after.outfit.bottom.id).toBe(before.outfit.bottom.id);
    expect(after.outfit.shoes.id).toBe(before.outfit.shoes.id);
  });

  it('a gender change re-picks only the starter slots', () => {
    const { state: before, picks } = build({ date: MON, closet: [tee] });
    const { state: after } = build({ date: MON, closet: [tee], avatar: WOMAN, saved: picks, rng: seededRng(50) });
    expect(after.outfit.top).toBe(tee);
    expect(before.outfit.bottom.id).toMatch(/^starter-man-/);
    expect(after.outfit.bottom.id).toMatch(/^starter-woman-/);
    expect(after.outfit.shoes.id).toMatch(/^starter-woman-/);
    expect(after.summary.wording).toBe(before.summary.wording);
  });

  it('a band change after a forecast update: items that still suit the day stay', () => {
    const warmDay = makeForecast([makeDay(MON, { feels: 75 })]);
    const closet = [tee, pants, sneakers];
    const first = buildState({ forecast: warmDay, date: MON, location: AUSTIN, avatar: MAN, closet, rng: seededRng(1) });
    // Keep only the all-closet Warm outfit for this check.
    const saved = { ...first.picks, outfit: { top: tee.id, bottom: pants.id, shoes: sneakers.id, outer: null, rain: null } };

    const hotDay = makeForecast([makeDay(MON, { feels: 90 })]);
    const { state } = buildState({ forecast: hotDay, date: MON, location: AUSTIN, avatar: MAN, closet, saved, rng: seededRng(2) });
    expect(state.band).toBe('hot');
    expect(state.outfit.top).toBe(tee);
    expect(state.outfit.shoes).toBe(sneakers);
    expect(state.outfit.bottom.type).toBe('shorts'); // pants don't suit a Hot day
  });
});

describe('snow without boots, rain over the coat (spec.md, Garment types by band)', () => {
  it('snow with only sneakers in the closet: the outfit wears them and Snow warns', () => {
    const sneakersItem = closetItem('kicks', 'sneakers', '#ffffff', 'Canvas sneakers');
    const day = makeForecast([makeDay(MON, { feels: 28, snow: 0.3 })]);
    const { state } = buildState({ forecast: day, date: MON, location: AUSTIN, avatar: MAN, closet: [sneakersItem], rng: seededRng(1) });
    expect(state.outfit.shoes).toBe(sneakersItem);
    const snow = state.reminders.find((r) => r.icon === 'snow');
    expect(snow.type).toBe('snowNoBoots');
    expect(snow.text).toMatch(/Canvas sneakers|boots/);
  });

  it('snow with no shoes in the closet: starter boots and the normal Snow reminder', () => {
    const day = makeForecast([makeDay(MON, { feels: 45, snow: 0.3 })]);
    const { state } = buildState({ forecast: day, date: MON, location: AUSTIN, avatar: WOMAN, rng: seededRng(1) });
    expect(state.outfit.shoes.type).toBe('boots');
    expect(state.reminders.map((r) => r.type)).toContain('snow');
  });

  it('a Freezing rain-and-wind day: coat and rain jacket both worn, rain jacket on top', () => {
    const day = makeForecast([makeDay(MON, { feels: 30, gust: 30, rain: 70 })]);
    const { state } = buildState({ forecast: day, date: MON, location: AUSTIN, avatar: MAN, rng: seededRng(1) });
    expect(state.wearing.map((w) => w.slot)).toEqual(['rain', 'outer', 'top', 'bottom', 'shoes']);
    expect(state.outfit.outer.type).toBe('warmCoat');
    expect(state.reminders.map((r) => r.type)).toEqual(['windRain']);
  });
});

describe('real forecasts from six places', () => {
  it.each(FIXTURES)('%s: every day builds a complete state for both genders', (name) => {
    const f = loadFixture(name);
    for (const day of f.days) {
      for (const avatar of [MAN, WOMAN]) {
        const { state, picks } = buildState({ forecast: f, date: day.date, location: AUSTIN, avatar, rng: seededRng(1) });
        expect(state.available).toBe(true);
        ['top', 'bottom', 'shoes'].forEach((slot) => expect(state.outfit[slot]).toBeTruthy());
        [state.summary.text, ...state.reminders.map((r) => r.text)].forEach((t) => expect(t).not.toMatch(/[{}]/));
        expect(picks.outfit.top).toBe(state.outfit.top.id);
      }
    }
  });
});
