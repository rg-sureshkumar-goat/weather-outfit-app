// R24 saved avatar values, R40 female or male rules, R22 hand-setup defaults.

import { describe, expect, it } from 'vitest';
import { AVATAR_KEY, defaultAvatar, normalizeAvatar, withGender, loadAvatar, saveAvatar, lookOf, describeAvatar } from '../src/store/avatar.js';
import { MONK_TONES, HAIR_COLORS } from '../src/art/palette.js';
import { HAIRSTYLES } from '../src/art/hair.js';
import { HAIRSTYLE_NAMES, HAIR_COLOR_NAMES } from '../src/content/avatarOptions.js';
import { forecastUrl } from '../src/weather/openMeteo.js';
import { placesUrl } from '../src/weather/places.js';
import { reverseUrl } from '../src/weather/reverseGeocode.js';
import { memoryStorage } from './helpers.js';

describe('hand-setup defaults (R22, R40)', () => {
  it('Female starts on Long straight and Male on Short crop, with no facial hair or glasses', () => {
    expect(defaultAvatar('woman')).toEqual({ gender: 'woman', skin: 6, hair: { style: 'longStraight', color: 'darkBrown' }, facialHair: 'none', glasses: false });
    expect(defaultAvatar('man')).toEqual({ gender: 'man', skin: 6, hair: { style: 'shortCrop', color: 'darkBrown' }, facialHair: 'none', glasses: false });
  });

  it('every option has a name to show', () => {
    expect(Object.keys(HAIRSTYLE_NAMES)).toEqual(Object.keys(HAIRSTYLES));
    expect(Object.keys(HAIR_COLOR_NAMES)).toEqual(Object.keys(HAIR_COLORS));
  });
});

describe('female or male (R40)', () => {
  const bearded = { gender: 'man', skin: 9, hair: { style: 'afro', color: 'auburn' }, facialHair: 'beard', glasses: true };

  it('one choice sets both the body and the face', () => {
    expect(lookOf(defaultAvatar('woman'))).toMatchObject({ body: 'A', face: 'A' });
    expect(lookOf(defaultAvatar('man'))).toMatchObject({ body: 'B', face: 'B' });
  });

  it('switching to Female keeps skin, hair and glasses and removes facial hair', () => {
    expect(withGender(bearded, 'woman')).toEqual({ gender: 'woman', skin: 9, hair: { style: 'afro', color: 'auburn' }, facialHair: 'none', glasses: true });
  });

  it('switching back to Male starts facial hair from None', () => {
    expect(withGender(withGender(bearded, 'woman'), 'man').facialHair).toBe('none');
  });

  it('a female avatar never has facial hair, even if storage says so', () => {
    expect(normalizeAvatar({ ...bearded, gender: 'woman' }).facialHair).toBe('none');
    const storage = memoryStorage();
    storage.setItem(AVATAR_KEY, JSON.stringify({ ...bearded, gender: 'woman' }));
    expect(loadAvatar(storage).facialHair).toBe('none');
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

describe('saved avatar values (R24)', () => {
  it('saves only the choices and restores them after a reload', () => {
    const storage = memoryStorage();
    const values = { gender: 'man', skin: 3, hair: { style: 'braids', color: 'black' }, facialHair: 'stubble', glasses: true };
    saveAvatar(storage, values);
    expect(JSON.parse(storage.getItem(AVATAR_KEY))).toEqual(values);
    expect(loadAvatar(storage)).toEqual(values);
    expect(storage.size).toBe(1);
  });

  it('nothing saved yet, or damaged data, means setup runs', () => {
    const storage = memoryStorage();
    expect(loadAvatar(storage)).toBeNull();
    storage.setItem(AVATAR_KEY, '{not json');
    expect(loadAvatar(storage)).toBeNull();
  });

  it('unknown values fall back to the gender\'s defaults', () => {
    const fixed = normalizeAvatar({ gender: 'woman', skin: 14, hair: { style: 'mohawk', color: 'green' }, facialHair: 'goatee', glasses: 'yes' });
    expect(fixed).toEqual(defaultAvatar('woman'));
  });

  it('draws the saved values: Monk tone number and hair color name become colors', () => {
    const look = lookOf({ gender: 'man', skin: 10, hair: { style: 'bald', color: 'grey' }, facialHair: 'beard', glasses: false });
    expect(look.skin).toBe(MONK_TONES[9]);
    expect(look.hair).toEqual({ style: 'bald', color: HAIR_COLORS.grey });
    expect(look.facialHair).toBe('beard');
  });

  it('describes the preview for screen readers (R33)', () => {
    expect(describeAvatar({ gender: 'man', skin: 6, hair: { style: 'shortCrop', color: 'darkBrown' }, facialHair: 'beard', glasses: true }))
      .toBe('Avatar preview: Male, Monk skin tone 6, dark brown hair, short crop, beard, glasses.');
    expect(describeAvatar({ gender: 'woman', skin: 2, hair: { style: 'bald', color: 'black' }, facialHair: 'none', glasses: false }))
      .toBe('Avatar preview: Female, Monk skin tone 2, bald.');
  });
});
