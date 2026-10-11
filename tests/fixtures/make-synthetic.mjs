// Builds the synthetic fixtures used by tests and by the dev-only ?fixture=
// switch (plan.md, Testing), from the real Austin response so every field
// keeps Open-Meteo's shape. Run once with:
//   node tests/fixtures/make-synthetic.mjs
// Each fixture changes only what its name says.

import { readFileSync, writeFileSync } from 'node:fs';

const here = (name) => new URL(`./${name}`, import.meta.url);
const base = JSON.parse(readFileSync(here('austin-tx.json'), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(base));
const inWindow = (time, day) => time.startsWith(day) && Number(time.slice(11, 13)) >= 9 && Number(time.slice(11, 13)) <= 21;
const today = base.daily.time[0];

function edit(name, change) {
  const json = clone();
  change(json);
  writeFileSync(here(`${name}.json`), `${JSON.stringify(json, null, 1)}\n`);
  console.log('wrote', name);
}

// Rain likely with strong gusts today: "Wind and rain", the rain jacket.
edit('synthetic-rain-wind', (j) => {
  j.hourly.time.forEach((t, i) => {
    if (!inWindow(t, today)) return;
    j.hourly.precipitation_probability[i] = 70;
    j.hourly.wind_gusts_10m[i] = 32;
    // Feels 58° in the morning, up to 64° mid-afternoon.
    const hour = Number(t.slice(11, 13));
    j.hourly.apparent_temperature[i] = 64 - Math.abs(hour - 15);
    j.hourly.temperature_2m[i] = 66 - Math.abs(hour - 15);
  });
  // A Chilly day throughout, so the header and strip agree with the window.
  j.daily.temperature_2m_max[0] = 66;
  j.daily.temperature_2m_min[0] = 58;
  j.daily.weather_code[0] = 63;
  j.current.temperature_2m = 63;
  j.current.apparent_temperature = 61;
  j.current.weather_code = 63;
});

// A freezing day with snow: boots, the Snow reminder.
edit('synthetic-snow', (j) => {
  j.hourly.time.forEach((t, i) => {
    if (!t.startsWith(today)) return;
    j.hourly.apparent_temperature[i] = 24;
    j.hourly.temperature_2m[i] = 30;
    j.hourly.snowfall[i] = inWindow(t, today) ? 0.08 : 0;
    j.hourly.uv_index[i] = 1;
  });
  j.daily.temperature_2m_max[0] = 31;
  j.daily.temperature_2m_min[0] = 22;
  j.daily.weather_code[0] = 73;
  j.current.temperature_2m = 29;
  j.current.apparent_temperature = 23;
  j.current.weather_code = 73;
});

// No UV values at all this week: no sunscreen reminder, plus the note (R29).
edit('synthetic-missing-uv', (j) => {
  j.hourly.uv_index = j.hourly.uv_index.map(() => null);
});

// Only six days come back: the seventh is disabled (R29).
edit('synthetic-missing-day', (j) => {
  const cut = j.daily.time.length - 1;
  Object.keys(j.daily).forEach((k) => j.daily[k].splice(cut));
  const lastDay = base.daily.time[cut];
  const keep = j.hourly.time.findIndex((t) => t.startsWith(lastDay));
  Object.keys(j.hourly).forEach((k) => j.hourly[k].splice(keep));
});
