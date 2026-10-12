// A closet photo, read on the device (R15, R18): shrunk so its longer side
// is at most 1280 px, saved as JPEG, and its colors sampled from the middle,
// leaving out the background seen at its edges (vision/colors.js). Until
// the cut-out (C8) the whole photo stands in for it. Nothing is uploaded.
//
// preparePhoto(fileOrBlob) -> { photo: Blob, colors: { base, print } }
// frameFromVideo(video) -> Blob   (the camera's current frame)

import { sampleColors, centerPixels, edgePixels } from './colors.js';

export const MAX_SIDE = 1280;

// Decoding through an <img> applies the photo's EXIF orientation, so
// portrait phone photos come out upright.
async function decode(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The photo could not be saved.'))), 'image/jpeg', 0.85);
});

function draw(source, width, height) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
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
  return { photo: await toBlob(canvas), colors };
}

export function frameFromVideo(video) {
  const { canvas } = draw(video, video.videoWidth, video.videoHeight);
  return toBlob(canvas);
}
