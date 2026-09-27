/* ==========================================================================
   NextStops — the remaining pages, as a descending staircase of type.
   Navigation built into the composition, not a footer.
   ========================================================================== */

import { routes } from '../data/site.js';

export function nextStops(current) {
  const i = routes.findIndex((r) => r.path === current);
  // Sections of a page (/#work) aren't "next stops"; they're scrolled to.
  const rest = routes.slice(i + 1).filter((r) => !r.path.includes('#'));
  if (!rest.length) return '';
  return `
    <nav class="next-stops" aria-label="Keep exploring">
      <div class="wrap">
        <p class="mono section-index next-stops__kicker" data-reveal="fade">Next</p>
        <ol class="stops">
          ${rest.map((r, k) => `
            <li style="--i:${k}" data-reveal="wipe" data-delay="${k * 90}">
              <a href="${r.path}" data-cursor="ENTER">
                <span class="stops__idx mono">${r.index}</span>
                <span class="stops__label display">${r.label}</span>
                <span class="stops__mood mono">${r.blurb} <span aria-hidden="true">→</span></span>
              </a>
            </li>`).join('')}
        </ol>
      </div>
    </nav>`;
}
