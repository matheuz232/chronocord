import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assets = path.join(root, 'assets');
fs.mkdirSync(assets, { recursive: true });

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function mix(a, b, t) { return a + (b - a) * t; }

function makeBmp(file, width, height, draw) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const out = Buffer.alloc(54 + pixelBytes);
  out.write('BM', 0, 2, 'ascii');
  out.writeUInt32LE(54 + pixelBytes, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(width, 18);
  out.writeInt32LE(height, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(0, 30);
  out.writeUInt32LE(pixelBytes, 34);
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = offset;
    for (let x = 0; x < width; x++) {
      const { r, g, b } = draw(x, y, width, height);
      out[offset++] = clamp(b);
      out[offset++] = clamp(g);
      out[offset++] = clamp(r);
    }
    offset = rowStart + rowSize;
  }
  fs.writeFileSync(file, out);
}

function background(x, y, w, h) {
  const nx = (x - w * 0.46) / (w * 0.62);
  const ny = (y - h * 0.45) / (h * 0.8);
  const radial = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny));
  const wave = (Math.sin(x * 0.055 + y * 0.031) + 1) * 0.5;
  const r = mix(5, 33, radial) + 11 * wave * radial;
  const g = mix(3, 7, radial) + 2 * wave;
  const b = mix(13, 58, radial) + 18 * radial * wave;
  return { r, g, b };
}

function withRing(x, y, w, h) {
  const cx = w * 0.5, cy = h * 0.44;
  const dx = (x - cx) / w, dy = (y - cy) / h;
  const angle = -0.32;
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
  const q = Math.sqrt((rx / 0.43) ** 2 + (ry / 0.18) ** 2);
  const d = Math.abs(q - 1);
  const glow = Math.max(0, 1 - d * 26);
  const core = Math.max(0, 1 - d * 65);
  return { glow, core, inside: q < 0.48 };
}

makeBmp(path.join(assets, 'installerSidebar.bmp'), 164, 314, (x, y, w, h) => {
  let c = background(x, y, w, h);
  const ring = withRing(x, y, w, h);
  if (ring.inside) c = { r: 1, g: 0, b: 4 };
  c = { r: c.r + 90 * ring.glow, g: c.g + 10 * ring.glow, b: c.b + 190 * ring.glow };
  c = { r: c.r + 100 * ring.core, g: c.g + 20 * ring.core, b: c.b + 230 * ring.core };
  return c;
});

makeBmp(path.join(assets, 'installerHeader.bmp'), 150, 57, (x, y, w, h) => {
  const c = background(x, y, w, h);
  const t = x / w;
  return { r: c.r + 10 * t, g: c.g + 2, b: c.b + 30 * t };
});

console.log('ChronoCord installer artwork generated.');
