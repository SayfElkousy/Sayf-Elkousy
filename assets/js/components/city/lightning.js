/* ==========================================================================
   LightningController — occasional, unpredictable, never strobing.

   A strike is at most two pulses (≤ 2 flashes/second; WCAG 2.3.1 allows 3),
   then a slow decay. Lightning *illuminates the world* — it lights the
   clouds, backlights silhouettes, and reveals the illustrated linework —
   rather than whiting out the viewport.
   ========================================================================== */

import { rng } from '../../core/utils.js';

export class LightningController {
  constructor({ seed = 9 } = {}) {
    this.r = rng(seed);
    this.level = 0;        // current illumination 0–1
    this.next = Infinity;  // seconds until next strike
    this.strike = null;
    this.bolt = null;
    this.enabled = true;
  }

  schedule(inSeconds) { this.next = inSeconds; }

  trigger(big = false) {
    const r = this.r;
    const peak = big ? 1 : 0.55 + r() * 0.4;
    // Envelope: [time, level] — a flash, a dip, a second flash, decay.
    const env = r() < 0.6
      ? [[0, 0], [0.04, peak], [0.11, peak * 0.22], [0.2, peak * 0.85], [0.34, peak * 0.3], [1.3, 0]]
      : [[0, 0], [0.05, peak], [0.3, peak * 0.4], [1.1, 0]];
    this.strike = { t: 0, env, x: 0.15 + r() * 0.7 };
    this.bolt = r() < (big ? 1 : 0.55) ? this.#makeBolt(this.strike.x) : null;
  }

  #makeBolt(xFrac) {
    const r = this.r;
    const pts = [];
    let x = xFrac, y = 0.08 + r() * 0.08;
    const end = 0.6 + r() * 0.12;
    pts.push([x, y]);
    const branches = [];
    while (y < end) {
      y += 0.02 + r() * 0.035;
      x += (r() - 0.5) * 0.035;
      pts.push([x, y]);
      if (r() < 0.18) {
        const b = [[x, y]];
        let bx = x, by = y;
        const dir = r() < 0.5 ? -1 : 1;
        for (let i = 0; i < 3 + r() * 4; i++) { by += 0.02 + r() * 0.02; bx += dir * (0.008 + r() * 0.02); b.push([bx, by]); }
        branches.push(b);
      }
    }
    return { pts, branches };
  }

  update(dt) {
    if (this.enabled) {
      this.next -= dt;
      if (this.next <= 0) {
        this.trigger();
        this.next = 7 + this.r() * 12; // 7–19s: unpredictable, never busy
      }
    }
    if (!this.strike) { this.level = 0; return; }
    const s = this.strike;
    s.t += dt;
    const env = s.env;
    if (s.t >= env[env.length - 1][0]) { this.strike = null; this.bolt = null; this.level = 0; return; }
    for (let i = 1; i < env.length; i++) {
      if (s.t <= env[i][0]) {
        const [t0, a0] = env[i - 1], [t1, a1] = env[i];
        this.level = a0 + ((s.t - t0) / (t1 - t0)) * (a1 - a0);
        break;
      }
    }
  }

  get x() { return this.strike ? this.strike.x : 0.5; }

  /** Distant bolt, drawn behind the far skyline. */
  drawBolt(ctx, W, H) {
    if (!this.bolt || this.level < 0.05) return;
    const draw = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); ctx.stroke(); };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8fb0ff';
    ctx.globalAlpha = 0.18 * this.level;
    ctx.lineWidth = 7;
    draw(this.bolt.pts);
    ctx.strokeStyle = '#eef3ff';
    ctx.globalAlpha = 0.85 * this.level;
    ctx.lineWidth = 1.3;
    draw(this.bolt.pts);
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.55 * this.level;
    this.bolt.branches.forEach(draw);
    ctx.restore();
  }
}
