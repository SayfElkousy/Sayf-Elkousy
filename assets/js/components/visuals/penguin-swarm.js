/* ==========================================================================
   PenguinSwarm — the particles of the PSO search-space visual.

   Every agent runs actual particle swarm optimization on
       f(x) = |x − target|²
   inside the unit cube [−1, 1]³. Each remembers its personal best (pbest);
   the swarm shares a global best (gbest). The target is never handed to them
   directly — they find it by sampling, which is why the swarm visibly
   searches, overshoots, and then converges. (The target moving just changes
   f; stale bests are re-scored every step, so the swarm re-explores.)

   Penguins (the few, visible ones) also flock:
     separation  keep a body-length apart
     alignment   swim roughly with their neighbours
     cohesion    stay loosely together
   plus a gentle pull toward the target so the group reads as one swarm.
   Dots (the many) run plain PSO — they are the "100+" of the real sim.

   Pure data + maths: no DOM. The visual (pso-search-space.js) owns drawing.
   ========================================================================== */

import { rng } from '../../core/utils.js';

/* ---------- The penguin: an original, reusable inline SVG ----------
   Upright, three-quarter view facing right, 40 × 48. Slate body with a
   hairline edge (so it reads on near-black), off-white belly, one eye,
   and the site's blue for beak and feet — the single playful accent.
   Two flipper poses (down / out) make a flap cycle. */
const BODY = '#1a2531';
const EDGE = 'rgba(157,167,179,0.75)';
const BELLY = '#e8ecef';
const BLUE = '#6b93ff';
export const PENGUIN_W = 40;
export const PENGUIN_H = 48;

export function penguinSVG({ pose = 0 } = {}) {
  const flippers = pose === 0
    ? `<path d="M9.6 19.5 C 6 23, 4.2 28, 4.4 33 C 6.6 30, 8.4 26.5, 9.8 24 Z" />
       <path d="M30.2 19.5 C 33.8 23, 35.6 28, 35.4 33 C 33.2 30, 31.4 26.5, 30 24 Z" />`
    : `<path d="M9.6 19.5 C 5.6 19.6, 2.2 21.8, 0.8 25.6 C 4 24.8, 7.2 24.4, 9.9 24.6 Z" />
       <path d="M30.2 19.5 C 34.2 19.6, 37.6 21.8, 39 25.6 C 35.8 24.8, 32.6 24.4, 29.9 24.6 Z" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PENGUIN_W} ${PENGUIN_H}" width="${PENGUIN_W}" height="${PENGUIN_H}">
  <g fill="${BLUE}">
    <path d="M12.5 44.2 C 11 45.8, 11.6 46.9, 13.6 46.9 L 18.4 46.9 C 19.4 46.9, 19.2 45.4, 17.8 44.4 Z" />
    <path d="M22.4 44.4 C 21 45.4, 20.8 46.9, 21.8 46.9 L 26.6 46.9 C 28.6 46.9, 29.2 45.8, 27.7 44.2 Z" />
  </g>
  <g fill="${BODY}" stroke="${EDGE}" stroke-width="0.9" stroke-linejoin="round">
    ${flippers}
    <path d="M19.6 2.6 C 26.4 2.6, 29.8 7.6, 29.8 13.8 C 29.8 19.4, 33 24.6, 33 32.4 C 33 40.6, 27.6 45.2, 19.9 45.2 C 12.2 45.2, 6.8 40.6, 6.8 32.4 C 6.8 24.6, 10 19.4, 10 13.8 C 10 7.6, 13 2.6, 19.6 2.6 Z" />
  </g>
  <path fill="${BELLY}" d="M21.6 15.2 C 25.4 15.2, 27.6 18.4, 28.2 22.6 C 29 27.4, 30.4 30, 30.4 34 C 30.4 40.2, 26.4 43.2, 21 43.2 C 15.4 43.2, 12.2 40.2, 12.2 34.2 C 12.2 29.6, 14.4 26.4, 15.4 22.4 C 16.2 18.2, 18.2 15.2, 21.6 15.2 Z" />
  <circle cx="23.4" cy="10" r="1.9" fill="${BELLY}" />
  <circle cx="24" cy="10.1" r="1" fill="#05080c" />
  <path fill="${BLUE}" d="M28.6 11.6 L 35.6 13.3 L 28.8 15 C 29.4 13.9, 29.3 12.7, 28.6 11.6 Z" />
</svg>`;
}

/** Rasterise both poses once (crisp at any DPR up to `scale`). */
export function loadPenguinSprites(scale = 4) {
  return Promise.all([0, 1].map((pose) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = PENGUIN_W * scale; c.height = PENGUIN_H * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(penguinSVG({ pose }));
  })));
}

/* ---------- Swarm ---------- */
const LIM = 0.94;            // soft walls, just inside the cube
const TUNE = {
  inertia: 1.35,             // velocity damping per second (higher = calmer)
  cognitive: 2.0,            // pull toward own best
  social: 2.6,               // pull toward swarm best
  attract: 0.55,             // gentle direct pull (penguins only)
  sep: 10, sepR: 0.4,        // separation (penguins)
  align: 0.9, alignR: 0.55,  // alignment (penguins)
  cohere: 0.22,              // cohesion (penguins)
  jitter: 0.35,              // idle wander so a converged swarm still breathes
  vmax: 1.35,                // units per second
};

const f = (p, t) => {
  const dx = p[0] - t[0], dy = p[1] - t[1], dz = p[2] - t[2];
  return dx * dx + dy * dy + dz * dz;
};

export class Swarm {
  /**
   * @param {object} o
   * @param {number} o.penguins  visible penguins
   * @param {number} o.dots      supporting particles
   * @param {number} [o.seed]
   */
  constructor({ penguins = 14, dots = 96, seed = 7 } = {}) {
    this.r = rng(seed);
    this.target = [0, 0, 0];
    this.gbest = [0, 0, 0];
    this.gbestVal = Infinity;
    this.time = 0;
    this.iter = 0;
    this.agents = [];
    for (let i = 0; i < penguins + dots; i++) this.agents.push(this.#spawn(i < penguins));
    this.penguins = this.agents.filter((a) => a.penguin);
    this.dots = this.agents.filter((a) => !a.penguin);
  }

  #rand(a = -1, b = 1) { return a + (b - a) * this.r(); }

  #spawn(penguin) {
    const x = [this.#rand(-0.85, 0.85), this.#rand(-0.85, 0.85), this.#rand(-0.85, 0.85)];
    return {
      penguin,
      x,
      v: [this.#rand(-0.3, 0.3), this.#rand(-0.3, 0.3), this.#rand(-0.3, 0.3)],
      pbest: x.slice(),
      r1: this.r(), r2: this.r(), reroll: this.r() * 0.5,
      phase: this.r() * Math.PI * 2,   // flap-cycle offset
      trail: [],                        // recent positions (penguins)
    };
  }

  /** Scatter slightly — used when the target jumps somewhere new. */
  scatter(amount = 0.6) {
    for (const a of this.agents) {
      for (let k = 0; k < 3; k++) a.v[k] += this.#rand(-amount, amount);
      // Forget a little: a personal best near the old target is no longer interesting.
      a.pbest = a.x.slice();
    }
  }

  step(dt) {
    const T = TUNE;
    const t = this.target;
    this.time += dt;
    this.iter = Math.floor(this.time * 20); // report at a PSO-like 20 iterations/s

    // Re-score bests against the (possibly moved) objective, update pbest, find gbest.
    let best = null, bestVal = Infinity;
    for (const a of this.agents) {
      if (f(a.x, t) < f(a.pbest, t)) a.pbest = a.x.slice();
      const v = f(a.pbest, t);
      if (v < bestVal) { bestVal = v; best = a.pbest; }
    }
    this.gbest = best.slice();
    this.gbestVal = bestVal;

    // Penguin neighbourhood stats (n is small: O(n²) is fine).
    const P = this.penguins;
    const centre = [0, 0, 0];
    for (const a of P) for (let k = 0; k < 3; k++) centre[k] += a.x[k] / P.length;

    const decay = Math.exp(-T.inertia * dt);
    for (const a of this.agents) {
      // Stochastic weights, re-drawn a few times per second (not per frame) so motion stays smooth.
      a.reroll -= dt;
      if (a.reroll <= 0) { a.r1 = this.r(); a.r2 = this.r(); a.reroll = 0.25 + this.r() * 0.4; }

      const acc = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        acc[k] += T.cognitive * a.r1 * (a.pbest[k] - a.x[k]);
        acc[k] += T.social * a.r2 * (this.gbest[k] - a.x[k]);
        acc[k] += T.jitter * Math.sin(this.time * (1.3 + k * 0.4) + a.phase * (k + 1));
      }

      if (a.penguin) {
        const avgV = [0, 0, 0];
        let nAlign = 0;
        for (const b of P) {
          if (b === a) continue;
          const dx = a.x[0] - b.x[0], dy = a.x[1] - b.x[1], dz = a.x[2] - b.x[2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
          if (d < T.sepR) {
            const push = T.sep * (T.sepR - d) / T.sepR / d;
            acc[0] += dx * push; acc[1] += dy * push; acc[2] += dz * push;
          }
          if (d < T.alignR) { nAlign++; for (let k = 0; k < 3; k++) avgV[k] += b.v[k]; }
        }
        for (let k = 0; k < 3; k++) {
          if (nAlign) acc[k] += T.align * (avgV[k] / nAlign - a.v[k]);
          acc[k] += T.cohere * (centre[k] - a.x[k]);
          acc[k] += T.attract * (t[k] - a.x[k]);
        }
      }

      let sp = 0;
      for (let k = 0; k < 3; k++) { a.v[k] = a.v[k] * decay + acc[k] * dt; sp += a.v[k] * a.v[k]; }
      sp = Math.sqrt(sp);
      if (sp > T.vmax) for (let k = 0; k < 3; k++) a.v[k] *= T.vmax / sp;

      for (let k = 0; k < 3; k++) {
        a.x[k] += a.v[k] * dt;
        if (a.x[k] > LIM) { a.x[k] = LIM; a.v[k] *= -0.4; }
        else if (a.x[k] < -LIM) { a.x[k] = -LIM; a.v[k] *= -0.4; }
      }
    }
  }

  /** Record trail points for penguins (call at a fixed cadence, not per frame). */
  sampleTrails(max = 16) {
    for (const a of this.penguins) {
      a.trail.push(a.x.slice());
      if (a.trail.length > max) a.trail.shift();
    }
  }
}
