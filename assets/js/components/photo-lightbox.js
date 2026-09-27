/* ==========================================================================
   PhotoLightbox — dark, cinematic, keyboard- and touch-friendly.
   ← / → navigate · Esc closes · swipe on touch · focus is trapped and
   restored to the photo that opened it.
   ========================================================================== */

import { photoOrder } from './photo-canvas.js';
import { esc, disposer, reducedMotion, real } from '../core/utils.js';

export class PhotoLightbox {
  constructor(root) {
    this.root = root;
    this.d = disposer();
    this.i = 0;
    const el = document.createElement('div');
    el.className = 'lb';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Photo viewer');
    el.innerHTML = `
      <div class="lb__top">
        <p class="mono lb__count"></p>
        <button type="button" class="lb__close mono" data-cursor="CLOSE">Close <span aria-hidden="true">×</span></button>
      </div>
      <figure class="lb__fig">
        <div class="lb__img"></div>
        <figcaption class="lb__cap">
          <span class="mono lb__loc"></span>
          <span class="mono lb__year"></span>
          <span class="lb__text"></span>
          <span class="mono lb__credit"></span>
        </figcaption>
      </figure>
      <button type="button" class="lb__nav lb__prev" aria-label="Previous photo" data-cursor="PREV"><span aria-hidden="true">←</span></button>
      <button type="button" class="lb__nav lb__next" aria-label="Next photo" data-cursor="NEXT"><span aria-hidden="true">→</span></button>`;
    document.body.appendChild(el);
    this.el = el;
    this.d.add(() => el.remove());

    this.d.on(root, 'click', (e) => {
      const b = e.target.closest('[data-photo]');
      if (b) { this.opener = b; this.open(+b.dataset.photo); }
    });
    this.d.on(el.querySelector('.lb__close'), 'click', () => this.close());
    this.d.on(el.querySelector('.lb__prev'), 'click', () => this.go(-1));
    this.d.on(el.querySelector('.lb__next'), 'click', () => this.go(1));
    this.d.on(el, 'click', (e) => { if (e.target === el) this.close(); });
    this.d.on(document, 'keydown', (e) => {
      if (el.hidden) return;
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowRight') this.go(1);
      else if (e.key === 'ArrowLeft') this.go(-1);
      else if (e.key === 'Tab') {
        const f = Array.from(el.querySelectorAll('button:not([hidden])'));
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // Swipe
    let sx = null;
    this.d.on(el, 'pointerdown', (e) => { if (e.pointerType !== 'mouse') sx = e.clientX; });
    this.d.on(el, 'pointerup', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
    });
  }

  render() {
    const p = photoOrder[this.i];
    const q = (s) => this.el.querySelector(s);
    q('.lb__count').textContent = `${String(this.i + 1).padStart(2, '0')} / ${String(photoOrder.length).padStart(2, '0')}`;
    q('.lb__img').innerHTML = `<img src="${esc(p.full || p.src)}" alt="${esc(real(p.alt))}">`;
    q('.lb__loc').textContent = real(p.location);
    q('.lb__year').textContent = real(p.year);
    q('.lb__text').textContent = real(p.caption);
    q('.lb__credit').textContent = real(p.credit) ? `Photo: ${p.credit}` : '';
    const single = photoOrder.length < 2;
    this.el.querySelectorAll('.lb__nav').forEach((b) => { b.hidden = single; });
    q('.lb__count').hidden = single;
    const img = q('.lb__img');
    if (!reducedMotion()) { img.classList.remove('is-in'); void img.offsetWidth; img.classList.add('is-in'); }
  }

  open(i) {
    this.i = i;
    this.render();
    this.el.hidden = false;
    document.documentElement.classList.add('lb-open');
    document.getElementById('main')?.setAttribute('inert', '');
    document.getElementById('site-nav')?.setAttribute('inert', '');
    requestAnimationFrame(() => this.el.classList.add('is-open'));
    this.el.querySelector('.lb__close').focus();
  }

  go(k) {
    this.i = (this.i + k + photoOrder.length) % photoOrder.length;
    this.render();
  }

  close() {
    if (this.el.hidden) return;
    this.el.classList.remove('is-open');
    document.documentElement.classList.remove('lb-open');
    document.getElementById('main')?.removeAttribute('inert');
    document.getElementById('site-nav')?.removeAttribute('inert');
    const done = () => { this.el.hidden = true; };
    if (reducedMotion()) done(); else setTimeout(done, 240);
    this.opener?.focus();
  }

  destroy() {
    this.close();
    this.el.hidden = true;
    document.documentElement.classList.remove('lb-open');
    this.d.run();
  }
}
