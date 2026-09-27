/* Small shared helpers. No framework, no dependencies. */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mapRange = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => rmQuery.matches;
export const onReducedMotionChange = (fn) => rmQuery.addEventListener('change', fn);

const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
export const finePointer = () => fineQuery.matches;

export const isNarrow = () => window.matchMedia('(max-width: 760px)').matches;

/** Seeded PRNG (mulberry32) so procedural art is stable between visits. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape text for safe insertion into template-literal HTML. */
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A disposer bag: collect cleanups, run them all on unmount. */
export function disposer() {
  const fns = [];
  return {
    add(fn) { fns.push(fn); return fn; },
    on(target, type, handler, opts) {
      target.addEventListener(type, handler, opts);
      fns.push(() => target.removeEventListener(type, handler, opts));
    },
    run() { while (fns.length) { try { fns.pop()(); } catch (e) { console.error(e); } } },
  };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** True for empty values and [BRACKETED] placeholders waiting for real content. */
export const isPlaceholder = (s) => s == null || String(s).trim() === '' || /\[[^\]]*\]/.test(String(s));
/** The value if it is real content, otherwise ''. Placeholders never reach visitors. */
export const real = (s) => (isPlaceholder(s) ? '' : String(s));

/** Build a clearly-marked placeholder frame. */
export function placeholder(label, { corner = '', ratio = '', className = '' } = {}) {
  return `<div class="ph ${className}" ${ratio ? `style="aspect-ratio:${ratio}"` : ''} role="img" aria-label="${esc(label)}">
    ${corner ? `<span class="ph__corner ph__corner--tl">${esc(corner)}</span>` : ''}
    <span class="ph__label">${esc(label)}</span>
  </div>`;
}
