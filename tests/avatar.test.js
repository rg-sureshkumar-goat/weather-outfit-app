// R24 saved avatar values, R40 female or male rules, R22 hand-setup defaults,
// R43 body type, face choices, beard and moustache.

import { describe, expect, it } from 'vitest';
import { AVATAR_KEY, defaultAvatar, normalizeAvatar, withGender, loadAvatar, saveAvatar, lookOf, describeAvatar, bodyTypesFor } from '../src/store/avatar.js';
import { MONK_TONES, HAIR_COLORS } from '../src/art/palette.js';
import { HAIRSTYLES } from '../src/art/hair.js';
import { BODY_TYPES } from '../src/art/bodies.js';
import { FACE_DEFAULTS, FEATURE_CHOICES, BEARDS, MOUSTACHES } from '../src/art/face.js';
import { HAIRSTYLE_NAMES, HAIR_COLOR_NAMES, BODY_TYPE_NAMES, BEARD_NAMES, MOUSTACHE_NAMES, FEATURE_NAMES } from '../src/content/avatarOptions.js';
import { forecastUrl } from '../src/weather/openMeteo.js';
import { placesUrl } from '../src/weather/places.js';
import { reverseUrl } from '../src/weather/reverseGeocode.js';
import { memoryStorage } from './helpers.js';

describe('hand-setup defaults (R22, R40)', () => {
  it('Female starts on Long straight and Male on Short crop, Average, with their face defaults and no facial hair or glasses', () => {
    expect(defaultAvatar('woman')).toEqual({ gender: 'woman', bodyType: 'average', skin: 6, hair: { style: 'longStraight', color: 'darkBrown' }, features: FACE_DEFAULTS.A, beard: 'none', moustache: 'none', glasses: false });
    expect(defaultAvatar('man')).toEqual({ gender: 'man', bodyType: 'average', skin: 6, hair: { style: 'shortCrop', color: 'darkBrown' }, features: FACE_DEFAULTS.B, beard: 'none', moustache: 'none', glasses: false });
  });

  it('every option has a name to show, in the art\'s order', () => {
    expect(Object.keys(HAIRSTYLE_NAMES)).toEqual(Object.keys(HAIRSTYLES));
    expect(Object.keys(HAIR_COLOR_NAMES)).toEqual(Object.keys(HAIR_COLORS));
    expect(Object.keys(BEARD_NAMES)).toEqual(BEARDS);
    expect(Object.keys(MOUSTACHE_NAMES)).toEqual(MOUSTACHES);
    for (const type of [...BODY_TYPES.A, ...BODY_TYPES.B]) expect(BODY_TYPE_NAMES[type], type).toBeTruthy();
    expect(Object.keys(FEATURE_NAMES)).toEqual(Object.keys(FEATURE_CHOICES));
    for (const [key, choices] of Object.entries(FEATURE_CHOICES)) expect(Object.keys(FEATURE_NAMES[key].choices), key).toEqual(choices);
  });
});

describe('female or male (R40)', () => {
  const bearded = { ...defaultAvatar('man'), skin: 9, hair: { style: 'afro', color: 'auburn' }, beard: 'full', moustache: 'handlebar', glasses: true };

  it('one choice sets both the body and the face', () => {
    expect(lookOf(defaultAvatar('woman'))).toMatchObject({ body: 'A', face: 'A' });
    expect(lookOf(defaultAvatar('man'))).toMatchObject({ body: 'B', face: 'B' });
  });

  it('switching to Female keeps skin, hair and glasses and removes the beard and moustache', () => {
    expect(withGender(bearded, 'woman')).toMatchObject({ gender: 'woman', skin: 9, hair: { style: 'afro', color: 'auburn' }, beard: 'none', moustache: 'none', glasses: true });
  });

  it('switching back to Male starts the beard and moustache from None', () => {
    expect(withGender(withGender(bearded, 'woman'), 'man')).toMatchObject({ beard: 'none', moustache: 'none' });
  });

  it('a female avatar never has facial hair, even if storage says so', () => {
    expect(normalizeAvatar({ ...bearded, gender: 'woman' })).toMatchObject({ beard: 'none', moustache: 'none' });
    const storage = memoryStorage();
    storage.setItem(AVATAR_KEY, JSON.stringify({ ...bearded, gender: 'woman' }));
    expect(loadAvatar(storage)).toMatchObject({ beard: 'none', moustache: 'none' });
    // Nor from the single choice saved before C6d.
    expect(normalizeAvatar({ gender: 'woman', facialHair: 'beard' })).toMatchObject({ beard: 'none', moustache: 'none' });
  });

  it('there is no third option: anything else is not a valid avatar', () => {
    expect(normalizeAvatar({ ...bearded, gender: 'other' })).toBeNull();
    expect(normalizeAvatar({ ...bearded, gender: undefined })).toBeNull();
    expect(() => saveAvatar(memoryStorage(), { ...bearded, gender: 'other' })).toThrow();
  });

  it('no network request carries the gender: request URLs come from places and coordinates only', () => {
    const urls = [
      forecastUrl({ latitude: 30.27, longitude: -97.74 }),
      placesUrl('Austin'),
      reverseUrl({ latitude: 30.27, longitude: -97.74 }),
    ];
    for (const url of urls) expect(url).not.toMatch(/gender|woman|female|\bman\b|male/i);
  });
});

describe('body type, face choices, beard and moustache (R43)', () => {
  it('each gender is offered its own six body types', () => {
    expect(bodyTypesFor('woman')).toEqual(['slim', 'average', 'athletic', 'hourglass', 'pear', 'plusSize']);
    expect(bodyTypesFor('man')).toEqual(['slim', 'average', 'athletic', 'broad', 'stocky', 'plusSize']);
    expect(normalizeAvatar({ ...defaultAvatar('woman'), bodyType: 'broad' }).bodyType).toBe('average');
    expect(normalizeAvatar({ ...defaultAvatar('man'), bodyType: 'broad' }).bodyType).toBe('broad');
  });

  it('switching gender keeps a body type both offer, and turns one only the old gender offers into Average', () => {
    expect(withGender({ ...defaultAvatar('man'), bodyType: 'plusSize' }, 'woman').bodyType).toBe('plusSize');
    expect(withGender({ ...defaultAvatar('man'), bodyType: 'stocky' }, 'woman').bodyType).toBe('average');
    expect(withGender({ ...defaultAvatar('woman'), bodyType: 'hourglass' }, 'man').bodyType).toBe('average');
  });

  it('switching gender keeps the face choices the User made and moves the untouched ones to the new face\'s defaults', () => {
    const woman = { ...defaultAvatar('woman'), features: { ...FACE_DEFAULTS.A, eyeColor: 'green', lashes: 'long', lips: 'red' } };
    const man = withGender(woman, 'man');
    // Chosen by the User: kept.
    expect(man.features).toMatchObject({ eyeColor: 'green', lashes: 'long', lips: 'red' });
    // Still on Female's defaults: now Male's.
    expect(man.features).toMatchObject({ brows: FACE_DEFAULTS.B.brows, mouth: FACE_DEFAULTS.B.mouth });
  });

  it('unknown face choices, beards and moustaches fall back to the defaults', () => {
    const fixed = normalizeAvatar({ ...defaultAvatar('man'), features: { shape: 'star', eyeColor: 'violet', nose: 'button' }, beard: 'braided', moustache: 'imperial' });
    expect(fixed.features).toEqual({ ...FACE_DEFAULTS.B, nose: 'button' });
    expect(fixed).toMatchObject({ beard: 'none', moustache: 'none' });
  });

  it('every face choice, beard and moustache can be saved and comes back after a reload', () => {
    const storage = memoryStorage();
    for (const [key, choices] of Object.entries(FEATURE_CHOICES)) {
      for (const choice of choices) {
        saveAvatar(storage, { ...defaultAvatar('man'), features: { ...FACE_DEFAULTS.B, [key]: choice } });
        expect(loadAvatar(storage).features[key], `${key} ${choice}`).toBe(choice);
      }
    }
    for (const beard of BEARDS) for (const moustache of MOUSTACHES) {
      saveAvatar(storage, { ...defaultAvatar('man'), beard, moustache });
      expect(loadAvatar(storage)).toMatchObject({ beard, moustache });
    }
  });
});

describe('saved avatar values (R24)', () => {
  it('saves only the choices and restores them after a reload', () => {
    const storage = memoryStorage();
    const values = { ...defaultAvatar('man'), bodyType: 'broad', skin: 3, hair: { style: 'braids', color: 'black' }, features: { ...FACE_DEFAULTS.B, shape: 'heart', freckles: 'light' }, beard: 'goatee', moustache: 'chevron', glasses: true };
    saveAvatar(storage, values);
    expect(JSON.parse(storage.getItem(AVATAR_KEY))).toEqual(values);
    expect(loadAvatar(storage)).toEqual(values);
    expect(storage.size).toBe(1);
  });

  it('an avatar saved before C6d keeps working: Average, the face\'s defaults, and its facial hair in the new terms', () => {
    const storage = memoryStorage();
    const old = (facialHair) => ({ gender: 'man', skin: 3, hair: { style: 'braids', color: 'black' }, facialHair, glasses: true });
    storage.setItem(AVATAR_KEY, JSON.stringify(old('beard')));
    expect(loadAvatar(storage)).toEqual({ gender: 'man', bodyType: 'average', skin: 3, hair: { style: 'braids', color: 'black' }, features: FACE_DEFAULTS.B, beard: 'full', moustache: 'classic', glasses: true });
    storage.setItem(AVATAR_KEY, JSON.stringify(old('stubble')));
    expect(loadAvatar(storage)).toMatchObject({ beard: 'lightStubble', moustache: 'none' });
    storage.setItem(AVATAR_KEY, JSON.stringify(old('none')));
    expect(loadAvatar(storage)).toMatchObject({ beard: 'none', moustache: 'none' });
    // Saving again writes only the new values.
    saveAvatar(storage, loadAvatar(storage));
    expect(JSON.parse(storage.getItem(AVATAR_KEY))).not.toHaveProperty('facialHair');
  });

  it('nothing saved yet, or damaged data, means setup runs', () => {
    const storage = memoryStorage();
    expect(loadAvatar(storage)).toBeNull();
    storage.setItem(AVATAR_KEY, '{not json');
    expect(loadAvatar(storage)).toBeNull();
  });

  it('unknown values fall back to the gender\'s defaults', () => {
    const fixed = normalizeAvatar({ gender: 'woman', bodyType: 'tall', skin: 14, hair: { style: 'mohawk', color: 'green' }, features: 'round', beard: 'goatee', glasses: 'yes' });
    expect(fixed).toEqual(defaultAvatar('woman'));
  });

  it('draws the saved values: Monk tone number and hair color name become colors, and every choice reaches the drawing', () => {
    const avatar = { ...defaultAvatar('man'), bodyType: 'stocky', skin: 10, hair: { style: 'bald', color: 'grey' }, features: { ...FACE_DEFAULTS.B, shape: 'square' }, beard: 'long', moustache: 'walrus' };
    const look = lookOf(avatar);
    expect(look.skin).toBe(MONK_TONES[9]);
    expect(look.hair).toEqual({ style: 'bald', color: HAIR_COLORS.grey });
    expect(look).toMatchObject({ bodyType: 'stocky', features: { shape: 'square' }, facialHair: { beard: 'long', moustache: 'walrus' } });
  });

  it('describes the preview for screen readers (R33), naming face choices that differ from the defaults', () => {
    expect(describeAvatar({ ...defaultAvatar('man'), beard: 'full', moustache: 'classic', glasses: true }))
      .toBe('Avatar preview: Male, average body, Monk skin tone 6, dark brown hair, short crop, beard full, moustache classic, glasses.');
    expect(describeAvatar({ ...defaultAvatar('woman'), bodyType: 'plusSize', skin: 2, hair: { style: 'bald', color: 'black' }, features: { ...FACE_DEFAULTS.A, eyeColor: 'green', lips: 'red' } }))
      .toBe('Avatar preview: Female, plus-size body, Monk skin tone 2, bald, eye color green, lip color red.');
  });
});
