// App shell: picks the screen, keeps one forecast per location per visit
// (plan.md, usage limits), and wires the location dialog.
//
// First run follows R22: avatar setup (female or male, selfie step, review),
// then location, then Today. The closet (C7) lives in IndexedDB on this
// device; the shell loads it once and again after every change, and hands
// Today the items as the outfit rules see them.
import '@fontsource-variable/nunito';
import './styles.css';
import { deviceStorage } from './store/storage.js';
import { loadLocation } from './store/location.js';
import { locationKey } from './store/picks.js';
import { fetchForecast } from './weather/openMeteo.js';
import { showLocation } from './screens/location.js';
import { showToday } from './screens/today.js';
import { showSetup } from './screens/setup.js';
import { showInfo } from './screens/info.js';
import { loadAvatar } from './store/avatar.js';
import { createCloset, outfitItem } from './store/closet.js';
import { photoLook } from './vision/pattern.js';
import { showCloset } from './screens/closet.js';
import { showAdd } from './screens/add.js';

const app = document.querySelector('#app');
const storage = deviceStorage();

// Dev only: ?fixture=<name> shows saved weather (plan.md, Testing).
const testWeather = import.meta.env.DEV ? new URLSearchParams(location.search).get('fixture') : null;

const cache = new Map();
async function getForecast(place, { refresh = false } = {}) {
  const key = testWeather ? `fixture:${testWeather}` : locationKey(place);
  if (!refresh && cache.has(key)) return cache.get(key);
  let forecast;
  if (import.meta.env.DEV && testWeather) {
    const { loadFixture } = await import('./dev/fixtures.js');
    forecast = await loadFixture(testWeather);
  } else {
    forecast = await fetchForecast(place);
  }
  const entry = { forecast, fetchedAt: new Date() };
  cache.set(key, entry);
  return entry;
}

// ---- The closet (R18) -------------------------------------------------------------

const closet = createCloset();
let closetItems = [];
// One object URL per item photo, freed when the item goes.
const photoUrls = new Map();

function photoUrl(item) {
  const cached = photoUrls.get(item.id);
  if (cached?.photo === item.photo) return cached.url;
  if (cached) URL.revokeObjectURL(cached.url);
  const url = item.photo ? URL.createObjectURL(item.photo) : '';
  photoUrls.set(item.id, { photo: item.photo, url });
  return url;
}

// Each cut-out closet item as photographed on the avatar (R44), made once
// from its cut-out and kept while the photo stays the same.
const looks = new Map(); // item id -> { key, look }

async function refreshLooks() {
  let changed = false;
  for (const item of closetItems) {
    // Only items shown as their photo need one (R44).
    if (!item.cutout || !item.photo || item.show === 'drawn') continue;
    const key = item.photo.size;
    if (looks.get(item.id)?.key === key) continue;
    try {
      looks.set(item.id, { key, look: await photoLook(item.photo) });
      changed = true;
    } catch {
      // Drawn in its colors instead.
    }
  }
  for (const id of looks.keys()) {
    if (!closetItems.some((i) => i.id === id)) looks.delete(id);
  }
  return changed;
}

const photosNow = () => Object.fromEntries([...looks].map(([id, { look }]) => [id, look]));

async function refreshCloset() {
  closetItems = await closet.list();
  const ids = new Set(closetItems.map((i) => i.id));
  for (const [id, { url }] of photoUrls) {
    if (!ids.has(id)) {
      URL.revokeObjectURL(url);
      photoUrls.delete(id);
    }
  }
}

// The location dialog over the current screen (P2 as a dialog, L2). Picking
// a place redraws the screen for it; focus returns to the pill on screen.
function changeLocation() {
  const holder = document.createElement('div');
  app.append(holder);
  const focusPill = () => [...app.querySelectorAll('[data-location]')].find((b) => b.offsetParent !== null)?.focus();
  showLocation(holder, {
    storage,
    onChosen: () => {
      holder.remove();
      go(screen);
      focusPill();
    },
    onClose: () => {
      holder.remove();
      focusPill();
    },
  });
}

let screen = 'today';
// A screen that holds something open (the camera) returns a function that
// lets it go before the next screen shows.
let teardown = null;

function go(name, opts = {}) {
  teardown?.();
  teardown = null;
  screen = name;
  const avatar = loadAvatar(storage);
  if (!avatar) {
    screen = 'setup';
    showSetup(app, { storage, onDone: () => go('today') });
    return;
  }
  const place = loadLocation(storage);
  if (!place) {
    showLocation(app, { storage, onChosen: () => go('today') });
    return;
  }
  const chrome = { location: place, onTab: (tab) => go(tab), onChangeLocation: changeLocation, onInfo: () => go('info') };
  if (name === 'closet') {
    return showCloset(app, {
      ...chrome,
      items: closetItems,
      photoUrl,
      photos: photosNow(),
      selectedId: opts.selectedId,
      onAdd: () => go('add'),
      onEdit: (item) => go('edit-item', { item }),
      onEditAvatar: () => go('edit-avatar'),
      // Deleting re-picks only the slots that used it, on its next showing
      // (R14, R20).
      onDelete: async (item) => {
        await closet.remove(item.id);
        await refreshCloset();
        await refreshLooks();
        go('closet');
      },
    });
  }
  if (name === 'add' || name === 'edit-item') {
    const existing = name === 'edit-item' ? opts.item : null;
    teardown = showAdd(app, {
      ...chrome,
      avatar,
      existing,
      photoUrl,
      onSave: (values) => (existing ? closet.update(existing.id, values) : closet.add(values)),
      onDone: async (item) => {
        await refreshCloset();
        await refreshLooks();
        go('closet', { selectedId: item.id });
      },
      onCancel: () => go('closet', { selectedId: existing?.id }),
    });
    return;
  }
  if (name === 'edit-avatar') {
    return showSetup(app, {
      storage,
      edit: avatar,
      onDone: () => go('closet'),
      onCancel: () => go('closet'),
    });
  }
  if (name === 'info') {
    return showInfo(app, {
      storage,
      location: place,
      onTab: (tab) => go(tab),
      onChangeLocation: changeLocation,
      onBack: () => go('today'),
      // Everything saved is gone (R35): forget this visit's forecasts too,
      // and start first setup again.
      onDeleted: async () => {
        await closet.clear();
        await refreshCloset();
        await refreshLooks();
        cache.clear();
        go('today');
      },
    });
  }

  showToday(app, {
    storage,
    location: place,
    avatar,
    testWeather,
    getForecast: (opts) => getForecast(place, opts),
    onTab: (tab) => go(tab),
    onInfo: () => go('info'),
    onChangeLocation: changeLocation,
    closet: closetItems.map(outfitItem),
    // Read at each drawing, so photos made after Today opened show (R44).
    photos: photosNow,
    // "Wearing" shows the User's cut-outs or photos and opens the item (P5).
    photoFor: (id) => {
      const item = closetItems.find((i) => i.id === id);
      return item ? { url: photoUrl(item), cutout: Boolean(item.cutout) } : null;
    },
    onOpenItem: (id) => go('closet', { selectedId: id }),
  });
}

// Coming back to the app after 30 minutes or more fetches fresh weather.
let hiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (screen === 'today' && hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000) app.refreshToday?.();
});

// The closet loads before the first screen, so Today starts with it. The
// items' photo looks are made next; Today redraws once they're ready (R44).
refreshCloset().catch(() => {}).finally(() => {
  go('today');
  refreshLooks().then((changed) => {
    if (changed && screen === 'today') app.redrawToday?.();
  }).catch(() => {});
});
