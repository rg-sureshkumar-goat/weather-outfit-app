// R2 search, R3 device location, R4 saved location.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { placesUrl, parsePlaces, searchPlaces, isZip, PlaceError } from '../src/weather/places.js';
import { reverseUrl, parseReverse, reverseLookup, LookupError } from '../src/weather/reverseGeocode.js';
import { loadLocation, saveLocation, LOCATION_KEY } from '../src/store/location.js';
import { savePicks, loadPicks, PICKS_KEY } from '../src/store/picks.js';
import { US_STATES, stateCode } from '../src/content/usStates.js';
import { memoryStorage } from './helpers.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

describe('search (R2)', () => {
  it('asks Open-Meteo geocoding for US places only', () => {
    const url = new URL(placesUrl('  Austin '));
    expect(url.origin).toBe('https://geocoding-api.open-meteo.com');
    expect(url.searchParams.get('name')).toBe('Austin');
    expect(url.searchParams.get('countryCode')).toBe('US');
  });

  it('"Austin" lists Austin, Texas first, and Austins in other states', () => {
    const places = parsePlaces(fixture('geocode-austin'));
    expect(places[0].longLabel).toBe('Austin, Texas');
    expect(places[0].label).toBe('Austin, TX');
    expect(new Set(places.map((p) => p.state)).size).toBeGreaterThan(3);
  });

  it('"78705" finds Austin, TX, with coordinates rounded to 2 decimals', () => {
    const [austin] = parsePlaces(fixture('geocode-78705'));
    expect(austin.label).toBe('Austin, TX');
    expect(austin.latitude).toBe(30.27);
    expect(austin.longitude).toBe(-97.74);
  });

  it('"Toronto" lists only US towns named Toronto, never Canada', () => {
    const places = parsePlaces(fixture('geocode-toronto'));
    expect(places.length).toBeGreaterThan(0);
    places.forEach((p) => expect(Object.values(US_STATES)).toContain(stateCode(p.state)));
    expect(places.some((p) => p.state === 'Ontario')).toBe(false);
    expect(places.map((p) => p.label)).toContain('Toronto, OH');
  });

  it('a city search keeps only places whose name contains the typed text', () => {
    const austins = parsePlaces(fixture('geocode-austin'), 'Austin').map((p) => p.name);
    expect(austins).not.toContain('Ardmore');
    expect(austins).not.toContain('Cazadero');
    expect(new Set(austins)).toEqual(new Set(['Austin']));
    expect(parsePlaces(fixture('geocode-toronto'), 'toronto').map((p) => p.name)).not.toContain('Tamo');
    // Partial text, case and punctuation don't matter.
    expect(parsePlaces(fixture('geocode-austin'), 'aus').length).toBe(austins.length);
    expect(parsePlaces({ results: [{ name: 'St. Louis', admin1: 'Missouri', country_code: 'US', feature_code: 'PPLA2', latitude: 38.63, longitude: -90.2 }] }, 'st louis')).toHaveLength(1);
  });

  it('a ZIP search keeps the city even though its name is not the ZIP', () => {
    expect(parsePlaces(fixture('geocode-78705'), '78705').map((p) => p.label)).toEqual(['Austin, TX']);
  });

  it('keeps cities and towns only: no dams or parks', () => {
    const names = parsePlaces(fixture('geocode-toronto')).map((p) => p.name);
    expect(names).not.toContain('Toronto Dam');
    expect(names).not.toContain('Toronto State Park');
  });

  it('a search with no US match ("Saskatoon") returns nothing, so the screen shows the not-found message', () => {
    // Open-Meteo leaves out "results" when nothing matches (checked live 2026-10-11).
    expect(parsePlaces({ generationtime_ms: 0.4 })).toEqual([]);
  });

  it('tells ZIP codes from city names', () => {
    expect(isZip('78705')).toBe(true);
    expect(isZip(' 78705 ')).toBe(true);
    expect(isZip('7870')).toBe(false);
    expect(isZip('Austin')).toBe(false);
  });

  it('when two matches read the same, the county tells them apart', () => {
    const places = parsePlaces({ results: [
      { name: 'Springfield', admin1: 'Ohio', admin2: 'Clark', country_code: 'US', latitude: 39.92, longitude: -83.81 },
      { name: 'Springfield', admin1: 'Ohio', admin2: 'Summit', country_code: 'US', latitude: 41.0, longitude: -81.5 },
    ] });
    expect(places.map((p) => p.longLabel)).toEqual(['Springfield, Ohio (Clark)', 'Springfield, Ohio (Summit)']);
  });

  it('skips the request for one-letter queries', async () => {
    let calls = 0;
    await expect(searchPlaces('A', async () => { calls++; })).resolves.toEqual([]);
    expect(calls).toBe(0);
  });

  it('reports a network failure as offline and keeps the query (the screen owns the text)', async () => {
    const error = await searchPlaces('Austin', async () => { throw new TypeError('Failed to fetch'); }).catch((e) => e);
    expect(error).toBeInstanceOf(PlaceError);
    expect(error.offline).toBe(true);
  });

  it('has a code for all 50 states and DC', () => {
    const codes = Object.values(US_STATES);
    expect(codes.length).toBeGreaterThanOrEqual(51);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('device location (R3)', () => {
  it('sends one Nominatim reverse lookup with coordinates rounded to 2 decimals', async () => {
    const urls = [];
    const fake = async (url) => {
      urls.push(url);
      return { ok: true, json: async () => fixture('reverse-austin') };
    };
    const result = await reverseLookup({ latitude: 30.26715, longitude: -97.74306 }, fake);
    expect(urls).toHaveLength(1);
    const url = new URL(urls[0]);
    expect(url.origin).toBe('https://nominatim.openstreetmap.org');
    expect(url.searchParams.get('lat')).toBe('30.27');
    expect(url.searchParams.get('lon')).toBe('-97.74');
    expect(result).toMatchObject({ inUS: true, place: { label: 'Austin, TX', latitude: 30.27, longitude: -97.74 } });
  });

  it('a position in Toronto, Canada is outside the US', () => {
    expect(parseReverse(fixture('reverse-toronto'), { latitude: 43.65, longitude: -79.38 })).toEqual({ inUS: false });
  });

  it('builds the request URL with jsonv2 and English names', () => {
    const url = new URL(reverseUrl({ latitude: 43.6532, longitude: -79.3832 }));
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('accept-language')).toBe('en');
    expect(url.searchParams.get('lat')).toBe('43.65');
  });

  it('reports a failed lookup so the screen can offer Retry', async () => {
    await expect(reverseLookup({ latitude: 30, longitude: -97 }, async () => ({ ok: false, status: 503 }))).rejects.toBeInstanceOf(LookupError);
  });
});

describe('saved location (R4)', () => {
  const austin = { name: 'Austin', label: 'Austin, TX', longLabel: 'Austin, Texas', latitude: 30.26715, longitude: -97.74306 };
  const seattle = { name: 'Seattle', label: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 };

  it('saves one location with rounded coordinates and restores it', () => {
    const storage = memoryStorage();
    saveLocation(storage, austin);
    expect(loadLocation(storage)).toEqual({ name: 'Austin', label: 'Austin, TX', longLabel: 'Austin, Texas', latitude: 30.27, longitude: -97.74 });
  });

  it('choosing another location replaces it: exactly one location entry', () => {
    const storage = memoryStorage();
    saveLocation(storage, austin);
    saveLocation(storage, seattle);
    expect(loadLocation(storage).label).toBe('Seattle, WA');
    expect(storage.size).toBe(1);
  });

  it('changing location clears the saved picks (R14); re-choosing the same place keeps them', () => {
    const storage = memoryStorage();
    saveLocation(storage, austin);
    savePicks(storage, loadLocation(storage), '2026-10-12', { summary: 1 });
    saveLocation(storage, austin);
    expect(storage.getItem(PICKS_KEY)).not.toBeNull();
    saveLocation(storage, seattle);
    expect(storage.getItem(PICKS_KEY)).toBeNull();
    expect(loadPicks(storage, loadLocation(storage), '2026-10-12')).toEqual({});
  });

  it('ignores damaged saved data', () => {
    const storage = memoryStorage();
    storage.setItem(LOCATION_KEY, '{not json');
    expect(loadLocation(storage)).toBeNull();
    storage.setItem(LOCATION_KEY, JSON.stringify({ label: 'X' }));
    expect(loadLocation(storage)).toBeNull();
  });
});
