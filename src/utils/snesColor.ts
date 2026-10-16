import { SnesColor, PalettePreset } from '../types/snes';

// Convert 8-bit RGB to authentic SNES 15-bit BGR555 color
export function rgbToSnesColor(r: number, g: number, b: number): SnesColor {
  const r5 = Math.max(0, Math.min(31, Math.floor((r * 31) / 255)));
  const g5 = Math.max(0, Math.min(31, Math.floor((g * 31) / 255)));
  const b5 = Math.max(0, Math.min(31, Math.floor((b * 31) / 255)));

  // SNES 15-bit BGR555: bit 15 is 0, bits 14-10: Blue, bits 9-5: Green, bits 4-0: Red
  const rawWord = (b5 << 10) | (g5 << 5) | r5;

  // Convert quantized 5-bit components back to 8-bit display values
  const r8 = Math.round((r5 * 255) / 31);
  const g8 = Math.round((g5 * 255) / 31);
  const b8 = Math.round((b5 * 255) / 31);

  const hex = `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`.toUpperCase();
  const snesHex = `$${rawWord.toString(16).padStart(4, '0').toUpperCase()}`;

  return {
    r5,
    g5,
    b5,
    rawWord,
    rgb8: [r8, g8, b8],
    hex,
    snesHex,
  };
}

// Convert 15-bit SNES raw word to SnesColor
export function snesWordToColor(word: number): SnesColor {
  const r5 = word & 0x1F;
  const g5 = (word >> 5) & 0x1F;
  const b5 = (word >> 10) & 0x1F;

  const r8 = Math.round((r5 * 255) / 31);
  const g8 = Math.round((g5 * 255) / 31);
  const b8 = Math.round((b5 * 255) / 31);

  const hex = `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`.toUpperCase();
  const snesHex = `$${word.toString(16).padStart(4, '0').toUpperCase()}`;

  return {
    r5,
    g5,
    b5,
    rawWord: word,
    rgb8: [r8, g8, b8],
    hex,
    snesHex,
  };
}

// Fast perceptual distance formula (human eye is most sensitive to green)
export function colorDistanceSq(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8);
}

// Find closest color index in a palette
export function findClosestColorIndex(
  r: number, g: number, b: number,
  palette: SnesColor[]
): number {
  let bestDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i].rgb8;
    const dist = colorDistanceSq(r, g, b, pr, pg, pb);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
      if (dist === 0) break;
    }
  }

  return bestIdx;
}

// Fixed Iconic SNES Preset Palettes
export const SNES_PRESET_PALETTES: Record<Exclude<PalettePreset, 'adaptive'>, SnesColor[]> = {
  'super-famicom': [
    // 16 colors: Authentic Super Famicom logo and system tones
    rgbToSnesColor(16, 16, 24),    // Backdrop Dark
    rgbToSnesColor(228, 0, 43),    // Famicom Red
    rgbToSnesColor(255, 204, 0),   // Famicom Yellow
    rgbToSnesColor(0, 150, 64),    // Famicom Green
    rgbToSnesColor(0, 114, 206),   // Famicom Blue
    rgbToSnesColor(240, 240, 248),  // Console Light Gray
    rgbToSnesColor(156, 156, 172),  // Console Mid Gray
    rgbToSnesColor(88, 88, 104),   // Console Dark Gray
    rgbToSnesColor(120, 96, 176),  // SNES Purple
    rgbToSnesColor(72, 48, 128),   // SNES Dark Violet
    rgbToSnesColor(255, 128, 160),  // Peach Pink
    rgbToSnesColor(248, 168, 64),   // Warm Amber
    rgbToSnesColor(64, 216, 216),   // Cyan
    rgbToSnesColor(40, 96, 48),    // Forest Green
    rgbToSnesColor(136, 40, 32),   // Brick Red
    rgbToSnesColor(255, 255, 255),  // Pure White
  ],
  'super-mario': [
    rgbToSnesColor(92, 148, 252),  // Sky Blue
    rgbToSnesColor(0, 0, 0),        // Outline Black
    rgbToSnesColor(248, 56, 0),    // Mario Red
    rgbToSnesColor(255, 208, 176), // Skin Tone
    rgbToSnesColor(136, 112, 0),   // Dirt / Brown
    rgbToSnesColor(255, 176, 56),  // Block Gold
    rgbToSnesColor(0, 168, 0),     // Pipe Green
    rgbToSnesColor(128, 208, 16),  // Yoshi Lime
    rgbToSnesColor(248, 248, 248), // Cloud White
    rgbToSnesColor(64, 48, 32),    // Dark Soil
    rgbToSnesColor(184, 24, 24),   // Dark Red
    rgbToSnesColor(0, 80, 192),    // Blue Overalls
    rgbToSnesColor(184, 184, 184), // Stone Gray
    rgbToSnesColor(248, 120, 24),  // Fire Flower Orange
    rgbToSnesColor(48, 104, 8),    // Dark Bush Green
    rgbToSnesColor(248, 184, 0),   // Coin Yellow
  ],
  'f-zero': [
    rgbToSnesColor(8, 8, 24),      // Void Blue
    rgbToSnesColor(248, 24, 72),   // Crimson Falcon
    rgbToSnesColor(24, 216, 248),  // Neon Plasma
    rgbToSnesColor(248, 224, 32),  // Golden Track
    rgbToSnesColor(144, 32, 248),  // Cyber Violet
    rgbToSnesColor(24, 168, 48),   // Acid Green
    rgbToSnesColor(248, 120, 16),  // Turbo Flare
    rgbToSnesColor(240, 248, 255), // Laser White
    rgbToSnesColor(40, 48, 80),    // Muted Track Surface
    rgbToSnesColor(88, 96, 128),   // Asphalt Edge
    rgbToSnesColor(192, 40, 120),  // Magenta Thrust
    rgbToSnesColor(48, 128, 192),  // Deep Sonic Blue
    rgbToSnesColor(16, 72, 40),    // Dark Circuit
    rgbToSnesColor(184, 160, 40),  // Sand Drift
    rgbToSnesColor(112, 16, 32),   // Dark Crimson
    rgbToSnesColor(255, 255, 255), // Max Specular
  ],
  'metroid-dark': [
    rgbToSnesColor(12, 12, 20),    // Zebes Cavern Dark
    rgbToSnesColor(240, 160, 48),  // Varia Orange
    rgbToSnesColor(224, 40, 40),   // Power Suit Red
    rgbToSnesColor(32, 216, 96),   // Spazer Beam Green
    rgbToSnesColor(80, 160, 240),  // Ice Beam Blue
    rgbToSnesColor(176, 96, 208),  // Phazon Violet
    rgbToSnesColor(144, 120, 72),  // Crateria Rock
    rgbToSnesColor(64, 72, 80),    // Tech Wall Slate
    rgbToSnesColor(104, 128, 136), // Metallic Highlight
    rgbToSnesColor(48, 32, 64),    // Brinstar Spores
    rgbToSnesColor(240, 240, 192), // Energy Cell Pale
    rgbToSnesColor(16, 80, 80),    // Norfair Lava Steam
    rgbToSnesColor(216, 80, 24),   // Magma Orange
    rgbToSnesColor(96, 24, 48),    // Organic Flesh
    rgbToSnesColor(192, 192, 216), // Chozo Statue
    rgbToSnesColor(255, 255, 255), // Flash White
  ],
  'cyberpunk': [
    rgbToSnesColor(8, 4, 16),      // Pitch Black
    rgbToSnesColor(255, 0, 128),   // Electric Magenta
    rgbToSnesColor(0, 240, 255),   // Holo Cyan
    rgbToSnesColor(255, 224, 0),   // Neon Yellow
    rgbToSnesColor(128, 0, 255),   // Matrix Purple
    rgbToSnesColor(0, 255, 140),   // Terminal Mint
    rgbToSnesColor(255, 64, 64),   // Warning Coral
    rgbToSnesColor(240, 240, 255), // Strobe White
    rgbToSnesColor(32, 24, 48),    // Shadow Indigo
    rgbToSnesColor(64, 48, 96),    // Dark Neon Hue
    rgbToSnesColor(180, 0, 90),    // Deep Rose
    rgbToSnesColor(0, 140, 180),   // Deep Ocean Cyan
    rgbToSnesColor(180, 150, 0),   // Mustard Streetlamp
    rgbToSnesColor(40, 120, 80),   // Low Green
    rgbToSnesColor(90, 80, 110),   // Concrete Fog
    rgbToSnesColor(255, 255, 255), // High Glare
  ],
  'gameboy-mono': [
    rgbToSnesColor(15, 56, 15),    // Darkest GB Green
    rgbToSnesColor(48, 98, 48),    // Dark GB Green
    rgbToSnesColor(139, 172, 15),  // Light GB Green
    rgbToSnesColor(155, 188, 15),  // Lightest GB Green
    rgbToSnesColor(20, 64, 20),    // Intermediate shade 1
    rgbToSnesColor(35, 80, 35),    // Intermediate shade 2
    rgbToSnesColor(60, 115, 60),   // Intermediate shade 3
    rgbToSnesColor(80, 135, 80),   // Intermediate shade 4
    rgbToSnesColor(100, 150, 30),  // Intermediate shade 5
    rgbToSnesColor(120, 160, 20),  // Intermediate shade 6
    rgbToSnesColor(145, 180, 18),  // Intermediate shade 7
    rgbToSnesColor(165, 195, 25),  // Bright LCD
    rgbToSnesColor(10, 40, 10),    // Contrast deep
    rgbToSnesColor(70, 125, 45),   // Mid tone
    rgbToSnesColor(175, 205, 30),  // Full backlight
    rgbToSnesColor(190, 220, 40),  // Max glare
  ],
  'sepia': [
    rgbToSnesColor(24, 16, 12),    // Dark Sepia
    rgbToSnesColor(56, 36, 24),
    rgbToSnesColor(88, 56, 36),
    rgbToSnesColor(120, 80, 52),
    rgbToSnesColor(152, 104, 68),
    rgbToSnesColor(184, 132, 88),
    rgbToSnesColor(216, 164, 112),
    rgbToSnesColor(240, 200, 152), // Light Parchment
    rgbToSnesColor(40, 28, 20),
    rgbToSnesColor(72, 48, 32),
    rgbToSnesColor(104, 68, 44),
    rgbToSnesColor(136, 92, 60),
    rgbToSnesColor(168, 116, 76),
    rgbToSnesColor(200, 148, 100),
    rgbToSnesColor(228, 180, 132),
    rgbToSnesColor(252, 224, 184),
  ],
};

// Fast Median-Cut Color Quantization to extract N authentic SNES colors from image pixels
export function extractAdaptivePalette(
  pixels: ImageData,
  colorCount: 16 | 256 = 16
): SnesColor[] {
  const data = pixels.data;
  const samples: [number, number, number][] = [];
  
  // Sample every 4th pixel for high performance during live webcam streaming
  const step = 4 * 4;
  for (let i = 0; i < data.length; i += step) {
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }

  if (samples.length === 0) {
    return SNES_PRESET_PALETTES['super-famicom'];
  }

  // Median Cut algorithm
  interface Box {
    colors: [number, number, number][];
  }

  let boxes: Box[] = [{ colors: samples }];

  while (boxes.length < colorCount) {
    let bestBoxIdx = -1;
    let maxRange = -1;

    for (let b = 0; b < boxes.length; b++) {
      const box = boxes[b];
      if (box.colors.length <= 1) continue;

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (let c = 0; c < box.colors.length; c++) {
        const [r, g, bVal] = box.colors[c];
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (g < minG) minG = g; if (g > maxG) maxG = g;
        if (bVal < minB) minB = bVal; if (bVal > maxB) maxB = bVal;
      }

      const range = Math.max(maxR - minR, maxG - minG, maxB - minB);
      if (range > maxRange) {
        maxRange = range;
        bestBoxIdx = b;
      }
    }

    if (bestBoxIdx === -1 || maxRange <= 0) break;

    const targetBox = boxes[bestBoxIdx];
    // Find axis with maximum range
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;
    for (let c = 0; c < targetBox.colors.length; c++) {
      const [r, g, bVal] = targetBox.colors[c];
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (g < minG) minG = g; if (g > maxG) maxG = g;
      if (bVal < minB) minB = bVal; if (bVal > maxB) maxB = bVal;
    }
    const rRange = maxR - minR;
    const gRange = maxG - minG;
    const bRange = maxB - minB;
    const sortAxis = rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;

    targetBox.colors.sort((a, bVal) => a[sortAxis] - bVal[sortAxis]);
    const mid = Math.floor(targetBox.colors.length / 2);
    const boxA: Box = { colors: targetBox.colors.slice(0, mid) };
    const boxB: Box = { colors: targetBox.colors.slice(mid) };

    boxes.splice(bestBoxIdx, 1, boxA, boxB);
  }

  // Calculate average SNES color for each box
  const result: SnesColor[] = [];
  for (const box of boxes) {
    if (box.colors.length === 0) continue;
    let sumR = 0, sumG = 0, sumB = 0;
    for (const [r, g, bVal] of box.colors) {
      sumR += r; sumG += g; sumB += bVal;
    }
    const len = box.colors.length;
    result.push(rgbToSnesColor(
      Math.round(sumR / len),
      Math.round(sumG / len),
      Math.round(sumB / len)
    ));
  }

  // Pad to required color count if image had very low variance
  while (result.length < colorCount) {
    const fallback = SNES_PRESET_PALETTES['super-famicom'][result.length % 16];
    result.push(fallback);
  }

  return result.slice(0, colorCount);
}
