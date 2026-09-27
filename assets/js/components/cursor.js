/* ==========================================================================
   CustomCursor — a dot and a ring. Desktop, fine pointers only.

   • The dot follows the pointer directly (no added latency).
   • The ring trails slightly and opens to show a context word
     (ENTER / VIEW / OPEN …) from the nearest [data-cursor].
   • A press flashes the dot red — one of the few red moments on the site.
   Disabled on touch and under prefers-reduced-motion. Toggle in data/site.js.
   ========================================================================== */

import { finePointer, reducedMotion, lerp } from '../core/utils.js';
import { site } from '../data/site.js';

export function initCursor() {
  if (!site.customCursor || !finePointer() || reducedMotion()) return;
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span class="cursor-label mono"></span>';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);
  const label = ring.firstElementChild;
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, rx = -100, ry = -100, raf = 0, shown = false;

  const loop = () => {
    rx = lerp(rx, x, 0.3);
    ry = lerp(ry, y, 0.3);
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    raf = Math.abs(rx - x) + Math.abs(ry - y) > 0.3 ? requestAnimationFrame(loop) : 0;
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (!shown) { shown = true; rx = x; ry = y; document.documentElement.classList.add('cursor-in'); }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('[data-cursor], a, button, [role="tab"]');
    const word = t ? (t.dataset.cursor || (t.tagName === 'A' ? 'ENTER' : '')) : '';
    const inert = t?.closest('[aria-disabled="true"]');
    ring.classList.toggle('is-active', !!t && !inert);
    ring.classList.toggle('has-label', !!word && !inert);
    label.textContent = inert ? '' : word;
  });
  document.documentElement.addEventListener('pointerleave', () => document.documentElement.classList.remove('cursor-in'));
  document.documentElement.addEventListener('pointerenter', () => { if (shown) document.documentElement.classList.add('cursor-in'); });
  window.addEventListener('pointerdown', () => { dot.classList.add('is-down'); ring.classList.add('is-down'); });
  window.addEventListener('pointerup', () => { dot.classList.remove('is-down'); ring.classList.remove('is-down'); });
}
