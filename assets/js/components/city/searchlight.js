/* ==========================================================================
   Searchlight — the Sayf Signal.

   A rooftop lamp throws a cone of light up into the cloud deck. Where it
   hits, a pool of light carries the name as a *shadow* — the letters are a
   stencil on the lens, so they read as dark shapes inside the light, the
   way a real projected signal would.

   Physics, faked cheaply:
   • the pool is an ellipse (oblique projection), squashed and skewed a little
   • cloud density modulates the pool's brightness (noise knock-out)
   • the letters ripple a pixel or two where the cloud surface is uneven
   • the cone is brightest at the lens and where it hits cloud, thinner
     between, and broken up by drifting fog
   • rain inside the cone is lit (see RainLayer.drawInBeam)
   ========================================================================== */

import { makeCanvas, noiseTexture } from './atmosphere.js';

export class Searchlight {
  constructor() {
    this.power = 0;
    this.aim = { x: 0, y: 0 };
    this.fogShift = 0;
  }

  /** Build the stencil — once per resize, after fonts are ready. */
  build(pool, dpr) {
    this.pool = pool;
    const m = 1.18; // margin for the soft edge
    const w = pool.rx * 2 * m, h = pool.ry * 2 * m;
    const c = makeCanvas(w * dpr, h * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    const cx = w / 2, cy = h / 2;

    // 1. The light pool.
    x.save();
    x.translate(cx, cy);
    x.scale(1, pool.ry / pool.rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, pool.rx * m);
    g.addColorStop(0, 'rgba(226, 234, 255, 0.92)');
    g.addColorStop(0.62, 'rgba(206, 220, 255, 0.78)');
    g.addColorStop(0.8, 'rgba(226, 234, 255, 0.9)');   // hot rim
    g.addColorStop(0.85, 'rgba(160, 185, 245, 0.35)');
    g.addColorStop(1, 'rgba(120, 150, 230, 0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(0, 0, pool.rx * m, 0, Math.PI * 2);
    x.fill();
    x.restore();

    // 2. The name, knocked out of the light (stencil on the lens).
    const t = this.#type(pool, dpr);
    x.save();
    x.globalCompositeOperation = 'destination-out';
    x.globalAlpha = 0.86;
    // Ripple: draw in horizontal strips, each nudged by the cloud surface.
    const strips = 72;
    const sh = t.height / strips;
    for (let i = 0; i < strips; i++) {
      const dx = Math.sin(i * 0.22) * 0.9 + Math.sin(i * 0.61 + 1) * 0.35;
      x.drawImage(t, 0, i * sh, t.width, sh + 1,
        cx - t.cssW / 2 + dx, cy - t.cssH / 2 + (i * t.cssH) / strips, t.cssW, t.cssH / strips + 0.5);
    }
    x.restore();

    // 3. Cloud density: uneven brightness across the pool.
    const nz = noiseTexture(w / 2, h / 2, { seed: 77, cell: 26, octaves: 3, contrast: 1.3 });
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-out';
    x.globalAlpha = 0.42;
    x.drawImage(nz, 0, 0, c.width, c.height);
    x.restore();

    this.stencil = c;
    this.stencilW = w;
    this.stencilH = h;

    // Beam fog texture (breaks up the cone).
    this.fog = noiseTexture(256, 256, { seed: 88, cell: 40, octaves: 3, contrast: 1.5 });
  }

  /** Typeset SAYF / ELKOUSY / سيف for projection. */
  #type(pool, dpr) {
    const blockW = pool.rx * 0.98;
    const probe = makeCanvas(10, 10).getContext('2d');
    const fit = (text, font, target) => {
      probe.font = `${font} 100px ${text === 'سيف' ? '"Reem Kufi"' : '"Big Shoulders Display"'}`;
      return (100 * target) / probe.measureText(text).width;
    };
    const f1 = fit('SAYF', '800', blockW);
    const f2 = fit('ELKOUSY', '700', blockW);
    const f3 = Math.min(f2 * 0.62, fit('سيف', '500', blockW * 0.3));
    const cap1 = f1 * 0.8, cap2 = f2 * 0.8;
    const gap = pool.ry * 0.06;
    const H = cap1 + gap + cap2 + gap * 1.6 + f3 * 0.9;
    const W = blockW + 4;
    const c = makeCanvas(W * dpr, H * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.fillStyle = '#000';
    x.textBaseline = 'alphabetic';
    x.textAlign = 'center';
    x.font = `800 ${f1}px "Big Shoulders Display", "Arial Narrow", sans-serif`;
    x.fillText('SAYF', W / 2, cap1);
    x.font = `700 ${f2}px "Big Shoulders Display", "Arial Narrow", sans-serif`;
    x.fillText('ELKOUSY', W / 2, cap1 + gap + cap2);
    // Rule between the name and the signature.
    x.fillRect(W / 2 - blockW * 0.06, cap1 + gap + cap2 + gap * 0.9, blockW * 0.12, Math.max(1.5, f2 * 0.04));
    x.direction = 'rtl';
    x.font = `500 ${f3}px "Reem Kufi", "Geeza Pro", sans-serif`;
    x.fillText('سيف', W / 2, H - f3 * 0.12);
    c.cssW = W; c.cssH = H;
    return c;
  }

  /** Perpendicular support points of the pool ellipse for the beam edges. */
  #edges(lamp, pool) {
    const dx = pool.x - lamp.x, dy = pool.y - lamp.y;
    const L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L;
    const k = Math.sqrt(pool.rx * pool.rx * nx * nx + pool.ry * pool.ry * ny * ny);
    const sx = (pool.rx * pool.rx * nx) / k, sy = (pool.ry * pool.ry * ny) / k;
    return { nx, ny, a: [pool.x + sx * 0.96, pool.y + sy * 0.96], b: [pool.x - sx * 0.96, pool.y - sy * 0.96], L };
  }

  beamPath(lamp, pool, spread = 1) {
    const e = this.#edges(lamp, pool);
    const ap = 7 * spread;
    const p = new Path2D();
    const mx = (e.a[0] + e.b[0]) / 2, my = (e.a[1] + e.b[1]) / 2;
    p.moveTo(lamp.x + e.nx * ap, lamp.y + e.ny * ap);
    p.lineTo(mx + (e.a[0] - mx) * spread, my + (e.a[1] - my) * spread);
    p.lineTo(mx + (e.b[0] - mx) * spread, my + (e.b[1] - my) * spread);
    p.lineTo(lamp.x - e.nx * ap, lamp.y - e.ny * ap);
    p.closePath();
    return p;
  }

  /** Draw the cone into an offscreen (half-res) canvas, then add it to the scene. */
  drawBeam(ctx, buf, lamp, pool, alpha, dt) {
    if (this.power <= 0.01 || alpha <= 0.01) return;
    const bx = buf.getContext('2d');
    const s = buf.width / buf.cssW;
    bx.setTransform(s, 0, 0, s, 0, 0);
    bx.globalCompositeOperation = 'source-over';
    bx.clearRect(0, 0, buf.cssW, buf.cssH);

    const grad = bx.createLinearGradient(lamp.x, lamp.y, pool.x, pool.y);
    grad.addColorStop(0, 'rgba(214, 226, 255, 0.5)');
    grad.addColorStop(0.18, 'rgba(190, 208, 255, 0.2)');
    grad.addColorStop(0.6, 'rgba(170, 192, 250, 0.09)');
    grad.addColorStop(0.82, 'rgba(180, 200, 255, 0.1)');
    grad.addColorStop(1, 'rgba(200, 216, 255, 0)');
    bx.fillStyle = grad;
    bx.fill(this.beamPath(lamp, pool, 1));
    bx.globalAlpha = 0.9;
    bx.fill(this.beamPath(lamp, pool, 0.42)); // brighter core
    bx.globalAlpha = 1;

    // The cone dissolves into the cloud where it lands — never over the letters.
    bx.globalCompositeOperation = 'destination-out';
    bx.save();
    bx.translate(pool.x, pool.y);
    bx.scale(1, pool.ry / pool.rx);
    const hole = bx.createRadialGradient(0, 0, pool.rx * 0.2, 0, 0, pool.rx * 1.05);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(0.7, 'rgba(0,0,0,0.9)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = hole;
    bx.beginPath(); bx.arc(0, 0, pool.rx * 1.05, 0, Math.PI * 2); bx.fill();
    bx.restore();

    // Fog drifting through the cone.
    this.fogShift = (this.fogShift + dt * 14) % 512;
    bx.globalCompositeOperation = 'destination-out';
    bx.globalAlpha = 0.55;
    const pat = bx.createPattern(this.fog, 'repeat');
    bx.save();
    bx.translate(-this.fogShift, this.fogShift * 0.3);
    bx.scale(2.2, 1.4);
    bx.fillStyle = pat;
    bx.fillRect(0, -200, (buf.cssW + 1200) / 2.2, (buf.cssH + 600) / 1.4);
    bx.restore();
    bx.globalAlpha = 1;
    bx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = this.power * alpha;
    ctx.drawImage(buf, 0, 0, buf.cssW, buf.cssH);
    ctx.restore();
  }

  drawPool(ctx, pool, alpha) {
    if (!this.stencil || this.power <= 0.01 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Wide scatter in the cloud deck.
    const halo = ctx.createRadialGradient(pool.x, pool.y, pool.rx * 0.4, pool.x, pool.y, pool.rx * 2.1);
    halo.addColorStop(0, 'rgba(120, 150, 220, 0.16)');
    halo.addColorStop(1, 'rgba(120, 150, 220, 0)');
    ctx.globalAlpha = this.power * alpha;
    ctx.fillStyle = halo;
    ctx.fillRect(pool.x - pool.rx * 2.2, pool.y - pool.rx * 2.2, pool.rx * 4.4, pool.rx * 4.4);
    // The signal: slightly squashed + skewed by the oblique projection.
    ctx.globalAlpha = this.power * alpha * 0.8;
    ctx.translate(pool.x, pool.y);
    ctx.transform(1, 0, -0.06, 0.94, 0, 0);
    ctx.drawImage(this.stencil, -this.stencilW / 2, -this.stencilH / 2, this.stencilW, this.stencilH);
    ctx.restore();
  }

  /** Lamp head (rotates with the aim), lens bloom, wet-roof reflection. */
  drawLamp(ctx, lamp, pool, u, roofY, H, alpha, t) {
    const ang = Math.atan2(pool.y - lamp.y, pool.x - lamp.x);
    ctx.save();
    ctx.translate(lamp.x, lamp.y);
    // Yoke
    ctx.fillStyle = '#010204';
    ctx.fillRect(-16 * u, 4 * u, 32 * u, 12 * u);
    ctx.rotate(ang);
    // Barrel
    ctx.fillStyle = '#03060a';
    ctx.fillRect(-26 * u, -15 * u, 40 * u, 30 * u);
    ctx.fillStyle = '#0b1320';
    ctx.fillRect(-26 * u, -15 * u, 40 * u, 2 * u);
    ctx.fillRect(14 * u, -17 * u, 5 * u, 34 * u);
    // Lens
    const p = this.power;
    ctx.fillStyle = `rgba(235, 242, 255, ${0.25 + p * 0.75})`;
    ctx.beginPath();
    ctx.ellipse(19 * u, 0, 3 * u, 14 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (p > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lx = lamp.x + Math.cos(ang) * 20 * u, ly = lamp.y + Math.sin(ang) * 20 * u;
      const bloom = ctx.createRadialGradient(lx, ly, 0, lx, ly, 90 * u);
      bloom.addColorStop(0, `rgba(230, 238, 255, ${0.55 * p * alpha})`);
      bloom.addColorStop(0.25, `rgba(150, 180, 255, ${0.14 * p * alpha})`);
      bloom.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(lx - 90 * u, ly - 90 * u, 180 * u, 180 * u);
      // Wet roof reflection, shimmering with the rain.
      // A few broken vertical streaks, shimmering with the rain.
      const depth = H - roofY;
      for (let i = 0; i < 5; i++) {
        const sx = lamp.x + (i - 2) * 5 * u + Math.sin(t * 3 + i * 1.7) * 1.5 * u;
        const a = (0.05 + 0.03 * Math.sin(t * (6 + i) + i)) * p * alpha * (1 - Math.abs(i - 2) * 0.25);
        const rg = ctx.createLinearGradient(0, roofY + 6, 0, H);
        rg.addColorStop(0, 'rgba(190, 210, 255, 0)');
        rg.addColorStop(0.12, `rgba(190, 210, 255, ${a})`);
        rg.addColorStop(1, 'rgba(190, 210, 255, 0)');
        ctx.fillStyle = rg;
        ctx.fillRect(sx, roofY + 6, (2 + (i % 2)) * u, depth * (0.6 + (i % 3) * 0.12));
      }
      ctx.restore();
    }
  }
}
