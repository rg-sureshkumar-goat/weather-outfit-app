// App shell: picks the screen, keeps one forecast per location per visit
// (plan.md, usage limits), and wires the location dialog.
//
// First run follows R22: avatar setup (female or male, selfie step, review),
// then location, then Today. Until C6 and C7, Info, Closet and Add item show
// "coming soon" pages.
import '@fontsource-variable/nunito';
import './styles.css';
import { deviceStorage } from './store/storage.js';
import { loadLocation } from './store/location.js';
import { locationKey } from './store/picks.js';
import { fetchForecast } from './weather/openMeteo.js';
import { showLocation } from './screens/location.js';
import { showToday } from './screens/today.js';
import { showSetup } from './screens/setup.js';
import { loadAvatar } from './store/avatar.js';
import { ICONS } from './screens/icons.js';

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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function comingSoon(title, text) {
  app.innerHTML = `<div class="soon-page">
    <button type="button" class="btn btn-small" data-back>${ICONS.person}<span>Back to Today</span></button>
    <section class="card"><h1>${esc(title)}</h1><p>${esc(text)}</p></section>
  </div>`;
  app.querySelector('[data-back]').addEventListener('click', () => go('today'));
}

let screen = 'today';
function go(name) {
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
  if (name === 'closet') return comingSoon('Closet', 'Your closet arrives in a later update. Starter items fill every outfit until then.');
  if (name === 'add') return comingSoon('Add item', 'Adding your own clothes by photo arrives in a later update.');
  if (name === 'info') return comingSoon('About Quick Dresser', 'Sources, privacy and credits arrive in a later update. Weather data by Open-Meteo.com (CC BY 4.0).');

  showToday(app, {
    storage,
    location: place,
    avatar,
    testWeather,
    getForecast: (opts) => getForecast(place, opts),
    onTab: (tab) => go(tab),
    onInfo: () => go('info'),
    onChangeLocation: () => {
      const holder = document.createElement('div');
      app.append(holder);
      // Phone and laptop each have a pill; focus returns to the one on screen.
      const focusPill = () => [...app.querySelectorAll('[data-location]')].find((b) => b.offsetParent !== null)?.focus();
      showLocation(holder, {
        storage,
        onChosen: () => {
          holder.remove();
          go('today');
          focusPill();
        },
        onClose: () => {
          holder.remove();
          focusPill();
        },
      });
    },
  });
}

// Coming back to the app after 30 minutes or more fetches fresh weather.
let hiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (screen === 'today' && hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000) app.refreshToday?.();
});

go('today');

