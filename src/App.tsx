import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CrtSettings, 
  DitherAlgorithm, 
  PalettePreset, 
  PpuFrameData, 
  RomHeaderConfig, 
  SnesColor, 
  SnesMode 
} from './types/snes';
import { 
  extractAdaptivePalette, 
  rgbToSnesColor, 
  SNES_PRESET_PALETTES 
} from './utils/snesColor';
import { processDither } from './utils/snesDither';
import { analyzeAndDeduplicateTiles } from './utils/snesTiles';
import { buildBootableSnesRom } from './utils/snesRom';
import { renderSampleFeed, SampleFeedId } from './utils/sampleFeeds';
import { Header } from './components/Header';
import { ScreenViewport } from './components/ScreenViewport';
import { DitherControls } from './components/DitherControls';
import { PpuTileInspector } from './components/PpuTileInspector';
import { CgramPaletteInspector } from './components/CgramPaletteInspector';
import { RomHeaderEditor } from './components/RomHeaderEditor';
import { ExportPanel } from './components/ExportPanel';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'feed' | 'tiles' | 'palette' | 'rom' | 'export'>('feed');

  // Input video sources
  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [selectedSampleFeed, setSelectedSampleFeed] = useState<SampleFeedId>('f-zero');
  const [mirrorWebcam, setMirrorWebcam] = useState<boolean>(true);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // SNES PPU Settings
  const [mode, setMode] = useState<SnesMode>('mode1');
  const [dither, setDither] = useState<DitherAlgorithm>('floyd-steinberg');
  const [ditherStrength, setDitherStrength] = useState<number>(0.85);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.05);
  const [palettePreset, setPalettePreset] = useState<PalettePreset>('adaptive');
  const [enableDeduplication, setEnableDeduplication] = useState<boolean>(true);
  const [enableFlips, setEnableFlips] = useState<boolean>(true);

  // CRT Screen Settings
  const [crtSettings, setCrtSettings] = useState<CrtSettings>({
    enabled: true,
    scanlines: 'medium',
    curvature: false,
    bloom: true,
    phosphorMask: false,
    integerScale: 0, // Fit
    mode7Tilt: false,
  });

  // ROM Header Config
  const [romConfig, setRomConfig] = useState<RomHeaderConfig>({
    title: 'WEBCAM PPU STUDIO   ',
    mapMode: 0x20,        // LoROM 2.68MHz
    cartridgeType: 0x00,  // ROM only
    romSize: 0x08,        // 256 KB
    ramSize: 0x00,        // None
    countryCode: 0x01,    // USA / NTSC
    developerId: 0x33,    // Extended Header
    version: 0x00,
    hasCopierHeader: false,
  });

  // Internal Frame States
  const [frameData, setFrameData] = useState<PpuFrameData | null>(null);
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(60);

  // ROM build states
  const [romBuildState, setRomBuildState] = useState<{
    sfcBlob: Blob | null;
    smcBlob: Blob | null;
    romBytes: Uint8Array | null;
    checksum: number;
    checksumComplement: number;
    headerOffset: number;
  }>({
    sfcBlob: null,
    smcBlob: null,
    romBytes: null,
    checksum: 0x0000,
    checksumComplement: 0xFFFF,
    headerOffset: 0x7FC0,
  });

  // DOM References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ppuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customImageRef = useRef<HTMLImageElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fpsCountRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: performance.now() });

  // Initialize hidden video element for webcam
  useEffect(() => {
    if (!videoRef.current) {
      const vid = document.createElement('video');
      vid.playsInline = true;
      vid.muted = true;
      videoRef.current = vid;
    }

    if (!sourceCanvasRef.current) {
      const cvs = document.createElement('canvas');
      cvs.width = 256;
      cvs.height = 224;
      sourceCanvasRef.current = cvs;
    }
  }, []);

  // Enumerate video devices
  const refreshDevices = useCallback(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoInputs);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Handle webcam stream start/stop
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (useWebcam) {
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 },
      };

      if (selectedDeviceId) {
        videoConstraints.deviceId = { exact: selectedDeviceId };
      } else {
        videoConstraints.facingMode = { ideal: cameraFacing };
      }

      navigator.mediaDevices
        ?.getUserMedia({
          video: videoConstraints,
          audio: false,
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
          setCameraError(null);
          refreshDevices();
        })
        .catch((err) => {
          console.warn('Camera access error, trying basic fallback:', err);
          navigator.mediaDevices
            ?.getUserMedia({ video: true, audio: false })
            .then((s) => {
              stream = s;
              if (videoRef.current) {
                videoRef.current.srcObject = s;
                videoRef.current.play().catch(() => {});
              }
              setCameraError(null);
              refreshDevices();
            })
            .catch((fallbackErr) => {
              console.warn('Camera fallback error, falling back to sample feed:', fallbackErr);
              setCameraError('Webcam unavailable or permission denied. Showing sample feed.');
              setUseWebcam(false);
            });
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [useWebcam, cameraFacing, selectedDeviceId, refreshDevices]);

  // Main PPU Render Loop (runs at 60Hz or throttled)
  useEffect(() => {
    let active = true;

    const renderLoop = (timeNow: number) => {
      if (!active) return;

      // Calculate real FPS
      const fpsState = fpsCountRef.current;
      fpsState.frames++;
      if (timeNow - fpsState.lastTime >= 1000) {
        setFps(fpsState.frames);
        fpsState.frames = 0;
        fpsState.lastTime = timeNow;
      }

      if (!isPaused) {
        const sourceCanvas = sourceCanvasRef.current;
        const ppuCanvas = ppuCanvasRef.current;

        if (sourceCanvas && ppuCanvas) {
          const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
          const pCtx = ppuCanvas.getContext('2d');

          if (sCtx && pCtx) {
            // 1. Draw source video / image into 256x224 source canvas
            if (useWebcam && videoRef.current && videoRef.current.readyState >= 2) {
              const vw = videoRef.current.videoWidth || 640;
              const vh = videoRef.current.videoHeight || 480;

              // Center-crop to 256x224 aspect ratio (8:7)
              const targetAspect = 256 / 224;
              let srcW = vw;
              let srcH = vw / targetAspect;
              if (srcH > vh) {
                srcH = vh;
                srcW = vh * targetAspect;
              }
              const sx = (vw - srcW) / 2;
              const sy = (vh - srcH) / 2;

              sCtx.save();
              if (mirrorWebcam) {
                sCtx.translate(256, 0);
                sCtx.scale(-1, 1);
              }
              sCtx.drawImage(videoRef.current, sx, sy, srcW, srcH, 0, 0, 256, 224);
              sCtx.restore();
            } else if (customImageRef.current) {
              // Custom uploaded image
              sCtx.drawImage(customImageRef.current, 0, 0, 256, 224);
            } else {
              // Procedural test video pattern
              renderSampleFeed(sCtx, selectedSampleFeed, timeNow);
            }

            // 2. Extract ImageData
            const srcImageData = sCtx.getImageData(0, 0, 256, 224);

            // 3. Determine SNES Palette (16 colors for Mode 1/0 or 256 colors for Mode 3/7)
            let activePalette: SnesColor[];
            const colorCount = (mode === 'mode0') ? 4 : (mode === 'mode3' || mode === 'mode7') ? 256 : 16;

            if (palettePreset === 'adaptive') {
              activePalette = extractAdaptivePalette(srcImageData, colorCount as any);
            } else {
              activePalette = SNES_PRESET_PALETTES[palettePreset] || SNES_PRESET_PALETTES['super-famicom'];
            }

            // 4. Run SNES Dithering Engine
            const ditherResult = processDither(
              srcImageData,
              activePalette,
              dither,
              ditherStrength,
              brightness,
              contrast
            );

            // 5. Draw dithered 256x224 image directly to PPU screen canvas
            pCtx.putImageData(ditherResult.outputImageData, 0, 0);

            // 6. Analyze 8x8 PPU Tiles and Deduplicate into VRAM
            const tileAnalysis = analyzeAndDeduplicateTiles(
              ditherResult.indexedPixels,
              mode,
              enableDeduplication,
              enableFlips
            );

            const newFrameData: PpuFrameData = {
              width: 256,
              height: 224,
              mode,
              dither,
              ditherStrength,
              palette: activePalette,
              subpalettes: [activePalette],
              tilemap: tileAnalysis.tilemap,
              uniqueTiles: tileAnalysis.uniqueTiles,
              tileUsageCount: tileAnalysis.tileUsageCount,
              tileLocationMap: tileAnalysis.tileLocationMap,
              totalTiles: tileAnalysis.totalTiles,
              uniqueTileCount: tileAnalysis.uniqueTileCount,
              vramBytes: tileAnalysis.vramBytes,
              compressionPercent: tileAnalysis.compressionPercent,
              rawCanvasPixels: ditherResult.outputImageData,
            };

            setFrameData(newFrameData);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    useWebcam,
    selectedSampleFeed,
    mirrorWebcam,
    isPaused,
    mode,
    dither,
    ditherStrength,
    brightness,
    contrast,
    palettePreset,
    enableDeduplication,
    enableFlips,
  ]);

  // Rebuild SNES ROM image whenever frameData or romConfig changes (debounced)
  useEffect(() => {
    if (!frameData || frameData.uniqueTiles.length === 0) return;

    const timeout = setTimeout(() => {
      try {
        const build = buildBootableSnesRom(
          romConfig,
          frameData.palette,
          frameData.uniqueTiles,
          frameData.tilemap
        );

        setRomBuildState({
          sfcBlob: build.sfcBlob,
          smcBlob: build.smcBlob,
          romBytes: build.romBytes,
          checksum: build.checksum,
          checksumComplement: build.checksumComplement,
          headerOffset: build.headerOffset,
        });
      } catch (err) {
        console.error('Failed to build SNES ROM image:', err);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [frameData, romConfig]);

  // Download Handlers
  const handleDownloadSfc = useCallback(() => {
    if (!romBuildState.sfcBlob) return;
    const url = URL.createObjectURL(romBuildState.sfcBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${romConfig.title.trim().toLowerCase() || 'webcam_ppu'}.sfc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [romBuildState.sfcBlob, romConfig.title]);

  const handleDownloadSmc = useCallback(() => {
    if (!romBuildState.smcBlob) return;
    const url = URL.createObjectURL(romBuildState.smcBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${romConfig.title.trim().toLowerCase() || 'webcam_ppu'}.smc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [romBuildState.smcBlob, romConfig.title]);

  const handleDownloadVram = useCallback(() => {
    if (!frameData) return;
    // Assemble all planar tile bytes
    const totalBytes = frameData.uniqueTiles.reduce((acc, t) => acc + t.planarBytes.length, 0);
    const buf = new Uint8Array(totalBytes);
    let offset = 0;
    for (const t of frameData.uniqueTiles) {
      buf.set(t.planarBytes, offset);
      offset += t.planarBytes.length;
    }
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiles.chr';
    a.click();
    URL.revokeObjectURL(url);
  }, [frameData]);

  const handleDownloadPal = useCallback(() => {
    if (!frameData) return;
    const buf = new Uint8Array(32);
    for (let i = 0; i < Math.min(frameData.palette.length, 16); i++) {
      const raw = frameData.palette[i].rawWord;
      buf[i * 2] = raw & 0xFF;
      buf[i * 2 + 1] = (raw >> 8) & 0xFF;
    }
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.pal';
    a.click();
    URL.revokeObjectURL(url);
  }, [frameData]);

  const handleTakeSnapshotPng = useCallback(() => {
    const canvas = ppuCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `snes_frame_${Date.now()}.png`;
    a.click();
  }, []);

  const handleToggleCameraFacing = useCallback(() => {
    setUseWebcam(true);
    setCameraFacing((prev) => {
      const next = prev === 'user' ? 'environment' : 'user';
      setMirrorWebcam(next === 'user');
      return next;
    });
    setSelectedDeviceId(null);
  }, []);

  const handleSelectCameraDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId || null);
    setUseWebcam(true);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      customImageRef.current = img;
      setUseWebcam(false);
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadRom={handleDownloadSfc}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Top Split: Live Screen Viewport (Left) + Primary Controls / Active Tab Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Screen Viewport */}
          <div className="lg:col-span-7 flex flex-col">
            <ScreenViewport
              ppuCanvasRef={ppuCanvasRef}
              hoveredTileIndex={hoveredTileIndex}
              frameData={frameData}
              isStreaming={!isPaused}
              isPaused={isPaused}
              useWebcam={useWebcam}
              selectedSampleFeed={selectedSampleFeed}
              mirrorWebcam={mirrorWebcam}
              cameraFacing={cameraFacing}
              availableCameras={availableCameras}
              selectedDeviceId={selectedDeviceId}
              crtSettings={crtSettings}
              fps={fps}
              cameraError={cameraError}
              onToggleStreaming={() => setIsPaused((prev) => !prev)}
              onTogglePause={() => setIsPaused((prev) => !prev)}
              onToggleMirror={() => setMirrorWebcam((prev) => !prev)}
              onToggleCameraFacing={handleToggleCameraFacing}
              onSelectCameraDevice={handleSelectCameraDevice}
              onSelectSample={(id) => {
                customImageRef.current = null;
                setUseWebcam(false);
                setSelectedSampleFeed(id);
              }}
              onSelectWebcam={() => {
                customImageRef.current = null;
                setUseWebcam(true);
              }}
              onFileUpload={handleFileUpload}
              onUpdateCrt={(update) => setCrtSettings((prev) => ({ ...prev, ...update }))}
              onTakeSnapshotPng={handleTakeSnapshotPng}
            />
          </div>

          {/* Right Column: Dynamic Panel based on Active Tab */}
          <div className="lg:col-span-5 flex flex-col min-h-[500px]">
            {activeTab === 'feed' && (
              <DitherControls
                mode={mode}
                dither={dither}
                ditherStrength={ditherStrength}
                brightness={brightness}
                contrast={contrast}
                enableDeduplication={enableDeduplication}
                enableFlips={enableFlips}
                onUpdateMode={setMode}
                onUpdateDither={setDither}
                onUpdateDitherStrength={setDitherStrength}
                onUpdateBrightness={setBrightness}
                onUpdateContrast={setContrast}
                onToggleDeduplication={() => setEnableDeduplication((prev) => !prev)}
                onToggleFlips={() => setEnableFlips((prev) => !prev)}
              />
            )}

            {activeTab === 'tiles' && (
              <PpuTileInspector
                frameData={frameData}
                hoveredTileIndex={hoveredTileIndex}
                onHoverTile={setHoveredTileIndex}
              />
            )}

            {activeTab === 'palette' && (
              <CgramPaletteInspector
                palette={frameData?.palette || SNES_PRESET_PALETTES['super-famicom']}
                preset={palettePreset}
                onSelectPreset={setPalettePreset}
              />
            )}

            {activeTab === 'rom' && (
              <RomHeaderEditor
                config={romConfig}
                checksum={romBuildState.checksum}
                checksumComplement={romBuildState.checksumComplement}
                headerOffset={romBuildState.headerOffset}
                romBytes={romBuildState.romBytes}
                onUpdateConfig={(update) => setRomConfig((prev) => ({ ...prev, ...update }))}
              />
            )}

            {activeTab === 'export' && (
              <ExportPanel
                config={romConfig}
                palette={frameData?.palette || SNES_PRESET_PALETTES['super-famicom']}
                uniqueTiles={frameData?.uniqueTiles || []}
                sfcBlob={romBuildState.sfcBlob}
                smcBlob={romBuildState.smcBlob}
                onDownloadSfc={handleDownloadSfc}
                onDownloadSmc={handleDownloadSmc}
                onDownloadVram={handleDownloadVram}
                onDownloadPal={handleDownloadPal}
              />
            )}
          </div>
        </div>

        {/* Bottom Full-Width Hardware Architecture Deep Dive (when on Feed tab) */}
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-800 text-xs">
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
              <h4 className="font-semibold text-neutral-100 mb-1">15-Bit BGR555 Space</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                The SNES Picture Processing Unit (PPU) calculates colors with 5 bits per channel (32 levels per component), yielding exactly 32,768 potential shades. All webcam video is quantized in real-time to match genuine console silicon.
              </p>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
              <h4 className="font-semibold text-neutral-100 mb-1">Planar 4bpp VRAM Tiles</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Rather than linear pixels, SNES stores 8×8 tiles as bitplanes interleaved in 32-byte chunks (Planes 0 & 1 in first 16 bytes, Planes 2 & 3 in second 16 bytes). Deduplication detects identical and flipped patterns to fit within 64KB VRAM.
              </p>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
              <h4 className="font-semibold text-neutral-100 mb-1">Bootable LoROM & Checksums</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                The internal header at $00:7FC0 embeds authentic 65816 machine code that initializes INIDISP, BGMODE, and VRAM addresses, allowing the generated .SFC file to boot on real hardware flashcarts and retro emulators.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer with clean unboxed metadata */}
      <footer className="mt-auto px-6 py-4 border-t border-neutral-800/80 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Super PPU Studio</span>
          <span aria-hidden="true">·</span>
          <span>SNES 256×224 Resolution</span>
          <span aria-hidden="true">·</span>
          <span>15-bit BGR555 Color Math</span>
          <span aria-hidden="true">·</span>
          <span>65816 Assembly Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Standard LoROM ($00:7FC0)</span>
          <span aria-hidden="true">·</span>
          <span>VRAM 64KB Model</span>
        </div>
      </footer>
    </div>
  );
}
