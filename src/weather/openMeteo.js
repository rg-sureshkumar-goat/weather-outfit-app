// Open-Meteo forecast: one request per location (R1, spec.md Weather inputs).

export const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const HOURLY = ['temperature_2m', 'apparent_temperature', 'precipitation_probability', 'uv_index', 'wind_gusts_10m', 'snowfall', 'weather_code'];
const DAILY = ['temperature_2m_max', 'temperature_2m_min'];
const CURRENT = ['temperature_2m', 'apparent_temperature', 'weather_code'];

// Coordinates are rounded to 2 decimals (about 1 km) before they leave the
// device (R3, R34).
export function roundCoord(value) {
  return Math.round(value * 100) / 100;
}

export function forecastUrl({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(roundCoord(latitude)),
    longitude: String(roundCoord(longitude)),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
    current: CURRENT.join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: '7',
  });
  return `${FORECAST_ENDPOINT}?${params}`;
}

export class ForecastError extends Error {
  constructor(message, { cause, offline = false } = {}) {
    super(message, { cause });
    this.name = 'ForecastError';
    this.offline = offline;
  }
}

// Fetches and parses the forecast. Failures become a ForecastError so the
// screen can say what failed and offer Retry (R30).
export async function fetchForecast(location, fetchImpl = globalThis.fetch) {
  let response;
  try {
    response = await fetchImpl(forecastUrl(location));
  } catch (cause) {
    throw new ForecastError("Couldn't reach Open-Meteo.", { cause, offline: true });
  }
  if (!response.ok) {
    throw new ForecastError(`Open-Meteo returned an error (${response.status}).`);
  }
  return parseForecast(await response.json());
}

// A missing value stays null, so the rules can skip it (R29).
const valueAt = (series, i) => (series && series[i] !== undefined ? series[i] : null);

// Turns Open-Meteo's parallel arrays into days with their hours. Times are
// the location's local time, as Open-Meteo returns them with timezone=auto.
export function parseForecast(json) {
  const { hourly = {}, daily = {}, current = {} } = json;
  const hoursByDate = new Map();
  (hourly.time || []).forEach((time, i) => {
    const date = time.slice(0, 10);
    if (!hoursByDate.has(date)) hoursByDate.set(date, []);
    hoursByDate.get(date).push({
      time,
      hour: Number(time.slice(11, 13)),
      temp: valueAt(hourly.temperature_2m, i),
      feels: valueAt(hourly.apparent_temperature, i),
      rain: valueAt(hourly.precipitation_probability, i),
      uv: valueAt(hourly.uv_index, i),
      gust: valueAt(hourly.wind_gusts_10m, i),
      snow: valueAt(hourly.snowfall, i),
      code: valueAt(hourly.weather_code, i),
    });
  });

  const days = (daily.time || []).map((date, i) => ({
    date,
    high: valueAt(daily.temperature_2m_max, i),
    low: valueAt(daily.temperature_2m_min, i),
    hours: hoursByDate.get(date) || [],
  }));

  return {
    timezone: json.timezone,
    // Open-Meteo's current time is the location's local time, so "today" is
    // the location's date, not the device's (plan.md, Time zones).
    now: current.time || null,
    today: current.time ? current.time.slice(0, 10) : days[0]?.date ?? null,
    current: {
      temp: current.temperature_2m ?? null,
      feels: current.apparent_temperature ?? null,
      code: current.weather_code ?? null,
    },
    days,
  };
}
