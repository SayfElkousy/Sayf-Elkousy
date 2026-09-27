/* ==========================================================================
   Atmosphere — sky, clouds, fog, and the value-noise they are built from.
   Everything here is pre-rendered once per resize; the frame loop only
   composites these canvases.
   ========================================================================== */

import { rng } from '../../core/utils.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/**
 * Smooth value noise as an alpha mask (white, varying alpha).
 * Built by upscaling tiny random grids with bilinear smoothing, 3 octaves.
 */
export function noiseTexture(w, h, { seed = 7, cell = 48, octaves = 3, contrast = 1 } = {}) {
  const r = rng(seed);
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  let amp = 1;
  let c = cell;
  for (let o = 0; o < octaves; o++) {
    const gw = Math.max(2, Math.ceil(w / c) + 2);
    const gh = Math.max(2, Math.ceil(h / c) + 2);
    const g = makeCanvas(gw, gh);
    const gx = g.getContext('2d');
    const img = gx.createImageData(gw, gh);
    for (let i = 0; i < gw * gh; i++) {
      const v = Math.pow(r(), contrast);
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 255;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = v * 255;
    }
    gx.putImageData(img, 0, 0);
    ctx.globalAlpha = o === 0 ? 1 : amp;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(g, -c, -c, gw * c, gh * c);
    amp *= 0.5;
    c = Math.max(4, c / 2.2);
  }
  return out;
}

/** Vertical sky gradient with the faint glow of a city below the cloud deck. */
export function renderSky(W, H, dpr) {
  const c = makeCanvas(W * dpr, H * dpr);
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#010203');
  g.addColorStop(0.35, '#03070c');
  g.addColorStop(0.62, '#070e18');
  g.addColorStop(0.8, '#0b1522');
  g.addColorStop(1, '#05090f');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // Light pollution: a broad, cool haze along the horizon.
  const hz = x.createRadialGradient(W * 0.5, H * 0.86, 10, W * 0.5, H * 0.86, Math.max(W, H) * 0.7);
  hz.addColorStop(0, 'rgba(34, 58, 100, 0.22)');
  hz.addColorStop(0.5, 'rgba(18, 32, 58, 0.1)');
  hz.addColorStop(1, 'rgba(0, 0, 0, 0)');
  x.fillStyle = hz;
  x.fillRect(0, 0, W, H);
  return c;
}

/**
 * Stratified storm clouds. Rendered twice from the same seed:
 * a normal pass, and a "lit" pass used when lightning fires.
 * Returned canvases are wider than the viewport so they can drift and wrap.
 */
export function renderClouds(W, H, dpr, seed = 11) {
  const scale = 0.5; // clouds are soft — render at half resolution
  const CW = Math.ceil(W * 1.6);
  const CH = Math.ceil(H * 0.78);
  const make = (palette) => {
    const r = rng(seed);
    const c = makeCanvas(CW * scale * dpr, CH * scale * dpr);
    const x = c.getContext('2d');
    x.scale(scale * dpr, scale * dpr);
    const n = Math.round(160 + (CW * CH) / 9000);
    for (let i = 0; i < n; i++) {
      const cx = r() * CW;
      const band = r();
      const cy = Math.pow(band, 0.8) * CH * 0.95;
      const rx = (60 + r() * 260) * (0.6 + (cy / CH) * 0.8);
      const ry = rx * (0.22 + r() * 0.2);
      const depth = cy / CH; // lower clouds catch more city glow
      const col = palette(depth, r());
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx);
      g.addColorStop(0, col.replace('A', String(0.1 + r() * 0.1)));
      g.addColorStop(0.55, col.replace('A', String(0.05 + r() * 0.05)));
      g.addColorStop(1, col.replace('A', '0'));
      x.save();
      x.translate(cx, cy);
      x.scale(1, ry / rx);
      x.translate(-cx, -cy);
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, rx, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    // Break up blob regularity with noise.
    const nz = noiseTexture(CW * scale, CH * scale, { seed: seed + 3, cell: 36, contrast: 0.8 });
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-in';
    x.globalAlpha = 1;
    x.drawImage(nz, 0, 0, c.width, c.height);
    // Fade toward the top so the deck sits low over the city.
    x.globalCompositeOperation = 'destination-in';
    const f = x.createLinearGradient(0, 0, 0, c.height);
    f.addColorStop(0, 'rgba(0,0,0,0.35)');
    f.addColorStop(0.5, 'rgba(0,0,0,1)');
    f.addColorStop(1, 'rgba(0,0,0,0.9)');
    x.fillStyle = f;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  };

  const normal = make((d, v) => {
    const l = 11 + d * 20 + v * 6;
    return `rgba(${(l * 0.62) | 0}, ${(l * 0.82) | 0}, ${(l * 1.18) | 0}, A)`;
  });
  const lit = make((d, v) => {
    const l = 120 + d * 70 + v * 40;
    return `rgba(${(l * 0.78) | 0}, ${(l * 0.86) | 0}, ${Math.min(255, l * 1.08) | 0}, A)`;
  });
  return { normal, lit, w: CW, h: CH };
}

/** A drifting fog sheet (tileable horizontally by drawing twice). */
export function renderFog(W, H, dpr, seed = 21) {
  const w = Math.ceil(W * 1.5);
  const h = Math.ceil(H * 0.5);
  const c = makeCanvas(w * 0.5 * dpr, h * 0.5 * dpr);
  const x = c.getContext('2d');
  const nz = noiseTexture(w * 0.5, h * 0.5, { seed, cell: 60, octaves: 3, contrast: 1.4 });
  x.drawImage(nz, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#152236';
  x.fillRect(0, 0, c.width, c.height);
  // Vertical profile: dense in the middle, gone at the top and bottom edges.
  x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, 'rgba(0,0,0,1)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.9)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return { canvas: c, w, h };
}
