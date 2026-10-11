// Reminder and summary wordings, three per type (spec.md, Wordings; R12).
// Words in braces are filled from the day's window values or the outfit.

// Reminders in the order they appear on screen (the spec's table order).
export const REMINDERS = [
  {
    type: 'umbrella',
    title: 'Umbrella',
    icon: 'umbrella',
    lines: [
      '{rain}% chance of rain around {rainTime}. Pack the umbrella.',
      'Rain could show up by {rainTime} ({rain}%). An umbrella in your bag saves the day.',
      'Showers possible around {rainTime}. Bring an umbrella just in case.',
    ],
  },
  {
    type: 'sunscreen',
    title: 'Sunscreen',
    icon: 'sunscreen',
    lines: [
      'UV reaches {uv} around {uvTime}. Put on SPF 15+ before you head out.',
      'Strong sun midday (UV {uv}). Sunscreen now, sunglasses in your bag.',
      'UV {uv} today. A layer of SPF 15+ before the walk is a good idea.',
    ],
  },
  {
    type: 'water',
    title: 'Water',
    icon: 'water',
    lines: [
      'Feels like {feelsMax}° by {maxTime}. Bring a water bottle.',
      'Warm one out there. Fill your water bottle before class.',
      "It'll feel like {feelsMax}° this afternoon. Keep water with you.",
    ],
  },
  {
    type: 'waterStrong',
    title: 'Water',
    icon: 'water',
    lines: [
      "Feels like {feelsMax}° by {maxTime}. Bring a full bottle and drink before you're thirsty.",
      "Serious heat today. Drink more water than usual, even if you're not thirsty.",
      '{feelsMax}° feels-like this afternoon. Refill your bottle whenever you can.',
    ],
  },
  {
    type: 'layer',
    title: 'Layer for later',
    icon: 'layer',
    lines: [
      'Drops to {feelsMin}° by {minTime}. Bring your {jacket}.',
      'Cooler tonight, around {feelsMin}°. Your {jacket} goes with this outfit.',
      'The evening gets chilly ({feelsMin}°). Toss your {jacket} in your bag.',
    ],
  },
  {
    type: 'wind',
    title: 'Wind',
    icon: 'wind',
    lines: [
      'Gusts up to {gust} mph. Expect a blustery walk to class.',
      'Windy today, with gusts near {gust} mph. Keep loose papers zipped away.',
      'Gusty out there ({gust} mph). A zip-up layer helps.',
    ],
  },
  {
    type: 'windRain',
    title: 'Wind and rain',
    icon: 'rainJacket',
    lines: [
      "Rain and gusts to {gust} mph. An umbrella won't hold up, so wear the hooded rain jacket.",
      "Wind and rain together today. Skip the umbrella and use your rain jacket's hood.",
      'Gusts near {gust} mph will flip an umbrella. Your hooded rain jacket is the move.',
    ],
  },
  {
    type: 'snow',
    title: 'Snow',
    icon: 'snow',
    lines: [
      'Snow expected around {snowTime}. Wear waterproof boots.',
      'Snow on the way. Boots with good grip keep your feet dry.',
      'Slick sidewalks likely with snow today. Waterproof boots, please.',
    ],
  },
  {
    type: 'snowNoBoots',
    title: 'Snow',
    icon: 'snow',
    lines: [
      'Snow expected around {snowTime}. Your {shoes} will do, but boots would keep your feet drier.',
      'Snow on the way and no boots in your closet. Step carefully in your {shoes}.',
      'Slick, snowy sidewalks likely today. Boots would be a better choice than your {shoes}.',
    ],
  },
];

export const REMINDER_BY_TYPE = Object.fromEntries(REMINDERS.map((r) => [r.type, r]));

// Band summaries: a short title and a sentence (spec.md, Band summaries).
export const SUMMARIES = {
  hot: [
    { title: 'Hot all day.', line: 'Feels like {feelsMax}° by {maxTime}. Your {top} and {bottom} keep you cool.' },
    { title: 'Scorcher.', line: 'Light and loose today: {top}, {bottom} and {shoes}.' },
    { title: "Heat's on.", line: 'It peaks at {feelsMax}°. Keep it breezy with your {top} and {bottom}.' },
  ],
  warm: [
    { title: 'Pleasantly warm.', line: 'At its warmest it feels like {feelsMax}°. Your {top} and {bottom} are just right.' },
    { title: 'Easy weather.', line: 'A comfortable {feelsMax}° at most. Go with your {top} and {bottom}.' },
    { title: 'Warm and easy.', line: 'Nothing tricky today: {top}, {bottom} and {shoes}.' },
  ],
  chilly: [
    { title: 'Cool day.', line: 'It only reaches {feelsMax}°. Wear your {top} under your {outer}.' },
    { title: 'Jacket weather.', line: 'It stays between {feelsMin}° and {feelsMax}°. Your {outer} over your {top} does the job.' },
    { title: 'Crisp out there.', line: 'Layer up: {top}, {bottom} and your {outer}.' },
  ],
  cold: [
    { title: 'Cold day.', line: 'It tops out at {feelsMax}°. Wear your {outer} over your {top}, plus a hat and gloves.' },
    { title: 'Bundle up.', line: 'It feels like {feelsMin}° at its coldest. Coat, warm layers, hat and gloves.' },
    { title: 'Coat on.', line: '{feelsMax}° at best. Your {outer} and {shoes} keep the cold out. Add a hat and gloves.' },
  ],
  freezing: [
    { title: 'Freezing.', line: 'Down to {feelsMin}°. Layer up under your {outer} and wear a hat and gloves.' },
    { title: 'Seriously cold.', line: 'It feels like {feelsMin}°. Warm layers, your {outer}, a hat and gloves.' },
    { title: 'Bundle all the way.', line: '{feelsMax}° is as warm as it gets. Warm layers, {shoes}, hat and gloves.' },
  ],
};

// Notes shown when a value is missing for the whole window (R29).
export const MISSING_NOTES = {
  rain: "Rain chances aren't available for this day.",
  uv: "UV data isn't available for this day.",
  gust: "Wind data isn't available for this day.",
  snow: "Snowfall data isn't available for this day.",
  code: "Sky conditions aren't available for this day.",
};

// Fills {name} placeholders. A missing value is a bug, so it throws rather
// than showing a raw placeholder on screen.
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (values[key] === undefined || values[key] === null) {
      throw new Error(`No value for {${key}} in "${template}"`);
    }
    return String(values[key]);
  });
}
