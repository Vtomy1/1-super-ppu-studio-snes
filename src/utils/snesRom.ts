import { RomHeaderConfig, SnesColor, TileData, TilemapEntry } from '../types/snes';

// Build a real, bootable SNES ROM (.sfc / .smc) embedding the captured webcam graphics
export function buildBootableSnesRom(
  config: RomHeaderConfig,
  palette: SnesColor[],
  uniqueTiles: TileData[],
  tilemap: TilemapEntry[]
): {
  sfcBlob: Blob;
  smcBlob: Blob;
  romBytes: Uint8Array;
  checksum: number;
  checksumComplement: number;
  headerOffset: number;
} {
  // Standard LoROM cartridge size: 256 KB = 262,144 bytes
  const romSizeBytes = (1 << config.romSize) * 1024; // e.g. 256KB = 262144 bytes
  const rom = new Uint8Array(romSizeBytes);

  // Fill with 0xFF (standard unprogrammed EPROM state)
  rom.fill(0xFF);

  // LoROM internal header resides at $00:7FC0 (file offset 0x7FC0)
  const headerOffset = 0x7FC0;

  // 1. Build Cartridge Title (21 bytes, padded with spaces 0x20)
  const rawTitle = (config.title.trim() || 'WEBCAM PPU STUDIO').toUpperCase().slice(0, 21);
  const paddedTitle = rawTitle.padEnd(21, ' ');
  for (let i = 0; i < 21; i++) {
    rom[headerOffset + i] = paddedTitle.charCodeAt(i);
  }

  // 2. ROM Makeup / Map Mode ($7FD5)
  rom[headerOffset + 0x15] = config.mapMode; // 0x20 = LoROM 2.68MHz, 0x30 = FastROM 3.58MHz

  // 3. Cartridge Type ($7FD6)
  rom[headerOffset + 0x16] = config.cartridgeType; // 0x00 = ROM only

  // 4. ROM Size ($7FD7)
  rom[headerOffset + 0x17] = config.romSize; // 0x08 = 256KB

  // 5. RAM Size ($7FD8)
  rom[headerOffset + 0x18] = config.ramSize; // 0x00 = None

  // 6. Country Code ($7FD9)
  rom[headerOffset + 0x19] = config.countryCode; // 0x01 = USA / NTSC

  // 7. Developer ID ($7FDA)
  rom[headerOffset + 0x1A] = config.developerId; // 0x33 = Extended

  // 8. Version ($7FDB)
  rom[headerOffset + 0x1B] = config.version; // 0x00

  // 9. Interrupt Vectors (Native and Emulation modes, $7FE0 - $7FFF)
  const codeEntry = 0x8000; // Reset handler location in Bank 0
  const view = new DataView(rom.buffer);

  // Native Mode Vectors
  view.setUint16(headerOffset + 0x24, codeEntry, true); // COP ($7FE4)
  view.setUint16(headerOffset + 0x26, codeEntry, true); // BRK ($7FE6)
  view.setUint16(headerOffset + 0x28, codeEntry, true); // ABORT ($7FE8)
  view.setUint16(headerOffset + 0x2A, codeEntry, true); // NMI ($7FEA)
  view.setUint16(headerOffset + 0x2E, codeEntry, true); // IRQ ($7FEE)

  // Emulation Mode Vectors
  view.setUint16(headerOffset + 0x34, codeEntry, true); // COP ($7FF4)
  view.setUint16(headerOffset + 0x38, codeEntry, true); // ABORT ($7FF8)
  view.setUint16(headerOffset + 0x3A, codeEntry, true); // NMI ($7FFA)
  view.setUint16(headerOffset + 0x3C, codeEntry, true); // RESET ($7FFC) - CPU Start Address!
  view.setUint16(headerOffset + 0x3E, codeEntry, true); // IRQ/BRK ($7FFE)

  // 10. Assemble 65816 Machine Code Stub into Bank 0 ($8000 -> file offset 0x0000)
  // Data offsets in Bank 0:
  // 0x0000..0x00FF: 65816 Initialization & Display Code
  // 0x0200..0x023F: CGRAM Palette data (32 bytes = 16 words)
  // 0x0300..0x09FF: Tilemap data (896 entries * 2 bytes = 1,792 bytes = 0x700 bytes)
  // 0x1000..0x7F00: Unique Character Tiles (4bpp planar, max ~500 tiles)

  const paletteDataOffset = 0x0200;
  const tilemapDataOffset = 0x0300;
  const tilesDataOffset = 0x1000;

  // Copy Palette Data (16 colors in BGR555 format = 32 bytes)
  const palCount = Math.min(palette.length, 16);
  for (let i = 0; i < palCount; i++) {
    const raw = palette[i].rawWord;
    rom[paletteDataOffset + i * 2] = raw & 0xFF;
    rom[paletteDataOffset + i * 2 + 1] = (raw >> 8) & 0xFF;
  }

  // Copy Tilemap Data (896 entries * 2 bytes = 1,792 bytes)
  for (let i = 0; i < tilemap.length && i < 896; i++) {
    const word = tilemap[i].rawWord;
    rom[tilemapDataOffset + i * 2] = word & 0xFF;
    rom[tilemapDataOffset + i * 2 + 1] = (word >> 8) & 0xFF;
  }

  // Copy Unique Tile Planar Data (each tile is 32 bytes for 4bpp)
  let curTileOffset = tilesDataOffset;
  const maxTilesToEmbed = Math.min(uniqueTiles.length, 450); // fit safely in 28KB bank 0 chunk
  for (let i = 0; i < maxTilesToEmbed; i++) {
    const planar = uniqueTiles[i].planarBytes;
    for (let b = 0; b < planar.length && (curTileOffset + b) < headerOffset; b++) {
      rom[curTileOffset + b] = planar[b];
    }
    curTileOffset += planar.length;
  }
  const totalTileBytes = maxTilesToEmbed * 32;

  // Real 65816 machine code instructions:
  let pc = 0x0000; // mapped to CPU $8000
  const emit = (...bytes: number[]) => {
    for (const b of bytes) {
      rom[pc++] = b;
    }
  };

  // CPU Initialization
  emit(0x78);             // SEI          Disable interrupts
  emit(0x18);             // CLC          Clear carry
  emit(0xFB);             // XCE          Switch 65816 from emulation to native 16-bit mode
  emit(0xC2, 0x10);       // REP #$10     16-bit Index Registers (X/Y)
  emit(0xE2, 0x20);       // SEP #$20     8-bit Accumulator (A)
  emit(0xA2, 0xFF, 0x1F); // LDX #$1FFF   Set stack pointer to $1FFF
  emit(0x9A);             // TXS

  // Force VBLANK / screen blank so we can transfer to VRAM/CGRAM
  emit(0xA9, 0x80);       // LDA #$80     INIDISP forced blank
  emit(0x8D, 0x00, 0x21); // STA $2100

  // Set BG Mode 1 (BG1 4bpp, BG2 4bpp, BG3 2bpp)
  emit(0xA9, 0x01);       // LDA #$01
  emit(0x8D, 0x05, 0x21); // STA $2105    BGMODE = 1

  // Set BG1 Screen Base Address ($0000 in VRAM, 32x32 size)
  emit(0xA9, 0x00);       // LDA #$00
  emit(0x8D, 0x07, 0x21); // STA $2107    BG1SC

  // Set BG1 Character Data Base Address ($1000 in VRAM words = $2000 bytes)
  emit(0xA9, 0x01);       // LDA #$01
  emit(0x8D, 0x0B, 0x21); // STA $210B    BG12NBA

  // Transfer CGRAM Palette: Set CGADD = $00
  emit(0xA9, 0x00);       // LDA #$00
  emit(0x8D, 0x21, 0x21); // STA $2121    CGADD = 0
  // DMA Channel 0: Transfer 32 bytes from $8200 to $2122 (CGDATA)
  emit(0xA9, 0x00);       // LDA #$00     1 register, write once
  emit(0x8D, 0x00, 0x43); // STA $4300    DMAP0
  emit(0xA9, 0x22);       // LDA #$22     Target: $2122 (CGDATA)
  emit(0x8D, 0x01, 0x43); // STA $4301    BBAD0
  emit(0xA2, 0x00, 0x82); // LDX #$8200   Source offset in Bank 0
  emit(0x8E, 0x02, 0x43); // STX $4302    A1T0L / A1T0H
  emit(0xA9, 0x00);       // LDA #$00     Bank 0
  emit(0x8D, 0x04, 0x43); // STA $4304    A1B0
  emit(0xA2, 0x20, 0x00); // LDX #$0020   Size: 32 bytes
  emit(0x8E, 0x05, 0x43); // STX $4305    DAS0L / DAS0H
  emit(0xA9, 0x01);       // LDA #$01     Trigger DMA Channel 0
  emit(0x8D, 0x0B, 0x42); // STA $420B    MDMAEN

  // Transfer Tilemap into VRAM at address $0000
  // Set VRAM word address ($2116 / $2117) = $0000
  emit(0xA9, 0x80);       // LDA #$80     Increment on high byte
  emit(0x8D, 0x15, 0x21); // STA $2115    VMAIN
  emit(0xA2, 0x00, 0x00); // LDX #$0000   VRAM dest $0000
  emit(0x8E, 0x16, 0x21); // STX $2116    VMADDL / VMADDH
  // DMA Channel 0 to VRAM ($2118 / $2119)
  emit(0xA9, 0x01);       // LDA #$01     2 registers write once ($2118, $2119)
  emit(0x8D, 0x00, 0x43); // STA $4300    DMAP0
  emit(0xA9, 0x18);       // LDA #$18     Target: $2118 (VMDATAL)
  emit(0x8D, 0x01, 0x43); // STA $4301    BBAD0
  emit(0xA2, 0x00, 0x83); // LDX #$8300   Source: tilemap at $8300
  emit(0x8E, 0x02, 0x43); // STX $4302
  emit(0xA9, 0x00);       // LDA #$00
  emit(0x8D, 0x04, 0x43); // STA $4304
  emit(0xA2, 0x00, 0x07); // LDX #$0700   Size: 1,792 bytes
  emit(0x8E, 0x05, 0x43); // STX $4305
  emit(0xA9, 0x01);       // LDA #$01
  emit(0x8D, 0x0B, 0x42); // STA $420B    Execute DMA

  // Transfer Character Tiles into VRAM at address $1000 (word address)
  emit(0xA2, 0x00, 0x10); // LDX #$1000   VRAM dest $1000
  emit(0x8E, 0x16, 0x21); // STX $2116
  emit(0xA9, 0x01);       // LDA #$01     2 registers ($2118, $2119)
  emit(0x8D, 0x00, 0x43); // STA $4300
  emit(0xA9, 0x18);       // LDA #$18
  emit(0x8D, 0x01, 0x43); // STA $4301
  emit(0xA2, 0x00, 0x90); // LDX #$9000   Source: tiles at $9000 (offset $1000 in bank 0)
  emit(0x8E, 0x02, 0x43); // STX $4302
  emit(0xA9, 0x00);       // LDA #$00
  emit(0x8D, 0x04, 0x43); // STA $4304
  emit(0xA2, totalTileBytes & 0xFF, (totalTileBytes >> 8) & 0xFF); // LDX #totalBytes
  emit(0x8E, 0x05, 0x43); // STX $4305
  emit(0xA9, 0x01);       // LDA #$01
  emit(0x8D, 0x0B, 0x42); // STA $420B    Execute DMA

  // Enable BG1 on Main Screen ($212C = $01)
  emit(0xA9, 0x01);       // LDA #$01
  emit(0x8D, 0x2C, 0x21); // STA $212C    TM

  // Turn Screen ON at Full Brightness ($2100 = $0F)
  emit(0xA9, 0x0F);       // LDA #$0F
  emit(0x8D, 0x00, 0x21); // STA $2100    INIDISP

  // Infinite wait loop
  const loopAddr = 0x8000 + pc;
  emit(0xCB);             // WAI          Wait for VBLANK
  emit(0x4C, loopAddr & 0xFF, (loopAddr >> 8) & 0xFF); // JMP loop

  // 11. Calculate Standard Nintendo Checksum and Complement
  // Reset checksum fields to zero during calculation
  rom[headerOffset + 0x1C] = 0x00;
  rom[headerOffset + 0x1D] = 0x00;
  rom[headerOffset + 0x1E] = 0x00;
  rom[headerOffset + 0x1F] = 0x00;

  let sum = 0;
  for (let i = 0; i < romSizeBytes; i++) {
    sum = (sum + rom[i]) & 0xFFFF;
  }

  const checksum = sum;
  const checksumComplement = sum ^ 0xFFFF;

  // Write Checksum Complement ($7FDC - $7FDD)
  view.setUint16(headerOffset + 0x1C, checksumComplement, true);
  // Write Checksum ($7FDE - $7FDF)
  view.setUint16(headerOffset + 0x1E, checksum, true);

  // Raw .sfc ROM blob
  const sfcBlob = new Blob([rom], { type: 'application/octet-stream' });

  // Optional 512-byte Copier Header (.smc format)
  // Super Magicom header format: 512 bytes with cartridge parameters
  const smcBuffer = new Uint8Array(512 + romSizeBytes);
  const copierHeader = new Uint8Array(512);
  // Standard SMC header flags:
  copierHeader[0] = romSizeBytes / (8 * 1024); // Size in 8KB units (e.g. 32 for 256KB)
  copierHeader[1] = 0x00;
  copierHeader[2] = 0x00;
  copierHeader[8] = 0xAA;
  copierHeader[9] = 0xBB;
  copierHeader[10] = 0x04;

  smcBuffer.set(copierHeader, 0);
  smcBuffer.set(rom, 512);
  const smcBlob = new Blob([smcBuffer], { type: 'application/octet-stream' });

  return {
    sfcBlob,
    smcBlob,
    romBytes: rom,
    checksum,
    checksumComplement,
    headerOffset,
  };
}

// Generate human-readable ca65 / wla-dx 65816 assembly source code
export function generateAsmSource(
  config: RomHeaderConfig,
  palette: SnesColor[],
  uniqueTiles: TileData[]
): string {
  const hex = (n: number, pad = 2) => '$' + n.toString(16).padStart(pad, '0').toUpperCase();

  const lines: string[] = [
    '; ====================================================================',
    `; SUPER PPU STUDIO - 65816 ASSEMBLY GENERATOR`,
    `; Cartridge Title: "${config.title.trim()}"`,
    `; Mapping: LoROM (Mode ${hex(config.mapMode)}), ROM Size: ${1 << config.romSize}KB`,
    '; Target: Super Nintendo Entertainment System (PPU 256x224)',
    '; ====================================================================',
    '',
    '.p816',
    '.i16',
    '.a8',
    '',
    '; --- SNES HARDWARE REGISTERS ---',
    'INIDISP = $2100   ; Screen Display & Brightness',
    'BGMODE  = $2105   ; BG Mode and Tile Size',
    'BG1SC   = $2107   ; BG1 Tilemap Base Address',
    'BG12NBA = $210B   ; BG1 & BG2 Character Tile Base Address',
    'VMAIN   = $2115   ; Video Port Control',
    'VMADDL  = $2116   ; VRAM Address Low',
    'VMADDH  = $2117   ; VRAM Address High',
    'VMDATAL = $2118   ; VRAM Data Write Low',
    'VMDATAH = $2119   ; VRAM Data Write High',
    'CGADD   = $2121   ; CGRAM Palette Address',
    'CGDATA  = $2122   ; CGRAM Data Write',
    'TM      = $212C   ; Main Screen Design',
    'MDMAEN  = $420B   ; DMA Enable',
    '',
    '; --- RESET ENTRY POINT ---',
    'ResetHandler:',
    '    SEI                 ; Disable Interrupts',
    '    CLC',
    '    XCE                 ; Switch to Native 16-bit Mode',
    '    REP #$10            ; 16-bit Index Registers (X, Y)',
    '    SEP #$20            ; 8-bit Accumulator (A)',
    '    LDX #$1FFF',
    '    TXS                 ; Setup Stack Pointer',
    '',
    '    ; 1. Enter Forced Blank',
    '    LDA #$80',
    '    STA INIDISP',
    '',
    '    ; 2. Configure BG Mode 1 (BG1 4bpp)',
    '    LDA #$01',
    '    STA BGMODE',
    '    LDA #$00            ; Tilemap at VRAM $0000',
    '    STA BG1SC',
    '    LDA #$01            ; Tiles at VRAM $1000',
    '    STA BG12NBA',
    '',
    '    ; 3. Transfer CGRAM Palette (32 bytes = 16 colors)',
    '    LDA #$00',
    '    STA CGADD',
    '    LDX #.loword(SnesPaletteData)',
    '    STX $4302           ; DMA Source Offset',
    '    LDA #.bankbyte(SnesPaletteData)',
    '    STA $4304           ; DMA Source Bank',
    '    LDX #$0020          ; 32 bytes',
    '    STX $4305',
    '    LDA #$22            ; Target CGDATA',
    '    STA $4301',
    '    LDA #$01',
    '    STA MDMAEN          ; Execute DMA 0',
    '',
    '    ; 4. Turn Screen ON at Full Brightness',
    '    LDA #$01',
    '    STA TM              ; Enable BG1',
    '    LDA #$0F',
    '    STA INIDISP         ; 100% Brightness',
    '',
    'MainLoop:',
    '    WAI                 ; Wait for Vertical Blanking Interrupt',
    '    JMP MainLoop',
    '',
    '; --- CGRAM 15-BIT BGR555 PALETTE ---',
    'SnesPaletteData:',
  ];

  // Palette bytes
  const palCount = Math.min(palette.length, 16);
  for (let i = 0; i < palCount; i++) {
    const raw = palette[i].rawWord;
    const low = raw & 0xFF;
    const high = (raw >> 8) & 0xFF;
    lines.push(`    .byte ${hex(low)}, ${hex(high)} ; Color ${i.toString().padStart(2, '0')}: ${palette[i].hex} (${palette[i].snesHex})`);
  }

  lines.push('');
  lines.push('; --- UNIQUE 4BPP PLANAR TILES (Preview sample) ---');
  lines.push('SnesTileData:');
  const previewTiles = Math.min(uniqueTiles.length, 8);
  for (let t = 0; t < previewTiles; t++) {
    lines.push(`    ; Tile #${t} (32 bytes planar interleaved)`);
    const planar = uniqueTiles[t].planarBytes;
    for (let r = 0; r < 8; r++) {
      const p0 = hex(planar[r * 2]);
      const p1 = hex(planar[r * 2 + 1]);
      const p2 = hex(planar[16 + r * 2]);
      const p3 = hex(planar[16 + r * 2 + 1]);
      lines.push(`    .byte ${p0}, ${p1}, ${p2}, ${p3} ; Row ${r} [P0, P1, P2, P3]`);
    }
  }

  lines.push('');
  lines.push('; (Remaining tile data and tilemap arrays available in .CHR and .VRAM exports)');
  return lines.join('\n');
}

// Generate C Header file for SNES homebrew development
export function generateCHeader(
  palette: SnesColor[],
  uniqueTiles: TileData[]
): string {
  const lines: string[] = [
    '#ifndef SNES_FRAME_DATA_H',
    '#define SNES_FRAME_DATA_H',
    '',
    '// Generated by Super PPU Studio',
    '#include <stdint.h>',
    '',
    `#define SNES_UNIQUE_TILE_COUNT ${uniqueTiles.length}`,
    '#define SNES_PALETTE_SIZE 16',
    '',
    '// 15-bit BGR555 CGRAM Palette',
    'static const uint16_t snes_palette[16] = {',
  ];

  const palCount = Math.min(palette.length, 16);
  for (let i = 0; i < palCount; i++) {
    lines.push(`    0x${palette[i].rawWord.toString(16).padStart(4, '0').toUpperCase()}, // Color ${i}: ${palette[i].hex}`);
  }
  lines.push('};');
  lines.push('');
  lines.push('// Sample 4bpp Planar Tiles (First 4 tiles)');
  lines.push('static const uint8_t snes_sample_tiles[] = {');

  const maxTiles = Math.min(uniqueTiles.length, 4);
  for (let t = 0; t < maxTiles; t++) {
    lines.push(`    // Tile #${t}`);
    const b = uniqueTiles[t].planarBytes;
    let rowStr = '    ';
    for (let i = 0; i < b.length; i++) {
      rowStr += `0x${b[i].toString(16).padStart(2, '0').toUpperCase()}, `;
      if ((i + 1) % 8 === 0 && i !== b.length - 1) {
        lines.push(rowStr);
        rowStr = '    ';
      }
    }
    if (rowStr.trim()) lines.push(rowStr);
  }

  lines.push('};');
  lines.push('');
  lines.push('#endif // SNES_FRAME_DATA_H');

  return lines.join('\n');
}
