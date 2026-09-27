/* ==========================================================================
   ABOUT — a short personal encyclopedia entry.

   One article, read top to bottom: title (English + Arabic), a contents
   row, an infobox with the portrait, three small sections, and two figures
   (Thoth, chess) set into the text like plates in a book. Copy lives in
   data/about.js; the drawings in components/illustrations.js.

   Desktop: text column (~62ch) + a right margin for infobox and chess.
   Mobile:  title → portrait → article → figures, one column.
   ========================================================================== */

import { sections, facts, portrait, thothCaption } from '../data/about.js';
import { esc, disposer } from '../core/utils.js';
import { initReveals } from '../core/reveal.js';
import { nextStops } from '../components/next-stops.js';
import { siteEnd, bindSiteEnd } from '../components/site-end.js';
import { knightSVG, thothSVG } from '../components/illustrations.js';

/** Escape a paragraph, then turn [label](/path) into a site link. */
const prose = (s) => esc(s).replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g,
  (_, label, href) => `<a class="inline" href="${href}">${label}</a>`);

const portraitMarkup = () => portrait.src
  ? `<img src="${esc(portrait.src)}" alt="${esc(portrait.alt)}" width="800" height="1000" decoding="async">`
  : `<div class="infobox__ph" role="img" aria-label="Professional portrait placeholder">
       <span class="mono">Professional portrait</span>
       <span class="mono muted">Coming soon</span>
     </div>`;

const thothFigure = () => `
  <figure class="wiki__fig wiki__fig--thoth" data-reveal="fade">
    <div class="wiki__fig-art">${thothSVG()}</div>
    <figcaption>
      <span class="mono wiki__fig-n">Fig. 1 — Thoth</span>
      <span class="wiki__fig-cap">${esc(thothCaption)}</span>
    </figcaption>
  </figure>`;

const chessFigure = () => `
  <figure class="wiki__fig wiki__fig--chess" data-reveal="fade">
    <div class="wiki__fig-art">${knightSVG()}</div>
    <figcaption>
      <span class="mono wiki__fig-n">Chess</span>
      <span class="hand">your move.</span>
    </figcaption>
  </figure>`;

function section(s, i) {
  const n = String(i + 1).padStart(2, '0');
  const criteria = s.criteria ? `
    <ol class="criteria">
      ${s.criteria.map(([name, text], k) => `
        <li>
          <span class="mono criteria__n">${String(k + 1).padStart(2, '0')}</span>
          <span class="criteria__name">${esc(name)}</span>
          <span class="criteria__text">${esc(text)}</span>
        </li>`).join('')}
    </ol>` : '';
  return `
    <section class="wiki__sec wiki__sec--${s.id}" id="${s.id}" aria-labelledby="${s.id}-t">
      <h2 class="wiki__h" id="${s.id}-t"><span class="mono">${n}</span> ${esc(s.title)}</h2>
      ${s.paras.map((p) => `<p>${prose(p)}</p>`).join('')}
      ${criteria}
      ${(s.after || []).map((p) => `<p class="wiki__more mono">${prose(p)}</p>`).join('')}
      ${s.id === 'background' ? thothFigure() : ''}
    </section>`;
}

export default {
  id: 'about',
  title: 'About — Sayf Elkousy',
  render() {
    const toc = sections.map((s, i) => `
      <li><a href="#${s.id}"><span class="mono">${String(i + 1).padStart(2, '0')}</span> ${esc(s.title)}</a></li>`).join('');

    return `
      <article class="wiki page-top" aria-labelledby="about-title">
        <div class="wrap">
          <header class="wiki__head">
            <p class="mono section-index">About</p>
            <h1 id="about-title" class="display wiki__title">Sayf Elkousy</h1>
            <p class="wiki__ar"><span class="ar" lang="ar">سيف</span> <span class="mono muted">Arabic · “sword”</span></p>
          </header>

          <nav class="wiki__toc" aria-label="Contents">
            <span class="mono muted">Contents</span>
            <ol>${toc}</ol>
          </nav>

          <div class="wiki__body">
            <aside class="infobox" aria-label="Summary">
              <p class="infobox__name">Sayf Elkousy <span class="ar" lang="ar">سيف</span></p>
              <figure class="infobox__photo">${portraitMarkup()}</figure>
              <dl class="infobox__facts">
                ${facts.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
              </dl>
            </aside>

            ${sections.map(section).join('')}

            <aside class="wiki__margin">${chessFigure()}</aside>
          </div>
        </div>
      </article>

      ${nextStops('/about')}
      ${siteEnd()}`;
  },

  mount(root) {
    const d = disposer();
    d.add(initReveals(root));
    bindSiteEnd(root, d);
    return () => d.run();
  },
};
