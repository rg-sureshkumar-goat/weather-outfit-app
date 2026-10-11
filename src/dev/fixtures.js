// Dev only: the ?fixture=<name> switch loads a saved Open-Meteo response
// from tests/fixtures instead of the live forecast, so screens can be
// checked against fixed weather (plan.md, Testing). Imported only behind
// import.meta.env.DEV, so the deployed build never contains it.

import { parseForecast } from '../weather/openMeteo.js';

const files = import.meta.glob('../../tests/fixtures/*.json', { import: 'default' });

export const fixtureNames = () =>
  Object.keys(files).map((p) => p.split('/').pop().replace('.json', '')).filter((n) => !n.startsWith('geocode-') && !n.startsWith('reverse-'));

export async function loadFixture(name) {
  const load = files[`../../tests/fixtures/${name}.json`];
  if (!load) throw new Error(`No fixture "${name}". Try one of: ${fixtureNames().join(', ')}`);
  return parseForecast(await load());
}
