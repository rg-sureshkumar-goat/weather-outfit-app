// Info (P6, L6): creator, data sources, how outfits are picked, privacy,
// credits (R27, R34, R36) and "Delete all my data" (R35). The band and
// reminder numbers come from the same constants the rules use, so the text
// can't drift from what the app does.
//
// showInfo(root, { storage, location, onTab, onChangeLocation, onBack, onDeleted })

import { BANDS } from '../content/garments.js';
import { THRESHOLDS } from '../recommend/rules.js';
import { clearAppData } from '../store/storage.js';
import { ICONS } from './icons.js';
import { esc, tabs, topBar, bindChrome } from './chrome.js';

// A link that opens its source in a new tab, saying so to screen readers.
const link = (href, text) =>
  `<a href="${href}" target="_blank" rel="noopener">${esc(text)}<span class="sr-only"> (opens in a new tab)</span></a>`;

const SOURCES = {
  openMeteo: 'https://open-meteo.com/',
  openMeteoTerms: 'https://open-meteo.com/en/terms',
  geocoding: 'https://open-meteo.com/en/docs/geocoding-api',
  geonames: 'https://www.geonames.org/',
  osmCopyright: 'https://www.openstreetmap.org/copyright',
  osmfPrivacy: 'https://osmfoundation.org/wiki/Privacy_Policy',
  ghPages: 'https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages',
  ccBy: 'https://creativecommons.org/licenses/by/4.0/',
  apache: 'https://www.apache.org/licenses/LICENSE-2.0',
  mediapipe: 'https://ai.google.dev/edge/mediapipe/solutions/guide',
  monk: 'https://skintone.google/',
  nunito: 'https://github.com/googlefonts/nunito',
  ofl: 'https://openfontlicense.org/',
  nwsHeat: 'https://www.weather.gov/ama/heatindex',
  nwsWinter: 'https://www.weather.gov/wrn/winter-sm',
  nwsRain: 'https://www.weather.gov/ppg/forecast_terms',
  nwsWind: 'https://www.weather.gov/mfl/beaufort',
  epaUv: 'https://www.epa.gov/sunsafety/uv-index-scale-0',
  // The record page; the PDF link itself is refused outside a download.
  cdcHeat: 'https://stacks.cdc.gov/view/cdc/152760',
};

const SECTIONS = [
  ['about', 'About'],
  ['weather', 'Weather and places'],
  ['picking', 'How outfits are picked'],
  ['privacy', 'Privacy'],
  ['credits', 'Credits'],
  ['data', 'Your data'],
];

// "Hot · 85°F or more", "Warm · 70–84°F" … from the band minimums.
function bandRows() {
  return BANDS.map((b, i) => {
    const above = BANDS[i - 1];
    let range;
    if (!above) range = `${b.min}°F or more`;
    else if (b.min === -Infinity) range = `below ${above.min}°F`;
    else range = `${b.min}–${above.min - 1}°F`;
    return `<li><b>${b.label}</b><span>${range}</span></li>`;
  }).join('');
}

function content() {
  const t = THRESHOLDS;
  return `
    <section id="info-about" aria-labelledby="h-about">
      <h2 id="h-about">About</h2>
      <p>Made by <b>RG Sureshkumar</b>.</p>
      <p>Quick Dresser suggests what to wear each day from the forecast, using your own clothes and a set of starter outfits.</p>
    </section>

    <section id="info-weather" aria-labelledby="h-weather">
      <h2 id="h-weather">Weather and places</h2>
      <p><b>Weather:</b> ${link(SOURCES.openMeteo, 'Open-Meteo.com')}, licensed ${link(SOURCES.ccBy, 'CC BY 4.0')}. Current conditions and a 7-day forecast from national weather models, including NOAA's for the US. The icon and word for each day are Open-Meteo's own weather codes.</p>
      <p><b>City and ZIP search:</b> Open-Meteo's ${link(SOURCES.geocoding, 'place search')}, with location data from ${link(SOURCES.geonames, 'GeoNames')} (${link(SOURCES.ccBy, 'CC BY 4.0')}).</p>
      <p><b>"Use my location":</b> the place name comes from OpenStreetMap's Nominatim. ${link(SOURCES.osmCopyright, '© OpenStreetMap contributors')}, ODbL.</p>
    </section>

    <section id="info-picking" aria-labelledby="h-picking">
      <h2 id="h-picking">How outfits are picked</h2>
      <p>The app looks at every hour from 9 am to 9 pm and uses the warmest feels-like temperature to pick a band:</p>
      <ul class="bands">${bandRows()}</ul>
      <p class="muted">No official source sets clothing bands, so these cut-offs are this app's own. The layering advice for colder bands follows the ${link(SOURCES.nwsWinter, 'National Weather Service')}.</p>
      <p>Reminders are added when the forecast calls for them:</p>
      <ul class="rules">
        <li><b>Umbrella</b> when the chance of rain reaches ${t.rain}% (the NWS calls 30–50% a "chance" of rain: ${link(SOURCES.nwsRain, 'forecast terms')}).</li>
        <li><b>Sunscreen</b> at UV index ${t.uv} or more, when the ${link(SOURCES.epaUv, 'EPA')} advises sun protection.</li>
        <li><b>Water</b> when it feels like ${t.water}°F or more, with a stronger reminder from ${t.waterStrong}°F, following the ${link(SOURCES.nwsHeat, 'NWS heat index')} and ${link(SOURCES.cdcHeat, 'CDC heat advice')}.</li>
        <li><b>Layer for later</b> when the coldest hour feels below ${t.layerBelow}°F and falls in a colder band than the warmest hour.</li>
        <li><b>Wind</b> when gusts reach ${t.gust} mph, where umbrellas become hard to use (${link(SOURCES.nwsWind, 'NWS Beaufort scale')}). With rain too, the reminder becomes "Wind and rain" and suggests a hooded rain jacket instead of an umbrella.</li>
        <li><b>Snow</b> whenever any snow is forecast, with boots when you have them.</li>
      </ul>
    </section>

    <section id="info-privacy" aria-labelledby="h-privacy">
      <h2 id="h-privacy">Privacy</h2>
      <p><b>Saved only on this device:</b> your location, your avatar choices (including Female or Male), your closet items and the outfits picked for each day. There are no accounts, cookies, analytics or ads.</p>
      <p><b>Photos:</b> your selfie is read on this device and never kept, and photos of your clothes stay on this device. Neither is ever uploaded.</p>
      <p><b>Sent off this device:</b></p>
      <ul class="rules">
        <li>Your location's coordinates, rounded to about 1 km, go to Open-Meteo for the forecast, and what you type in the city or ZIP search goes to Open-Meteo's place search. Open-Meteo ${link(SOURCES.openMeteoTerms, 'deletes its logs after 90 days')}.</li>
        <li>Each tap of "Use my location" sends one lookup with rounded coordinates to OpenStreetMap's Nominatim, to name the place. OpenStreetMap logs each lookup with your IP address under the ${link(SOURCES.osmfPrivacy, 'OSMF privacy policy')}, which doesn't say how long those logs are kept.</li>
        <li>The app is hosted on GitHub Pages, which ${link(SOURCES.ghPages, "logs each visitor's IP address for security")}.</li>
      </ul>
    </section>

    <section id="info-credits" aria-labelledby="h-credits">
      <h2 id="h-credits">Credits</h2>
      <ul class="rules">
        <li>Weather data by ${link(SOURCES.openMeteo, 'Open-Meteo.com')}, ${link(SOURCES.ccBy, 'CC BY 4.0')}.</li>
        <li>Place data for search by ${link(SOURCES.geonames, 'GeoNames')}, ${link(SOURCES.ccBy, 'CC BY 4.0')}.</li>
        <li>Place names for your location: ${link(SOURCES.osmCopyright, '© OpenStreetMap contributors')}, ODbL.</li>
        <li>${link(SOURCES.mediapipe, 'Google MediaPipe')} runtime and models, ${link(SOURCES.apache, 'Apache 2.0')}, hosted with the app.</li>
        <li>${link(SOURCES.monk, 'Monk Skin Tone Scale')} by Ellis Monk, ${link(SOURCES.ccBy, 'CC BY 4.0')}.</li>
        <li>${link(SOURCES.nunito, 'Nunito')} font by Vernon Adams and others, ${link(SOURCES.ofl, 'SIL Open Font License 1.1')}.</li>
        <li>The character, clothing, icons and backdrops are original artwork created for this project.</li>
      </ul>
    </section>

    <section id="info-data" aria-labelledby="h-data">
      <h2 id="h-data">Your data</h2>
      <p><b>One device at a time:</b> your closet, avatar and location stay on the device that saved them. Your phone and your laptop each keep their own, and so do Safari and the Home Screen app on the same phone.</p>
      <p>"Delete all my data" removes your location, avatar, closet (with its photos) and saved outfits from this device, then starts setup again.</p>
      <div data-delete-area>
        <button type="button" class="btn btn-danger" data-delete>${ICONS.trash}<span>Delete all my data</span></button>
      </div>
    </section>`;
}

export function showInfo(root, { storage, location, onTab, onChangeLocation, onBack, onDeleted }) {
  root.innerHTML = `
    <div class="info-page">
      ${topBar(location, null)}
      <div class="info-back"><button type="button" class="btn-back" data-back>${ICONS.back}<span>Today</span></button></div>
      <main class="info-layout">
        <nav class="info-nav" aria-label="On this page">
          <ul>${SECTIONS.map(([id, label]) => `<li><a href="#info-${id}">${label}</a></li>`).join('')}</ul>
        </nav>
        <article class="info-content">
          <h1 tabindex="-1">About Quick Dresser</h1>
          ${content()}
        </article>
      </main>
      <div class="bottom-dock">${tabs('bottom', null)}</div>
    </div>`;

  bindChrome(root, { onTab, onChangeLocation, onInfo: () => {} });
  // The info button shows this page is open (L6).
  root.querySelectorAll('[data-info]').forEach((b) => b.setAttribute('aria-current', 'page'));
  root.querySelector('[data-back]').addEventListener('click', onBack);

  // Section links scroll within the page without changing the address.
  root.querySelectorAll('.info-nav a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = root.querySelector(a.getAttribute('href'));
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target.querySelector('h2').setAttribute('tabindex', '-1');
    target.querySelector('h2').focus({ preventScroll: true });
  }));

  // Delete asks in the page first (R35); Cancel changes nothing.
  const area = root.querySelector('[data-delete-area]');
  function showDeleteButton() {
    area.innerHTML = `<button type="button" class="btn btn-danger" data-delete>${ICONS.trash}<span>Delete all my data</span></button>`;
    area.querySelector('[data-delete]').addEventListener('click', confirmDelete);
  }
  function confirmDelete() {
    area.innerHTML = `
      <div class="confirm card" role="group" aria-labelledby="confirm-title">
        <p id="confirm-title" class="confirm-title">Delete everything on this device?</p>
        <p>Your location, avatar, closet (with its photos) and saved outfits will be removed from this device. This can't be undone.</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-outline" data-cancel>Cancel</button>
          <button type="button" class="btn btn-danger" data-confirm>${ICONS.trash}<span>Delete</span></button>
        </div>
      </div>`;
    area.querySelector('[data-cancel]').addEventListener('click', () => {
      showDeleteButton();
      area.querySelector('[data-delete]').focus();
    });
    area.querySelector('[data-confirm]').addEventListener('click', () => {
      clearAppData(storage);
      onDeleted();
    });
    area.querySelector('[data-cancel]').focus();
  }
  root.querySelector('[data-delete]').addEventListener('click', confirmDelete);

  root.querySelector('h1').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
