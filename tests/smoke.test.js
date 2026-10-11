import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config, { PAGES_BASE } from '../vite.config.js';

const publicFile = (name) => new URL(`../public/${name}`, import.meta.url);

// Guards the classic GitHub Pages failure: a wrong base path makes every
// asset 404 on the deployed site while the local dev server looks fine.
describe('build config', () => {
  it('serves assets from the Pages project path', () => {
    expect(PAGES_BASE).toBe('/weather-outfit-app/');
    expect(config.base).toBe(PAGES_BASE);
  });
});

// Guards the iPhone Home Screen install (R38): the manifest must stay inside
// the app's path and every icon it names must exist.
describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'));

  it('opens full-screen within the app path', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
  });

  it('names only icons that exist, plus the iPhone icon', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(publicFile(icon.src)), icon.src).toBe(true);
    }
    expect(existsSync(publicFile('apple-touch-icon.png'))).toBe(true);
  });
});
