// Copies the MediaPipe vision runtime (WASM) from node_modules into public/,
// so the app hosts it itself instead of loading it from Google (R34, R37).
// Runs automatically before `npm run dev` and `npm run build`. The copied
// files are not committed; see .gitignore.

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const target = join(root, 'public', 'mediapipe', 'wasm');

// The SIMD runtime is what modern browsers load. The no-SIMD pair is the
// fallback MediaPipe picks on browsers without WASM SIMD; a visitor only
// ever downloads one of the two.
const files = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

if (!existsSync(source)) {
  console.error(`MediaPipe runtime not found at ${source}. Run \`npm install\` first.`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });

for (const file of files) {
  const from = join(source, file);
  const to = join(target, file);
  // Skip files that are already up to date, so `npm run dev` starts quickly.
  if (existsSync(to) && statSync(to).size === statSync(from).size && statSync(to).mtimeMs >= statSync(from).mtimeMs) {
    continue;
  }
  copyFileSync(from, to);
  console.log(`Copied ${file} (${(statSync(to).size / 1e6).toFixed(1)} MB)`);
}
