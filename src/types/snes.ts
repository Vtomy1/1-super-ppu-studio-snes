export type SnesMode = 'mode1' | 'mode3' | 'mode7' | 'mode0';

export type DitherAlgorithm = 
  | 'none'
  | 'floyd-steinberg'
  | 'bayer4'
  | 'bayer8'
  | 'atkinson'
  | 'sierra'
  | 'checkerboard';

export type PalettePreset = 
  | 'adaptive'
  | 'super-famicom'
  | 'super-mario'
  | 'f-zero'
  | 'metroid-dark'
  | 'cyberpunk'
  | 'gameboy-mono'
  | 'sepia';

export interface SnesColor {
  r5: number;        // 0..31
  g5: number;        // 0..31
  b5: number;        // 0..31
  rawWord: number;   // 15-bit BGR555: (b5 << 10) | (g5 << 5) | r5
  rgb8: [number, number, number]; // [0..255, 0..255, 0..255]
  hex: string;       // e.g. "#F8A038"
  snesHex: string;   // e.g. "$1CA3"
}

export interface TileData {
  id: number;
  pixels: Uint8Array;      // 64 indices (0..15 or 0..255)
  planarBytes: Uint8Array; // 32 bytes (4bpp), 16 bytes (2bpp), or 64 bytes (8bpp)
  hash: string;
}

export interface TilemapEntry {
  tileIndex: number;       // 0..1023 in VRAM character table
  paletteIndex: number;    // 0..7
  priority: boolean;
  hFlip: boolean;
  vFlip: boolean;
  rawWord: number;         // SNES 16-bit tilemap entry
}

export interface PpuFrameData {
  width: number;           // 256
  height: number;          // 224
  mode: SnesMode;
  dither: DitherAlgorithm;
  ditherStrength: number;
  palette: SnesColor[];    // Active palette (16, 128, or 256 colors)
  subpalettes: SnesColor[][]; // 8 subpalettes of 16 colors (for Mode 1)
  tilemap: TilemapEntry[]; // 32 x 28 = 896 entries
  uniqueTiles: TileData[]; // deduplicated tiles
  tileUsageCount: number[];// occurrence count per unique tile
  tileLocationMap: number[][]; // for each unique tile, list of tilemap indices
  totalTiles: number;      // 896
  uniqueTileCount: number;
  vramBytes: number;
  compressionPercent: number;
  rawCanvasPixels: ImageData; // 256x224 RGB image for direct display
}

export interface RomHeaderConfig {
  title: string;           // 21 ASCII characters
  mapMode: number;         // 0x20 = LoROM 2.68MHz, 0x30 = LoROM FastROM 3.58MHz, 0x21 = HiROM
  cartridgeType: number;   // 0x00 = ROM only, 0x01 = ROM+RAM, 0x02 = ROM+RAM+Battery
  romSize: number;         // 0x08 = 256KB, 0x09 = 512KB, 0x0A = 1024KB
  ramSize: number;         // 0x00 = None, 0x01 = 2KB, 0x03 = 8KB
  countryCode: number;     // 0x01 = USA, 0x00 = Japan, 0x02 = Europe
  developerId: number;     // 0x33 = Extended, 0x01 = Nintendo
  version: number;         // 0x00
  hasCopierHeader: boolean;// 512-byte copier header (.smc)
}

export interface CrtSettings {
  enabled: boolean;
  scanlines: 'none' | 'light' | 'medium' | 'strong';
  curvature: boolean;
  bloom: boolean;
  phosphorMask: boolean;
  integerScale: number;    // 1, 2, 3, 4, or 0 for responsive fit
  mode7Tilt: boolean;      // 3D Mode 7 perspective view
}
