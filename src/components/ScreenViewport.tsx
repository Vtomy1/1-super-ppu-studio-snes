import React, { useRef, useEffect } from 'react';
import { 
  Camera, 
  Pause, 
  Play, 
  FlipHorizontal, 
  Tv, 
  Sparkles, 
  Maximize2, 
  Compass, 
  Check, 
  Upload, 
  Video,
  SwitchCamera
} from 'lucide-react';
import { CrtSettings, PpuFrameData } from '../types/snes';
import { SAMPLE_FEEDS, SampleFeedId } from '../utils/sampleFeeds';

interface ScreenViewportProps {
  ppuCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  hoveredTileIndex: number | null;
  frameData: PpuFrameData | null;
  isStreaming: boolean;
  isPaused: boolean;
  useWebcam: boolean;
  selectedSampleFeed: SampleFeedId;
  mirrorWebcam: boolean;
  cameraFacing: 'user' | 'environment';
  availableCameras: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  crtSettings: CrtSettings;
  fps: number;
  cameraError: string | null;
  onToggleStreaming: () => void;
  onTogglePause: () => void;
  onToggleMirror: () => void;
  onToggleCameraFacing: () => void;
  onSelectCameraDevice: (deviceId: string) => void;
  onSelectSample: (id: SampleFeedId) => void;
  onSelectWebcam: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateCrt: (update: Partial<CrtSettings>) => void;
  onTakeSnapshotPng: () => void;
}

export const ScreenViewport: React.FC<ScreenViewportProps> = ({
  ppuCanvasRef,
  hoveredTileIndex,
  frameData,
  isStreaming,
  isPaused,
  useWebcam,
  selectedSampleFeed,
  mirrorWebcam,
  cameraFacing,
  availableCameras,
  selectedDeviceId,
  crtSettings,
  fps,
  cameraError,
  onToggleStreaming,
  onTogglePause,
  onToggleMirror,
  onToggleCameraFacing,
  onSelectCameraDevice,
  onSelectSample,
  onSelectWebcam,
  onFileUpload,
  onUpdateCrt,
  onTakeSnapshotPng,
}) => {
  const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Redraw tile highlight overlay whenever hoveredTileIndex changes
  useEffect(() => {
    const canvas = highlightCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 224);

    if (hoveredTileIndex === null || !frameData) return;

    // Highlight all occurrences of hovered tile
    const occurrences = frameData.tileLocationMap[hoveredTileIndex] || [];
    if (occurrences.length === 0) return;

    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';

    for (const tilemapIdx of occurrences) {
      const col = tilemapIdx % 32;
      const row = Math.floor(tilemapIdx / 32);
      const x = col * 8;
      const y = row * 8;

      ctx.fillRect(x, y, 8, 8);
      ctx.strokeRect(x + 0.5, y + 0.5, 7, 7);
    }
  }, [hoveredTileIndex, frameData]);

  // Determine scaling classes
  const getScaleStyle = () => {
    if (crtSettings.integerScale === 1) {
      return { width: 256, height: 224 };
    }
    if (crtSettings.integerScale === 2) {
      return { width: 512, height: 448 };
    }
    if (crtSettings.integerScale === 3) {
      return { width: 768, height: 672 };
    }
    // Fit / Responsive
    return { width: '100%', maxWidth: '640px', aspectRatio: '256 / 224' };
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Source Switcher Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded">
        {/* Source options */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onSelectWebcam}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              useWebcam
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Webcam</span>
          </button>

          {/* Front / Back Camera Switcher */}
          <button
            onClick={onToggleCameraFacing}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              cameraFacing === 'environment'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
            title="Switch between front and back camera"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span>{cameraFacing === 'environment' ? 'Back Cam' : 'Front Cam'}</span>
          </button>

          {/* Multiple camera devices dropdown (if available) */}
          {availableCameras.length > 1 && (
            <div className="relative inline-block">
              <select
                value={selectedDeviceId || ''}
                onChange={(e) => onSelectCameraDevice(e.target.value)}
                className="px-2 py-1 text-xs font-medium rounded bg-neutral-800 border border-neutral-700 text-neutral-200 cursor-pointer max-w-[140px] truncate"
                title="Select camera device"
              >
                <option value="">Camera Device...</option>
                {availableCameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative inline-block">
            <select
              value={useWebcam ? '' : selectedSampleFeed}
              onChange={(e) => onSelectSample(e.target.value as SampleFeedId)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors bg-neutral-800 border border-neutral-700 text-neutral-200 cursor-pointer ${
                !useWebcam ? 'border-purple-500 text-white ring-1 ring-purple-500/50' : ''
              }`}
            >
              <option value="" disabled>Select Test Pattern...</option>
              {SAMPLE_FEEDS.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors text-neutral-300 hover:text-white hover:bg-neutral-800"
            title="Upload custom image to convert to SNES tiles"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileUpload}
          />
        </div>

        {/* Playback Controls & FPS */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 tabular-nums bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            <span>PPU CLK</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">{fps} FPS</span>
          </div>

          {useWebcam && (
            <button
              onClick={onToggleMirror}
              className={`p-1.5 rounded transition-colors ${
                mirrorWebcam ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Mirror Webcam Feed"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onTogglePause}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Freeze'}</span>
          </button>
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="relative flex-1 min-h-[380px] bg-neutral-950 border border-neutral-800 rounded p-4 flex flex-col items-center justify-center overflow-hidden">
        {/* Mode 7 Horizon Backdrop (visible when Mode 7 Tilt is active) */}
        {crtSettings.mode7Tilt && (
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-950/40 to-neutral-950 pointer-events-none" />
        )}

        {/* Camera Error Alert */}
        {cameraError && useWebcam && (
          <div className="absolute top-6 left-6 right-6 z-40 bg-red-950/90 border border-red-700 text-red-200 px-4 py-2.5 rounded text-xs">
            <p className="font-semibold mb-0.5">Camera Access Notice</p>
            <p className="text-red-300">{cameraError}</p>
          </div>
        )}

        {/* TV Bezel / Pixel Screen Frame */}
        <div 
          className="relative transition-all duration-300"
          style={{
            ...getScaleStyle(),
            transform: crtSettings.mode7Tilt ? 'perspective(500px) rotateX(46deg) scaleY(1.25) translateY(20px)' : 'none',
            transformOrigin: 'bottom center',
          }}
        >
          {/* Authentic SNES Native Canvas (256x224) */}
          <canvas
            ref={ppuCanvasRef}
            width={256}
            height={224}
            className={`w-full h-full block rounded-sm shadow-2xl ${
              crtSettings.curvature ? 'scale-[0.98]' : ''
            }`}
            style={{
              imageRendering: 'pixelated',
              backgroundColor: '#000000',
            }}
          />

          {/* Real-time Hovered Tile Highlight Canvas */}
          <canvas
            ref={highlightCanvasRef}
            width={256}
            height={224}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* CRT Scanline Shader Overlay */}
          {crtSettings.enabled && crtSettings.scanlines !== 'none' && (
            <div 
              className={`absolute inset-0 pointer-events-none z-20 ${
                crtSettings.scanlines === 'light' 
                  ? 'bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px]'
                  : crtSettings.scanlines === 'medium'
                  ? 'bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.55)_50%)] bg-[length:100%_4px]'
                  : 'bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]'
              }`}
            />
          )}

          {/* CRT Phosphor Mask */}
          {crtSettings.enabled && crtSettings.phosphorMask && (
            <div 
              className="absolute inset-0 pointer-events-none z-20 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:3px_3px]"
            />
          )}

          {/* CRT Bloom / Curvature Vignette */}
          {crtSettings.enabled && crtSettings.bloom && (
            <div 
              className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_60px_rgba(0,0,0,0.85)]"
            />
          )}
        </div>

        {/* Hovered Tile Info Badge */}
        {hoveredTileIndex !== null && frameData && (
          <div className="absolute bottom-4 left-4 z-30 bg-neutral-900/90 border border-neutral-700 text-neutral-200 px-3 py-1.5 rounded text-xs font-mono shadow-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-xs inline-block" />
            <span>Tile #{hoveredTileIndex}</span>
            <span className="text-neutral-500">·</span>
            <span>{frameData.tileUsageCount[hoveredTileIndex] || 0} occurrences on screen</span>
          </div>
        )}
      </div>

      {/* Screen Controls & Display Tuning Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded">
        {/* Integer Scaling */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="text-neutral-500 text-[11px] uppercase tracking-wider">Scale:</span>
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800">
            {([1, 2, 3, 0] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => onUpdateCrt({ integerScale: scale })}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  crtSettings.integerScale === scale
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {scale === 0 ? 'Fit' : `${scale}x`}
              </button>
            ))}
          </div>
        </div>

        {/* CRT Simulation Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateCrt({ enabled: !crtSettings.enabled })}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              crtSettings.enabled
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT Scanlines</span>
          </button>

          {crtSettings.enabled && (
            <select
              value={crtSettings.scanlines}
              onChange={(e) => onUpdateCrt({ scanlines: e.target.value as any })}
              className="px-2 py-1 text-xs font-medium bg-neutral-950 border border-neutral-800 rounded text-neutral-300"
            >
              <option value="light">Light Scanlines</option>
              <option value="medium">Medium Scanlines</option>
              <option value="strong">Heavy Scanlines</option>
            </select>
          )}

          <button
            onClick={() => onUpdateCrt({ mode7Tilt: !crtSettings.mode7Tilt })}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              crtSettings.mode7Tilt
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title="Simulate SNES Mode 7 3D Perspective Rotation"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Mode 7 Perspective</span>
          </button>

          <button
            onClick={onTakeSnapshotPng}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors"
            title="Download PNG snapshot of current SNES screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Capture PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
