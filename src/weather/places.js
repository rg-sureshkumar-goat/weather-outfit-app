// Location by search (R2): Open-Meteo geocoding, limited to the US.

import { stateCode } from '../content/usStates.js';
import { roundCoord } from './openMeteo.js';

export const GEOCODE_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export class PlaceError extends Error {
  constructor(message, { cause, offline = false } = {}) {
    super(message, { cause });
    this.name = 'PlaceError';
    this.offline = offline;
  }
}

export const isZip = (query) => /^\d{5}$/.test(query.trim());

export function placesUrl(query) {
  const params = new URLSearchParams({
    name: query.trim(),
    count: '10',
    language: 'en',
    format: 'json',
    countryCode: 'US',
  });
  return `${GEOCODE_ENDPOINT}?${params}`;
}

// Letters and digits only, lower case, without accents, for comparing names
// ("St. Louis" matches "st louis").
const plain = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Matches as places the app can save: name, state, label and coordinates
// rounded to 2 decimals (R3, R34). When two matches would read the same,
// the county tells them apart. For a city search, only places whose name
// contains the typed text are kept; Open-Meteo also returns towns matched
// on an alternate name (Ardmore for "Austin"), which look unrelated
// (Developer's decision, 2026-10-11). ZIP searches skip that filter.
export function parsePlaces(json, query = '') {
  const typed = isZip(query) ? '' : plain(query);
  const places = (json.results || [])
    // US cities and towns only: GeoNames feature codes starting "PPL" are
    // populated places; dams, parks and the like are left out.
    .filter((r) => r.country_code === 'US' && (!r.feature_code || r.feature_code.startsWith('PPL')))
    .filter((r) => !typed || plain(r.name).includes(typed))
    .map((r) => ({
      name: r.name,
      state: r.admin1 ?? '',
      county: r.admin2 ?? '',
      label: `${r.name}, ${stateCode(r.admin1)}`,
      longLabel: r.admin1 ? `${r.name}, ${r.admin1}` : r.name,
      latitude: roundCoord(r.latitude),
      longitude: roundCoord(r.longitude),
    }));
  const counts = places.reduce((m, p) => m.set(p.longLabel, (m.get(p.longLabel) || 0) + 1), new Map());
  return places.map((p) => (counts.get(p.longLabel) > 1 && p.county ? { ...p, longLabel: `${p.longLabel} (${p.county})` } : p));
}

// Searches for a city or ZIP. Queries shorter than 2 characters return no
// matches without a request.
export async function searchPlaces(query, fetchImpl = globalThis.fetch) {
  if (query.trim().length < 2) return [];
  let response;
  try {
    response = await fetchImpl(placesUrl(query));
  } catch (cause) {
    throw new PlaceError("Couldn't reach the place search.", { cause, offline: true });
  }
  if (!response.ok) throw new PlaceError(`The place search returned an error (${response.status}).`);
  return parsePlaces(await response.json(), query);
}
