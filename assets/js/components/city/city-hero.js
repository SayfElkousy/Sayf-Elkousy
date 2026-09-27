/* ==========================================================================
   CityHero — the opening establishing shot.

   BLACK → city emerges → a first strike of lightning → the searchlight
   ignites → SAYF ELKOUSY on the clouds → (scroll) the camera pulls away,
   the storm thins, the architecture turns to blueprint linework, and that
   linework hands off to the site's own 12-column grid.

   Layers (back → front):
     sky · clouds · signal pool · bolt · distant · fog · mid · fog ·
     beam · near · rain(far, mid, in-beam) · rooftop · lamp · rain(near)

   Performance:
   • all architecture is pre-rendered; a frame is ~15 drawImage calls + 3 rain paths
   • DPR capped (1.5 desktop / 1.25 touch), steps down if frames run slow
   • the loop stops when the hero is off-screen or the tab is hidden
   • reduced motion: a single still frame, no lightning, no parallax
   ========================================================================== */

import { renderSky, renderClouds, renderFog, makeCanvas } from './atmosphere.js';
import { renderLayer, renderForeground, paintWindow } from './skyline.js';
import { RainLayer } from './rain.js';
import { LightningController } from './lightning.js';
import { Searchlight } from './searchlight.js';
import { clamp, lerp, smoothstep, reducedMotion, finePointer, rng } from '../../core/utils.js';

const LAYER_DEPTH = {
  // parallax px, scroll drop (×H), scroll zoom
  clouds:  { par: 2,  drop: -0.2, zoom: 0.02 },
  distant: { par: 3,  drop: 0.06, zoom: 0.05 },
  mid:     { par: 5,  drop: 0.14, zoom: 0.09 },
  near:    { par: 9,  drop: 0.26, zoom: 0.15 },
  fg:      { par: 14, drop: 0.5,  zoom: 0.24 },
};

export class CityHero {
  /**
   * @param {HTMLElement} section  the tall hero section (scroll runway)
   * @param {object} o
   * @param {boolean} o.intro      play the full opening (first visit this session)
   * @param {(p:number)=>void} o.onProgress
   */
  constructor(section, { intro = true, onProgress } = {}) {
    this.section = section;
    this.stage = section.querySelector('.hero__stage');
    this.canvas = section.querySelector('.hero__canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.intro = intro;
    this.onProgress = onProgress || (() => {});
    this.touch = !finePointer();
    this.rain = new RainLayer({ density: this.touch ? 0.6 : 1 });
    this.lightning = new LightningController();
    this.light = new Searchlight();
    this.r = rng(1234);
    this.t = 0;
    this.p = 0;                  // scroll progress 0–1
    this.ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    this.running = false;
    this.visible = true;
    this.frameTimes = [];
    this.dprCap = this.touch ? 1.25 : 1.5;
    this.life = { win: 1.2, plane: 18 + this.r() * 20, planeT: -1 };
  }

  async mount() {
    this.#layout();
    // Fonts must be ready before the signal is typeset.
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('800 100px "Big Shoulders Display"'),
          document.fonts.load('700 100px "Big Shoulders Display"'),
          document.fonts.load('500 60px "Reem Kufi"', 'سيف'),
        ]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch { /* fall back to system faces */ }
    if (this.destroyed) return;
    this.light.build(this.comp.pool0, this.dpr);

    // Intro choreography (seconds).
    if (reducedMotion()) {
      this.exposure = 1; this.light.power = 1; this.lightning.enabled = false;
    } else if (this.intro) {
      this.exposure = 0;
      this.timeline = { expFrom: 0, expStart: 0.35, expDur: 2.2, bolt: 1.0, ignite: 1.9 };
      this.lightning.schedule(Infinity);
    } else {
      this.exposure = 0.35;
      this.timeline = { expFrom: 0.35, expStart: 0, expDur: 0.7, bolt: -1, ignite: -1 };
      this.light.power = 1;
      this.lightning.schedule(4 + this.r() * 5);
    }

    this.#bind();
    this.#onScroll();
    if (reducedMotion()) this.#drawStill();
    else this.start();
  }

  /* ---------------- composition ---------------- */
  #layout() {
    const rect = this.stage.getBoundingClientRect();
    const W = Math.round(rect.width) || window.innerWidth;
    const H = Math.round(rect.height) || window.innerHeight;
    this.W = W; this.H = H;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';

    const portrait = H > W * 1.05;
    const u = clamp(Math.min(W, H * 1.4) / 1100, 0.6, 1.25);
    const roofY = H * (portrait ? 0.87 : 0.85);
    const lamp = { x: W * (portrait ? 0.72 : 0.73), y: roofY - 44 * u };
    const rx = portrait ? W * 0.42 : Math.min(W * 0.2, H * 0.3, 360);
    const pool = { x: W * (portrait ? 0.47 : 0.41), y: Math.max(H * (portrait ? 0.27 : 0.31), 96 + rx * 0.6), rx, ry: rx * 0.6 };
    this.comp = { lamp, pool0: pool, pool: { ...pool }, roofY, u, portrait, mastX: W * (portrait ? 0.6 : 0.655) };

    this.sky = renderSky(W, H, 0.5);
    this.clouds = renderClouds(W, H, dpr);
    this.fog = renderFog(W, H, dpr);
    this.layers = {
      distant: renderLayer('distant', W, H, dpr, this.comp),
      mid: renderLayer('mid', W, H, dpr, this.comp),
      near: renderLayer('near', W, H, dpr, this.comp),
    };
    this.fg = renderForeground(W, H, dpr, this.comp);
    this.rain.resize(W, H);
    this.beamBuf = makeCanvas(W * 0.5, H * 0.5);
    this.beamBuf.cssW = W; this.beamBuf.cssH = H;

    // Vignette
    const v = makeCanvas(W * 0.5, H * 0.5);
    const vx = v.getContext('2d');
    vx.scale(0.5, 0.5);
    const g = vx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(1,2,4,0.72)');
    vx.fillStyle = g;
    vx.fillRect(0, 0, W, H);
    this.vignette = v;
    this.lastW = W; this.lastH = H;
  }

  /* ---------------- events ---------------- */
  #bind() {
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.visible ? this.start() : this.stop();
    }, { threshold: 0 });
    this.io.observe(this.section);

    this.onVis = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener('visibilitychange', this.onVis);

    this.onScrollBound = () => this.#onScroll();
    window.addEventListener('scroll', this.onScrollBound, { passive: true });

    this.onResize = () => {
      clearTimeout(this.rt);
      this.rt = setTimeout(() => {
        const rect = this.stage.getBoundingClientRect();
        // Ignore mobile URL-bar height jitter; rebuild on real size changes.
        if (Math.abs(rect.width - this.lastW) < 2 && Math.abs(rect.height - this.lastH) < this.lastH * 0.2) return;
        this.#layout();
        this.light.build(this.comp.pool0, this.dpr);
        if (reducedMotion()) this.#drawStill();
      }, 180);
    };
    window.addEventListener('resize', this.onResize);

    if (!this.touch) {
      this.onPtr = (e) => {
        this.ptr.tx = (e.clientX / this.W) * 2 - 1;
        this.ptr.ty = (e.clientY / this.H) * 2 - 1;
      };
      window.addEventListener('pointermove', this.onPtr, { passive: true });
    }
    // A discovered interaction: click / tap the sky and the storm answers.
    this.onSkyClick = (e) => {
      if (reducedMotion() || this.p > 0.2) return;
      if (e.target.closest('a, button')) return;
      const now = performance.now();
      if (now - (this.lastSky || 0) < 4000 || this.lightning.strike) return;
      if (e.clientY > this.comp.roofY * 0.8) return;
      this.lastSky = now;
      this.lightning.trigger(false);
    };
    this.stage.addEventListener('click', this.onSkyClick);
  }

  #onScroll() {
    const rect = this.section.getBoundingClientRect();
    const run = Math.max(1, rect.height - window.innerHeight);
    this.p = clamp(-rect.top / run);
    this.onProgress(this.p);
    this.canvas.style.opacity = String(1 - smoothstep(0.78, 1, this.p));
    if (reducedMotion()) this.#drawStill();
  }

  start() {
    if (this.running || !this.visible || document.hidden || reducedMotion() || this.destroyed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.#update(dt);
      this.#draw(dt);
      this.#watchPerf(dt);
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
    document.removeEventListener('visibilitychange', this.onVis);
    window.removeEventListener('scroll', this.onScrollBound);
    window.removeEventListener('resize', this.onResize);
    if (this.onPtr) window.removeEventListener('pointermove', this.onPtr);
    this.stage.removeEventListener('click', this.onSkyClick);
  }

  #watchPerf(dt) {
    if (this.perfDone) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (avg > 0.026 && this.dprCap > 1) {
      this.dprCap = 1;
      this.#layout();
      this.light.build(this.comp.pool0, this.dpr);
    } else if (avg > 0.03) {
      this.rain.density *= 0.6; this.rain.resize(this.W, this.H);
      this.perfDone = true;
    } else {
      this.perfDone = true;
    }
  }

  /* ---------------- simulation ---------------- */
  #update(dt) {
    this.t += dt;
    const t = this.t;
    const tl = this.timeline;

    // Intro
    if (tl) {
      const k = clamp((t - tl.expStart) / tl.expDur);
      this.exposure = lerp(tl.expFrom, 1, 1 - Math.pow(1 - k, 3));
      if (tl.bolt > 0 && t >= tl.bolt && !tl.boltDone) { tl.boltDone = true; this.lightning.trigger(true); }
      if (tl.ignite > 0 && t >= tl.ignite) {
        // Arc-lamp ignition: a stutter, then steady.
        const i = t - tl.ignite;
        const stutter = [[0, 0], [0.05, 0.45], [0.1, 0.05], [0.17, 0.7], [0.24, 0.3], [0.5, 1]];
        let pw = 1;
        for (let s = 1; s < stutter.length; s++) {
          if (i <= stutter[s][0]) { const [t0, a0] = stutter[s - 1], [t1, a1] = stutter[s]; pw = a0 + ((i - t0) / (t1 - t0)) * (a1 - a0); break; }
        }
        this.light.power = pw;
        if (i > 0.6 && !tl.scheduled) { tl.scheduled = true; this.lightning.schedule(6 + this.r() * 6); }
      } else if (tl.ignite > 0) {
        this.light.power = 0;
      }
      if (k >= 1 && (tl.ignite < 0 || t > tl.ignite + 0.6)) this.timeline = null;
    }
    if (!this.timeline) this.light.power = 0.97 + Math.sin(t * 1.7) * 0.015 + Math.sin(t * 5.3) * 0.008;

    this.lightning.enabled = this.p < 0.35;
    this.lightning.update(dt);
    this.rain.update(dt);

    // Pointer (lagged, heavy — a physical searchlight)
    this.ptr.x = lerp(this.ptr.x, this.ptr.tx, 0.045);
    this.ptr.y = lerp(this.ptr.y, this.ptr.ty, 0.045);
    const P0 = this.comp.pool0, pool = this.comp.pool;
    pool.x = P0.x + Math.sin(t * 0.11) * this.W * 0.012 + this.ptr.x * this.W * 0.035;
    pool.y = P0.y + Math.sin(t * 0.07 + 1) * this.H * 0.006 + this.ptr.y * this.H * 0.015;

    // City life: windows switch on and off, slowly, one at a time.
    this.life.win -= dt;
    if (this.life.win <= 0) {
      this.life.win = 0.8 + this.r() * 2.2;
      const layer = this.r() < 0.6 ? this.layers.near : this.layers.mid;
      const w = layer.windows[(this.r() * layer.windows.length) | 0];
      if (w) paintWindow(layer, w, !w.on);
    }
    // A distant aircraft, now and then.
    this.life.plane -= dt;
    if (this.life.plane <= 0 && this.life.planeT < 0) { this.life.planeT = 0; this.life.planeDir = this.r() < 0.5 ? 1 : -1; this.life.planeY = 0.12 + this.r() * 0.16; }
    if (this.life.planeT >= 0) {
      this.life.planeT += dt / 38;
      if (this.life.planeT > 1) { this.life.planeT = -1; this.life.plane = 30 + this.r() * 40; }
    }
  }

  /* ---------------- rendering ---------------- */
  #layerTransform(key, ctx) {
    const d = LAYER_DEPTH[key];
    const p = reducedMotion() ? 0 : this.p;
    const s = 1 - p * d.zoom;
    const fx = this.W / 2, fy = this.H * 0.95;
    const px = this.touch ? 0 : -this.ptr.x * d.par;
    const py = this.touch ? 0 : -this.ptr.y * d.par * 0.4;
    ctx.setTransform(this.dpr * s, 0, 0, this.dpr * s,
      this.dpr * (fx - fx * s + px), this.dpr * (fy - fy * s + py + p * this.H * d.drop));
  }

  #drawLayer(ctx, key, layer, bodyA, lineA) {
    this.#layerTransform(key, ctx);
    const x = -layer.pad;
    if (bodyA > 0.01) {
      ctx.globalAlpha = bodyA;
      ctx.drawImage(layer.body, x, layer.y, layer.body.width / layer.dpr, layer.h);
    }
    if (lineA > 0.01) {
      ctx.globalAlpha = Math.min(1, lineA);
      ctx.drawImage(layer.lines, x, layer.y, layer.lines.width / layer.ldpr, layer.h);
    }
    ctx.globalAlpha = 1;
  }

  #blinkers(ctx, key, list, t, alpha) {
    if (!list.length || alpha < 0.02) return;
    this.#layerTransform(key, ctx);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of list) {
      const on = ((t * b.s + b.p) % 2.2) < 0.9;
      if (!on) continue;
      const r = b.big ? 7 : 4;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.4);
      g.addColorStop(0, `rgba(255, 70, 95, ${0.95 * alpha})`);
      g.addColorStop(0.3, `rgba(255, 48, 79, ${0.35 * alpha})`);
      g.addColorStop(1, 'rgba(255, 48, 79, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x - r * 2.4, b.y - r * 2.4, r * 4.8, r * 4.8);
    }
    ctx.restore();
  }

  #draw(dt) {
    const { ctx, W, H, dpr } = this;
    const p = this.p;
    const rm = reducedMotion();
    const L = this.lightning.level;
    const t = this.t;
    const storm = 1 - smoothstep(0, 0.6, p);          // rain, fog, lightning presence
    const blueprint = smoothstep(0.3, 0.85, p);       // silhouettes → linework
    const pool = this.comp.pool;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.sky, 0, 0, W, H);

    // Clouds drift; lightning lights them from inside.
    this.#layerTransform('clouds', ctx);
    const cw = this.clouds.w;
    const off = -((t * 7) % cw);
    const cy = -H * 0.04;
    ctx.globalAlpha = 1 - blueprint * 0.6;
    ctx.drawImage(this.clouds.normal, off, cy, cw, this.clouds.h);
    ctx.drawImage(this.clouds.normal, off + cw, cy, cw, this.clouds.h);
    if (L > 0.01) {
      ctx.globalAlpha = L * 0.85 * storm;
      ctx.drawImage(this.clouds.lit, off, cy, cw, this.clouds.h);
      ctx.drawImage(this.clouds.lit, off + cw, cy, cw, this.clouds.h);
      ctx.globalCompositeOperation = 'lighter';
      const lx = this.lightning.x * W;
      const g = ctx.createRadialGradient(lx, H * 0.25, 0, lx, H * 0.25, W * 0.6);
      g.addColorStop(0, `rgba(150, 175, 240, ${0.28 * L * storm})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(-50, -50, W + 100, H * 0.9);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;

    // The signal on the clouds (moves up and away as the camera pulls back).
    const sigPool = { ...pool, y: pool.y - p * H * 0.28 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // screen space: the beam must land exactly here
    this.light.drawPool(ctx, sigPool, 1 - p * 0.3);

    // Aircraft
    if (this.life.planeT >= 0) {
      const k = this.life.planeT;
      const ax = this.life.planeDir > 0 ? lerp(-20, W + 20, k) : lerp(W + 20, -20, k);
      const ay = H * this.life.planeY + Math.sin(k * 3) * 6;
      const on = (t % 1.3) < 0.12;
      ctx.fillStyle = on ? '#ff304f' : 'rgba(220,230,255,0.7)';
      ctx.globalAlpha = storm * (on ? 1 : 0.6);
      ctx.fillRect(ax, ay, on ? 2 : 1.5, on ? 2 : 1.5);
      ctx.globalAlpha = 1;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lightning.drawBolt(ctx, W, H);

    const silA = 1 - blueprint * 0.78;
    const lineBase = 0.03 + blueprint * 0.7;
    this.#drawLayer(ctx, 'distant', this.layers.distant, silA, lineBase * 0.6 + L * 0.35 * storm);
    this.#fog(ctx, H * 0.56, 0.38 * storm, t * 5, 'distant');
    this.#drawLayer(ctx, 'mid', this.layers.mid, silA, lineBase * 0.8 + L * 0.5 * storm);
    this.#blinkers(ctx, 'mid', this.layers.mid.blinkers, t, silA);
    this.#fog(ctx, H * 0.66, 0.32 * storm, t * 9 + 300, 'mid');

    // Beam
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const beamA = 1 - smoothstep(0.1, 0.7, p);
    const lampS = this.#screenLamp(p);
    this.light.drawBeam(ctx, this.beamBuf, lampS, sigPool, beamA, dt);

    this.#drawLayer(ctx, 'near', this.layers.near, silA, lineBase + L * 0.6 * storm);
    this.#elevators(ctx, t, silA);
    this.#blinkers(ctx, 'near', this.layers.near.blinkers, t, silA);

    // Rain: far + mid, then the rain caught in the beam.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rainA = storm * (0.75 + L * 0.8);
    this.rain.draw(ctx, 'far', { alpha: rainA });
    this.rain.draw(ctx, 'mid', { alpha: rainA });
    this.rain.drawInBeam(ctx, this.light.beamPath(lampS, sigPool, 1), this.light.power * beamA, storm);

    // Rooftop
    this.#drawLayer(ctx, 'fg', this.fg, 1 - blueprint * 0.9, 0.06 + L * 0.45 * storm + blueprint * 0.4);
    this.#blinkers(ctx, 'fg', this.fg.blinkers, t, 1 - blueprint);
    this.#layerTransform('fg', ctx);
    this.light.drawLamp(ctx, this.comp.lamp, this.#poolInFgSpace(sigPool, p), this.comp.u, this.comp.roofY, H, 1 - blueprint, t);
    if (!rm) this.rain.splashesOn(ctx, this.comp.roofY + 4, dt, storm);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.rain.draw(ctx, 'near', { alpha: storm * (1 + L) });

    // Grade: vignette, then exposure (intro fade from black).
    ctx.globalAlpha = 1 - blueprint * 0.5;
    ctx.drawImage(this.vignette, 0, 0, W, H);
    // Blueprint hand-off: the scene settles into the page ground colour.
    if (blueprint > 0) {
      ctx.globalAlpha = blueprint * 0.55;
      ctx.fillStyle = '#030507';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.exposure < 1) {
      ctx.globalAlpha = 1 - this.exposure;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }

  /** Lamp position after the foreground's scroll transform, in screen space. */
  #screenLamp(p) {
    const d = LAYER_DEPTH.fg;
    const pp = reducedMotion() ? 0 : p;
    const s = 1 - pp * d.zoom;
    const fx = this.W / 2, fy = this.H * 0.95;
    const px = this.touch ? 0 : -this.ptr.x * d.par;
    const py = this.touch ? 0 : -this.ptr.y * d.par * 0.4;
    const L = this.comp.lamp;
    const u = this.comp.u;
    const ang = Math.atan2(this.comp.pool.y - L.y, this.comp.pool.x - L.x);
    const lx = L.x + Math.cos(ang) * 20 * u, ly = L.y + Math.sin(ang) * 20 * u;
    return { x: fx + (lx - fx) * s + px, y: fy + (ly - fy) * s + py + pp * this.H * d.drop };
  }

  /** Inverse of the fg transform for aiming the lamp at the (screen-space) pool. */
  #poolInFgSpace(pool, p) {
    const d = LAYER_DEPTH.fg;
    const pp = reducedMotion() ? 0 : p;
    const s = 1 - pp * d.zoom;
    const fx = this.W / 2, fy = this.H * 0.95;
    const px = this.touch ? 0 : -this.ptr.x * d.par;
    const py = this.touch ? 0 : -this.ptr.y * d.par * 0.4;
    return { x: (pool.x - px - fx) / s + fx, y: (pool.y - py - pp * this.H * d.drop - fy) / s + fy };
  }

  #fog(ctx, y, alpha, shift, key) {
    if (alpha <= 0.01) return;
    this.#layerTransform(key, ctx);
    const f = this.fog;
    const x = -(shift % f.w);
    ctx.globalAlpha = alpha;
    ctx.drawImage(f.canvas, x, y - f.h / 2, f.w, f.h);
    ctx.drawImage(f.canvas, x + f.w, y - f.h / 2, f.w, f.h);
    ctx.globalAlpha = 1;
  }

  #elevators(ctx, t, alpha) {
    const list = this.layers.near.elevators;
    if (!list.length) return;
    this.#layerTransform('near', ctx);
    ctx.fillStyle = '#e8c68f';
    for (const e of list) {
      const k = (Math.sin(t * 0.09 + e.p) + 1) / 2;
      const y = lerp(e.y0, e.y1, k);
      ctx.globalAlpha = 0.75 * alpha;
      ctx.fillRect(e.x, y, 2.4 * this.comp.u, 3.6 * this.comp.u);
    }
    ctx.globalAlpha = 1;
  }

  #drawStill() {
    if (!this.layers || !this.light.stencil) return;
    this.light.power = 1;
    this.exposure = 1;
    this.#draw(0);
  }
}
