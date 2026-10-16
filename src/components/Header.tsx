import React from 'react';
import { Download, Tv, Cpu, Palette, FileCode, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'feed' | 'tiles' | 'palette' | 'rom' | 'export';
  setActiveTab: (tab: 'feed' | 'tiles' | 'palette' | 'rom' | 'export') => void;
  onDownloadRom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadRom,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 shrink-0 sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-7 h-7 rounded-sm bg-gradient-to-tr from-purple-700 via-indigo-600 to-rose-500 flex items-center justify-center font-bold text-xs text-white shadow-inner">
          16b
        </div>
        <span className="text-base font-semibold tracking-tight text-neutral-100">
          Super PPU Studio
        </span>
      </div>

      {/* Zone 2: 4–5 single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'feed' ? 'text-white border-b-2 border-purple-500 py-1' : 'hover:text-neutral-200'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Live PPU Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('tiles')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tiles' ? 'text-white border-b-2 border-purple-500 py-1' : 'hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>PPU Tiles & VRAM</span>
        </button>

        <button
          onClick={() => setActiveTab('palette')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'palette' ? 'text-white border-b-2 border-purple-500 py-1' : 'hover:text-neutral-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>CGRAM Palette</span>
        </button>

        <button
          onClick={() => setActiveTab('rom')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rom' ? 'text-white border-b-2 border-purple-500 py-1' : 'hover:text-neutral-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ROM Header ($7FC0)</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'export' ? 'text-white border-b-2 border-purple-500 py-1' : 'hover:text-neutral-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>65816 ASM & Export</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onDownloadRom}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded transition-colors whitespace-nowrap shadow-sm shadow-purple-900/40"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download .SFC ROM</span>
        </button>
      </div>
    </header>
  );
};
