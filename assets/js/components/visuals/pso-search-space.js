/* ==========================================================================
   PSO search space — the visual for "Particle Swarm Optimization in
   Quantum Engineering".

   A unit cube seen in perspective: dark inner walls with a grid, a floor
   with contour rings (level sets of the objective), and a swarm running real
   PSO toward the optimum x*. Penguins are the visible particles; small blue
   dots are the rest of the swarm.

   Interaction
   • Desktop: the pointer is the optimum. Its position is taken relative to
     this visual, cast as a ray into the cube, and placed on that ray, so
     x* always sits under the cursor while its depth drifts slowly.
     The cube tilts a few degrees with the pointer (parallax).
   • Touch / pointer away: x* wanders on its own; the swarm scatters a
     little on each move and reconverges. A tap moves x* for a while.
   • Reduced motion: one still frame — the swarm pre-simulated to near
     convergence, with trails showing the paths it took.

   Canvas 2D, no dependencies. One rAF loop, running only while the visual
   is on screen and the tab is visible. Everything is torn down on unmount.
   ========================================================================== */

import { Swarm, loadPenguinSprites, PENGUIN_W, PENGUIN_H } from './penguin-swarm.js';
import { lerp, smoothstep, reducedMotion, finePointer, disposer, rng } from '../../core/utils.js';

const D = 7;                         // camera distance (cube spans −1…1)
const YAW = -0.6, PITCH = 0.34;      // resting view (radians)
const TILT_YAW = 0.06;               // ±3.4° with the pointer
const TILT_PITCH = 0.045;            // ±2.6°
const BOUND = 0.88;                  // where x* may go
const INTRO = 1.5;                   // seconds: edges → grid → swarm

const INK = '241,244,246';
const INK2 = '157,167,179';
const BLUE = '43,99,255';
const BLUE_T = '107,147,255';

export const psoVisual = {
  markup() {
    const hint = finePointer() ? 'Your cursor is the optimum' : 'Tap to move the optimum';
    return `
      <div class="pso" role="img" aria-label="Illustration: a three-dimensional search space. A swarm of particles, drawn as penguins and small blue points, searches the space and converges on the optimum.">
        <canvas class="pso__canvas" aria-hidden="true"></canvas>
        <p class="pso__hud pso__hud--tl mono" aria-hidden="true">
          <span>Search space</span>
          <span class="pso__fx">f(x) = ‖x − x*‖²</span>
        </p>
        <p class="pso__hud pso__hud--bl mono" aria-hidden="true">
          <span class="pso__iter">Iter 0000</span>
          <span class="pso__best">gbest —</span>
        </p>
        <p class="pso__hint mono" aria-hidden="true">${hint}</p>
      </div>`;
  },
  mount(el) {
    const v = new PsoSearchSpace(el.querySelector('.pso'));
    return () => v.destroy();
  },
};

/* 12 cube edges as pairs of corner indices; corners are (±1, ±1, ±1). */
const CORNERS = [];
for (let i = 0; i < 8; i++) CORNERS.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
const EDGES = [];
for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
  const diff = CORNERS[a].reduce((n, v, k) => n + (v !== CORNERS[b][k]), 0);
  if (diff === 1) EDGES.push([a, b]);
}

class PsoSearchSpace {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('.pso__canvas');
    this.ctx = this.canvas.getContext('2d');
    this.iterEl = root.querySelector('.pso__iter');
    this.bestEl = root.querySelector('.pso__best');
    this.d = disposer();
    this.still = reducedMotion();
    this.touch = !finePointer();
    this.swarm = new Swarm({ penguins: this.touch ? 12 : 14, dots: this.touch ? 70 : 96 });
    this.r = rng(99);

    this.yaw = YAW; this.pitch = PITCH;
    this.target = this.swarm.target;           // shared, updated in place
    this.goal = [0.35, 0.1, 0.15];
    this.target.splice(0, 3, ...this.goal);
    this.mode = 'auto';
    this.nextWaypoint = 0;
    this.ptr = { x: 0, y: 0, nx: 0, ny: 0, inside: false, left: 0 };
    this.time = 0;
    this.introAt = -1;                         // time the intro started
    this.trailClock = 0;
    this.hudClock = 0;
    this.running = false;
    this.visible = false;

    this.#bind();
    loadPenguinSprites().then((s) => {
      if (this.destroyed) return;
      this.sprites = s;
      if (this.still) this.#drawStill();
    });
  }

  /* ---------------- lifecycle ---------------- */
  #bind() {
    this.ro = new ResizeObserver(() => this.#resize());
    this.ro.observe(this.root);
    this.#resize();

    if (this.still) return; // a still frame needs no loop or input

    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible && this.introAt < 0) this.introAt = this.time;
      this.visible ? this.start() : this.stop();
    }, { threshold: 0.08 });
    this.io.observe(this.root);
    this.d.on(document, 'visibilitychange', () => (document.hidden ? this.stop() : this.start()));

    this.d.on(this.root, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.#setPointer(e);
      if (this.mode !== 'pointer') { this.mode = 'pointer'; this.swarm.scatter(0.35); }
    });
    this.d.on(this.root, 'pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.ptr.inside = false;
      this.ptr.left = this.time;
    });
    // Touch / pen: a tap sets the optimum for a while. Never required.
    this.d.on(this.root, 'pointerup', (e) => {
      if (e.pointerType === 'mouse') return;
      this.#setPointer(e);
      this.goal = this.#unproject(this.ptr.x, this.ptr.y);
      this.mode = 'tap';
      this.tapUntil = this.time + 6;
      this.swarm.scatter(0.5);
    });
  }

  #setPointer(e) {
    const r = this.root.getBoundingClientRect();
    // Pointer relative to this visual, not the page.
    this.ptr.x = e.clientX - r.left;
    this.ptr.y = e.clientY - r.top;
    this.ptr.nx = (this.ptr.x / r.width) * 2 - 1;
    this.ptr.ny = (this.ptr.y / r.height) * 2 - 1;
    this.ptr.inside = true;
  }

  #resize() {
    const r = this.root.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    if (W === this.W && H === this.H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.#fit();
    if (this.still) this.#drawStill();
    else if (!this.running) this.#draw();
  }

  /** Scale and centre so the cube fits with room for tilt and the HUD. */
  #fit() {
    this.f = 1; this.cx = 0; this.cy = 0;
    this.#setRot(YAW, PITCH);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of CORNERS) {
      const [x, y] = this.#project(c);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const narrow = this.W < 520;
    const f = Math.min((this.W * (narrow ? 0.8 : 0.74)) / (x1 - x0), (this.H * (narrow ? 0.68 : 0.72)) / (y1 - y0));
    this.f = f;
    this.cx = this.W / 2 - ((x0 + x1) / 2) * f;
    this.cy = this.H * 0.52 - ((y0 + y1) / 2) * f;
    this.penH = Math.max(24, Math.min(36, this.W / 21)); // penguin height at mid-depth
  }

  start() {
    if (this.running || !this.visible || document.hidden || this.destroyed || this.still) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.#update(dt);
      this.#draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    this.io?.disconnect();
    this.ro?.disconnect();
    this.d.run();
  }

  /* ---------------- camera ---------------- */
  #setRot(yaw, pitch) {
    this.cyw = Math.cos(yaw); this.syw = Math.sin(yaw);
    this.cp = Math.cos(pitch); this.sp = Math.sin(pitch);
  }

  /** World → [screenX, screenY, scale, depth]. Larger depth = nearer. */
  #project(p) {
    const x1 = p[0] * this.cyw + p[2] * this.syw;
    const z1 = -p[0] * this.syw + p[2] * this.cyw;
    const y2 = p[1] * this.cp - z1 * this.sp;
    const z2 = p[1] * this.sp + z1 * this.cp;
    const s = this.f / (D - z2);
    return [this.cx + x1 * s, this.cy - y2 * s, s, z2];
  }

  /** Camera space → world (inverse rotation). */
  #toWorld(x1, y2, z2) {
    const y = y2 * this.cp + z2 * this.sp;
    const z1 = -y2 * this.sp + z2 * this.cp;
    return [x1 * this.cyw - z1 * this.syw, y, x1 * this.syw + z1 * this.cyw];
  }

  /**
   * Local pointer (px, relative to the visual) → a point in the cube.
   * Cast a ray from the camera through the pointer; x* rides that ray, so it
   * stays under the cursor while its depth drifts.
   */
  #unproject(X, Y) {
    const xc = (X - this.cx) / this.f, yc = -(Y - this.cy) / this.f;
    const O = this.#toWorld(0, 0, D);
    const dir = this.#toWorld(xc, yc, -1);
    let t0 = -Infinity, t1 = Infinity;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(dir[k]) < 1e-9) { if (Math.abs(O[k]) > BOUND) { t0 = Infinity; } continue; }
      let a = (-BOUND - O[k]) / dir[k], b = (BOUND - O[k]) / dir[k];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    }
    let t;
    if (t0 <= t1 && t1 > 0) t = lerp(t0, t1, 0.5 + 0.3 * Math.sin(this.time * 0.35));
    else t = -(O[0] * dir[0] + O[1] * dir[1] + O[2] * dir[2]) / (dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
    return O.map((o, k) => Math.max(-BOUND, Math.min(BOUND, o + dir[k] * t)));
  }

  /* ---------------- simulation ---------------- */
  #update(dt) {
    this.time += dt;

    // Where is the optimum heading?
    if (this.mode === 'pointer' && !this.ptr.inside && this.time - this.ptr.left > 1.2) this.mode = 'auto';
    if (this.mode === 'tap' && this.time > this.tapUntil) this.mode = 'auto';
    if (this.mode === 'pointer' && this.ptr.inside) this.goal = this.#unproject(this.ptr.x, this.ptr.y);
    if (this.mode === 'auto' && this.time >= this.nextWaypoint) {
      const rr = () => (this.r() * 2 - 1) * 0.72;
      this.goal = [rr(), rr() * 0.8, rr()];
      if (this.nextWaypoint > 0) this.swarm.scatter(0.45);
      this.nextWaypoint = this.time + 4.5 + this.r() * 2.5;
    }
    const k = 1 - Math.exp(-(this.mode === 'auto' ? 1.4 : 5) * dt);
    for (let i = 0; i < 3; i++) this.target[i] = lerp(this.target[i], this.goal[i], k);

    // Swarm (hold still until the intro has drawn the cube).
    if (this.time - this.introAt > INTRO * 0.45) {
      const steps = dt > 1 / 45 ? 2 : 1;
      for (let s = 0; s < steps; s++) this.swarm.step(dt / steps);
      this.trailClock += dt;
      if (this.trailClock > 0.05) { this.trailClock = 0; this.swarm.sampleTrails(); }
    }

    // Parallax tilt.
    const pointing = this.mode === 'pointer' && this.ptr.inside;
    const ty = YAW + (pointing ? this.ptr.nx * TILT_YAW : Math.sin(this.time * 0.25) * 0.02);
    const tp = PITCH + (pointing ? this.ptr.ny * TILT_PITCH : 0);
    const c = 1 - Math.exp(-4 * dt);
    this.yaw = lerp(this.yaw, ty, c);
    this.pitch = lerp(this.pitch, tp, c);

    // HUD, a few times a second.
    this.hudClock += dt;
    if (this.hudClock > 0.15) {
      this.hudClock = 0;
      this.iterEl.textContent = `Iter ${String(this.swarm.iter % 10000).padStart(4, '0')}`;
      this.bestEl.textContent = `gbest ${Math.sqrt(this.swarm.gbestVal).toFixed(3)}`;
    }
  }

  #drawStill() {
    if (!this.W) return;
    // Pre-simulate from scattered starts to near convergence, keeping long trails.
    const sw = new Swarm({ penguins: 14, dots: 96, seed: 7 });
    sw.target.splice(0, 3, 0.3, -0.05, 0.12);
    for (let i = 0; i < 150; i++) {
      sw.step(1 / 60);
      if (i % 5 === 0) sw.sampleTrails(30);
    }
    const live = this.swarm;
    this.swarm = sw;
    this.target = sw.target;
    this.time = 0;
    this.#draw();
    this.swarm = live;
    this.target = live.target;
    this.iterEl.textContent = `Iter ${String(sw.iter).padStart(4, '0')}`;
    this.bestEl.textContent = `gbest ${Math.sqrt(sw.gbestVal).toFixed(3)}`;
  }

  /* ---------------- drawing ---------------- */
  #draw() {
    const { ctx, W, H, dpr } = this;
    if (!W) return;
    this.#setRot(this.yaw, this.pitch);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const since = this.still ? INTRO : this.introAt < 0 ? 0 : this.time - this.introAt;
    const kEdge = smoothstep(0, INTRO * 0.6, since);
    const kGrid = smoothstep(INTRO * 0.25, INTRO * 0.8, since);
    const kSwarm = smoothstep(INTRO * 0.45, INTRO, since);

    const P = CORNERS.map((c) => this.#project(c));
    const cam = this.#toWorld(0, 0, D);
    // A face is an inner (back) wall when the camera is on its inside.
    const back = (axis, sign) => sign * cam[axis] < 1;

    this.#walls(P, back, kGrid);
    this.#contours(kGrid);
    this.#edges(P, back, kEdge, false);
    this.#axes(P, kGrid);
    this.#agents(kSwarm);
    this.#markers(kSwarm);
    this.#edges(P, back, kEdge, true);
  }

  #walls(P, back, k) {
    if (k <= 0) return;
    const ctx = this.ctx;
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      if (!back(axis, sign)) continue;
      const floor = axis === 1 && sign === -1;
      // corners on this face, in winding order
      const u = (axis + 1) % 3, v = (axis + 2) % 3;
      const quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
        const p = [0, 0, 0]; p[axis] = sign; p[u] = a; p[v] = b; return this.#project(p);
      });
      ctx.beginPath();
      quad.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = floor ? `rgba(18,30,44,${0.55 * k})` : `rgba(12,20,30,${0.45 * k})`;
      ctx.fill();

      // inner grid
      const N = 8;
      ctx.beginPath();
      for (let i = 1; i < N; i++) {
        const t = -1 + (2 * i) / N;
        for (const [ua, va] of [[u, v], [v, u]]) {
          const a = [0, 0, 0], b = [0, 0, 0];
          a[axis] = b[axis] = sign; a[ua] = b[ua] = t; a[va] = -1; b[va] = 1;
          const A = this.#project(a), B = this.#project(b);
          ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        }
      }
      ctx.strokeStyle = `rgba(${INK2},${(floor ? 0.12 : 0.07) * k})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /** Level sets of f on the floor, around x*'s footprint. */
  #contours(k) {
    if (k <= 0) return;
    const ctx = this.ctx;
    const [tx, , tz] = this.target;
    const foot = this.#project([tx, -1, tz]);
    // soft blue pool under the optimum
    const g = ctx.createRadialGradient(foot[0], foot[1], 0, foot[0], foot[1], foot[2] * 0.9);
    g.addColorStop(0, `rgba(${BLUE},${0.16 * k})`);
    g.addColorStop(1, `rgba(${BLUE},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(foot[0], foot[1], foot[2] * 0.9, foot[2] * 0.9 * Math.sin(this.pitch) * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    [0.18, 0.38, 0.6, 0.86].forEach((rad, i) => {
      ctx.beginPath();
      let pen = false;
      for (let s = 0; s <= 48; s++) {
        const a = (s / 48) * Math.PI * 2;
        const x = tx + Math.cos(a) * rad, z = tz + Math.sin(a) * rad;
        if (Math.abs(x) > 1 || Math.abs(z) > 1) { pen = false; continue; }
        const [X, Y] = this.#project([x, -1, z]);
        pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        pen = true;
      }
      ctx.strokeStyle = `rgba(${BLUE_T},${(0.3 - i * 0.06) * k})`;
      ctx.setLineDash(i ? [2, 4] : []);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  #edges(P, back, k, front) {
    if (k <= 0) return;
    const ctx = this.ctx;
    ctx.lineWidth = 1;
    for (const [a, b] of EDGES) {
      // the axis this edge runs along, and the two faces that meet at it
      const A = CORNERS[a], B = CORNERS[b];
      const along = A.findIndex((v, i) => v !== B[i]);
      const faces = [0, 1, 2].filter((i) => i !== along).map((i) => [i, A[i]]);
      const hidden = faces.every(([ax, s]) => back(ax, s));
      if (hidden === front) continue;
      const p = P[a], q = P[b];
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(lerp(p[0], q[0], k), lerp(p[1], q[1], k));
      ctx.strokeStyle = front ? `rgba(${INK},0.42)` : `rgba(${INK2},0.24)`;
      ctx.stroke();
    }
  }

  /** Faint coordinate ticks and labels on three edges from one corner. */
  #axes(P, k) {
    if (k <= 0) return;
    const ctx = this.ctx;
    const o = [-1, -1, 1]; // origin corner for the labels
    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = `rgba(${INK2},${0.55 * k})`;
    ctx.strokeStyle = `rgba(${INK2},${0.35 * k})`;
    ctx.lineWidth = 1;
    const axes = [['x', [1, -1, 1]], ['y', [-1, 1, 1]], ['z', [-1, -1, -1]]];
    for (const [name, end] of axes) {
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const p = this.#project(o.map((v, j) => lerp(v, end[j], t)));
        ctx.beginPath();
        ctx.moveTo(p[0] - 2, p[1]); ctx.lineTo(p[0] + 2, p[1]);
        ctx.stroke();
      }
      const e = this.#project(end);
      const m = this.#project(o.map((v, j) => lerp(v, end[j], 1.08)));
      ctx.fillText(name, m[0] + (m[0] - e[0]) * 0.2 - 3, m[1] + 3);
    }
    const c0 = this.#project([-1, -1, 1]);
    const c1 = this.#project([1, 1, -1]);
    ctx.fillStyle = `rgba(${INK2},${0.4 * k})`;
    ctx.fillText('(−1,−1,1)', c0[0] - 22, c0[1] + 16);
    ctx.fillText('(1,1,−1)', c1[0] - 18, c1[1] - 9);
  }

  #agents(k) {
    if (k <= 0) return;
    const ctx = this.ctx;
    const mid = this.f / D;
    const items = this.swarm.agents.map((a) => ({ a, p: this.#project(a.x) }));
    items.sort((m, n) => m.p[3] - n.p[3]); // far → near

    for (const { a, p } of items) {
      const depth = p[2] / mid;               // ~0.8 (far) … 1.3 (near)
      const fade = k * Math.min(1, 0.55 + (depth - 0.8) * 0.9);
      if (!a.penguin) {
        const q = this.#project([a.x[0] - a.v[0] * 0.09, a.x[1] - a.v[1] * 0.09, a.x[2] - a.v[2] * 0.09]);
        ctx.strokeStyle = `rgba(${BLUE_T},${0.35 * fade})`;
        ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.fillStyle = `rgba(${BLUE_T},${0.85 * fade})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.25 * depth, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      this.#penguin(a, p, depth, fade);
    }
  }

  #penguin(a, p, depth, fade) {
    const ctx = this.ctx;
    // trail
    if (a.trail.length > 1) {
      ctx.lineWidth = 1;
      let prev = this.#project(a.trail[0]);
      for (let i = 1; i < a.trail.length; i++) {
        const cur = this.#project(a.trail[i]);
        ctx.strokeStyle = `rgba(${INK2},${(i / a.trail.length) * 0.3 * fade})`;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
        prev = cur;
      }
    }
    if (!this.sprites?.[0]) return;

    // Face the way it's travelling on screen; lean into the motion.
    const q = this.#project([a.x[0] + a.v[0] * 0.06, a.x[1] + a.v[1] * 0.06, a.x[2] + a.v[2] * 0.06]);
    const vx = q[0] - p[0], vy = q[1] - p[1];
    if (a.face === undefined) a.face = vx < 0 ? -1 : 1;
    if (Math.abs(vx) > 0.35) a.face = vx < 0 ? -1 : 1;
    const lean = Math.max(-0.45, Math.min(0.45, vx * 0.05 + vy * 0.02 * a.face));
    a.lean = a.lean === undefined ? lean : lerp(a.lean, lean, 0.15);

    const speed = Math.hypot(...a.v);
    const h = this.penH * depth;
    const w = (h * PENGUIN_W) / PENGUIN_H;
    const flap = (this.time * (1.4 + speed * 4) + a.phase) % 1;
    const sprite = this.sprites[flap < 0.5 ? 0 : 1] || this.sprites[0];
    const bob = Math.sin(this.time * 5 + a.phase) * h * 0.03;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(p[0], p[1] + bob);
    ctx.rotate(a.lean);
    ctx.scale(a.face, 1); // mirror to face left
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** x* (the optimum) and the swarm's best guess so far. */
  #markers(k) {
    if (k <= 0) return;
    const ctx = this.ctx;
    const t = this.#project(this.target);
    const foot = this.#project([this.target[0], -1, this.target[2]]);

    // drop line + floor cross: where x* sits in the space
    ctx.strokeStyle = `rgba(${BLUE_T},${0.3 * k})`;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(foot[0] - 4, foot[1]); ctx.lineTo(foot[0] + 4, foot[1]);
    ctx.moveTo(foot[0], foot[1] - 3); ctx.lineTo(foot[0], foot[1] + 3);
    ctx.stroke();

    // x*: a small ring with a soft glow
    const g = ctx.createRadialGradient(t[0], t[1], 0, t[0], t[1], 20);
    g.addColorStop(0, `rgba(${BLUE},${0.28 * k})`);
    g.addColorStop(1, `rgba(${BLUE},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(t[0] - 20, t[1] - 20, 40, 40);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(${BLUE_T},${0.95 * k})`;
    ctx.beginPath(); ctx.arc(t[0], t[1], 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(${INK},${k})`;
    ctx.beginPath(); ctx.arc(t[0], t[1], 1.4, 0, Math.PI * 2); ctx.fill();

    // gbest: the site's station diamond
    const b = this.#project(this.swarm.gbest);
    ctx.save();
    ctx.translate(b[0], b[1]);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = `rgba(${INK},${0.8 * k})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(-3.5, -3.5, 7, 7);
    ctx.restore();

    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = `rgba(${BLUE_T},${0.9 * k})`;
    ctx.fillText('x*', t[0] + 10, t[1] - 8);
    if (Math.hypot(b[0] - t[0], b[1] - t[1]) > 14) {
      ctx.fillStyle = `rgba(${INK2},${0.75 * k})`;
      ctx.fillText('gbest', b[0] + 8, b[1] + 12);
    }
  }
}
