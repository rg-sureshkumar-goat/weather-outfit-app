// Display wording for Today: dates, times, the sky backdrop and the avatar's
// text description (R6, R33). Weather words come from Open-Meteo's code
// table in src/content/weatherCodes.js.

// Dates are calendar days at the location (YYYY-MM-DD), so they're formatted
// in UTC to keep the device's own time zone from shifting the day.
const at = (date) => new Date(`${date}T12:00:00Z`);
const fmt = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });

export function dayLabels(date) {
  const d = at(date);
  return {
    short: fmt({ weekday: 'short' }).format(d), // "Sat"
    dayNum: d.getUTCDate(), // 3
    medium: fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(d), // "Sat, Oct 3"
    long: fmt({ weekday: 'long', month: 'short', day: 'numeric' }).format(d), // "Saturday, Oct 3"
  };
}

// "7:42 am" in the device's own time, for "Updated …".
export function timeLabel(when) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(when).replace(' AM', ' am').replace(' PM', ' pm');
}

// The sky backdrop behind the avatar follows the day's weather icon family
// (research.md, Visual direction): clear, overcast, rain or snow. With no
// code for the day it stays neutral (overcast) rather than guess.
const SKIES = {
  clear: 'clear',
  partlyCloudy: 'clear',
  overcast: 'overcast',
  fog: 'overcast',
  drizzle: 'rain',
  rain: 'rain',
  freezingRain: 'rain',
  showers: 'rain',
  thunderstorm: 'rain',
  snow: 'snow',
};

export const skyFor = (icon) => SKIES[icon] ?? 'overcast';

// "white tee, khaki shorts and white sneakers": the avatar's text
// description, read by screen readers (R33).
export function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function outfitDescription(state) {
  const names = state.wearing.map((w) => w.item.name.charAt(0).toLowerCase() + w.item.name.slice(1));
  return `The avatar is wearing ${listNames(names)}.`;
}
