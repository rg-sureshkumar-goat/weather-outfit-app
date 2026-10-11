// The device's localStorage, or an in-memory stand-in when the browser
// refuses storage (for example some private-browsing modes), so the app
// still works for the current visit instead of failing.

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
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
