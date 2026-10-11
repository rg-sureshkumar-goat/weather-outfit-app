// App shell. Until Today arrives in C4, a saved location leads to a simple
// home page whose location pill reopens the location card. First setup
// (C5) will put the female-or-male step and the avatar before location.
import '@fontsource-variable/nunito';
import './styles.css';
import { deviceStorage } from './store/storage.js';
import { loadLocation } from './store/location.js';
import { showLocation } from './screens/location.js';
import { ICONS } from './screens/icons.js';

const app = document.querySelector('#app');
const storage = deviceStorage();

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function showHome() {
  const location = loadLocation(storage);
  if (!location) {
    showLocation(app, { storage, onChosen: showHome });
    return;
  }
  app.innerHTML = `
    <div class="home">
      <header class="home-bar">
        <span class="logo">Quick Dresser</span>
        <button type="button" class="pill" data-location aria-label="Location: ${escapeHtml(location.label)}. Change location">${ICONS.pin}<span>${escapeHtml(location.label)}</span>${ICONS.chevron}</button>
      </header>
      <section class="home-card">
        <h1>You're set for ${escapeHtml(location.longLabel)}.</h1>
        <p>Today's forecast and your outfit come in the next update.</p>
      </section>
      <div id="dialog"></div>
    </div>`;
  const pill = app.querySelector('[data-location]');
  const dialog = app.querySelector('#dialog');
  pill.addEventListener('click', () => {
    showLocation(dialog, {
      storage,
      onChosen: showHome,
      onClose: () => {
        dialog.innerHTML = '';
        pill.focus();
      },
    });
  });
}

showHome();
