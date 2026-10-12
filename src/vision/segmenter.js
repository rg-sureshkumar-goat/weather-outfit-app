// The cut-out model (R16, R37): MediaPipe MagicTouch (Apache 2.0) and the
// MediaPipe runtime that runs it, both hosted with the app and fetched only
// when Add item opens. Today never imports this file. The browser caches
// both, so later visits reuse them. Nothing is uploaded: the model runs on
// the device.
//
// loadSegmenter(onProgress) -> Promise<segmenter>   one load per page
//   onProgress(share)   0–1, as the runtime and model download
// segmenterLoaded() -> true once it's ready
// segmentAt(segmenter, image, [x, y]) -> Float32Array   confidence, 0–1, per
//   pixel of image that it belongs to the thing at (x, y), normalized

const BASE = import.meta.env.BASE_URL;
const RUNTIME_DIR = `${BASE}mediapipe/wasm`;
const MODEL_URL = `${BASE}models/magic_touch.tflite`;

// Unpacked sizes in bytes, for the progress bar. GitHub Pages compresses the
// runtime, so the download's own length can't be used.
// tests/vision.test.js checks these against the files.
export const SIZES = {
  'vision_wasm_internal.wasm': 11756954,
  'vision_wasm_nosimd_internal.wasm': 10960242,
  'magic_touch.tflite': 6227884,
};

// Reads a response body, reporting each chunk's size.
async function fetchBytes(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status}).`);
  const chunks = [];
  let length = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.length;
    onBytes(value.length);
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  return bytes;
}

let loading = null;
let loaded = false;
let report = () => {};

export const segmenterLoaded = () => loaded;

async function load() {
  // The MediaPipe library is its own chunk, so Today's bundle leaves it out.
  const { FilesetResolver, InteractiveSegmenterLegacy } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(RUNTIME_DIR);
  const runtimeFile = fileset.wasmBinaryPath.split('/').pop();
  const total = SIZES[runtimeFile] + SIZES['magic_touch.tflite'];
  let received = 0;
  const onBytes = (n) => {
    received += n;
    report(Math.min(0.99, received / total));
  };
  const [runtime, model] = await Promise.all([fetchBytes(fileset.wasmBinaryPath, onBytes), fetchBytes(MODEL_URL, onBytes)]);
  // Hand MediaPipe the files already downloaded, as local URLs, so nothing
  // is fetched twice. (MediaPipe 1.0.1 rejects this model passed as bytes
  // through modelAssetBuffer, but reads it from a URL.)
  const runtimeUrl = URL.createObjectURL(new Blob([runtime], { type: 'application/wasm' }));
  const modelUrl = URL.createObjectURL(new Blob([model]));
  try {
    const segmenter = await InteractiveSegmenterLegacy.createFromOptions(
      { ...fileset, wasmBinaryPath: runtimeUrl },
      { baseOptions: { modelAssetPath: modelUrl, delegate: 'CPU' }, outputConfidenceMasks: true, outputCategoryMask: false },
    );
    loaded = true;
    report(1);
    return segmenter;
  } finally {
    URL.revokeObjectURL(runtimeUrl);
    URL.revokeObjectURL(modelUrl);
  }
}

export function loadSegmenter(onProgress) {
  if (onProgress) report = onProgress;
  // A failed load can be tried again on the next photo.
  loading ??= load().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

export function segmentAt(segmenter, image, [x, y]) {
  const result = segmenter.segment(image, { keypoint: { x, y } });
  try {
    // MagicTouch gives one mask: how likely each pixel is part of the thing
    // at the point. Copied, since MediaPipe frees its own on close.
    return Float32Array.from(result.confidenceMasks[0].getAsFloat32Array());
  } finally {
    result.close();
  }
}
