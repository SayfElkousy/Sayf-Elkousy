/* ==========================================================================
   HOME — who Sayf is, then what he has done.

     city hero            the name on the clouds (who)
     #work                selected work: one rounded card per achievement (what)
     resume / involved    render once real content exists in data/
     more about me        one line, then About and Play

   WORK in the navigation is this page's #work section: the nav lights HOME
   or WORK by scroll position (IntersectionObserver below), and moving between
   them is an in-page scroll — never the route transition.
   ========================================================================== */

import { CityHero } from '../components/city/city-hero.js';
import { site } from '../data/site.js';
import { smoothstep, disposer, reducedMotion } from '../core/utils.js';
import { initReveals } from '../core/reveal.js';
import { siteEnd, bindSiteEnd } from '../components/site-end.js';
import { ExperienceExplorer, explorerMarkup } from '../components/experience-explorer.js';
import { achievementsMarkup, mountAchievements } from '../components/achievement.js';
import { resumeMarkup } from '../components/resume-viewer.js';
import { nextStops } from '../components/next-stops.js';

let introPlayed = false; // the full opening plays once per page load

export default {
  id: 'home',
  title: 'Sayf Elkousy',
  render() {
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__stage">
          <canvas class="hero__canvas" aria-hidden="true"></canvas>
          <h1 id="hero-title" class="visually-hidden">Sayf Elkousy <span lang="ar" dir="rtl">سيف</span></h1>
          <p class="visually-hidden">A city at night in the rain. From a rooftop, a searchlight projects the name Sayf Elkousy onto the clouds.</p>

          <div class="hero__hud">
            <p class="hero__subtitle mono">${site.subtitle.split('×').map((s) => `<span>${s.trim()}</span>`).join('<span class="x" aria-hidden="true">×</span>')}</p>
            <a class="hero__scroll mono" href="#work" data-cursor="DOWN">
              <span>Scroll</span><i aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </section>

      <section id="work" class="work" aria-labelledby="work-title">
        <h2 id="work-title" class="visually-hidden">Selected work</h2>
        <div class="wrap work__list">${achievementsMarkup()}</div>
      </section>

      ${resumeMarkup()}
      ${explorerMarkup()}

      <section class="more" aria-labelledby="more-title">
        <div class="wrap grid">
          <h2 id="more-title" class="mono section-index more__kicker" data-reveal="fade">More about me</h2>
          <p class="lead more__lead" data-reveal="rise"></p>
        </div>
      </section>
      ${nextStops('/')}
      ${siteEnd()}`;
  },

  mount(root, { first, setActive }) {
    const d = disposer();
    const hud = root.querySelector('.hero__hud');
    const hero = new CityHero(root.querySelector('.hero'), {
      intro: first && !introPlayed,
      onProgress: (p) => {
        hud.style.opacity = String(1 - smoothstep(0.02, 0.22, p));
        document.body.style.setProperty('--home-grid', String(smoothstep(0.6, 1, p) * 0.55));
      },
    });
    if (first && !introPlayed) root.querySelector('.hero').classList.add('is-intro');
    introPlayed = true;
    hero.mount();
    window.__sayfHero = hero; // test harness hook
    d.add(() => hero.destroy());
    d.add(() => document.body.style.removeProperty('--home-grid'));

    const work = root.querySelector('#work');

    // Cue: glide to the work without touching the URL.
    d.on(root.querySelector('.hero__scroll'), 'click', (e) => {
      e.preventDefault();
      work.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    });

    // HOME ↔ WORK in the nav follows the scroll. The root box is the top 40%
    // of this document's viewport (root: document, so it also holds inside
    // an iframe): WORK is lit once #work's top has crossed into it (and stays
    // lit below — resume, about, footer all sit under Work).
    if (setActive && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        const line = e.rootBounds ? e.rootBounds.bottom : window.innerHeight * 0.4;
        const inWork = e.boundingClientRect.top < line;
        setActive(inWork ? '/#work' : '/');
      }, { root: document, rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
      io.observe(work);
      d.add(() => io.disconnect());
    }

    const explorer = new ExperienceExplorer(root.querySelector('.explorer'));
    d.add(() => explorer.destroy());
    d.add(mountAchievements(root));
    bindSiteEnd(root, d);
    d.add(initReveals(root));
    return () => d.run();
  },
};
