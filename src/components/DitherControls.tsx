import React from 'react';
import { Sliders, Grid, Repeat, SlidersHorizontal, Eye } from 'lucide-react';
import { DitherAlgorithm, SnesMode } from '../types/snes';

interface DitherControlsProps {
  mode: SnesMode;
  dither: DitherAlgorithm;
  ditherStrength: number;
  brightness: number;
  contrast: number;
  enableDeduplication: boolean;
  enableFlips: boolean;
  onUpdateMode: (mode: SnesMode) => void;
  onUpdateDither: (dither: DitherAlgorithm) => void;
  onUpdateDitherStrength: (val: number) => void;
  onUpdateBrightness: (val: number) => void;
  onUpdateContrast: (val: number) => void;
  onToggleDeduplication: () => void;
  onToggleFlips: () => void;
}

export const DitherControls: React.FC<DitherControlsProps> = ({
  mode,
  dither,
  ditherStrength,
  brightness,
  contrast,
  enableDeduplication,
  enableFlips,
  onUpdateMode,
  onUpdateDither,
  onUpdateDitherStrength,
  onUpdateBrightness,
  onUpdateContrast,
  onToggleDeduplication,
  onToggleFlips,
}) => {
  return (
    <div className="flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded p-4 text-xs">
      {/* 1. SNES PPU Graphics Mode */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>PPU Background Mode</span>
          </span>
          <span className="text-[11px] text-neutral-400 font-mono">
            {mode === 'mode1' && '4bpp · 16 colors/tile'}
            {mode === 'mode3' && '8bpp · 256 colors'}
            {mode === 'mode7' && '8bpp · Affine 3D Plane'}
            {mode === 'mode0' && '2bpp · 4 colors'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {([
            { id: 'mode1', label: 'Mode 1', sub: 'Standard 4bpp' },
            { id: 'mode7', label: 'Mode 7', sub: 'Affine 3D 8bpp' },
            { id: 'mode3', label: 'Mode 3', sub: 'Direct 8bpp' },
            { id: 'mode0', label: 'Mode 0', sub: 'Classic 2bpp' },
          ] as const).map((m) => (
            <button
              key={m.id}
              onClick={() => onUpdateMode(m.id)}
              className={`flex flex-col p-2 rounded border text-left transition-all ${
                mode === m.id
                  ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500 text-white'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <span className="font-semibold text-xs">{m.label}</span>
              <span className="text-[10px] text-neutral-400">{m.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Dithering Algorithm Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dithering Algorithm</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {([
            { id: 'floyd-steinberg', name: 'Floyd-Steinberg', note: 'Error diffusion' },
            { id: 'bayer4', name: 'Bayer 4x4', note: 'Ordered matrix' },
            { id: 'bayer8', name: 'Bayer 8x8', note: 'Fine matrix' },
            { id: 'atkinson', name: 'Atkinson', note: 'High-contrast' },
            { id: 'sierra', name: 'Sierra', note: '2-row diffusion' },
            { id: 'checkerboard', name: 'Checkerboard', note: 'Pseudo-translucency' },
            { id: 'none', name: 'None (Direct)', note: 'Pure quantization' },
          ] as const).map((d) => (
            <button
              key={d.id}
              onClick={() => onUpdateDither(d.id)}
              className={`p-2 rounded border text-left transition-all ${
                dither === d.id
                  ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500 text-white'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <div className="font-semibold text-xs">{d.name}</div>
              <div className="text-[10px] text-neutral-400">{d.note}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Dither Strength & Image Tuning Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded">
        {/* Dither Strength */}
        <div>
          <div className="flex justify-between items-center mb-1 text-neutral-300">
            <span>Dither Intensity</span>
            <span className="font-mono text-neutral-400 tabular-nums">{Math.round(ditherStrength * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={ditherStrength}
            onChange={(e) => onUpdateDitherStrength(parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
          />
        </div>

        {/* Brightness */}
        <div>
          <div className="flex justify-between items-center mb-1 text-neutral-300">
            <span>Luminance (Bias)</span>
            <span className="font-mono text-neutral-400 tabular-nums">
              {brightness > 0 ? `+${Math.round(brightness * 100)}` : Math.round(brightness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="-0.4"
            max="0.4"
            step="0.02"
            value={brightness}
            onChange={(e) => onUpdateBrightness(parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div>
          <div className="flex justify-between items-center mb-1 text-neutral-300">
            <span>Contrast</span>
            <span className="font-mono text-neutral-400 tabular-nums">{contrast.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.05"
            value={contrast}
            onChange={(e) => onUpdateContrast(parseFloat(e.target.value))}
            className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* 4. VRAM Tile Deduplication & Optimization Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableDeduplication}
              onChange={onToggleDeduplication}
              className="accent-purple-500 rounded cursor-pointer"
            />
            <span className="text-neutral-200">VRAM Tile Deduplication</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableFlips}
              onChange={onToggleFlips}
              disabled={!enableDeduplication}
              className="accent-purple-500 rounded cursor-pointer disabled:opacity-50"
            />
            <span className={`text-neutral-200 ${!enableDeduplication ? 'opacity-50' : ''}`}>
              H/V Flip Optimization
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
