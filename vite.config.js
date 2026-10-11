import { defineConfig } from 'vite';

// GitHub Pages serves the app from https://rg-sureshkumar-goat.github.io/weather-outfit-app/,
// so every built asset path must start with this base.
export const PAGES_BASE = '/weather-outfit-app/';

export default defineConfig({
  base: PAGES_BASE,
  server: {
    fs: {
      // The dev server can serve any file in the project folder. Keep the
      // Developer's private test photos out of reach, plus Vite's defaults.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/test-garments/**', '**/test-selfie/**', '**/*.{heic,HEIC}'],
    },
  },
});
