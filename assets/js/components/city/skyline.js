/* ==========================================================================
   Skyline — procedural, seeded, illustrated architecture.

   Each depth layer is pre-rendered into two canvases:
     • body   — silhouettes with side faces (volume) + lit windows
     • lines  — the illustrated structure: outlines, floor lines, mullions,
                lattice bracing. Nearly invisible normally; lightning and the
                scroll "blueprint" transition reveal it.

   Composition constraints keep the story readable: towers step down under
   the searchlight beam and never cover the projected signal.
   ========================================================================== */

import { makeCanvas } from './atmosphere.js';
import { rng, lerp, clamp } from '../../core/utils.js';

export const LAYER_CFG = {
  distant: {
    seed: 101, baseY: 0.8, hMin: 0.05, hMax: 0.3, hPow: 1.6, wMin: 16, wMax: 54, gap: [-10, 6],
    top: '#0e1a2a', bottom: '#142236', side: '#0c1624', sideK: 0.35,
    winP: 0.035, win: [1.3, 1.6], winGap: [4.5, 5.5], floor: 4.5, crown: 0.35, landmark: 0.05,
    lineW: 0.5, pad: 6,
  },
  mid: {
    seed: 202, baseY: 0.9, hMin: 0.1, hMax: 0.52, hPow: 1.4, wMin: 26, wMax: 86, gap: [-14, 10],
    top: '#070f1a', bottom: '#0b1522', side: '#09121e', sideK: 0.5,
    winP: 0.06, win: [1.6, 2.4], winGap: [5.5, 7.5], floor: 6, crown: 0.5, landmark: 0.08,
    lineW: 0.6, pad: 10,
  },
  near: {
    seed: 303, baseY: 1.04, hMin: 0.26, hMax: 0.98, hPow: 1.15, wMin: 58, wMax: 150, gap: [-24, 26],
    top: '#03070c', bottom: '#050a10', side: '#070e17', sideK: 0.7,
    winP: 0.07, win: [2.2, 3.4], winGap: [7, 10], floor: 9, crown: 0.7, landmark: 0.12,
    lineW: 0.75, pad: 18,
  },
};

const WIN_COLORS = [
  ['#a9c1e8', 0.72],
  ['#e8c68f', 0.2],
  ['#6b93ff', 0.08],
];
function pickWinColor(r) {
  let v = r();
  for (const [c, p] of WIN_COLORS) { if ((v -= p) <= 0) return c; }
  return WIN_COLORS[0][0];
}

/** Beam centre-line y at screen x (the beam runs lamp → pool). */
export function beamYAt(comp, x) {
  const { lamp, pool } = comp;
  const t = (x - lamp.x) / (pool.x - lamp.x);
  return lamp.y + t * (pool.y - lamp.y);
}

function constrain(b, name, comp, W, H) {
  const { lamp, pool } = comp;
  const x0 = b.x, x1 = b.x + b.w;
  // 1. Never cover the signal.
  const px0 = pool.x - pool.rx * 1.08, px1 = pool.x + pool.rx * 1.08;
  if (x1 > px0 && x0 < px1) b.top = Math.max(b.top, pool.y + pool.ry * 0.92 + (name === 'near' ? 20 : 8));
  // 2. Near the lamp the beam is in front of the city: towers step down beneath it.
  if (name === 'near') {
    const bx0 = Math.min(pool.x, lamp.x), bx1 = lamp.x + 30;
    if (x1 > bx0 && x0 < bx1) {
      const yCut = H * 0.5;
      const yb = Math.max(beamYAt(comp, clamp(x0, bx0, bx1)), beamYAt(comp, clamp(x1, bx0, bx1)));
      if (yb > yCut) b.top = Math.max(b.top, yb + 26 + (lamp.x - (x0 + x1) / 2) * 0.04);
    }
  }
  if (b.base - b.top < H * 0.05) return false;
  return true;
}

function generate(name, W, H, comp) {
  const cfg = LAYER_CFG[name];
  const r = rng(cfg.seed + Math.round(W / 200));
  const u = clamp(Math.min(W, H * 1.4) / 1100, 0.55, 1.25);
  const list = [];
  let x = -cfg.pad - r() * cfg.wMax * u;
  while (x < W + cfg.pad) {
    const w = lerp(cfg.wMin, cfg.wMax, Math.pow(r(), 1.3)) * u;
    let h = lerp(cfg.hMin, cfg.hMax, Math.pow(r(), cfg.hPow)) * H;
    if (r() < cfg.landmark) h *= 1.3;
    const base = cfg.baseY * H;
    const b = { x, w, base, top: base - h, r: r() };
    if (constrain(b, name, comp, W, H)) {
      const hh = b.base - b.top;
      // Setbacks: tall buildings step in as they rise (art-deco profile).
      b.tiers = [{ x0: b.x, x1: b.x + w, y: b.top }];
      if (hh > H * 0.25 && r() < 0.75) {
        const steps = 1 + Math.floor(r() * (name === 'near' ? 3 : 2));
        b.tiers = [];
        let tx0 = b.x, tx1 = b.x + w;
        let y = b.top + hh * (0.18 + r() * 0.2);
        // tiers listed bottom → top; tier i spans from previous y up to its own top
        const tops = [];
        for (let s = 0; s < steps; s++) { tops.push(y); y = y - (y - b.top) * (0.5 + r() * 0.2); }
        b.tiers.push({ x0: tx0, x1: tx1, y: tops[0] });
        for (let s = 1; s <= steps; s++) {
          const inset = (tx1 - tx0) * (0.1 + r() * 0.14);
          const asym = r() < 0.3 ? inset * (r() - 0.5) : 0;
          tx0 += inset + asym; tx1 -= inset - asym;
          b.tiers.push({ x0: tx0, x1: tx1, y: s === steps ? b.top : tops[s] });
        }
      }
      // Crown
      const cr = r();
      b.crown = r() > cfg.crown ? 'flat'
        : cr < 0.3 ? 'antenna' : cr < 0.5 ? 'spire' : cr < 0.65 ? 'slant' : cr < 0.8 ? 'mast' : cr < 0.92 ? 'machine' : 'tank';
      if (name === 'distant' && (b.crown === 'tank' || b.crown === 'machine')) b.crown = 'flat';
      const P = comp.pool;
      if (b.x + b.w > P.x - P.rx * 1.2 && b.x < P.x + P.rx * 1.2 && b.crown !== 'flat') b.crown = name === 'distant' ? 'flat' : 'machine';
      b.lattice = name !== 'distant' && r() < 0.14;
      list.push(b);
    }
    x += w + lerp(cfg.gap[0], cfg.gap[1], r()) * u;
  }
  // Tall first, short in front: stacked depth within the layer.
  list.sort((a, b) => a.top - b.top);
  return { list, u };
}

/**
 * Render a layer.
 * @returns {{ body, lines, y, h, pad, windows, blinkers, elevators }}
 */
export function renderLayer(name, W, H, dpr, comp) {
  const cfg = LAYER_CFG[name];
  const { list, u } = generate(name, W, H, comp);
  const r = rng(cfg.seed * 7);
  const pad = 24;
  const minTop = Math.min(...list.map((b) => b.top)) - 110 * u;
  const y0 = Math.max(-40, Math.floor(minTop));
  const h = Math.ceil(H - y0 + 4);
  const cw = W + pad * 2;

  const body = makeCanvas(cw * dpr, h * dpr);
  const bx = body.getContext('2d');
  bx.scale(dpr, dpr);
  bx.translate(pad, -y0);
  const ldpr = Math.max(1, dpr * 0.8);
  const lines = makeCanvas(cw * ldpr, h * ldpr);
  const lx = lines.getContext('2d');
  lx.scale(ldpr, ldpr);
  lx.translate(pad, -y0);
  lx.strokeStyle = '#8fb0ff';
  lx.lineWidth = cfg.lineW;

  const front = bx.createLinearGradient(0, y0, 0, H);
  front.addColorStop(0, cfg.top);
  front.addColorStop(1, cfg.bottom);

  const windows = [];
  const blinkers = [];
  const elevators = [];
  const horizon = H * 0.6;

  for (const b of list) {
    const cx = b.x + b.w / 2;
    const dxn = (cx - W / 2) / (W / 2);                 // −1 … 1
    const sideW = Math.min(b.w * 0.45, Math.abs(dxn) * b.w * 0.5 * cfg.sideK);
    const sideDir = dxn < 0 ? 1 : -1;                    // face toward the vanishing point

    for (let ti = 0; ti < b.tiers.length; ti++) {
      const t = b.tiers[ti];
      const yBottom = ti === 0 ? b.base + 4 : b.tiers[ti - 1].y;
      const tw = t.x1 - t.x0;
      // Side face (parallelogram receding toward the horizon).
      if (sideW > 1.2) {
        const sx = sideDir > 0 ? t.x1 : t.x0;
        const sx2 = sx + sideW * sideDir;
        const drop = ((horizon - t.y) * sideW) / (W * 0.9);
        bx.fillStyle = cfg.side;
        bx.beginPath();
        bx.moveTo(sx, t.y);
        bx.lineTo(sx2, t.y + drop);
        bx.lineTo(sx2, yBottom);
        bx.lineTo(sx, yBottom);
        bx.closePath();
        bx.fill();
        // side linework: edge + receding floor lines
        lx.beginPath();
        lx.moveTo(sx2, t.y + drop); lx.lineTo(sx2, yBottom);
        lx.moveTo(sx, t.y); lx.lineTo(sx2, t.y + drop);
        const fl = cfg.floor * u * 2;
        for (let fy = t.y + fl; fy < yBottom; fy += fl) {
          const d2 = ((horizon - fy) * sideW) / (W * 0.9);
          lx.moveTo(sx, fy); lx.lineTo(sx2, fy + d2);
        }
        lx.globalAlpha = 0.5;
        lx.stroke();
        lx.globalAlpha = 1;
      }
      // Front face
      bx.fillStyle = front;
      bx.fillRect(t.x0, t.y, tw, yBottom - t.y);
      // Rim light on the top edge: a sliver of sky glow.
      bx.fillStyle = 'rgba(120, 150, 205, 0.10)';
      bx.fillRect(t.x0, t.y, tw, 1);

      // Linework: outline, floors, mullions.
      lx.beginPath();
      lx.rect(t.x0, t.y, tw, yBottom - t.y);
      const fl = cfg.floor * u;
      for (let fy = t.y + fl; fy < Math.min(yBottom, H); fy += fl) { lx.moveTo(t.x0, fy); lx.lineTo(t.x1, fy); }
      const cols = Math.max(2, Math.round(tw / (cfg.winGap[0] * u * 2.2)));
      for (let c = 1; c < cols; c++) { const mx = t.x0 + (tw * c) / cols; lx.moveTo(mx, t.y); lx.lineTo(mx, yBottom); }
      lx.stroke();
      if (b.lattice) {
        lx.beginPath();
        const seg = tw * 0.9;
        for (let fy = t.y; fy < yBottom - seg; fy += seg) {
          lx.moveTo(t.x0, fy); lx.lineTo(t.x1, fy + seg);
          lx.moveTo(t.x1, fy); lx.lineTo(t.x0, fy + seg);
        }
        lx.globalAlpha = 0.7; lx.stroke(); lx.globalAlpha = 1;
      }

      // Windows
      const gx = lerp(cfg.winGap[0], cfg.winGap[1], r()) * u;
      const gy = gx * (1.25 + r() * 0.3);
      const ww = cfg.win[0] * u, wh = cfg.win[1] * u * 1.5;
      const office = r() < 0.25; // some towers keep whole floors lit
      for (let wy = t.y + gy; wy < Math.min(yBottom, H) - gy * 0.5; wy += gy) {
        const rowBoost = office && r() < 0.12 ? 7 : r() < 0.04 ? 4 : 1;
        for (let wx = t.x0 + gx * 0.6; wx < t.x1 - gx * 0.4; wx += gx) {
          const lit = r() < cfg.winP * rowBoost;
          if (!lit && r() > 0.02) continue; // keep a pool of dark windows for city life
          const w = { x: wx, y: wy, w: ww, h: wh, c: pickWinColor(r), a: 0.35 + r() * 0.55, on: lit };
          windows.push(w);
          if (lit) { bx.globalAlpha = w.a; bx.fillStyle = w.c; bx.fillRect(wx, wy, ww, wh); bx.globalAlpha = 1; }
        }
      }
    }

    // Crowns
    const topT = b.tiers[b.tiers.length - 1];
    const tcx = (topT.x0 + topT.x1) / 2;
    const tw = topT.x1 - topT.x0;
    bx.fillStyle = cfg.top;
    bx.strokeStyle = cfg.top;
    lx.beginPath();
    switch (b.crown) {
      case 'spire': {
        const sh = tw * (1.2 + r() * 1.4);
        bx.beginPath(); bx.moveTo(topT.x0 + tw * 0.28, b.top); bx.lineTo(tcx, b.top - sh); bx.lineTo(topT.x1 - tw * 0.28, b.top); bx.fill();
        lx.moveTo(topT.x0 + tw * 0.28, b.top); lx.lineTo(tcx, b.top - sh); lx.lineTo(topT.x1 - tw * 0.28, b.top);
        for (let k = 1; k < 5; k++) { const yy = b.top - (sh * k) / 5; const hw = (tw * 0.22 * (5 - k)) / 5; lx.moveTo(tcx - hw, yy); lx.lineTo(tcx + hw, yy); }
        if (name !== 'distant') blinkers.push({ x: tcx, y: b.top - sh - 2, p: r() * 6, s: 1 + r() * 0.6 });
        break;
      }
      case 'antenna': {
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const ax = topT.x0 + tw * (0.2 + r() * 0.6);
          const ah = (18 + r() * 70) * u;
          bx.fillRect(ax - 0.6, b.top - ah, 1.3, ah);
          bx.fillRect(ax - 4 * u, b.top - ah * 0.55, 8 * u, 1);
          lx.moveTo(ax, b.top); lx.lineTo(ax, b.top - ah);
          if (k === 0 && name !== 'distant') blinkers.push({ x: ax, y: b.top - ah - 1, p: r() * 6, s: 0.8 + r() * 0.8 });
        }
        break;
      }
      case 'slant': {
        const sh = tw * (0.3 + r() * 0.5);
        const left = r() < 0.5;
        bx.beginPath(); bx.moveTo(topT.x0, b.top); bx.lineTo(left ? topT.x0 : topT.x1, b.top - sh); bx.lineTo(topT.x1, b.top); bx.fill();
        lx.moveTo(topT.x0, b.top); lx.lineTo(left ? topT.x0 : topT.x1, b.top - sh); lx.lineTo(topT.x1, b.top);
        break;
      }
      case 'mast': {
        const mh = (50 + r() * 90) * u;
        const mw = Math.max(4, tw * 0.12);
        bx.lineWidth = 1;
        bx.beginPath();
        bx.moveTo(tcx - mw / 2, b.top); bx.lineTo(tcx - 0.5, b.top - mh);
        bx.moveTo(tcx + mw / 2, b.top); bx.lineTo(tcx + 0.5, b.top - mh);
        for (let k = 0; k < 6; k++) {
          const y1 = b.top - (mh * k) / 6, y2 = b.top - (mh * (k + 1)) / 6;
          const w1 = (mw / 2) * (1 - k / 6), w2 = (mw / 2) * (1 - (k + 1) / 6);
          bx.moveTo(tcx - w1, y1); bx.lineTo(tcx + w2, y2);
          bx.moveTo(tcx + w1, y1); bx.lineTo(tcx - w2, y2);
        }
        bx.stroke();
        lx.moveTo(tcx, b.top); lx.lineTo(tcx, b.top - mh);
        if (name !== 'distant') blinkers.push({ x: tcx, y: b.top - mh - 1, p: r() * 6, s: 1.2 });
        break;
      }
      case 'machine': {
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const mw = tw * (0.15 + r() * 0.25), mh = (6 + r() * 12) * u;
          const mx = topT.x0 + r() * (tw - mw);
          bx.fillRect(mx, b.top - mh, mw, mh + 1);
          lx.rect(mx, b.top - mh, mw, mh);
          for (let g = mx + 2; g < mx + mw - 1; g += 3) { lx.moveTo(g, b.top - mh + 2); lx.lineTo(g, b.top - 2); }
        }
        break;
      }
      case 'tank': {
        const tr = Math.min(tw * 0.18, 14 * u), th = tr * 1.6, legs = tr * 1.2;
        const tx = topT.x0 + tw * (0.2 + r() * 0.5);
        bx.fillRect(tx - tr, b.top - legs - th, tr * 2, th);
        bx.beginPath(); bx.moveTo(tx - tr - 1, b.top - legs - th); bx.lineTo(tx, b.top - legs - th - tr * 0.8); bx.lineTo(tx + tr + 1, b.top - legs - th); bx.fill();
        bx.fillRect(tx - tr * 0.8, b.top - legs, 1.2, legs);
        bx.fillRect(tx + tr * 0.8 - 1, b.top - legs, 1.2, legs);
        lx.rect(tx - tr, b.top - legs - th, tr * 2, th);
        for (let k = 1; k < 4; k++) { lx.moveTo(tx - tr, b.top - legs - (th * k) / 4); lx.lineTo(tx + tr, b.top - legs - (th * k) / 4); }
        break;
      }
      default: break;
    }
    lx.stroke();

    // One slow elevator light per tall near tower (only a few).
    if (name === 'near' && b.base - b.top > H * 0.5 && elevators.length < 2 && b.r < 0.6) {
      const t0 = b.tiers[0];
      elevators.push({ x: t0.x0 + (t0.x1 - t0.x0) * (0.3 + b.r * 0.4), y0: b.tiers[b.tiers.length - 1].y + 10, y1: Math.min(H - 20, b.base - 30), p: b.r * 10 });
    }
  }

  return { body, lines, y: y0, h, pad, windows, blinkers, elevators, dpr, ldpr, cfg };
}

/** Redraw a single window on a layer's body canvas (city life). */
export function paintWindow(layer, w, on) {
  const x = layer.body.getContext('2d');
  x.save();
  x.setTransform(layer.dpr, 0, 0, layer.dpr, layer.pad * layer.dpr, -layer.y * layer.dpr);
  if (on) { x.globalAlpha = w.a; x.fillStyle = w.c; }
  else { x.globalAlpha = 1; x.fillStyle = layer.cfg.top; }
  x.fillRect(w.x, w.y, w.w, w.h);
  x.restore();
  w.on = on;
}

/* ==========================================================================
   Foreground rooftop — the sharpest silhouette. Water tower, machinery,
   railing, a lattice mast that cuts across the beam, the lamp pedestal.
   ========================================================================== */
export function renderForeground(W, H, dpr, comp) {
  const r = rng(404);
  const u = clamp(Math.min(W, H * 1.4) / 1100, 0.6, 1.25);
  const y0 = Math.floor(H * 0.3);
  const h = H - y0;
  const pad = 24;
  const cw = W + pad * 2;
  const body = makeCanvas(cw * dpr, h * dpr);
  const bx = body.getContext('2d');
  bx.scale(dpr, dpr); bx.translate(pad, -y0);
  const ldpr = Math.max(1, dpr * 0.8);
  const lines = makeCanvas(cw * ldpr, h * ldpr);
  const lx = lines.getContext('2d');
  lx.scale(ldpr, ldpr); lx.translate(pad, -y0);
  lx.strokeStyle = '#a6bfff';
  lx.lineWidth = 0.9;

  const roofY = comp.roofY;
  const C = '#010204';
  bx.fillStyle = C;
  bx.strokeStyle = C;
  const blinkers = [];

  // Parapet + roof mass
  bx.fillRect(-pad, roofY, cw, H - roofY + 2);
  lx.beginPath(); lx.moveTo(-pad, roofY); lx.lineTo(W + pad, roofY);
  for (let x = -pad; x < W + pad; x += 34 * u) { lx.moveTo(x, roofY); lx.lineTo(x, roofY + 10 * u); }
  lx.stroke();

  // Water tower (left third)
  const wtX = W * (W > H ? 0.1 : 0.12);
  const tr = 30 * u, th = 58 * u, legs = 64 * u;
  const wtTop = roofY - legs - th;
  bx.fillRect(wtX - tr, wtTop, tr * 2, th);
  bx.beginPath(); bx.moveTo(wtX - tr - 3, wtTop); bx.lineTo(wtX, wtTop - tr * 0.9); bx.lineTo(wtX + tr + 3, wtTop); bx.fill();
  bx.lineWidth = 2.2 * u;
  bx.beginPath();
  bx.moveTo(wtX - tr * 0.85, roofY); bx.lineTo(wtX - tr * 0.7, roofY - legs);
  bx.moveTo(wtX + tr * 0.85, roofY); bx.lineTo(wtX + tr * 0.7, roofY - legs);
  bx.moveTo(wtX - tr * 0.1, roofY); bx.lineTo(wtX - tr * 0.1, roofY - legs);
  bx.moveTo(wtX - tr * 0.8, roofY - legs * 0.5); bx.lineTo(wtX + tr * 0.8, roofY - legs * 0.5);
  bx.moveTo(wtX - tr * 0.8, roofY - legs * 0.5); bx.lineTo(wtX + tr * 0.72, roofY - legs * 0.95);
  bx.stroke();
  lx.beginPath();
  lx.rect(wtX - tr, wtTop, tr * 2, th);
  for (let k = 1; k < 5; k++) { lx.moveTo(wtX - tr, wtTop + (th * k) / 5); lx.lineTo(wtX + tr, wtTop + (th * k) / 5); }
  for (let k = 1; k < 6; k++) { lx.moveTo(wtX - tr + (tr * 2 * k) / 6, wtTop); lx.lineTo(wtX - tr + (tr * 2 * k) / 6, wtTop + th); }
  lx.moveTo(wtX - tr - 3, wtTop); lx.lineTo(wtX, wtTop - tr * 0.9); lx.lineTo(wtX + tr + 3, wtTop);
  lx.stroke();

  // HVAC boxes and vents
  const boxes = W > H ? 7 : 4;
  for (let i = 0; i < boxes; i++) {
    let bxX = r() * W;
    if (Math.abs(bxX - comp.lamp.x) < 70 * u || Math.abs(bxX - wtX) < 50 * u) bxX += 110 * u;
    const bw = (26 + r() * 60) * u, bh = (12 + r() * 30) * u;
    bx.fillRect(bxX, roofY - bh, bw, bh + 1);
    lx.beginPath(); lx.rect(bxX, roofY - bh, bw, bh);
    for (let g = bxX + 4; g < bxX + bw - 3; g += 4 * u) { lx.moveTo(g, roofY - bh + 3); lx.lineTo(g, roofY - 3); }
    lx.globalAlpha = 0.6; lx.stroke(); lx.globalAlpha = 1;
    if (r() < 0.6) { // mushroom vent
      const vx = bxX + bw + (8 + r() * 20) * u, vh = (14 + r() * 26) * u;
      bx.fillRect(vx - 2 * u, roofY - vh, 4 * u, vh);
      bx.fillRect(vx - 6 * u, roofY - vh - 4 * u, 12 * u, 4 * u);
    }
  }

  // Railing along the parapet (broken into runs)
  bx.lineWidth = 1.4;
  bx.beginPath();
  for (let x = -pad; x < W + pad;) {
    const run = (120 + r() * 260) * u;
    const rh = 22 * u;
    bx.moveTo(x, roofY - rh); bx.lineTo(Math.min(W + pad, x + run), roofY - rh);
    for (let px = x; px < x + run && px < W + pad; px += 16 * u) { bx.moveTo(px, roofY); bx.lineTo(px, roofY - rh); }
    x += run + (60 + r() * 200) * u;
  }
  bx.stroke();

  // Lattice mast crossing the lower beam.
  const mastX = comp.mastX;
  const mastTop = Math.min(comp.lamp.y - H * 0.34, beamYAt(comp, mastX) - H * 0.12);
  const mw = 12 * u;
  bx.lineWidth = 1.6 * u;
  bx.beginPath();
  bx.moveTo(mastX - mw / 2, roofY); bx.lineTo(mastX - 1.5, mastTop);
  bx.moveTo(mastX + mw / 2, roofY); bx.lineTo(mastX + 1.5, mastTop);
  const segs = 14;
  for (let k = 0; k < segs; k++) {
    const y1 = roofY - ((roofY - mastTop) * k) / segs, y2 = roofY - ((roofY - mastTop) * (k + 1)) / segs;
    const w1 = mw / 2 - ((mw / 2 - 1.5) * k) / segs, w2 = mw / 2 - ((mw / 2 - 1.5) * (k + 1)) / segs;
    bx.moveTo(mastX - w1, y1); bx.lineTo(mastX + w2, y2);
    bx.moveTo(mastX + w1, y1); bx.lineTo(mastX - w2, y2);
    bx.moveTo(mastX - w1, y1); bx.lineTo(mastX + w1, y1);
  }
  bx.moveTo(mastX, mastTop); bx.lineTo(mastX, mastTop - 26 * u);
  bx.moveTo(mastX - 10 * u, mastTop + 18 * u); bx.lineTo(mastX + 10 * u, mastTop + 18 * u);
  bx.stroke();
  blinkers.push({ x: mastX, y: mastTop - 27 * u, p: 0.4, s: 1.1, big: true });

  // Lamp pedestal
  const L = comp.lamp;
  bx.fillRect(L.x - 22 * u, L.y + 14 * u, 44 * u, roofY - L.y - 14 * u + 1);
  bx.fillRect(L.x - 30 * u, roofY - 6 * u, 60 * u, 7 * u);
  lx.beginPath(); lx.rect(L.x - 22 * u, L.y + 14 * u, 44 * u, roofY - L.y - 14 * u); lx.stroke();

  return { body, lines, y: y0, h, pad, blinkers, u, dpr, ldpr };
}
