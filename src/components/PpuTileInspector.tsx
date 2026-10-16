import React, { useState } from 'react';
import { Layers, ZoomIn, Hash, Database, HardDrive, Info } from 'lucide-react';
import { PpuFrameData, TileData } from '../types/snes';

interface PpuTileInspectorProps {
  frameData: PpuFrameData | null;
  hoveredTileIndex: number | null;
  onHoverTile: (index: number | null) => void;
}

export const PpuTileInspector: React.FC<PpuTileInspectorProps> = ({
  frameData,
  hoveredTileIndex,
  onHoverTile,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number>(0);

  if (!frameData || frameData.uniqueTiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-neutral-400 text-xs">
        <Layers className="w-8 h-8 mb-2 opacity-50" />
        <p>Awaiting PPU video frames...</p>
      </div>
    );
  }

  const selectedTile = frameData.uniqueTiles[selectedTileId] || frameData.uniqueTiles[0];
  const selectedOccurrences = frameData.tileUsageCount[selectedTile.id] || 0;
  const vramAddress = 0x1000 + selectedTile.id * (frameData.mode === 'mode0' ? 16 : 32);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* VRAM Telemetry Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-neutral-400 text-[11px] mb-0.5">Unique 8x8 Tiles</div>
          <div className="text-base font-semibold text-neutral-100 font-mono tabular-nums">
            {frameData.uniqueTileCount} <span className="text-neutral-500 text-xs font-normal">/ 1024</span>
          </div>
        </div>

        <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-neutral-400 text-[11px] mb-0.5">Deduplication Savings</div>
          <div className="text-base font-semibold text-emerald-400 font-mono tabular-nums">
            {frameData.compressionPercent}%
          </div>
        </div>

        <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-neutral-400 text-[11px] mb-0.5">VRAM Footprint</div>
          <div className="text-base font-semibold text-neutral-100 font-mono tabular-nums">
            {(frameData.vramBytes / 1024).toFixed(2)} <span className="text-neutral-500 text-xs font-normal">KB</span>
          </div>
        </div>

        <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-neutral-400 text-[11px] mb-0.5">PPU Mode</div>
          <div className="text-base font-semibold text-purple-400 font-mono uppercase">
            {frameData.mode}
          </div>
        </div>
      </div>

      {/* Main Inspector Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column: 16x16 Pattern Table VRAM Grid */}
        <div className="md:col-span-7 flex flex-col bg-neutral-900 border border-neutral-800 rounded p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <span className="text-xs font-medium text-neutral-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-neutral-400" />
              <span>VRAM Character Pattern Table (Hover to highlight screen)</span>
            </span>
            <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
              Showing {frameData.uniqueTiles.length} tiles
            </span>
          </div>

          {/* Scrollable Tile Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
              {frameData.uniqueTiles.map((tile) => {
                const isSelected = selectedTile.id === tile.id;
                const isHovered = hoveredTileIndex === tile.id;

                return (
                  <button
                    key={tile.id}
                    onMouseEnter={() => onHoverTile(tile.id)}
                    onMouseLeave={() => onHoverTile(null)}
                    onClick={() => setSelectedTileId(tile.id)}
                    className={`relative p-0.5 rounded transition-all aspect-square border ${
                      isSelected
                        ? 'border-purple-500 bg-purple-950/60 ring-1 ring-purple-500'
                        : isHovered
                        ? 'border-cyan-400 bg-cyan-950/40'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                    }`}
                    title={`Tile #${tile.id} (${frameData.tileUsageCount[tile.id] || 0} uses)`}
                  >
                    {/* 8x8 Mini Canvas Preview */}
                    <TilePreviewCanvas tile={tile} palette={frameData.palette} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Tile Microscope & 4bpp Planar Interleaved Breakdown */}
        <div className="md:col-span-5 flex flex-col gap-3 bg-neutral-900 border border-neutral-800 rounded p-3 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-100">
              <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
              <span>Tile Micro-Scope (#{selectedTile.id})</span>
            </div>
            <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
              VRAM ${vramAddress.toString(16).toUpperCase().padStart(4, '0')}
            </div>
          </div>

          {/* 16x Zoom 8x8 Pixel Grid */}
          <div className="flex items-center justify-center p-3 bg-neutral-950 rounded border border-neutral-800">
            <div className="grid grid-cols-8 gap-[1px] bg-neutral-800 p-[1px] rounded-xs shadow-inner">
              {Array.from(selectedTile.pixels).map((colorIdx, idx) => {
                const color = frameData.palette[colorIdx] || frameData.palette[0];
                return (
                  <div
                    key={idx}
                    className="w-5 h-5 flex items-center justify-center text-[9px] font-mono select-none"
                    style={{ backgroundColor: color.hex }}
                    title={`Pixel (${idx % 8}, ${Math.floor(idx / 8)}): Index ${colorIdx} (${color.snesHex})`}
                  >
                    <span 
                      className={`text-[8px] font-bold ${
                        (color.r5 + color.g5 + color.b5) > 40 ? 'text-black' : 'text-white'
                      }`}
                    >
                      {colorIdx}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tile Properties List */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-400">Screen Occurrences</span>
              <span className="font-mono text-neutral-200 tabular-nums">{selectedOccurrences} times</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-400">Planar Byte Size</span>
              <span className="font-mono text-neutral-200 tabular-nums">{selectedTile.planarBytes.length} bytes</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-800/80">
              <span className="text-neutral-400">Encoding Format</span>
              <span className="font-mono text-neutral-200">
                {frameData.mode === 'mode0' ? '2bpp Planar' : frameData.mode === 'mode3' || frameData.mode === 'mode7' ? '8bpp Planar' : '4bpp Planar Interleaved'}
              </span>
            </div>
          </div>

          {/* SNES Planar Interleaved Hex Dump */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="font-semibold text-neutral-300">SNES Planar Interleaved Memory:</span>
              <span className="text-[10px] text-neutral-500">Planes 0-1 / Planes 2-3</span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800 text-[10px] font-mono space-y-1">
              <div className="text-neutral-500 text-[9px] pb-1 border-b border-neutral-800/50">
                ROW | P0 P1 (bytes 0-15) | P2 P3 (bytes 16-31)
              </div>
              {Array.from({ length: 8 }).map((_, r) => {
                const b = selectedTile.planarBytes;
                const p0 = b[r * 2]?.toString(16).padStart(2, '0').toUpperCase() || '00';
                const p1 = b[r * 2 + 1]?.toString(16).padStart(2, '0').toUpperCase() || '00';
                const p2 = b[16 + r * 2]?.toString(16).padStart(2, '0').toUpperCase() || '00';
                const p3 = b[16 + r * 2 + 1]?.toString(16).padStart(2, '0').toUpperCase() || '00';

                return (
                  <div key={r} className="flex justify-between text-neutral-300">
                    <span className="text-neutral-500">R{r}</span>
                    <span className="text-cyan-400">{p0} {p1}</span>
                    <span className="text-neutral-600">|</span>
                    <span className="text-purple-400">{p2} {p3}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Subcomponent to render 8x8 pixel preview onto micro canvas
const TilePreviewCanvas: React.FC<{ tile: TileData; palette: any[] }> = ({ tile, palette }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = ctx.createImageData(8, 8);
    const data = img.data;

    for (let i = 0; i < 64; i++) {
      const colorIdx = tile.pixels[i];
      const color = palette[colorIdx] || palette[0];
      const [r, g, b] = color.rgb8;

      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
  }, [tile, palette]);

  return (
    <canvas
      ref={canvasRef}
      width={8}
      height={8}
      className="w-full h-full block rounded-xs"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
