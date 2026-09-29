/* ==========================================================================
   Achievement — the one card every Work activity uses.

   Three variants of one card (same border, radius, type, label → title →
   organization → meta → description):
     ach--interactive  PSO: the interactive visual beside the text (≈55 / 45)
     ach--photos       text, with one or two small photos beside it
                       (side by side, never one inside another; optional
                       caption directly under a photo)
     ach--text         no photos: heading block and description in two columns
   Mobile (every card, same order): label → title → organization → meta →
   visual / photos → description.
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

/** Photo shape: its real proportions, clamped to 3:4 … 3:2 so rows stay tidy. */
const ratio = (im) => Math.min(1.5, Math.max(0.75, (im.w && im.h) ? im.w / im.h : 1)).toFixed(3);

/** Up to two small photos, side by side — each a plain image, optionally captioned. */
function media(a) {
  const list = photos(a).slice(0, 2);
  if (!list.length) return '';
  return `
    <div class="ach__photos">
      ${list.map((im) => `
        <figure class="ach__fig" style="--r:${ratio(im)}">
          ${img(im, { cls: 'ach__fig-img', sizes: '(max-width: 900px) 50vw, 360px' })}
          ${real(im.caption) ? `<figcaption class="ach__cap">${esc(im.caption)}</figcaption>` : ''}
        </figure>`).join('')}
    </div>`;
}

/** The interactive visual (PSO). */
function interactive(a, visual) {
  return `
    <div class="ach__visual" data-visual="${esc(a.visual)}">
      ${visual.markup(a)}
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
  const kind = visual ? 'interactive' : photos(a).length ? 'photos' : 'text';
  const cls = `ach ach--${kind}`;

  return `
    <article class="${cls}" id="${id}" aria-labelledby="${id}-title" data-reveal="rise">
      ${visual ? interactive(a, visual) : media(a)}
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
