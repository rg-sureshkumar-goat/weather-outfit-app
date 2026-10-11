// The avatar values (R24, R40), saved on this device only (R34). They are
// choices, never images: gender, Monk tone number, hair color and style
// names, facial hair and glasses.
//
//   { gender: 'woman' | 'man',          // shown as Female and Male
//     skin: 1–10,                       // Monk Skin Tone Scale number
//     hair: { style, color },           // keys of HAIRSTYLES and HAIR_COLORS
//     facialHair: 'none' | 'stubble' | 'beard',   // Male only
//     glasses: true | false }

import { MONK_TONES, HAIR_COLORS } from '../art/palette.js';
import { HAIRSTYLES } from '../art/hair.js';
import { GENDER_NAMES, HAIRSTYLE_NAMES, HAIR_COLOR_NAMES } from '../content/avatarOptions.js';

export const AVATAR_KEY = 'quickDresser.avatar';
export const GENDERS = ['woman', 'man'];
export const FACIAL_HAIR = ['none', 'stubble', 'beard'];

// Where "Set it up by hand" starts (R22, R40). The hairstyle follows the
// gender; skin tone and hair color start mid-scale until a selfie sets them.
export function defaultAvatar(gender) {
  return {
    gender,
    skin: 6,
    hair: { style: gender === 'woman' ? 'longStraight' : 'shortCrop', color: 'darkBrown' },
    facialHair: 'none',
    glasses: false,
  };
}

const has = (obj, key) => typeof key === 'string' && Object.hasOwn(obj, key);

// A complete, valid set of values, or null without a valid gender. Any
// other value that's missing or unknown falls back to the gender's default.
// Facial hair is Male only, so a female avatar always has none (R40).
export function normalizeAvatar(values) {
  if (!values || !GENDERS.includes(values.gender)) return null;
  const d = defaultAvatar(values.gender);
  return {
    gender: values.gender,
    skin: Number.isInteger(values.skin) && values.skin >= 1 && values.skin <= MONK_TONES.length ? values.skin : d.skin,
    hair: {
      style: has(HAIRSTYLES, values.hair?.style) ? values.hair.style : d.hair.style,
      color: has(HAIR_COLORS, values.hair?.color) ? values.hair.color : d.hair.color,
    },
    facialHair: values.gender === 'man' && FACIAL_HAIR.includes(values.facialHair) ? values.facialHair : 'none',
    glasses: values.glasses === true,
  };
}

// Changing gender on the review keeps skin, hair and glasses; switching to
// Female removes facial hair, and switching back starts from none (R40).
export const withGender = (avatar, gender) => normalizeAvatar({ ...avatar, gender });

export function loadAvatar(storage) {
  try {
    return normalizeAvatar(JSON.parse(storage.getItem(AVATAR_KEY)));
  } catch {
    return null;
  }
}

export function saveAvatar(storage, avatar) {
  const values = normalizeAvatar(avatar);
  if (!values) throw new Error('An avatar needs Female or Male.');
  storage.setItem(AVATAR_KEY, JSON.stringify(values));
  return values;
}

// The drawing's look from the values: one gender choice sets the body and
// face (R40).
export function lookOf(avatar) {
  const set = avatar.gender === 'woman' ? 'A' : 'B';
  return {
    body: set,
    face: set,
    skin: MONK_TONES[avatar.skin - 1],
    hair: { style: avatar.hair.style, color: HAIR_COLORS[avatar.hair.color] },
    facialHair: avatar.facialHair,
    glasses: avatar.glasses,
  };
}

// A sentence for screen readers describing the preview (R33).
export function describeAvatar(avatar) {
  const parts = [
    GENDER_NAMES[avatar.gender],
    `Monk skin tone ${avatar.skin}`,
    `${HAIR_COLOR_NAMES[avatar.hair.color].toLowerCase()} hair, ${HAIRSTYLE_NAMES[avatar.hair.style].toLowerCase()}`,
  ];
  if (avatar.hair.style === 'bald') parts[2] = 'bald';
  if (avatar.facialHair !== 'none') parts.push(avatar.facialHair);
  if (avatar.glasses) parts.push('glasses');
  return `Avatar preview: ${parts.join(', ')}.`;
}
