/* ==========================================================================
   PhotoCanvas — an editorial scrapbook, composed by hand (not a grid).

   Photos come from data/photos.js. Each group with at least one photo
   becomes a "spread"; groups with none are skipped. A spread recomposes
   itself for however many photos it holds (1, 2, 3, or a looser collage
   for 4+) via .collage--n1 … .collage--many in play.css.

   Each photo is a button: hover/focus reveals its details (when supplied),
   the cursor reads VIEW, and activating it opens the lightbox.
   Frames use each photo's real proportions — nothing is cropped.
   ========================================================================== */

import { photos, groups } from '../data/photos.js';
import { esc, real } from '../core/utils.js';
import { asset } from '../core/base.js';

/** Photos in page order — also the lightbox order. */
export const photoOrder = groups.flatMap((g) => photos.filter((p) => p.group === g.id && p.src));

const TILTS = [-2.2, 1.4, 3.2, -1.5, 2.4, -0.8];

function details(p) {
  const bits = [real(p.location), real(p.year)].filter(Boolean);
  const cap = real(p.caption), credit = real(p.credit);
  if (!bits.length && !cap && !credit) return '';
  return `
    <span class="shot__meta mono" aria-hidden="true">
      ${bits.map((b) => `<span>${esc(b)}</span>`).join('')}
      ${cap ? `<span class="shot__cap">${esc(cap)}</span>` : ''}
      ${credit ? `<span class="shot__credit">Photo: ${esc(credit)}</span>` : ''}
    </span>`;
}

/** One photo. `k` is its position inside the spread (drives tilt + slot). */
export function shot(p, k = 0) {
  const ratio = p.width && p.height ? `${p.width} / ${p.height}` : '4 / 3';
  const srcset = p.full && p.full !== p.src && p.width
    ? ` srcset="${esc(asset(p.src))} ${Math.min(1800, p.width)}w, ${esc(asset(p.full))} ${p.width}w" sizes="(max-width: 760px) 100vw, 60vw"`
    : '';
  return `
    <button type="button" class="shot" style="--r:${TILTS[k % TILTS.length]}deg" data-photo="${photoOrder.indexOf(p)}"
      data-cursor="VIEW" aria-label="${esc(real(p.alt) || 'Photo')} — open larger">
      <span class="shot__img" style="aspect-ratio:${ratio}">
        <img src="${esc(asset(p.src))}"${srcset} alt="" loading="lazy" decoding="async" width="${p.width || ''}" height="${p.height || ''}">
      </span>
      ${details(p)}
    </button>`;
}

export function photoCanvasMarkup() {
  return groups.map((g) => {
    const list = photoOrder.filter((p) => p.group === g.id);
    if (!list.length) return '';
    const n = list.length > 3 ? 'many' : `n${list.length}`;
    return `
      <section class="spread" aria-label="${esc(g.label)}">
        <p class="spread__label mono" data-reveal="fade">${esc(g.label)}</p>
        <div class="collage collage--${n}">
          ${list.map((p, k) => shot(p, k)).join('')}
        </div>
        <p class="spread__word display" aria-hidden="true">${esc(g.word)}</p>
      </section>`;
  }).join('');
}
