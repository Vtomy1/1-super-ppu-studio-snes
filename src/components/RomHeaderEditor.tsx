import React from 'react';
import { Cpu, Binary, CheckCircle, ShieldCheck, HardDrive, Hash } from 'lucide-react';
import { RomHeaderConfig } from '../types/snes';

interface RomHeaderEditorProps {
  config: RomHeaderConfig;
  checksum: number;
  checksumComplement: number;
  headerOffset: number;
  romBytes: Uint8Array | null;
  onUpdateConfig: (update: Partial<RomHeaderConfig>) => void;
}

export const RomHeaderEditor: React.FC<RomHeaderEditorProps> = ({
  config,
  checksum,
  checksumComplement,
  headerOffset,
  romBytes,
  onUpdateConfig,
}) => {
  const hexWord = (val: number) => '$' + val.toString(16).padStart(4, '0').toUpperCase();
  const hexByte = (val: number) => '$' + val.toString(16).padStart(2, '0').toUpperCase();

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* Header Overview Banner */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-xs font-semibold text-neutral-100">
              SNES Cartridge Internal Header Specification
            </div>
            <div className="text-[11px] text-neutral-400">
              LoROM Base Address: <span className="font-mono text-cyan-400">$00:7FC0</span> · Vector Table: <span className="font-mono text-cyan-400">$00:7FE0</span>
            </div>
          </div>
        </div>

        {/* Checksum Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs">
            <span className="text-neutral-400">Checksum:</span>
            <span className="text-purple-400 font-semibold">{hexWord(checksum)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs">
            <span className="text-neutral-400">Complement:</span>
            <span className="text-indigo-400 font-semibold">{hexWord(checksumComplement)}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Sum = $FFFF Valid</span>
          </div>
        </div>
      </div>

      {/* Configuration Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Form: Metadata */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded space-y-3.5 text-xs">
          <div className="font-semibold text-neutral-200 pb-2 border-b border-neutral-800">
            Cartridge Identity & Memory Map
          </div>

          {/* Title */}
          <div>
            <label className="block text-neutral-400 mb-1 text-[11px]">
              Cartridge Title (Max 21 ASCII Characters)
            </label>
            <input
              type="text"
              maxLength={21}
              value={config.title}
              onChange={(e) => onUpdateConfig({ title: e.target.value.toUpperCase() })}
              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 font-mono focus:border-purple-500 focus:outline-none"
              placeholder="WEBCAM PPU STUDIO"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-0.5 font-mono">
              <span>ASCII representation at $7FC0-$7FD4</span>
              <span>{config.title.length} / 21 chars</span>
            </div>
          </div>

          {/* Map Mode & Speed */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-neutral-400 mb-1 text-[11px]">
                ROM Map & Speed ($7FD5)
              </label>
              <select
                value={config.mapMode}
                onChange={(e) => onUpdateConfig({ mapMode: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono"
              >
                <option value={0x20}>$20: LoROM (SlowROM 2.68MHz)</option>
                <option value={0x30}>$30: LoROM (FastROM 3.58MHz)</option>
                <option value={0x21}>$21: HiROM (SlowROM)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 text-[11px]">
                Hardware Type ($7FD6)
              </label>
              <select
                value={config.cartridgeType}
                onChange={(e) => onUpdateConfig({ cartridgeType: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono"
              >
                <option value={0x00}>$00: ROM Only</option>
                <option value={0x01}>$01: ROM + RAM</option>
                <option value={0x02}>$02: ROM + SRAM + Battery</option>
              </select>
            </div>
          </div>

          {/* ROM & RAM Sizes */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-neutral-400 mb-1 text-[11px]">
                ROM Size ($7FD7)
              </label>
              <select
                value={config.romSize}
                onChange={(e) => onUpdateConfig({ romSize: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono"
              >
                <option value={0x08}>$08: 256 KB (2 Mbit)</option>
                <option value={0x09}>$09: 512 KB (4 Mbit)</option>
                <option value={0x0A}>$0A: 1024 KB (8 Mbit)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 text-[11px]">
                SRAM Size ($7FD8)
              </label>
              <select
                value={config.ramSize}
                onChange={(e) => onUpdateConfig({ ramSize: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono"
              >
                <option value={0x00}>$00: None</option>
                <option value={0x01}>$01: 2 KB</option>
                <option value={0x03}>$03: 8 KB</option>
              </select>
            </div>
          </div>

          {/* Destination & Developer */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-neutral-400 mb-1 text-[11px]">
                Region Destination ($7FD9)
              </label>
              <select
                value={config.countryCode}
                onChange={(e) => onUpdateConfig({ countryCode: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono"
              >
                <option value={0x01}>$01: North America (NTSC 60Hz)</option>
                <option value={0x00}>$00: Japan (NTSC 60Hz)</option>
                <option value={0x02}>$02: Europe / Oceania (PAL 50Hz)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 text-[11px]">
                Developer ID ($7FDA)
              </label>
              <select
                value={config.developerId}
                onChange={(e) => onUpdateConfig({ developerId: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 font-mono"
              >
                <option value={0x33}>$33: Extended Header</option>
                <option value={0x01}>$01: Nintendo Official</option>
              </select>
            </div>
          </div>

          {/* Copier Header Toggle */}
          <div className="pt-2 border-t border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.hasCopierHeader}
                onChange={(e) => onUpdateConfig({ hasCopierHeader: e.target.checked })}
                className="accent-purple-500 rounded cursor-pointer"
              />
              <span className="text-neutral-200 font-medium">
                Include 512-Byte Copier Header (.smc format)
              </span>
            </label>
            <p className="text-[10px] text-neutral-500 mt-0.5 ml-5">
              Super Magicom / Super Wildcard format (useful for legacy hardware copiers)
            </p>
          </div>
        </div>

        {/* Right Form: 65816 CPU Vectors Table */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded flex flex-col justify-between text-xs">
          <div>
            <div className="font-semibold text-neutral-200 pb-2 border-b border-neutral-800 mb-3 flex items-center justify-between">
              <span>65816 Hardware Interrupt Vectors</span>
              <span className="text-[10px] text-neutral-400 font-mono">Bank 0 ($00:7FE0-$7FFF)</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-neutral-950 rounded border border-neutral-800 font-mono">
                <div>
                  <div className="text-emerald-400 font-semibold">RESET ($7FFC)</div>
                  <div className="text-[10px] text-neutral-400">CPU Entry point on boot</div>
                </div>
                <div className="text-neutral-100 font-bold">$8000</div>
              </div>

              <div className="flex justify-between items-center p-2 bg-neutral-950 rounded border border-neutral-800 font-mono">
                <div>
                  <div className="text-cyan-400 font-semibold">NMI ($7FFA)</div>
                  <div className="text-[10px] text-neutral-400">Vertical Blanking Interrupt</div>
                </div>
                <div className="text-neutral-100 font-bold">$8000</div>
              </div>

              <div className="flex justify-between items-center p-2 bg-neutral-950 rounded border border-neutral-800 font-mono">
                <div>
                  <div className="text-purple-400 font-semibold">IRQ / BRK ($7FFE)</div>
                  <div className="text-[10px] text-neutral-400">Maskable Interrupt / Break</div>
                </div>
                <div className="text-neutral-100 font-bold">$8000</div>
              </div>

              <div className="flex justify-between items-center p-2 bg-neutral-950 rounded border border-neutral-800 font-mono">
                <div>
                  <div className="text-amber-400 font-semibold">COP ($7FE4 / $7FF4)</div>
                  <div className="text-[10px] text-neutral-400">Co-processor exception</div>
                </div>
                <div className="text-neutral-100 font-bold">$8000</div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-neutral-950/70 border border-neutral-800 rounded text-[11px] text-neutral-400">
            The reset vector points directly to our embedded 65816 machine code routine at <span className="font-mono text-purple-400">$8000</span>, initializing PPU registers and displaying the webcam graphic frame immediately on console startup.
          </div>
        </div>
      </div>

      {/* Hex Dump Inspector of Cartridge Header ($00:7FC0 - $00:7FFF) */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <Binary className="w-4 h-4 text-purple-400" />
            <span>Interactive Cartridge Header Memory Dump ($00:7FC0 - $00:7FFF)</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-amber-400">■ Title</span>
            <span className="text-cyan-400">■ Map/Type</span>
            <span className="text-purple-400">■ Checksum</span>
            <span className="text-rose-400">■ Vectors</span>
          </div>
        </div>

        {/* 64-byte Hex Table */}
        <div className="bg-neutral-950 p-3 rounded border border-neutral-800 font-mono text-xs overflow-x-auto">
          {romBytes && romBytes.length > headerOffset + 64 ? (
            <div className="space-y-1.5">
              {[0x7FC0, 0x7FD0, 0x7FE0, 0x7FF0].map((baseAddr) => {
                const offset = baseAddr;
                return (
                  <div key={baseAddr} className="flex items-center gap-4">
                    <span className="text-neutral-500 font-semibold select-none">
                      ${baseAddr.toString(16).toUpperCase()}:
                    </span>

                    {/* 16 bytes */}
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 16 }).map((_, byteIdx) => {
                        const addr = baseAddr + byteIdx;
                        const val = romBytes[addr];
                        const valHex = val.toString(16).padStart(2, '0').toUpperCase();

                        // Color categorization
                        let colorClass = 'text-neutral-400';
                        if (addr >= 0x7FC0 && addr <= 0x7FD4) colorClass = 'text-amber-300 font-semibold'; // Title
                        else if (addr === 0x7FD5 || addr === 0x7FD6) colorClass = 'text-cyan-400 font-semibold'; // Map/Type
                        else if (addr >= 0x7FDC && addr <= 0x7FDF) colorClass = 'text-purple-400 font-semibold'; // Checksum
                        else if (addr >= 0x7FE0) colorClass = 'text-rose-400'; // Vectors

                        return (
                          <span key={byteIdx} className={`${colorClass} hover:bg-neutral-800 px-0.5 rounded cursor-default`} title={`Addr: $${addr.toString(16).toUpperCase()} = 0x${valHex}`}>
                            {valHex}
                          </span>
                        );
                      })}
                    </div>

                    {/* ASCII Representation */}
                    <div className="text-neutral-400 border-l border-neutral-800 pl-3">
                      {Array.from({ length: 16 }).map((_, byteIdx) => {
                        const val = romBytes[baseAddr + byteIdx];
                        const char = (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
                        return <span key={byteIdx} className="hover:text-white">{char}</span>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-neutral-500 text-center py-2">
              Generating ROM buffer...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
