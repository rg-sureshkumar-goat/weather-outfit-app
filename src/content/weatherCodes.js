// Open-Meteo's weather codes (WMO), with Open-Meteo's own description of each
// and the icon family that draws it (R10). The app shows the code the API
// gives and never works out a condition of its own: each day uses its daily
// code ("the most severe weather condition on a given day"), and Today's
// header uses the current code.
//
// Descriptions are copied word for word from the code table at
// https://open-meteo.com/en/docs (checked 2026-10-11).

export const WEATHER_CODES = {
  0: { text: 'Clear sky', icon: 'clear' },
  1: { text: 'Mainly clear', icon: 'partlyCloudy' },
  2: { text: 'Partly cloudy', icon: 'partlyCloudy' },
  3: { text: 'Overcast', icon: 'overcast' },
  45: { text: 'Fog', icon: 'fog' },
  48: { text: 'Depositing rime fog', icon: 'fog' },
  51: { text: 'Light drizzle', icon: 'drizzle' },
  53: { text: 'Moderate drizzle', icon: 'drizzle' },
  55: { text: 'Dense drizzle', icon: 'drizzle' },
  56: { text: 'Light freezing drizzle', icon: 'freezingRain' },
  57: { text: 'Dense freezing drizzle', icon: 'freezingRain' },
  61: { text: 'Slight rain', icon: 'rain' },
  63: { text: 'Moderate rain', icon: 'rain' },
  65: { text: 'Heavy rain', icon: 'rain' },
  66: { text: 'Light freezing rain', icon: 'freezingRain' },
  67: { text: 'Heavy freezing rain', icon: 'freezingRain' },
  71: { text: 'Slight snowfall', icon: 'snow' },
  73: { text: 'Moderate snowfall', icon: 'snow' },
  75: { text: 'Heavy snowfall', icon: 'snow' },
  77: { text: 'Snow grains', icon: 'snow' },
  80: { text: 'Slight rain showers', icon: 'showers' },
  81: { text: 'Moderate rain showers', icon: 'showers' },
  82: { text: 'Violent rain showers', icon: 'showers' },
  85: { text: 'Slight snow showers', icon: 'snow' },
  86: { text: 'Heavy snow showers', icon: 'snow' },
  95: { text: 'Thunderstorm', icon: 'thunderstorm' },
  96: { text: 'Thunderstorm with slight hail', icon: 'thunderstorm' },
  97: { text: 'Heavy thunderstorm', icon: 'thunderstorm' },
  99: { text: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
};

// The 10 icon families, one placeholder icon each until C10.
export const WEATHER_ICONS = ['clear', 'partlyCloudy', 'overcast', 'fog', 'drizzle', 'rain', 'freezingRain', 'showers', 'snow', 'thunderstorm'];

// { code, text, icon } for a code, or null when the code is missing or not
// in the table; the screen then shows no icon and says so (R29).
export function describeWeather(code) {
  const entry = code === null || code === undefined ? null : WEATHER_CODES[code];
  return entry ? { code, ...entry } : null;
}
