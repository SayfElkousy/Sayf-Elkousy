/* ==========================================================================
   RouteTransition — the signature move.

   A nod to the spinning-emblem cuts of vintage superhero television, made
   with the Sayf wordmark instead of any borrowed symbol.

   PHASE A  (in, ~380ms)
     1. the current interface darkens and recedes slightly
     2. the wordmark appears at the centre, tilted in perspective
     3–5. it spins and rushes toward the viewer, decelerating until it
          squares up at ~94vw — nearly the whole viewport
   MIDPOINT
     6. the route swaps under full cover (waits here if the page is slow,
        so nothing half-rendered is ever shown)
   PHASE B  (out, ~380ms)
     7. the mark accelerates through the viewer, turning white → cobalt,
        its blue and red outline echoes splitting apart (RGB separation)
     8. the veil lifts and the new page settles in

   Reduced motion: fade → navigate → fade. No rotation, no scale.
   ========================================================================== */

import { wordmarkStack } from './wordmark.js';
import { routes } from '../data/site.js';
import { reducedMotion, wait } from '../core/utils.js';
import { scramble } from '../core/scramble.js';

const BASE_HALF = 380;
const PERSP = 'perspective(1100px)';

export class RouteTransition {
  constructor(el) {
    this.el = el;
    this.running = null;
    el.innerHTML = `
      <div class="rt__veil"></div>
      <div class="rt__stage">
        <div class="rt__mark rt__mark--red">${wordmarkStack({ mode: 'outline', pip: false, rule: false, ar: false })}</div>
        <div class="rt__mark rt__mark--blue">${wordmarkStack({ mode: 'outline', pip: false, rule: false, ar: false })}</div>
        <div class="rt__mark rt__mark--main">${wordmarkStack({ pip: true })}</div>
      </div>
      <div class="rt__dest mono"><span class="rt__arrow">→</span> <span class="rt__code"></span></div>`;
    this.veil = el.querySelector('.rt__veil');
    this.main = el.querySelector('.rt__mark--main');
    this.blue = el.querySelector('.rt__mark--blue');
    this.red = el.querySelector('.rt__mark--red');
    this.dest = el.querySelector('.rt__dest');
    this.code = el.querySelector('.rt__code');
    this.outlet = document.getElementById('main');
  }

  run(midpoint, info = {}) {
    if (this.running) return this.running; // never stack
    this.running = this.#play(midpoint, info).finally(() => { this.running = null; });
    return this.running;
  }

  async #play(midpoint, { to, hash = '' }) {
    // Hidden tabs don't advance animation timelines — just swap.
    if (document.hidden) { await midpoint(); return; }
    if (reducedMotion()) return this.#fade(midpoint);

    const HALF = BASE_HALF * (window.__rtSlow || 1); // __rtSlow: test-only slow motion
    const r = routes.find((x) => x.path === to + hash) || routes.find((x) => x.path === to);
    this.code.textContent = '';
    this.el.classList.add('is-active');
    const k = HALF / BASE_HALF;
    const opts = (o = {}) => ({ duration: HALF, fill: 'forwards', ...o, ...(o.duration ? { duration: o.duration * k } : {}), ...(o.delay ? { delay: o.delay * k } : {}) });
    const anims = [];
    const A = (el, kf, o) => { const a = el.animate(kf, opts(o)); anims.push(a); return a; };

    /* ---------- PHASE A ---------- */
    A(this.veil, [{ opacity: 0 }, { opacity: 1, offset: 0.34 }, { opacity: 1 }], { easing: 'linear' });
    A(this.outlet, [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(0.975)', filter: 'brightness(0.4)' },
    ], { duration: BASE_HALF * 0.5, easing: 'cubic-bezier(.55,0,.9,.3)' });

    const inEase = 'cubic-bezier(.22,.6,.18,1)';
    A(this.main, [
      { opacity: 0, transform: `${PERSP} rotateX(14deg) rotateY(42deg) rotate(-300deg) scale(0.05)` },
      { opacity: 1, offset: 0.18 },
      { opacity: 1, transform: `${PERSP} rotateX(0) rotateY(0) rotate(0deg) scale(1)` },
    ], { easing: inEase });
    A(this.blue, [
      { opacity: 0, transform: `${PERSP} rotateY(42deg) rotate(-340deg) scale(0.04)` },
      { opacity: 0.8, offset: 0.3 },
      { opacity: 0.75, transform: `${PERSP} translateX(0.4%) rotate(-1.5deg) scale(1.012)` },
    ], { easing: inEase, delay: 24 });
    A(this.red, [
      { opacity: 0, transform: `${PERSP} rotateY(42deg) rotate(-380deg) scale(0.03)` },
      { opacity: 0, offset: 0.4 },
      { opacity: 0.7, offset: 0.8 },
      { opacity: 0.55, transform: `${PERSP} translateX(-0.4%) rotate(1.5deg) scale(1.01)` },
    ], { easing: inEase, delay: 40 });
    A(this.dest, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 120, easing: 'ease-out' });
    if (r) setTimeout(() => scramble(this.code, `${r.index} — ${r.label}`, { duration: 360 }), 120 * k);

    await Promise.race([Promise.all(anims.slice(2).map((a) => a.finished)), wait(HALF + 200)]);

    /* ---------- MIDPOINT ---------- */
    await midpoint();

    /* ---------- PHASE B ---------- */
    anims.forEach((a) => { try { a.commitStyles?.(); } catch { /* detached */ } a.cancel(); });
    const out = [];
    const B = (el, kf, o) => { const a = el.animate(kf, opts(o)); out.push(a); return a; };
    const outEase = 'cubic-bezier(.6,0,.86,.4)';

    B(this.main, [
      { opacity: 1, color: '#f1f4f6', transform: `${PERSP} rotate(0deg) scale(1)` },
      { color: '#2b63ff', offset: 0.22 },
      { opacity: 1, offset: 0.55 },
      { opacity: 0, color: '#2b63ff', transform: `${PERSP} rotateX(-8deg) rotate(28deg) scale(5.5)` },
    ], { easing: outEase });
    B(this.blue, [
      { opacity: 0.75, transform: `${PERSP} translateX(0.4%) rotate(-1.5deg) scale(1.012)` },
      { opacity: 0, transform: `${PERSP} translateX(3%) rotate(14deg) scale(3.4)` },
    ], { easing: outEase });
    B(this.red, [
      { opacity: 0.55, transform: `${PERSP} translateX(-0.4%) rotate(1.5deg) scale(1.01)` },
      { opacity: 0, transform: `${PERSP} translateX(-4%) rotate(40deg) scale(4.2)` },
    ], { easing: outEase, duration: BASE_HALF * 0.8 });
    B(this.veil, [{ opacity: 1 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { easing: 'cubic-bezier(.3,0,.2,1)' });
    B(this.dest, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 });
    B(this.outlet, [
      { transform: 'scale(1.02)', filter: 'brightness(0.5)' },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ], { easing: 'cubic-bezier(.16,1,.3,1)', duration: BASE_HALF + 60, fill: 'none' });

    await Promise.race([Promise.all(out.map((a) => a.finished.catch(() => {}))), wait(HALF + 300)]);
    out.forEach((a) => a.cancel());
    this.#reset();
  }

  async #fade(midpoint) {
    this.el.classList.add('is-active', 'is-reduced');
    const a = this.veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' });
    await Promise.race([a.finished, wait(260)]);
    await midpoint();
    const b = this.veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    await Promise.race([b.finished, wait(280)]);
    a.cancel(); b.cancel();
    this.#reset();
  }

  #reset() {
    this.el.classList.remove('is-active', 'is-reduced');
    this.outlet.getAnimations?.().forEach((a) => a.cancel());
    [this.main, this.blue, this.red, this.dest, this.veil].forEach((n) => n.removeAttribute('style'));
    this.outlet.style.transform = '';
    this.outlet.style.filter = '';
  }
}
