// The User's closet (R18): items kept in the browser's IndexedDB on this
// device only, never uploaded (R34). Each device keeps its own closet
// (Developer's choice, 2026-10-11). An item is
//
//   { id, type,                  // a key of content/garments.js GARMENT_TYPES
//     name,                      // shown in the Closet and on Today
//     colors: { base, print,     // #rrggbb; print may be null
//               more },          // the other colors recognized (R17), up to
//                                // 6 colors in all
//     photo,                     // the cut-out (a PNG with a clear
//                                // background), or the whole photo (JPEG)
//                                // when there was no usable cut-out
//     cutout,                    // true when photo is a cut-out (R16)
//     show,                      // with a cut-out: 'drawn' or 'photo', how
//                                // the avatar shows it (R44)
//     pattern,                   // with a cut-out: its pattern reading
//                                // (vision/reading.js), or null
//     details,                   // a button shirt's { pockets (0–2, or
//                                // absent for the standard drawing), flaps,
//                                // buttons (color or null) }, or null
//     added }                    // ISO date and time
//
// Saving is one write: if storage is full, nothing is half-saved and a
// ClosetFullError says so (R18).

import { GARMENT_TYPES } from '../content/garments.js';
import { MAX_COLORS } from '../vision/colors.js';

export const DB_NAME = 'quickDresser';
const STORE = 'items';
export const NAME_MAX = 60;

export class ClosetFullError extends Error {
  constructor() {
    super('Storage on this device is full.');
    this.name = 'ClosetFullError';
  }
}

const HEX = /^#[0-9a-f]{6}$/i;
const isQuota = (e) => e?.name === 'QuotaExceededError' || e?.code === 22 || /quota/i.test(e?.message ?? '');

// ---- Backends ------------------------------------------------------------------

const done = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

// The device's IndexedDB. Each call is its own transaction, so a write
// either completes or leaves nothing behind.
export function idbBackend(name = DB_NAME) {
  let db = null;
  const open = () => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    return done(req);
  };
  const run = async (mode, fn) => {
    db ??= await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? req.error);
      tx.onabort = () => reject(tx.error ?? req.error);
    });
  };
  return {
    getAll: () => run('readonly', (s) => s.getAll()),
    get: (id) => run('readonly', (s) => s.get(id)),
    put: (item) => run('readwrite', (s) => s.put(item)),
    delete: (id) => run('readwrite', (s) => s.delete(id)),
    // Deletes the whole database ("Delete all my data", R35).
    async destroy() {
      db?.close();
      db = null;
      await done(indexedDB.deleteDatabase(name));
    },
  };
}

// For tests, and for browsers that refuse IndexedDB (some private modes):
// the closet lasts for the visit only.
export function memoryBackend() {
  const map = new Map();
  return {
    getAll: async () => [...map.values()],
    get: async (id) => map.get(id),
    put: async (item) => { map.set(item.id, item); },
    delete: async (id) => { map.delete(id); },
    destroy: async () => { map.clear(); },
  };
}

// IndexedDB when the browser allows it.
export function deviceBackend() {
  try {
    if (globalThis.indexedDB) return idbBackend();
  } catch {
    // Fall through to the visit-only closet.
  }
  return memoryBackend();
}

// ---- The closet ----------------------------------------------------------------

const newId = () => `item-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

// The values a person chose, checked; throws on anything invalid.
export function checkValues({ type, name, colors }) {
  if (!GARMENT_TYPES[type]) throw new Error(`Unknown garment type: ${type}`);
  if (!HEX.test(colors?.base ?? '')) throw new Error('A base color is needed.');
  if (colors.print != null && !HEX.test(colors.print)) throw new Error('The print color is not a color.');
  const more = colors.more ?? [];
  if (!Array.isArray(more) || more.some((c) => !HEX.test(c))) throw new Error('The other colors are not colors.');
  if (1 + (colors.print ? 1 : 0) + more.length > MAX_COLORS) throw new Error(`An item has at most ${MAX_COLORS} colors.`);
  const clean = String(name ?? '').trim().slice(0, NAME_MAX);
  if (!clean) throw new Error('A name is needed.');
  return {
    type,
    name: clean,
    colors: { base: colors.base.toLowerCase(), print: colors.print ? colors.print.toLowerCase() : null, more: more.map((c) => c.toLowerCase()) },
  };
}

// How an item looks on the avatar (R44), checked: `show` and `pattern` only
// with a cut-out; `details` for any item. Throws on anything invalid.
const KINDS = ['solid', 'plaid', 'check', 'stripes', 'other'];
const roleColors = (roles) => roles
  && HEX.test(roles.ground ?? '')
  && [roles.light, roles.accent].every((c) => c == null || HEX.test(c))
  && Array.isArray(roles.extra) && roles.extra.length <= MAX_COLORS && roles.extra.every((c) => HEX.test(c));
export function checkLook({ show, pattern, details }, cutout) {
  const out = { show: null, pattern: null, details: null };
  if (cutout) {
    if (show != null && show !== 'drawn' && show !== 'photo') throw new Error('Show as is Drawn or Photo.');
    out.show = show ?? null;
    if (pattern != null) {
      if (!KINDS.includes(pattern.kind)) throw new Error('The pattern reading is not valid.');
      const woven = ['plaid', 'check', 'stripes'].includes(pattern.kind);
      if (woven && !(pattern.repeat > 0 && pattern.repeat <= 1 && roleColors(pattern.roles) && roleColors(pattern.sources))) throw new Error('The pattern reading is not valid.');
      if (pattern.kind === 'stripes' && pattern.along !== 'down' && pattern.along !== 'across') throw new Error('The pattern reading is not valid.');
      out.pattern = woven
        ? { kind: pattern.kind, ...(pattern.kind === 'stripes' ? { along: pattern.along } : {}), repeat: pattern.repeat, roles: pattern.roles, sources: pattern.sources }
        : { kind: pattern.kind };
    }
  }
  if (details != null) {
    const { pockets, flaps, buttons } = details;
    if (pockets != null && ![0, 1, 2].includes(pockets)) throw new Error('Pockets are none, one or two.');
    if (buttons != null && !HEX.test(buttons)) throw new Error('The button color is not a color.');
    out.details = { ...(pockets != null ? { pockets } : {}), flaps: Boolean(flaps), buttons: buttons ? buttons.toLowerCase() : null };
  }
  return out;
}

const valid = (item) => item && GARMENT_TYPES[item.type] && HEX.test(item.colors?.base ?? '') && item.id;

export function createCloset(backend = deviceBackend()) {
  const write = async (item) => {
    try {
      await backend.put(item);
    } catch (e) {
      throw isQuota(e) ? new ClosetFullError() : e;
    }
    return item;
  };
  return {
    // Every item, newest first; damaged records are skipped.
    async list() {
      const items = (await backend.getAll()).filter(valid);
      return items.sort((a, b) => String(b.added).localeCompare(String(a.added)));
    },
    async add({ photo, cutout, show, pattern, details, ...values }) {
      const hasCutout = Boolean(cutout && photo);
      return write({ id: newId(), ...checkValues(values), photo: photo ?? null, cutout: hasCutout, ...checkLook({ show, pattern, details }, hasCutout), added: new Date().toISOString() });
    },
    // Edit (R20): type, name, colors and how it looks; the photo, cut-out
    // and date stay.
    async update(id, { show, pattern, details, ...values }) {
      const current = await backend.get(id);
      if (!current) throw new Error('That item is no longer in the closet.');
      return write({ ...current, ...checkValues(values), ...checkLook({ show, pattern, details }, current.cutout) });
    },
    remove: (id) => backend.delete(id),
    clear: () => backend.destroy(),
  };
}

// The item as the outfit rules see it (R9): no photo, marked as the User's,
// with how the avatar draws it (R44).
export const outfitItem = ({ id, type, name, colors, show, pattern, details }) => ({ id, type, name, colors, show, pattern, details, source: 'closet' });
