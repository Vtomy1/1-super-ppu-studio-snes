import React, { useState } from 'react';
import { Palette, Copy, Check, Sparkles, Layers } from 'lucide-react';
import { PalettePreset, SnesColor } from '../types/snes';

interface CgramPaletteInspectorProps {
  palette: SnesColor[];
  preset: PalettePreset;
  onSelectPreset: (preset: PalettePreset) => void;
}

export const CgramPaletteInspector: React.FC<CgramPaletteInspectorProps> = ({
  palette,
  preset,
  onSelectPreset,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<SnesColor | null>(palette[0] || null);

  const handleCopy = (color: SnesColor, idx: number) => {
    navigator.clipboard.writeText(color.snesHex);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  };

  const activeColor = selectedColor || palette[0];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Preset Selection Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-neutral-200">CGRAM Palette Matrix:</span>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { id: 'adaptive', name: 'Adaptive Webcam' },
            { id: 'super-famicom', name: 'Super Famicom' },
            { id: 'super-mario', name: 'Super Mario' },
            { id: 'f-zero', name: 'F-Zero Circuit' },
            { id: 'metroid-dark', name: 'Metroid Zebes' },
            { id: 'cyberpunk', name: 'Cyberpunk 16b' },
            { id: 'gameboy-mono', name: 'Game Boy LCD' },
            { id: 'sepia', name: 'Nostalgia Sepia' },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectPreset(item.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                preset === item.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Palette View & Inspector Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column: Color Swatches Grid */}
        <div className="md:col-span-8 flex flex-col bg-neutral-900 border border-neutral-800 rounded p-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
            <span className="text-xs font-medium text-neutral-200">
              Active Subpalette 0 (16 Colors in 15-bit BGR555 Space)
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              Click to inspect / copy
            </span>
          </div>

          {/* 16-color swatches */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {palette.map((color, idx) => {
              const isSelected = activeColor === color;
              const isCopied = copiedIdx === idx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedColor(color);
                    handleCopy(color, idx);
                  }}
                  className={`flex items-center gap-3 p-2 rounded border text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-neutral-800 ring-1 ring-purple-500/50'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  }`}
                >
                  {/* Swatch square */}
                  <div
                    className="w-8 h-8 rounded-xs border border-white/10 shrink-0 shadow-sm flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{ backgroundColor: color.hex }}
                  >
                    <span className={((color.r5 + color.g5 + color.b5) > 40) ? 'text-black' : 'text-white'}>
                      {idx}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-neutral-200 font-mono">
                      {color.snesHex}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {color.hex}
                    </span>
                  </div>

                  <div className="text-neutral-500 hover:text-neutral-300">
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Color 15-bit BGR555 Math Inspector */}
        <div className="md:col-span-4 flex flex-col gap-3 bg-neutral-900 border border-neutral-800 rounded p-4">
          <div className="pb-2 border-b border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-100">
              15-Bit BGR555 Color Math
            </h3>
          </div>

          {/* Big Color Block */}
          <div
            className="w-full h-20 rounded border border-neutral-700 shadow-inner flex items-center justify-center"
            style={{ backgroundColor: activeColor.hex }}
          >
            <span
              className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                (activeColor.r5 + activeColor.g5 + activeColor.b5) > 40
                  ? 'bg-black/60 text-white'
                  : 'bg-white/80 text-black'
              }`}
            >
              {activeColor.snesHex}
            </span>
          </div>

          {/* 5-bit Component Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-red-400 font-semibold font-mono">Red (5-Bit):</span>
                <span className="font-mono text-neutral-200 tabular-nums">
                  {activeColor.r5} / 31 (8-bit: {activeColor.rgb8[0]})
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${(activeColor.r5 / 31) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-emerald-400 font-semibold font-mono">Green (5-Bit):</span>
                <span className="font-mono text-neutral-200 tabular-nums">
                  {activeColor.g5} / 31 (8-bit: {activeColor.rgb8[1]})
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(activeColor.g5 / 31) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-blue-400 font-semibold font-mono">Blue (5-Bit):</span>
                <span className="font-mono text-neutral-200 tabular-nums">
                  {activeColor.b5} / 31 (8-bit: {activeColor.rgb8[2]})
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(activeColor.b5 / 31) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Binary Word Representation */}
          <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 text-xs font-mono">
            <div className="text-[10px] text-neutral-400 mb-1">
              Raw 16-Bit Word: 0bbbbbgggggrrrrr
            </div>
            <div className="text-neutral-200 text-xs break-all">
              <span className="text-neutral-500">0</span>
              <span className="text-blue-400">{activeColor.b5.toString(2).padStart(5, '0')}</span>
              <span className="text-emerald-400">{activeColor.g5.toString(2).padStart(5, '0')}</span>
              <span className="text-red-400">{activeColor.r5.toString(2).padStart(5, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
