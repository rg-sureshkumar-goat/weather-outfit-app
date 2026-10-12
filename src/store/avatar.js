// The avatar values (R24, R40, R43), saved on this device only (R34). They
// are choices, never images:
//
//   { gender: 'woman' | 'man',          // shown as Female and Male
//     bodyType,                         // bodies.js BODY_TYPES for the gender
//     skin: 1–10,                       // Monk Skin Tone Scale number
//     hair: { style, color },           // keys of HAIRSTYLES and HAIR_COLORS
//     features: { shape, eyeShape, … }, // all 15 of face.js FEATURE_CHOICES
//     beard, moustache,                 // face.js BEARDS, MOUSTACHES; Male only
//     glasses: true | false }
//
// Avatars saved before C6d have no body type or face choices and one
// facialHair value ('none' | 'stubble' | 'beard'). They load as Average with
// the face's defaults; Stubble becomes Light stubble, and Beard becomes Full
// with a Classic moustache.

import { MONK_TONES, HAIR_COLORS } from '../art/palette.js';
import { HAIRSTYLES } from '../art/hair.js';
import { BODY_TYPES } from '../art/bodies.js';
import { FACE_DEFAULTS, FEATURE_CHOICES, BEARDS, MOUSTACHES } from '../art/face.js';
import { GENDER_NAMES, BODY_TYPE_NAMES, HAIRSTYLE_NAMES, HAIR_COLOR_NAMES, BEARD_NAMES, MOUSTACHE_NAMES, FEATURE_NAMES } from '../content/avatarOptions.js';

export const AVATAR_KEY = 'quickDresser.avatar';
export const GENDERS = ['woman', 'man'];

// The art's body and face set for each gender (R40).
export const setOf = (gender) => (gender === 'woman' ? 'A' : 'B');

// The six body types offered for a gender (R43).
export const bodyTypesFor = (gender) => BODY_TYPES[setOf(gender)];

// The facial hair saved before C6d, as [beard, moustache].
const ONE_CHOICE = { stubble: ['lightStubble', 'none'], beard: ['full', 'classic'] };

// Where "Set it up by hand" starts (R22, R40). The hairstyle and face follow
// the gender; skin tone and hair color start mid-scale until a selfie sets
// them.
export function defaultAvatar(gender) {
  return {
    gender,
    bodyType: 'average',
    skin: 6,
    hair: { style: gender === 'woman' ? 'longStraight' : 'shortCrop', color: 'darkBrown' },
    features: { ...FACE_DEFAULTS[setOf(gender)] },
    beard: 'none',
    moustache: 'none',
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
  const [oldBeard, oldMoustache] = ONE_CHOICE[values.facialHair] ?? ['none', 'none'];
  const beard = values.beard === undefined ? oldBeard : values.beard;
  const moustache = values.moustache === undefined ? oldMoustache : values.moustache;
  const man = values.gender === 'man';
  return {
    gender: values.gender,
    bodyType: bodyTypesFor(values.gender).includes(values.bodyType) ? values.bodyType : d.bodyType,
    skin: Number.isInteger(values.skin) && values.skin >= 1 && values.skin <= MONK_TONES.length ? values.skin : d.skin,
    hair: {
      style: has(HAIRSTYLES, values.hair?.style) ? values.hair.style : d.hair.style,
      color: has(HAIR_COLORS, values.hair?.color) ? values.hair.color : d.hair.color,
    },
    features: Object.fromEntries(Object.entries(d.features).map(([key, fallback]) => {
      const value = values.features?.[key];
      return [key, FEATURE_CHOICES[key].includes(value) ? value : fallback];
    })),
    beard: man && BEARDS.includes(beard) ? beard : 'none',
    moustache: man && MOUSTACHES.includes(moustache) ? moustache : 'none',
    glasses: values.glasses === true,
  };
}

// Changing gender on the review keeps skin, hair, glasses and every face
// choice the User made (R40). Face choices still on the old face's defaults
// move to the new face's, a body type the new gender doesn't offer becomes
// Average, and the beard and moustache start from None.
export function withGender(avatar, gender) {
  if (avatar.gender === gender) return normalizeAvatar(avatar);
  const from = FACE_DEFAULTS[setOf(avatar.gender)];
  const to = FACE_DEFAULTS[setOf(gender)];
  const features = Object.fromEntries(Object.entries(avatar.features ?? {}).map(([key, value]) => [key, value === from[key] ? to[key] : value]));
  return normalizeAvatar({ ...avatar, gender, features, beard: 'none', moustache: 'none' });
}

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
// face set (R40); the rest are the User's choices (R43).
export function lookOf(avatar) {
  const set = setOf(avatar.gender);
  return {
    body: set,
    bodyType: avatar.bodyType,
    face: set,
    features: avatar.features,
    skin: MONK_TONES[avatar.skin - 1],
    hair: { style: avatar.hair.style, color: HAIR_COLORS[avatar.hair.color] },
    facialHair: { beard: avatar.beard, moustache: avatar.moustache },
    glasses: avatar.glasses,
  };
}

// A sentence for screen readers describing the preview (R33). Face choices
// are listed only where they differ from the face's defaults.
export function describeAvatar(avatar) {
  const lower = (s) => s.toLowerCase();
  const parts = [
    GENDER_NAMES[avatar.gender],
    `${lower(BODY_TYPE_NAMES[avatar.bodyType])} body`,
    `Monk skin tone ${avatar.skin}`,
    avatar.hair.style === 'bald' ? 'bald' : `${lower(HAIR_COLOR_NAMES[avatar.hair.color])} hair, ${lower(HAIRSTYLE_NAMES[avatar.hair.style])}`,
  ];
  const defaults = FACE_DEFAULTS[setOf(avatar.gender)];
  for (const [key, value] of Object.entries(avatar.features)) {
    if (value !== defaults[key]) parts.push(`${lower(FEATURE_NAMES[key].label)} ${lower(FEATURE_NAMES[key].choices[value])}`);
  }
  if (avatar.beard !== 'none') parts.push(`beard ${lower(BEARD_NAMES[avatar.beard])}`);
  if (avatar.moustache !== 'none') parts.push(`moustache ${lower(MOUSTACHE_NAMES[avatar.moustache])}`);
  if (avatar.glasses) parts.push('glasses');
  return `Avatar preview: ${parts.join(', ')}.`;
}
