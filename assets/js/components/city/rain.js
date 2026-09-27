/* ==========================================================================
   RainLayer — three depths of rain on canvas, plus roof splashes.
   One path per depth, one stroke call per depth. No DOM particles.

   far   — small, dense, slow, faint
   mid   — medium
   near  — long, fast, soft (wide + low alpha reads as motion blur)
   Wind drifts slowly so drops never fall as identical vertical lines.
   ========================================================================== */

import { rng } from '../../core/utils.js';

const DEPTHS = {
  far:  { count: 300, len: [7, 13],  speed: [520, 700],   width: 0.7, alpha: 0.2,  beam: 0.55, windK: 0.7 },
  mid:  { count: 130, len: [14, 24], speed: [900, 1150],  width: 1,   alpha: 0.24, beam: 0.6,  windK: 1 },
  near: { count: 26,  len: [46, 80], speed: [1700, 2100], width: 1.9, alpha: 0.13, beam: 0.3,  windK: 1.4 },
};

export class RainLayer {
  constructor({ density = 1, seed = 5 } = {}) {
    this.r = rng(seed);
    this.density = density;
    this.wind = 0.16;
    this.t = 0;
    this.drops = {};
    this.splashes = [];
  }

  resize(W, H) {
    this.W = W; this.H = H;
    const r = this.r;
    const area = (W * H) / (1440 * 900);
    for (const [k, d] of Object.entries(DEPTHS)) {
      const n = Math.round(d.count * this.density * Math.max(0.45, Math.min(1.4, area)));
      this.drops[k] = Array.from({ length: n }, () => ({
        x: r() * (W + 200) - 100,
        y: r() * H,
        l: d.len[0] + r() * (d.len[1] - d.len[0]),
        v: d.speed[0] + r() * (d.speed[1] - d.speed[0]),
      }));
    }
  }

  update(dt) {
    this.t += dt;
    // Gusting wind: two slow sines, never quite repeating.
    this.wind = 0.15 + Math.sin(this.t * 0.23) * 0.05 + Math.sin(this.t * 0.61 + 1.3) * 0.025;
    const { W, H } = this;
    for (const [k, d] of Object.entries(DEPTHS)) {
      const wx = this.wind * d.windK;
      for (const p of this.drops[k]) {
        p.y += p.v * dt;
        p.x -= p.v * wx * dt;
        if (p.y - p.l > H) { p.y = -p.l - this.r() * 60; p.x = this.r() * (W + 200) - 60; }
        if (p.x < -120) p.x += W + 240;
      }
    }
  }

  /** Build one path per depth. */
  #path(ctx, k) {
    const d = DEPTHS[k];
    const wx = this.wind * d.windK;
    ctx.beginPath();
    for (const p of this.drops[k]) {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.l * wx, p.y - p.l);
    }
  }

  draw(ctx, k, { alpha = 1, color = '#b7c7e0', boost = 1 } = {}) {
    const d = DEPTHS[k];
    if (!this.drops[k] || alpha <= 0.001) return;
    ctx.globalAlpha = Math.min(1, d.alpha * alpha * boost);
    ctx.strokeStyle = color;
    ctx.lineWidth = d.width;
    ctx.lineCap = 'round';
    this.#path(ctx, k);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Rain made visible by the searchlight: draw again, bright, clipped to the beam. */
  drawInBeam(ctx, clipPath, power, alpha) {
    if (power <= 0.01 || alpha <= 0.01) return;
    ctx.save();
    ctx.clip(clipPath);
    ctx.globalCompositeOperation = 'lighter';
    for (const k of ['far', 'mid', 'near']) {
      const d = DEPTHS[k];
      ctx.globalAlpha = d.beam * power * alpha;
      ctx.strokeStyle = '#dfe8ff';
      ctx.lineWidth = d.width * (k === 'near' ? 1 : 1.1);
      this.#path(ctx, k);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Tiny splashes on the wet roof. */
  splashesOn(ctx, roofY, dt, alpha) {
    if (alpha <= 0.01) return;
    const r = this.r;
    const spawn = dt * 26 * this.density;
    for (let i = 0; i < spawn; i++) {
      if (r() < 0.8) this.splashes.push({ x: r() * this.W, y: roofY + 6 + r() * (this.H - roofY - 6), t: 0 });
    }
    ctx.strokeStyle = '#9fb2cf';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    let a = 0;
    this.splashes = this.splashes.filter((s) => {
      s.t += dt;
      if (s.t > 0.22) return false;
      const k = s.t / 0.22;
      const w = 2 + k * 5;
      ctx.moveTo(s.x - w, s.y - k * 3);
      ctx.lineTo(s.x - w * 0.3, s.y - 1);
      ctx.moveTo(s.x + w, s.y - k * 3);
      ctx.lineTo(s.x + w * 0.3, s.y - 1);
      a++;
      return true;
    });
    if (a) { ctx.globalAlpha = 0.28 * alpha; ctx.stroke(); ctx.globalAlpha = 1; }
  }
}
