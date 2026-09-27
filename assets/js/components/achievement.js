/* ==========================================================================
   Achievement — one rounded card per piece of real work.

       ╭──────────────────────────────┬─────────────────────────╮
       │  VISUAL (unique per project) │  SELECTED WORK / 01     │
       │                              │  Title                  │
       │                              │  Description            │
       │                              │  Organization · Date    │
       │                              │  Link ↗                 │
       ╰──────────────────────────────┴─────────────────────────╯

   Desktop: ~55 / 45, visual left. Mobile: visual, then title, then text.
   Content comes from data/work.js. Optional fields render only when set.

   Visuals are registered in `visuals` below: { markup(a) → html,
   mount(el) → cleanup }. Give each new project its own visual — the PSO
   cube and penguins belong to the PSO project only. A card whose `visual`
   is null (or unknown) renders as text only, full width.
   ========================================================================== */

import { achievements } from '../data/work.js';
import { psoVisual } from './visuals/pso-search-space.js';
import { esc, isPlaceholder, real, disposer } from '../core/utils.js';

export const visuals = {
  pso: psoVisual,
};

const shown = achievements.filter((a) => !isPlaceholder(a.title) && !isPlaceholder(a.description));

export function achievementMarkup(a, i) {
  const n = String(i + 1).padStart(2, '0');
  const label = real(a.label) || `Selected work / ${n}`;
  const visual = visuals[a.visual];
  const meta = [real(a.organization), real(a.date)].filter(Boolean);
  const link = a.link && !isPlaceholder(a.link.href) && !isPlaceholder(a.link.label)
    ? `<a class="btn ach__link" href="${esc(a.link.href)}" target="_blank" rel="noopener" data-cursor="OPEN">${esc(a.link.label)} <span class="arrow" aria-hidden="true">↗</span></a>`
    : '';
  const id = esc(a.id || `work-${n}`);

  return `
    <article class="ach${visual ? '' : ' ach--text'}" id="${id}" aria-labelledby="${id}-title" data-reveal="rise">
      ${visual ? `<div class="ach__visual" data-visual="${esc(a.visual)}">${visual.markup(a)}</div>` : ''}
      <div class="ach__info">
        <p class="ach__label mono">${esc(label)}</p>
        <h3 class="ach__title" id="${id}-title">${esc(a.title)}</h3>
        <p class="ach__desc">${esc(a.description)}</p>
        ${meta.length ? `<p class="ach__meta mono">${meta.map(esc).join('<span aria-hidden="true"> · </span>')}</p>` : ''}
        ${link}
      </div>
    </article>`;
}

/** The whole Selected Work list (Home, #work). */
export function achievementsMarkup() {
  return shown.map(achievementMarkup).join('');
}

/** Mount every visual inside `root`; returns one cleanup for all of them. */
export function mountAchievements(root) {
  const d = disposer();
  root.querySelectorAll('.ach__visual[data-visual]').forEach((el) => {
    const cleanup = visuals[el.dataset.visual]?.mount(el);
    if (cleanup) d.add(cleanup);
  });
  return () => d.run();
}
