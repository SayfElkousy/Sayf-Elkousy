/* Text scramble — a technical label briefly destabilises, then resolves.
   Used sparingly (nav metadata, a few labels). Seasoning, not identity. */
import { reducedMotion } from './utils.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/—·';
const running = new WeakMap();
const guards = new WeakMap();

export function scramble(el, text, { duration = 420 } = {}) {
  if (!el) return;
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (reducedMotion()) { el.textContent = text; return; }

  // Guarantee the final text even if frames are throttled (background tab).
  clearTimeout(guards.get(el));
  guards.set(el, setTimeout(() => {
    cancelAnimationFrame(running.get(el));
    running.delete(el);
    el.textContent = text;
  }, duration + 80));

  const start = performance.now();
  const len = text.length;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = text[i];
      const settleAt = (i / len) * 0.7 + 0.3;
      if (ch === ' ' || t >= settleAt) out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (t < 1) running.set(el, requestAnimationFrame(tick));
    else { el.textContent = text; running.delete(el); }
  };
  running.set(el, requestAnimationFrame(tick));
}
