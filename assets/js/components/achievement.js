/* ==========================================================================
   Achievement — the one card every Work activity uses.

   Desktop (≈55 / 45, sides alternate from card to card):
       ╭────────────────────────────────┬──────────────────────────╮
       │ VISUAL                         │ SELECTED WORK / 02       │
       │  PSO: the interactive cube     │ Title / role             │
       │  others: their photographs     │ Organization             │
       │                                │ Dates · Location         │
       │                                │ One strong paragraph     │
       ╰────────────────────────────────┴──────────────────────────╯
   Mobile (every card, same order): label → title → organization → meta →
   visual → description.

   Photos (data/work.js → images[]), one standard treatment:
     0 → a quiet "Photo coming soon" panel
     1 → the photo fills the visual side (object-fit: cover)
     2 → the first fills it; the second sits uncropped in a pane docked into
         a corner (insetCorner: 'bl' | 'tr'), separated by a dark rule
   The visual side has fixed proportions, so photos never resize a card.
   ========================================================================== */

import { achievements, research, skills } from '../data/work.js';
import { psoVisual } from './visuals/pso-search-space.js';
import { esc, isPlaceholder, real, disposer } from '../core/utils.js';
import { asset } from '../core/base.js';

/** Interactive visuals, by key. Only projects that earn one get one. */
export const visuals = {
  pso: psoVisual,
};

const shown = achievements.filter((a) => !isPlaceholder(a.title) && !isPlaceholder(a.description));
const lines = (v) => [].concat(v || []).map(real).filter(Boolean);
const photos = (a) => (a.images || []).filter((im) => real(im?.src));

/** <img> with the original as src and the downsized copies as srcset. */
function img(im, { cls, sizes }) {
  const set = im.web
    ? `srcset="${asset(`assets/photos/web/${im.web}-800.jpg`)} 800w, ${asset(`assets/photos/web/${im.web}-1600.jpg`)} 1600w" sizes="${sizes}"`
    : '';
  const pos = im.pos ? ` style="object-position:${esc(im.pos)}"` : '';
  return `<img class="${cls}" src="${esc(asset(im.src))}" ${set} alt="${esc(real(im.alt))}" width="${im.w || ''}" height="${im.h || ''}" loading="lazy" decoding="async"${pos}>`;
}

function media(a, n) {
  const list = photos(a);
  if (!list.length) {
    return `
      <div class="ach__visual ach__media ach__media--empty">
        <p class="ach__empty mono" aria-hidden="true">
          <span>Documentation / ${n}</span>
          <span class="ach__empty-v">Photo coming soon</span>
        </p>
      </div>`;
  }
  const [main, second] = list;
  const corner = a.insetCorner === 'tr' ? 'tr' : 'bl';
  return `
    <div class="ach__visual ach__media${second ? ` ach__media--two ach__media--${corner}` : ''}">
      ${img(main, { cls: 'ach__img', sizes: '(max-width: 900px) 100vw, 55vw' })}
      ${second ? `<figure class="ach__inset" style="aspect-ratio:${second.w || 4} / ${second.h || 5}">
        ${img(second, { cls: 'ach__inset-img', sizes: '(max-width: 900px) 40vw, 20vw' })}
      </figure>` : ''}
    </div>`;
}

/** The interactive visual (PSO), plus an optional small photo pane over it. */
function interactive(a, visual) {
  const [im] = photos(a);
  return `
    <div class="ach__visual" data-visual="${esc(a.visual)}">
      ${visual.markup(a)}
      ${im ? `<figure class="ach__photo">${img(im, { cls: '', sizes: '20vw' })}</figure>` : ''}
    </div>`;
}

export function achievementMarkup(a, i) {
  const n = String(i + 1).padStart(2, '0');
  const label = real(a.label) || `Selected work / ${n}`;
  const visual = visuals[a.visual];
  const orgs = lines(a.organization);
  const meta = [real(a.dates), real(a.location), lines(a.tools).join(' · ')].filter(Boolean);
  const link = a.link && !isPlaceholder(a.link.href) && !isPlaceholder(a.link.label)
    ? `<a class="btn ach__link" href="${esc(a.link.href)}" target="_blank" rel="noopener" data-cursor="OPEN">${esc(a.link.label)} <span class="arrow" aria-hidden="true">↗</span></a>`
    : '';
  const id = esc(a.id || `work-${n}`);
  const cls = ['ach', i % 2 ? 'ach--flip' : ''].filter(Boolean).join(' ');

  return `
    <article class="${cls}" id="${id}" aria-labelledby="${id}-title" data-reveal="rise">
      ${visual ? interactive(a, visual) : media(a, n)}
      <div class="ach__info">
        <p class="ach__label mono">${esc(label)}</p>
        <h3 class="ach__title" id="${id}-title">${esc(a.title)}</h3>
        ${orgs.length ? `<p class="ach__org">${orgs.map(esc).join('<br>')}</p>` : ''}
        ${meta.length ? `<p class="ach__meta mono">${meta.map(esc).join('<span aria-hidden="true"> · </span>')}</p>` : ''}
        <p class="ach__desc">${esc(a.description)}</p>
        ${link}
      </div>
    </article>`;
}

/** The whole Selected Work list (Home, #work). */
export function achievementsMarkup() {
  return shown.map(achievementMarkup).join('');
}

/** Research + Technical Skills: compact, editorial — no cards. */
export function referenceMarkup() {
  const r = research;
  const entries = (r.entries || []).map((e, i) => `
    <li class="pub">
      <span class="pub__n mono">${String(i + 1).padStart(2, '0')}</span>
      <div class="pub__body">
        <p class="pub__kind mono">${esc(e.kind)}</p>
        <p class="pub__title">${esc(e.title)}</p>
        <p class="pub__venue">${esc(e.venue)}${real(e.role) ? `<span class="mono pub__role"> · ${esc(e.role)}</span>` : ''}</p>
      </div>
      ${real(e.pdf) ? `<a class="pub__pdf mono" href="${esc(encodeURI(asset(e.pdf)))}" target="_blank" rel="noopener" data-cursor="OPEN">PDF <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens ${esc(e.title)} in a new tab)</span></a>` : '<span class="pub__pdf pub__pdf--none mono" aria-hidden="true"></span>'}
    </li>`).join('');
  return `
    <section class="ref" aria-labelledby="research-title">
      <h3 class="ref__k mono" id="research-title">Research</h3>
      <div class="ref__body">
        <p class="ref__title">${esc(r.title)}</p>
        <p class="ref__org">${esc(r.organization)}</p>
        <p class="ref__meta mono">${[r.dates, r.location].map(esc).join('<span aria-hidden="true"> · </span>')}</p>
        <p class="ref__text">${esc(r.description)}</p>
        ${entries ? `<ol class="pubs">${entries}</ol>` : ''}
      </div>
    </section>
    <section class="ref" aria-labelledby="skills-title">
      <h3 class="ref__k mono" id="skills-title">Technical skills</h3>
      <dl class="ref__body skills">
        ${skills.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${v.map(esc).join('<span aria-hidden="true"> · </span>')}</dd></div>`).join('')}
      </dl>
    </section>`;
}

/** Mount every interactive visual inside `root`; returns one cleanup for all. */
export function mountAchievements(root) {
  const d = disposer();
  root.querySelectorAll('.ach__visual[data-visual]').forEach((el) => {
    const cleanup = visuals[el.dataset.visual]?.mount(el);
    if (cleanup) d.add(cleanup);
  });
  return () => d.run();
}
