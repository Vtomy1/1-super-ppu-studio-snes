// Procedural test video generators for SNES 256x224 frame buffers

export type SampleFeedId = 'f-zero' | 'metroid' | 'colorbars' | 'chrono' | 'portrait';

export interface SampleFeedInfo {
  id: SampleFeedId;
  name: string;
  description: string;
}

export const SAMPLE_FEEDS: SampleFeedInfo[] = [
  { id: 'f-zero', name: 'Mode 7 Speed Circuit', description: 'Retro 3D grid with distant mountains and speedline horizon' },
  { id: 'metroid', name: 'Zebes Bio-Chamber', description: 'Dark atmospheric cavern with glowing stasis core' },
  { id: 'chrono', name: 'Epoch Time Warp', description: 'Swirling dimensional portal with energy particles' },
  { id: 'portrait', name: '16-Bit Pilot Portrait', description: 'High-contrast character bust ready for pixel dithering' },
  { id: 'colorbars', name: 'SMPTE SNES Test Pattern', description: '15-bit BGR555 gradient ramps and calibration bars' },
];

export function renderSampleFeed(
  ctx: CanvasRenderingContext2D,
  id: SampleFeedId,
  timeMs: number
): void {
  const w = 256;
  const h = 224;
  const t = timeMs * 0.001;

  if (id === 'f-zero') {
    // Mode 7 Horizon & Grid
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 90);
    sky.addColorStop(0, '#040410');
    sky.addColorStop(0.6, '#280c44');
    sky.addColorStop(1, '#ff4466');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, 90);

    // Distant synthwave mountains
    ctx.fillStyle = '#1c0828';
    ctx.beginPath();
    ctx.moveTo(0, 90);
    for (let x = 0; x <= w; x += 16) {
      const my = 90 - Math.abs(Math.sin((x * 0.05) + 1.2)) * 30 - Math.cos(x * 0.02) * 15;
      ctx.lineTo(x, my);
    }
    ctx.lineTo(w, 90);
    ctx.fill();

    // Twin suns
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(128, 55, 22, 0, Math.PI * 2);
    ctx.fill();

    // Road plane with perspective lines
    const ground = ctx.createLinearGradient(0, 90, 0, h);
    ground.addColorStop(0, '#0c1024');
    ground.addColorStop(1, '#02040c');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 90, w, h - 90);

    // Animated perspective track lines
    const horizonY = 90;
    const speed = (t * 80) % 32;

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;

    // Horizontal perspective grid lines
    for (let i = 1; i <= 14; i++) {
      const p = Math.pow((i + (speed / 32)) / 14, 2.5);
      const ly = horizonY + p * (h - horizonY);
      if (ly < h) {
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(w, ly);
        ctx.stroke();
      }
    }

    // Radial track converging to center
    const vpX = 128 + Math.sin(t * 1.5) * 40;
    ctx.strokeStyle = '#ff0077';
    for (let x = -w; x <= w * 2; x += 32) {
      ctx.beginPath();
      ctx.moveTo(vpX, horizonY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Racing hovercraft vehicle in center
    const carX = 128 + Math.sin(t * 1.8) * 35;
    const carY = 175;
    ctx.fillStyle = '#e4002b';
    ctx.beginPath();
    ctx.moveTo(carX, carY - 14);
    ctx.lineTo(carX + 22, carY + 8);
    ctx.lineTo(carX - 22, carY + 8);
    ctx.closePath();
    ctx.fill();

    // Cockpit canopy
    ctx.fillStyle = '#24d8f8';
    ctx.beginPath();
    ctx.ellipse(carX, carY - 2, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thruster glow
    ctx.fillStyle = (Math.floor(t * 30) % 2 === 0) ? '#ffea00' : '#ff7700';
    ctx.fillRect(carX - 12, carY + 8, 8, 5);
    ctx.fillRect(carX + 4, carY + 8, 8, 5);
  } else if (id === 'metroid') {
    // Sci-fi Bio Chamber
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);

    // Glowing stasis containment cylinder
    const coreGrad = ctx.createRadialGradient(128, 112, 10, 128, 112, 75);
    coreGrad.addColorStop(0, '#38ff78');
    coreGrad.addColorStop(0.4, '#108040');
    coreGrad.addColorStop(1, '#051810');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(128, 112, 65, 0, Math.PI * 2);
    ctx.fill();

    // Glass tube rings
    ctx.strokeStyle = '#50e0a0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Floating alien organism in center
    ctx.fillStyle = '#ff3366';
    const blobPulse = Math.sin(t * 3) * 4;
    ctx.beginPath();
    ctx.arc(128, 112, 28 + blobPulse, 0, Math.PI * 2);
    ctx.fill();

    // Nuclei
    ctx.fillStyle = '#ffff66';
    for (let i = 0; i < 3; i++) {
      const angle = t * 2 + (i * Math.PI * 2) / 3;
      const nx = 128 + Math.cos(angle) * 12;
      const ny = 112 + Math.sin(angle) * 12;
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Industrial metal girder frames
    ctx.fillStyle = '#3a3a4c';
    ctx.fillRect(0, 0, 36, h);
    ctx.fillRect(w - 36, 0, 36, h);
    ctx.fillRect(0, 0, w, 28);
    ctx.fillRect(0, h - 32, w, 32);

    // Warning hazard stripes on top
    ctx.fillStyle = '#f8b800';
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 12, 28);
      ctx.lineTo(x + 6, 28);
      ctx.lineTo(x - 6, 0);
      ctx.fill();
    }
  } else if (id === 'chrono') {
    // Time Gate Warp
    ctx.fillStyle = '#050210';
    ctx.fillRect(0, 0, w, h);

    const cx = 128;
    const cy = 112;

    // Spiral vortex arms
    for (let arm = 0; arm < 4; arm++) {
      const baseAngle = (arm * Math.PI) / 2 + t * 1.2;
      ctx.beginPath();
      for (let r = 5; r < 120; r += 4) {
        const theta = baseAngle + r * 0.06;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (r === 5) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = arm % 2 === 0 ? '#00f0ff' : '#d040ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Epoch time machine silhouette
    ctx.fillStyle = '#f0c030';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2040c0';
    ctx.fillRect(cx - 16, cy - 18, 32, 6);
  } else if (id === 'portrait') {
    // Retro 16-Bit Cyber Pilot Portrait
    // Backdrop studio gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#102040');
    bg.addColorStop(1, '#050a18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Torso armor
    ctx.fillStyle = '#20304a';
    ctx.beginPath();
    ctx.moveTo(50, h);
    ctx.lineTo(80, 160);
    ctx.lineTo(176, 160);
    ctx.lineTo(206, h);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#d49870';
    ctx.fillRect(114, 130, 28, 35);

    // Head / Face
    ctx.fillStyle = '#e8b890';
    ctx.beginPath();
    ctx.ellipse(128, 100, 36, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jaw shadow
    ctx.fillStyle = '#c08060';
    ctx.beginPath();
    ctx.arc(128, 118, 22, 0, Math.PI);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#3a2018';
    ctx.beginPath();
    ctx.arc(128, 86, 40, Math.PI, Math.PI * 2);
    ctx.lineTo(166, 110);
    ctx.lineTo(158, 80);
    ctx.lineTo(98, 80);
    ctx.lineTo(90, 110);
    ctx.closePath();
    ctx.fill();

    // Cyber visor / glasses
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(100, 94, 56, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(106, 96, 12, 3);

    // Pilot Badge
    ctx.fillStyle = '#f8b800';
    ctx.fillRect(92, 180, 16, 20);
  } else {
    // SMPTE SNES 15-bit Test Pattern & Color Bars
    const barWidth = w / 7;
    const colors = [
      '#e0e0e0', // Light Gray
      '#d8d800', // Yellow
      '#00d8d8', // Cyan
      '#00d800', // Green
      '#d800d8', // Magenta
      '#d80000', // Red
      '#0000d8', // Blue
    ];

    // Main 7 bars (top 65%)
    const topH = 150;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(i * barWidth, 0, barWidth + 1, topH);
    }

    // Cast bars (middle 15%)
    const midH = 34;
    const castColors = ['#0000d8', '#000000', '#d800d8', '#000000', '#00d8d8', '#000000', '#e0e0e0'];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = castColors[i];
      ctx.fillRect(i * barWidth, topH, barWidth + 1, midH);
    }

    // Bottom BGR555 Ramp (bottom 20%)
    const botY = topH + midH;
    const botH = h - botY;
    for (let x = 0; x < w; x++) {
      // 32 distinct 5-bit steps across 256 pixels = 8 pixels per step
      const step = Math.floor((x / w) * 32);
      const intensity = Math.round((step * 255) / 31);
      ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
      ctx.fillRect(x, botY, 1, botH);
    }
  }
}
