// Saves real Open-Meteo responses for six US places as test fixtures, using
// the app's own request (forecastUrl), so the fixtures always hold exactly
// the fields the app asks for. Run when the request changes, then rebuild
// the synthetic fixtures:
//   node tests/fixtures/save-forecasts.mjs
//   node tests/fixtures/make-synthetic.mjs

import { writeFileSync } from 'node:fs';
import { forecastUrl } from '../../src/weather/openMeteo.js';

// Hot, wet, mild, cold, very cold and tropical places across US time zones.
const PLACES = {
  'austin-tx': { latitude: 30.27, longitude: -97.74 },
  'seattle-wa': { latitude: 47.61, longitude: -122.33 },
  'chicago-il': { latitude: 41.88, longitude: -87.63 },
  'minneapolis-mn': { latitude: 44.98, longitude: -93.27 },
  'anchorage-ak': { latitude: 61.22, longitude: -149.9 },
  'honolulu-hi': { latitude: 21.31, longitude: -157.86 },
};

for (const [name, place] of Object.entries(PLACES)) {
  const response = await fetch(forecastUrl(place));
  if (!response.ok) throw new Error(`${name}: Open-Meteo returned ${response.status}`);
  const json = await response.json();
  writeFileSync(new URL(`./${name}.json`, import.meta.url), `${JSON.stringify(json, null, 1)}\n`);
  console.log('saved', name, json.current.time, json.timezone);
}
