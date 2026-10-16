import { SnesMode, TileData, TilemapEntry } from '../types/snes';

// Convert an 8x8 pixel tile into authentic SNES 4bpp Planar Interleaved binary format (32 bytes)
export function encode4bppTile(pixels: Uint8Array): Uint8Array {
  // pixels has 64 entries (indices 0..15)
  const bytes = new Uint8Array(32);

  for (let row = 0; row < 8; row++) {
    let p0 = 0;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;

    for (let col = 0; col < 8; col++) {
      const px = pixels[row * 8 + col] & 0x0F;
      const bitMask = 1 << (7 - col);

      if (px & 0x01) p0 |= bitMask;
      if (px & 0x02) p1 |= bitMask;
      if (px & 0x04) p2 |= bitMask;
      if (px & 0x08) p3 |= bitMask;
    }

    // Planes 0 and 1 interleaved in bytes 0..15
    bytes[row * 2] = p0;
    bytes[row * 2 + 1] = p1;

    // Planes 2 and 3 interleaved in bytes 16..31
    bytes[16 + row * 2] = p2;
    bytes[16 + row * 2 + 1] = p3;
  }

  return bytes;
}

// Convert an 8x8 pixel tile into authentic SNES 2bpp Planar Interleaved binary format (16 bytes)
export function encode2bppTile(pixels: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(16);

  for (let row = 0; row < 8; row++) {
    let p0 = 0;
    let p1 = 0;

    for (let col = 0; col < 8; col++) {
      const px = pixels[row * 8 + col] & 0x03;
      const bitMask = 1 << (7 - col);

      if (px & 0x01) p0 |= bitMask;
      if (px & 0x02) p1 |= bitMask;
    }

    bytes[row * 2] = p0;
    bytes[row * 2 + 1] = p1;
  }

  return bytes;
}

// Convert an 8x8 pixel tile into authentic SNES 8bpp Planar Interleaved binary format (64 bytes)
export function encode8bppTile(pixels: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(64);

  for (let row = 0; row < 8; row++) {
    let p0 = 0, p1 = 0, p2 = 0, p3 = 0;
    let p4 = 0, p5 = 0, p6 = 0, p7 = 0;

    for (let col = 0; col < 8; col++) {
      const px = pixels[row * 8 + col];
      const bitMask = 1 << (7 - col);

      if (px & 0x01) p0 |= bitMask;
      if (px & 0x02) p1 |= bitMask;
      if (px & 0x04) p2 |= bitMask;
      if (px & 0x08) p3 |= bitMask;
      if (px & 0x10) p4 |= bitMask;
      if (px & 0x20) p5 |= bitMask;
      if (px & 0x40) p6 |= bitMask;
      if (px & 0x80) p7 |= bitMask;
    }

    bytes[row * 2] = p0;
    bytes[row * 2 + 1] = p1;
    bytes[16 + row * 2] = p2;
    bytes[16 + row * 2 + 1] = p3;
    bytes[32 + row * 2] = p4;
    bytes[32 + row * 2 + 1] = p5;
    bytes[48 + row * 2] = p6;
    bytes[48 + row * 2 + 1] = p7;
  }

  return bytes;
}

// Decode a 4bpp planar tile back to 64 pixel indices
export function decode4bppTile(planar: Uint8Array): Uint8Array {
  const pixels = new Uint8Array(64);

  for (let row = 0; row < 8; row++) {
    const p0 = planar[row * 2];
    const p1 = planar[row * 2 + 1];
    const p2 = planar[16 + row * 2];
    const p3 = planar[16 + row * 2 + 1];

    for (let col = 0; col < 8; col++) {
      const bitMask = 1 << (7 - col);
      let val = 0;
      if (p0 & bitMask) val |= 0x01;
      if (p1 & bitMask) val |= 0x02;
      if (p2 & bitMask) val |= 0x04;
      if (p3 & bitMask) val |= 0x08;
      pixels[row * 8 + col] = val;
    }
  }

  return pixels;
}

// Extract 8x8 tile pixels from full 256x224 frame
export function extractTilePixels(
  indexedFrame: Uint8Array,
  tileCol: number,
  tileRow: number,
  frameWidth: number = 256
): Uint8Array {
  const tile = new Uint8Array(64);
  const startX = tileCol * 8;
  const startY = tileRow * 8;

  for (let y = 0; y < 8; y++) {
    const rowOffset = (startY + y) * frameWidth + startX;
    for (let x = 0; x < 8; x++) {
      tile[y * 8 + x] = indexedFrame[rowOffset + x];
    }
  }

  return tile;
}

// Generate unique hash string for an 8x8 tile
export function getTileHash(pixels: Uint8Array): string {
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += pixels[i].toString(16);
  }
  return hash;
}

// Flip tile horizontally
export function flipTileH(pixels: Uint8Array): Uint8Array {
  const flipped = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      flipped[y * 8 + x] = pixels[y * 8 + (7 - x)];
    }
  }
  return flipped;
}

// Flip tile vertically
export function flipTileV(pixels: Uint8Array): Uint8Array {
  const flipped = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      flipped[y * 8 + x] = pixels[(7 - y) * 8 + x];
    }
  }
  return flipped;
}

export interface TileAnalysisResult {
  tilemap: TilemapEntry[];
  uniqueTiles: TileData[];
  tileUsageCount: number[];
  tileLocationMap: number[][]; // index in uniqueTiles -> array of tilemap indices
  totalTiles: number;
  uniqueTileCount: number;
  vramBytes: number;
  compressionPercent: number;
}

// Analyze full 256x224 screen, deduplicate tiles, and construct authentic SNES VRAM tilemap
export function analyzeAndDeduplicateTiles(
  indexedFrame: Uint8Array,
  mode: SnesMode,
  enableDeduplication: boolean = true,
  enableFlips: boolean = true
): TileAnalysisResult {
  const cols = 32;
  const rows = 28; // 256x224 resolution: 32 * 8 = 256, 28 * 8 = 224
  const totalTiles = cols * rows; // 896 tiles

  const tilemap: TilemapEntry[] = [];
  const uniqueTiles: TileData[] = [];
  const hashMap = new Map<string, { tileIdx: number; hFlip: boolean; vFlip: boolean }>();
  const tileUsageCount: number[] = [];
  const tileLocationMap: number[][] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tilemapIndex = row * cols + col;
      const rawPixels = extractTilePixels(indexedFrame, col, row, 256);
      const baseHash = getTileHash(rawPixels);

      let targetTileIdx = -1;
      let matchedHFlip = false;
      let matchedVFlip = false;

      if (enableDeduplication && hashMap.has(baseHash)) {
        const match = hashMap.get(baseHash)!;
        targetTileIdx = match.tileIdx;
        matchedHFlip = match.hFlip;
        matchedVFlip = match.vFlip;
      } else if (enableDeduplication && enableFlips) {
        // Check Horizontal flip
        const hFlipped = flipTileH(rawPixels);
        const hHash = getTileHash(hFlipped);
        if (hashMap.has(hHash)) {
          const match = hashMap.get(hHash)!;
          targetTileIdx = match.tileIdx;
          matchedHFlip = !match.hFlip;
          matchedVFlip = match.vFlip;
        } else {
          // Check Vertical flip
          const vFlipped = flipTileV(rawPixels);
          const vHash = getTileHash(vFlipped);
          if (hashMap.has(vHash)) {
            const match = hashMap.get(vHash)!;
            targetTileIdx = match.tileIdx;
            matchedHFlip = match.hFlip;
            matchedVFlip = !match.vFlip;
          }
        }
      }

      if (targetTileIdx === -1) {
        // Register new unique tile
        targetTileIdx = uniqueTiles.length;
        
        let planarBytes: Uint8Array;
        if (mode === 'mode0') {
          planarBytes = encode2bppTile(rawPixels);
        } else if (mode === 'mode3' || mode === 'mode7') {
          planarBytes = encode8bppTile(rawPixels);
        } else {
          // Mode 1 (4bpp default)
          planarBytes = encode4bppTile(rawPixels);
        }

        const newTile: TileData = {
          id: targetTileIdx,
          pixels: rawPixels,
          planarBytes,
          hash: baseHash,
        };

        uniqueTiles.push(newTile);
        tileUsageCount.push(0);
        tileLocationMap.push([]);

        if (enableDeduplication) {
          hashMap.set(baseHash, { tileIdx: targetTileIdx, hFlip: false, vFlip: false });
        }
      }

      // Record occurrence
      tileUsageCount[targetTileIdx]++;
      tileLocationMap[targetTileIdx].push(tilemapIndex);

      // SNES Tilemap Word:
      // Bit 15: V Flip
      // Bit 14: H Flip
      // Bit 13: Priority
      // Bits 10-12: Subpalette (0..7)
      // Bits 0-9: Tile Number (0..1023)
      const paletteIndex = 0;
      const priority = false;
      const rawWord = 
        ((matchedVFlip ? 1 : 0) << 15) |
        ((matchedHFlip ? 1 : 0) << 14) |
        ((priority ? 1 : 0) << 13) |
        ((paletteIndex & 0x07) << 10) |
        (targetTileIdx & 0x03FF);

      tilemap.push({
        tileIndex: targetTileIdx,
        paletteIndex,
        priority,
        hFlip: matchedHFlip,
        vFlip: matchedVFlip,
        rawWord,
      });
    }
  }

  // Calculate memory metrics
  const bytesPerTile = mode === 'mode0' ? 16 : (mode === 'mode3' || mode === 'mode7') ? 64 : 32;
  const tilemapBytes = totalTiles * 2; // 896 * 2 = 1,792 bytes
  const uniqueTileBytes = uniqueTiles.length * bytesPerTile;
  const vramBytes = uniqueTileBytes + tilemapBytes;

  const rawBytes = totalTiles * bytesPerTile + tilemapBytes;
  const compressionPercent = Math.max(0, Math.round(((rawBytes - vramBytes) / rawBytes) * 100));

  return {
    tilemap,
    uniqueTiles,
    tileUsageCount,
    tileLocationMap,
    totalTiles,
    uniqueTileCount: uniqueTiles.length,
    vramBytes,
    compressionPercent,
  };
}
