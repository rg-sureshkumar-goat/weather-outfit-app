// The device's localStorage, or an in-memory stand-in when the browser
// refuses storage (for example some private-browsing modes), so the app
// still works for the current visit instead of failing.

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

// Every key the app saves starts with this, so "Delete all my data" (R35)
// finds all of it: location, avatar, saved picks and, from C7, the closet.
export const APP_PREFIX = 'quickDresser.';

// Removes everything the app saved on this device and nothing else.
export function clearAppData(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(APP_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
  return keys;
}

export function deviceStorage() {
  try {
    const probe = 'quickDresser.probe';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return memoryStorage();
  }
}
