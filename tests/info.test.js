// R35 "Delete all my data": removes everything the app saved on this device,
// and nothing else, so first setup starts again.

import { describe, expect, it } from 'vitest';
import { clearAppData, APP_PREFIX } from '../src/store/storage.js';
import { saveAvatar, loadAvatar, defaultAvatar, AVATAR_KEY } from '../src/store/avatar.js';
import { saveLocation, loadLocation, LOCATION_KEY } from '../src/store/location.js';
import { savePicks, loadPicks, PICKS_KEY } from '../src/store/picks.js';
import { memoryStorage } from './helpers.js';

const AUSTIN = { name: 'Austin', label: 'Austin, TX', latitude: 30.27, longitude: -97.74 };

describe('delete all my data (R35)', () => {
  function filled() {
    const storage = memoryStorage();
    saveAvatar(storage, defaultAvatar('woman'));
    saveLocation(storage, AUSTIN);
    savePicks(storage, AUSTIN, '2026-10-12', { outfit: { top: 'x' }, summary: 0, reminders: {}, jacket: null });
    storage.setItem('someOtherApp.setting', 'keep');
    return storage;
  }

  it('every key the app saves uses the app prefix', () => {
    for (const key of [AVATAR_KEY, LOCATION_KEY, PICKS_KEY]) expect(key.startsWith(APP_PREFIX)).toBe(true);
  });

  it('removes the location, avatar and saved picks', () => {
    const storage = filled();
    expect(clearAppData(storage).sort()).toEqual([AVATAR_KEY, LOCATION_KEY, PICKS_KEY].sort());
    expect(loadAvatar(storage)).toBeNull();
    expect(loadLocation(storage)).toBeNull();
    expect(loadPicks(storage, AUSTIN, '2026-10-12')).toEqual({});
  });

  it('leaves anything that is not the app\'s alone', () => {
    const storage = filled();
    clearAppData(storage);
    expect(storage.getItem('someOtherApp.setting')).toBe('keep');
    expect(storage.length).toBe(1);
  });

  it('with nothing saved, there is nothing to remove', () => {
    expect(clearAppData(memoryStorage())).toEqual([]);
  });
});
