// Location by device (R3): one OpenStreetMap Nominatim reverse lookup per
// tap gives the place name and whether it's in the US. Called only when the
// User taps "Use my location" (or Retry after a failed lookup); there are
// no background or repeated lookups (Nominatim usage policy). Browsers send
// the page as the Referer, which identifies the app to Nominatim.

import { stateCode } from '../content/usStates.js';
import { roundCoord } from './openMeteo.js';

export const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

export class LookupError extends Error {
  constructor(message, { cause, offline = false } = {}) {
    super(message, { cause });
    this.name = 'LookupError';
    this.offline = offline;
  }
}

export function reverseUrl({ latitude, longitude }) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(roundCoord(latitude)),
    lon: String(roundCoord(longitude)),
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'en',
  });
  return `${REVERSE_ENDPOINT}?${params}`;
}

// { inUS: true, place } for a US position, { inUS: false } otherwise.
export function parseReverse(json, { latitude, longitude }) {
  const a = json.address || {};
  if (a.country_code !== 'us') return { inUS: false };
  const name = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || json.name || 'Your location';
  const iso = a['ISO3166-2-lvl4'] || '';
  const code = iso.startsWith('US-') ? iso.slice(3) : stateCode(a.state);
  return {
    inUS: true,
    place: {
      name,
      state: a.state ?? '',
      label: code ? `${name}, ${code}` : name,
      longLabel: a.state ? `${name}, ${a.state}` : name,
      latitude: roundCoord(latitude),
      longitude: roundCoord(longitude),
    },
  };
}

// Coordinates are rounded before they're sent (R3, R34).
export async function reverseLookup(coords, fetchImpl = globalThis.fetch) {
  const rounded = { latitude: roundCoord(coords.latitude), longitude: roundCoord(coords.longitude) };
  let response;
  try {
    response = await fetchImpl(reverseUrl(rounded));
  } catch (cause) {
    throw new LookupError("Couldn't reach OpenStreetMap to name your location.", { cause, offline: true });
  }
  if (!response.ok) throw new LookupError(`OpenStreetMap returned an error (${response.status}).`);
  return parseReverse(await response.json(), rounded);
}
