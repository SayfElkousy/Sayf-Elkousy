/* ==========================================================================
   GlobalNavigation — "the line".

   The four pages are stations on a single transit line drawn across the top
   of the interface. The blue run of the line shows how far into the world
   you are (Home → Play = mysterious → playful). The line drops one step at a
   45° kink before PLAY — the site loosens up there.

   Experiments (all subtle, all optional to understanding):
   • The line bows toward the cursor when it comes close.
   • Station labels brighten and lean a few px toward the pointer.

   "Contact" sits on the left, beside the wordmark, and opens the sidebar
   (components/sidebar.js) at every width. WORK is a section of Home
   (/#work); pages/home.js lights HOME or WORK by scroll position.
   Mobile: wordmark + Contact + current page (which also opens the sidebar,
   where the page list lives).
   ========================================================================== */

import { routes } from '../data/site.js';
import { wordmarkLine } from './wordmark.js';
import { clamp, lerp, finePointer, reducedMotion } from '../core/utils.js';

// Station positions along the line (0–1). Irregular, like a real line map.
const STOPS = [0, 0.37, 0.69, 1];
const KINK_AT = 0.82; // fraction where the 45° step begins
const DROP = 9;       // px the line steps down before PLAY
const LINE_Y = 12;

export class Nav {
  constructor(root) {
    this.root = root;
    this.activeIndex = -1;
    this.pointer = { x: -9999, y: -9999, inside: false };
    this.bend = 0;           // smoothed bend amount
    this.bendX = 0;
    this.render();
    this.cache();
    this.layout();
    this.bind();
  }

  render() {
    const stations = routes.map((r, i) => `
      <li class="station" style="--x:${STOPS[i]};--dy:${STOPS[i] > KINK_AT ? DROP : 0}px">
        <a href="${r.path}" data-i="${i}" data-cursor="ENTER">
          <span class="station__mark" aria-hidden="true"></span>
          <span class="station__label">${r.label}</span>
        </a>
      </li>`).join('');

    this.root.innerHTML = `
      <div class="nav-bar">
        <a class="nav-mark" href="/" aria-label="Sayf Elkousy — home" data-cursor="HOME">${wordmarkLine()}</a>

        <button class="nav-contact" type="button" aria-expanded="false" aria-controls="site-panel" aria-haspopup="dialog" data-open-sidebar data-cursor="OPEN">
          <span class="nav-contact__pip" aria-hidden="true"></span>
          <span class="nav-contact__label">Contact</span>
        </button>

        <nav class="nav-line" aria-label="Primary">
          <svg class="nav-line__svg" aria-hidden="true" focusable="false">
            <path class="nav-line__base" />
            <path class="nav-line__run" pathLength="1" />
          </svg>
          <ol class="nav-line__stations">${stations}</ol>
        </nav>

        <button class="nav-mini mono" type="button" aria-expanded="false" aria-controls="site-panel" aria-haspopup="dialog" data-open-sidebar>
          <span class="nav-mini__mark" aria-hidden="true"></span>
          <span class="nav-mini__label"></span>
        </button>
      </div>`;
  }

  cache() {
    const q = (s) => this.root.querySelector(s);
    this.lineEl = q('.nav-line');
    this.svg = q('.nav-line__svg');
    this.base = q('.nav-line__base');
    this.run = q('.nav-line__run');
    this.stations = Array.from(this.root.querySelectorAll('.station a'));
    this.mini = q('.nav-mini');
    this.miniLabel = q('.nav-mini__label');
  }

  /* ---------- geometry ---------- */
  layout = () => {
    const w = this.lineEl.clientWidth;
    this.w = w;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${LINE_Y + DROP + 12}`);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', LINE_Y + DROP + 12);

    // Base polyline (sampled so it can bend smoothly toward the cursor).
    const kx = KINK_AT * w;
    const pts = [];
    const N = 64;
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * w;
      let y = LINE_Y;
      if (x > kx) y = LINE_Y + Math.min(DROP, x - kx); // 45° step
      pts.push([x, y]);
    }
    // Insert exact kink corners so the 45° reads crisply.
    pts.push([kx, LINE_Y], [kx + DROP, LINE_Y + DROP]);
    pts.sort((a, b) => a[0] - b[0]);
    this.pts = pts;

    // Cumulative lengths → fraction of line at each station.
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[cum.length - 1];
    this.stopFrac = STOPS.map((s) => {
      const x = s * w;
      let i = pts.findIndex((p) => p[0] >= x);
      if (i <= 0) return 0;
      const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1);
      return (cum[i - 1] + t * (cum[i] - cum[i - 1])) / total;
    });
    this.drawLine(0, 0);
    if (this.activeIndex >= 0) this.setRun(this.activeIndex, false);
  };

  drawLine(bend, bx) {
    const sigma = 70;
    let d = '';
    for (let i = 0; i < this.pts.length; i++) {
      const [x, y] = this.pts[i];
      const off = bend * Math.exp(-((x - bx) ** 2) / (2 * sigma * sigma));
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y + off).toFixed(2);
    }
    this.base.setAttribute('d', d);
    this.run.setAttribute('d', d);
  }

  setRun(i, animate = true) {
    const frac = this.stopFrac ? this.stopFrac[i] : 0;
    this.run.style.transition = animate && !reducedMotion() ? '' : 'none';
    this.run.style.strokeDasharray = '1 1';
    this.run.style.strokeDashoffset = String(1 - frac);
  }

  /* ---------- state ---------- */
  /** @param {string} key  a route path ('/about') or a section of one ('/#work') */
  setActive(key) {
    const i = routes.findIndex((r) => r.path === key);
    if (i === this.activeIndex && i >= 0) return;
    const known = i >= 0;
    const prev = this.activeIndex;
    this.activeIndex = i;

    this.stations.forEach((a, j) => {
      if (j === i) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      a.parentElement.classList.toggle('is-active', j === i);
    });
    this.setRun(known ? i : 0, known && prev !== -1);
    this.miniLabel.textContent = known ? routes[i].label : 'Pages';
    this.mini.setAttribute('aria-label', known ? `Pages — current: ${routes[i].label}` : 'Pages');
  }

  /* ---------- interaction ---------- */
  bind() {
    window.addEventListener('resize', this.layout);
    if (document.fonts) document.fonts.ready.then(this.layout);

    if (finePointer()) {
      window.addEventListener('pointermove', this.onPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { this.pointer.inside = false; this.kick(); });
    }

    // Scrolled state: a quiet backing so content never collides with the line.
    const onScroll = () => this.root.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  onPointer = (e) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.inside = e.clientY < 180;
    this.kick();
  };

  kick() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  frame = () => {
    this.raf = 0;
    const r = this.lineEl.getBoundingClientRect();
    const lx = this.pointer.x - r.left;
    const ly = this.pointer.y - (r.top + LINE_Y);
    const near = this.pointer.inside && lx > -60 && lx < r.width + 60 && Math.abs(ly) < 70;
    const targetBend = near && !reducedMotion() ? clamp(ly * 0.12, -5, 5) * (1 - Math.abs(ly) / 70) : 0;
    this.bend = lerp(this.bend, targetBend, 0.25);
    this.bendX = lerp(this.bendX || lx, lx, 0.35);
    this.drawLine(this.bend, this.bendX);

    // Label proximity + a few px of magnetism.
    this.stations.forEach((a) => {
      const sr = a.getBoundingClientRect();
      const cx = sr.left + sr.width / 2;
      const cy = sr.top + sr.height / 2;
      const dx = this.pointer.x - cx;
      const dy = this.pointer.y - cy;
      const d = Math.hypot(dx, dy);
      const k = this.pointer.inside ? clamp(1 - d / 170) : 0;
      a.style.setProperty('--k', k.toFixed(3));
      const m = reducedMotion() ? 0 : k * k;
      a.style.setProperty('--mx', (clamp(dx, -40, 40) * 0.08 * m).toFixed(2) + 'px');
      a.style.setProperty('--my', (clamp(dy, -40, 40) * 0.06 * m).toFixed(2) + 'px');
    });

    if (Math.abs(this.bend - targetBend) > 0.02) this.kick();
  };
}
