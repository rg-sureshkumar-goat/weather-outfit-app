// Saved picks on this device (R14, R34). One entry holds the current
// location's key and its picks by date: item IDs and wording numbers only.
// `storage` is localStorage in the app and a stand-in in tests.

export const PICKS_KEY = 'quickDresser.picks';

// Locations are identified by their rounded coordinates (R4).
export const locationKey = ({ latitude, longitude }) => `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

function read(storage) {
  try {
    return JSON.parse(storage.getItem(PICKS_KEY)) || null;
  } catch {
    return null;
  }
}

// Picks for this location, without dates that have passed. `today` is the
// location's own date (YYYY-MM-DD). Picks saved for another location are
// cleared (R14).
export function loadPicks(storage, location, today) {
  const stored = read(storage);
  if (!stored) return {};
  if (stored.location !== locationKey(location)) {
    storage.removeItem(PICKS_KEY);
    return {};
  }
  const byDate = Object.fromEntries(Object.entries(stored.byDate || {}).filter(([date]) => date >= today));
  if (Object.keys(byDate).length !== Object.keys(stored.byDate || {}).length) {
    storage.setItem(PICKS_KEY, JSON.stringify({ location: stored.location, byDate }));
  }
  return byDate;
}

export function savePicks(storage, location, date, picks) {
  const key = locationKey(location);
  const stored = read(storage);
  const byDate = stored && stored.location === key ? stored.byDate : {};
  storage.setItem(PICKS_KEY, JSON.stringify({ location: key, byDate: { ...byDate, [date]: picks } }));
}

export function clearPicks(storage) {
  storage.removeItem(PICKS_KEY);
}
