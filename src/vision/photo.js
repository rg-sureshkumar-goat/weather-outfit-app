// A closet photo, read on the device (R15–R18). Nothing is uploaded.
//
// preparePhoto(fileOrBlob) -> { photo, colors, canvas }
//   The photo shrunk so its longer side is at most 1280 px, as a JPEG, with
//   colors sampled from its middle, leaving out the background seen at its
//   edges. This is what's kept when there's no cut-out.
// cutOut(canvas, segmenter) -> { photo, colors } or null
//   The item cut out of the photo by MagicTouch (R16), as a PNG with a clear
//   background cropped to the item, and colors sampled from inside it (R17).
//   null when no outline looks like the item (vision/cutout.js).
// frameFromVideo(video) -> Blob   (the camera's current frame)

import { sampleColors, centerPixels, edgePixels } from './colors.js';
import { PROBES, chooseOutline } from './cutout.js';
import { segmentAt } from './segmenter.js';

export const MAX_SIDE = 1280;
// MagicTouch looks at a copy at most this size; it works at 512 px inside.
const PROBE_SIDE = 512;
// The kept cut-out's longer side.
const CUTOUT_SIDE = 960;

// Decoding through an <img> applies the photo's EXIF orientation, so
// portrait phone photos come out upright. It waits for the load event, not
// img.decode(), which never settles while the page is hidden (as it can be
// behind the phone's photo picker).
async function decode(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, type = 'image/jpeg') => new Promise((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The photo could not be saved.'))), type, 0.85);
});

// A canvas holding the source, shrunk so its longer side is at most `side`.
function draw(source, width, height, side = MAX_SIDE) {
  const scale = Math.min(1, side / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

export async function preparePhoto(file) {
  let img;
  try {
    img = await decode(file);
  } catch {
    throw new Error("That file couldn't be opened as a photo. Try a JPEG or PNG.");
  }
  const { canvas, ctx } = draw(img, img.naturalWidth, img.naturalHeight);
  const background = sampleColors(edgePixels(ctx, canvas.width, canvas.height), { step: 2 }).base;
  const colors = sampleColors(centerPixels(ctx, canvas.width, canvas.height), { step: 2, background });
  return { photo: await toBlob(canvas), colors, canvas };
}

// The photo inside the outline, cropped to the item with a small margin.
async function drawCutout(canvas, { mask, stats }, mw, mh) {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mw;
  maskCanvas.height = mh;
  const maskCtx = maskCanvas.getContext('2d');
  const pixels = maskCtx.createImageData(mw, mh);
  for (let i = 0; i < mask.length; i += 1) pixels.data[i * 4 + 3] = mask[i] * 255;
  maskCtx.putImageData(pixels, 0, 0);

  // The box in mask pixels, then in photo pixels.
  const margin = Math.round(0.02 * Math.max(mw, mh));
  const bx = Math.max(0, stats.box.x - margin);
  const by = Math.max(0, stats.box.y - margin);
  const bw = Math.min(mw, stats.box.x + stats.box.w + margin) - bx;
  const bh = Math.min(mh, stats.box.y + stats.box.h + margin) - by;
  const sx = canvas.width / mw;
  const sy = canvas.height / mh;
  const scale = Math.min(1, CUTOUT_SIDE / Math.max(bw * sx, bh * sy));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(bw * sx * scale));
  out.height = Math.max(1, Math.round(bh * sy * scale));
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, bx * sx, by * sy, bw * sx, bh * sy, 0, 0, out.width, out.height);
  // Scaling the mask up smooths its stair-stepped edge.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, bx, by, bw, bh, 0, 0, out.width, out.height);
  const colors = sampleColors(ctx.getImageData(0, 0, out.width, out.height).data, { step: 2 });
  return { photo: await toBlob(out, 'image/png'), colors };
}

// A pause that lets the page draw and respond to taps.
const breather = () => new Promise((resolve) => { setTimeout(resolve, 0); });

export async function cutOut(canvas, segmenter) {
  const { canvas: small, ctx } = draw(canvas, canvas.width, canvas.height, PROBE_SIDE);
  // One point at a time, with a pause after each, so the screen stays
  // responsive while the User picks a type.
  const answers = [];
  for (const point of PROBES) {
    answers.push({ point, confidence: segmentAt(segmenter, small, point) });
    await breather();
  }
  const outline = chooseOutline(answers, small.width, small.height, ctx.getImageData(0, 0, small.width, small.height).data);
  return outline ? drawCutout(canvas, outline, small.width, small.height) : null;
}

export function frameFromVideo(video) {
  const { canvas } = draw(video, video.videoWidth, video.videoHeight);
  return toBlob(canvas);
}
