// The one saved location (R4): name and rounded coordinates, on this device
// only. Choosing a different location replaces it and clears the saved
// picks, which belong to the old location (R14).

import { clearPicks } from './picks.js';
import { roundCoord } from '../weather/openMeteo.js';

export const LOCATION_KEY = 'quickDresser.location';

export function loadLocation(storage) {
  try {
    const p = JSON.parse(storage.getItem(LOCATION_KEY));
    if (!p || typeof p.label !== 'string' || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return null;
    return p;
  } catch {
    return null;
  }
}

const samePlace = (a, b) => a && b && a.latitude === b.latitude && a.longitude === b.longitude;

export function saveLocation(storage, place) {
  const next = {
    name: place.name,
    label: place.label,
    longLabel: place.longLabel ?? place.label,
    latitude: roundCoord(place.latitude),
    longitude: roundCoord(place.longitude),
  };
  const previous = loadLocation(storage);
  storage.setItem(LOCATION_KEY, JSON.stringify(next));
  if (previous && !samePlace(previous, next)) clearPicks(storage);
  return next;
}
