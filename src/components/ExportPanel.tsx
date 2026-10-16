import React, { useState } from 'react';
import { Download, FileCode, Check, Copy, HardDrive, Terminal, Code } from 'lucide-react';
import { RomHeaderConfig, SnesColor, TileData } from '../types/snes';
import { generateAsmSource, generateCHeader } from '../utils/snesRom';

interface ExportPanelProps {
  config: RomHeaderConfig;
  palette: SnesColor[];
  uniqueTiles: TileData[];
  sfcBlob: Blob | null;
  smcBlob: Blob | null;
  onDownloadSfc: () => void;
  onDownloadSmc: () => void;
  onDownloadVram: () => void;
  onDownloadPal: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  config,
  palette,
  uniqueTiles,
  onDownloadSfc,
  onDownloadSmc,
  onDownloadVram,
  onDownloadPal,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'asm' | 'c'>('asm');
  const [copiedCode, setCopiedCode] = useState(false);

  const asmCode = React.useMemo(() => {
    return generateAsmSource(config, palette, uniqueTiles);
  }, [config, palette, uniqueTiles]);

  const cCode = React.useMemo(() => {
    return generateCHeader(palette, uniqueTiles);
  }, [palette, uniqueTiles]);

  const currentCode = activeCodeTab === 'asm' ? asmCode : cCode;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCodeFile = () => {
    const filename = activeCodeTab === 'asm' ? `${config.title.trim().toLowerCase() || 'snes_frame'}.asm` : 'snes_frame.h';
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* Download Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. SFC ROM */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex flex-col justify-between">
          <div>
            <div className="font-semibold text-neutral-100 flex items-center gap-1.5 mb-1">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>Bootable .SFC ROM</span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-3">
              Standard 256KB LoROM binary ready to play in emulators (Snes9x, Ares, Mesen-S) or flashcarts.
            </p>
          </div>
          <button
            onClick={onDownloadSfc}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .SFC</span>
          </button>
        </div>

        {/* 2. SMC Copier ROM */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex flex-col justify-between">
          <div>
            <div className="font-semibold text-neutral-100 flex items-center gap-1.5 mb-1">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Copier .SMC ROM</span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-3">
              Includes 512-byte Super Magicom / Super Wildcard copier header prefix for legacy hardware.
            </p>
          </div>
          <button
            onClick={onDownloadSmc}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .SMC</span>
          </button>
        </div>

        {/* 3. VRAM Tiles (.CHR) */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex flex-col justify-between">
          <div>
            <div className="font-semibold text-neutral-100 flex items-center gap-1.5 mb-1">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Raw VRAM (.CHR)</span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-3">
              Pure binary planar interleaved tile bytes (32 bytes per tile) for custom homebrew imports.
            </p>
          </div>
          <button
            onClick={onDownloadVram}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .CHR</span>
          </button>
        </div>

        {/* 4. CGRAM Palette (.PAL) */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex flex-col justify-between">
          <div>
            <div className="font-semibold text-neutral-100 flex items-center gap-1.5 mb-1">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>CGRAM Binary (.PAL)</span>
            </div>
            <p className="text-[11px] text-neutral-400 mb-3">
              15-bit BGR555 little-endian binary color table (32 bytes = 16 colors) for graphics tools.
            </p>
          </div>
          <button
            onClick={onDownloadPal}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .PAL</span>
          </button>
        </div>
      </div>

      {/* Code Generator & Viewer Section */}
      <div className="flex-1 min-h-[360px] flex flex-col bg-neutral-900 border border-neutral-800 rounded p-4">
        {/* Code Tabs & Action Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCodeTab('asm')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeCodeTab === 'asm'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>65816 Assembly (ca65 / wla-dx)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('c')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeCodeTab === 'c'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>C Header Arrays (.h)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownloadCodeFile}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Block Container */}
        <div className="flex-1 bg-neutral-950 rounded border border-neutral-800 p-3 overflow-auto font-mono text-xs text-neutral-300 leading-relaxed select-text">
          <pre>{currentCode}</pre>
        </div>
      </div>
    </div>
  );
};
