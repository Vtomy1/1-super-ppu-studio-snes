import { DitherAlgorithm, SnesColor } from '../types/snes';
import { findClosestColorIndex } from './snesColor';

// Bayer 4x4 threshold matrix (normalized to -0.5 .. +0.5)
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
].map(row => row.map(v => (v / 16 - 0.5)));

// Bayer 8x8 threshold matrix
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
].map(row => row.map(v => (v / 64 - 0.5)));

export interface DitherResult {
  indexedPixels: Uint8Array; // width * height palette indices
  outputImageData: ImageData; // rendered RGB pixels
}

export function processDither(
  sourceImage: ImageData,
  palette: SnesColor[],
  algorithm: DitherAlgorithm,
  strength: number = 1.0,
  brightness: number = 0,
  contrast: number = 1.0
): DitherResult {
  const width = sourceImage.width;
  const height = sourceImage.height;
  const src = sourceImage.data;

  const indexedPixels = new Uint8Array(width * height);
  const outputImageData = new ImageData(width, height);
  const out = outputImageData.data;

  // Float buffers for error diffusion or matrix modifications
  const rBuf = new Float32Array(width * height);
  const gBuf = new Float32Array(width * height);
  const bBuf = new Float32Array(width * height);

  // Apply brightness, contrast & copy to float buffer
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    let r = src[i];
    let g = src[i + 1];
    let b = src[i + 2];

    // Contrast
    if (contrast !== 1.0) {
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
    }

    // Brightness
    r += brightness * 255;
    g += brightness * 255;
    b += brightness * 255;

    rBuf[p] = Math.max(0, Math.min(255, r));
    gBuf[p] = Math.max(0, Math.min(255, g));
    bBuf[p] = Math.max(0, Math.min(255, b));
  }

  // Handle Bayer or Checkerboard (ordered / non-diffusive)
  if (algorithm === 'bayer4' || algorithm === 'bayer8' || algorithm === 'checkerboard' || algorithm === 'none') {
    const ditherRange = 48 * strength;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        let r = rBuf[p];
        let g = gBuf[p];
        let b = bBuf[p];

        if (algorithm === 'bayer4') {
          const m = BAYER_4X4[y % 4][x % 4] * ditherRange;
          r += m; g += m; b += m;
        } else if (algorithm === 'bayer8') {
          const m = BAYER_8X8[y % 8][x % 8] * ditherRange;
          r += m; g += m; b += m;
        } else if (algorithm === 'checkerboard') {
          // Classic SNES pseudo-transparency alternating check
          const isCheck = ((x + y) & 1) === 1;
          const offset = (isCheck ? 22 : -22) * strength;
          r += offset; g += offset; b += offset;
        }

        const cr = Math.max(0, Math.min(255, r));
        const cg = Math.max(0, Math.min(255, g));
        const cb = Math.max(0, Math.min(255, b));

        const colorIdx = findClosestColorIndex(cr, cg, cb, palette);
        indexedPixels[p] = colorIdx;

        const [or, og, ob] = palette[colorIdx].rgb8;
        const outIdx = p * 4;
        out[outIdx] = or;
        out[outIdx + 1] = og;
        out[outIdx + 2] = ob;
        out[outIdx + 3] = 255;
      }
    }

    return { indexedPixels, outputImageData };
  }

  // Handle Error Diffusion Dithering (Floyd-Steinberg, Atkinson, Sierra)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const curR = Math.max(0, Math.min(255, rBuf[p]));
      const curG = Math.max(0, Math.min(255, gBuf[p]));
      const curB = Math.max(0, Math.min(255, bBuf[p]));

      const colorIdx = findClosestColorIndex(curR, curG, curB, palette);
      indexedPixels[p] = colorIdx;

      const [or, og, ob] = palette[colorIdx].rgb8;
      const outIdx = p * 4;
      out[outIdx] = or;
      out[outIdx + 1] = og;
      out[outIdx + 2] = ob;
      out[outIdx + 3] = 255;

      const errR = (curR - or) * strength;
      const errG = (curG - og) * strength;
      const errB = (curB - ob) * strength;

      if (algorithm === 'floyd-steinberg') {
        // x+1, y: 7/16
        if (x + 1 < width) {
          const idx = p + 1;
          rBuf[idx] += (errR * 7) / 16;
          gBuf[idx] += (errG * 7) / 16;
          bBuf[idx] += (errB * 7) / 16;
        }
        // x-1, y+1: 3/16
        if (x - 1 >= 0 && y + 1 < height) {
          const idx = (y + 1) * width + (x - 1);
          rBuf[idx] += (errR * 3) / 16;
          gBuf[idx] += (errG * 3) / 16;
          bBuf[idx] += (errB * 3) / 16;
        }
        // x, y+1: 5/16
        if (y + 1 < height) {
          const idx = (y + 1) * width + x;
          rBuf[idx] += (errR * 5) / 16;
          gBuf[idx] += (errG * 5) / 16;
          bBuf[idx] += (errB * 5) / 16;
        }
        // x+1, y+1: 1/16
        if (x + 1 < width && y + 1 < height) {
          const idx = (y + 1) * width + (x + 1);
          rBuf[idx] += (errR * 1) / 16;
          gBuf[idx] += (errG * 1) / 16;
          bBuf[idx] += (errB * 1) / 16;
        }
      } else if (algorithm === 'atkinson') {
        // Atkinson spreads 1/8 each to 6 neighbors (retaining 2/8, preserving sharp high-contrast edges)
        const spreadAtk = (dx: number, dy: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = ny * width + nx;
            rBuf[idx] += errR * 0.125;
            gBuf[idx] += errG * 0.125;
            bBuf[idx] += errB * 0.125;
          }
        };
        spreadAtk(1, 0);
        spreadAtk(2, 0);
        spreadAtk(-1, 1);
        spreadAtk(0, 1);
        spreadAtk(1, 1);
        spreadAtk(0, 2);
      } else if (algorithm === 'sierra') {
        // Sierra 2-row
        const spreadSie = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = ny * width + nx;
            rBuf[idx] += (errR * factor) / 16;
            gBuf[idx] += (errG * factor) / 16;
            bBuf[idx] += (errB * factor) / 16;
          }
        };
        spreadSie(1, 0, 4);
        spreadSie(2, 0, 3);
        spreadSie(-2, 1, 1);
        spreadSie(-1, 1, 2);
        spreadSie(0, 1, 3);
        spreadSie(1, 1, 2);
        spreadSie(2, 1, 1);
      }
    }
  }

  return { indexedPixels, outputImageData };
}
