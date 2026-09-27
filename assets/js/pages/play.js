/* ==========================================================================
   PLAY — the life away from the screen.
   Hero video → photographs (sport first) → travel map → end.
   The grid loosens, images tilt and overlap, typography gets involved —
   but only real media is shown; empty sections are skipped.
   ========================================================================== */

import { heroVideo } from '../data/photos.js';
import { disposer, esc, reducedMotion } from '../core/utils.js';
import { initReveals } from '../core/reveal.js';
import { photoCanvasMarkup } from '../components/photo-canvas.js';
import { PhotoLightbox } from '../components/photo-lightbox.js';
import { travelMarkup, initTravelMap } from '../components/travel-map.js';
import { siteEnd, bindSiteEnd } from '../components/site-end.js';

/* Pitch markings drawn around the video (decorative; see play.css "Pitch").
   The video sits where the centre of the pitch would be; penalty areas,
   goals and corner arcs frame it on either side. */
const pitchMarkup = () => `
  <div class="pitch" aria-hidden="true">
    <div class="pitch__lines">
      <i class="pitch__box pitch__box--l"></i><i class="pitch__box pitch__box--r"></i>
      <i class="pitch__six pitch__six--l"></i><i class="pitch__six pitch__six--r"></i>
      <i class="pitch__spot pitch__spot--l"></i><i class="pitch__spot pitch__spot--r"></i>
      <i class="pitch__corner pitch__corner--tl"></i><i class="pitch__corner pitch__corner--tr"></i>
      <i class="pitch__corner pitch__corner--bl"></i><i class="pitch__corner pitch__corner--br"></i>
      <i class="pitch__half pitch__half--t"></i><i class="pitch__half pitch__half--b"></i>
      <i class="pitch__arc pitch__arc--t"></i><i class="pitch__arc pitch__arc--b"></i>
    </div>
    <i class="pitch__goal pitch__goal--l"></i><i class="pitch__goal pitch__goal--r"></i>
    <span class="pitch__lbl pitch__lbl--0 mono">0</span>
    <span class="pitch__lbl pitch__lbl--mid mono">52.5</span>
    <span class="pitch__lbl pitch__lbl--end mono">105 m</span>
    <svg class="pitch__tactic" viewBox="0 0 64 44">
      <path d="M8 34 C 18 30, 24 18, 34 12" />
      <path d="M30 10 L 35 11.5 L 32 16" />
      <circle cx="8" cy="34" r="2.4" /><circle cx="38" cy="10" r="2.4" /><circle cx="56" cy="30" r="2.4" />
    </svg>
  </div>`;

function heroMarkup() {
  const v = heroVideo;
  const still = reducedMotion();
  return `
    <div class="play-open__hero">
      <div class="play-open__frame">
        <video class="play-open__video" muted loop playsinline ${still ? 'preload="metadata"' : 'autoplay preload="auto"'}
          ${v.poster ? `poster="${esc(v.poster)}"` : ''} aria-label="${esc(v.label)}" disablepictureinpicture>
          <source src="${esc(v.src)}${v.poster ? '' : '#t=0.1'}" type="video/mp4">
        </video>
      </div>
      <button type="button" class="play-open__toggle mono">
        <span class="play-open__toggle-icon" aria-hidden="true"></span>
        <span class="play-open__toggle-text">${still ? 'Play video' : 'Pause video'}</span>
      </button>
    </div>`;
}

export default {
  id: 'play',
  title: 'Play — Sayf Elkousy',
  render() {
    return `
      <section class="play-open" aria-labelledby="play-title">
        <div class="play-open__stage">
          ${pitchMarkup()}
          ${heroMarkup()}
        </div>
        <h1 id="play-title" class="display play-open__title">Play</h1>
        <p class="play-open__lede">If I'm not studying, you'll often find me playing pickup soccer, watching my favorite team Liverpool play, or joining basketball runs at the gym!</p>
      </section>

      <div class="play-canvas">${photoCanvasMarkup()}</div>

      ${travelMarkup()}

      ${siteEnd()}`;
  },
  mount(root) {
    const d = disposer();
    const lb = new PhotoLightbox(root.querySelector('.play-canvas').parentElement);
    d.add(() => lb.destroy());
    d.add(initReveals(root));
    d.add(initTravelMap(root));
    bindSiteEnd(root, d);

    // Hero video: plays only while on screen, honours reduced motion,
    // and always offers a visible pause/play control.
    const video = root.querySelector('.play-open__video');
    const toggle = root.querySelector('.play-open__toggle');
    const label = toggle.querySelector('.play-open__toggle-text');
    let wanted = !reducedMotion(); // the viewer's choice
    let visible = true;

    const sync = () => {
      toggle.classList.toggle('is-paused', !wanted);
      label.textContent = wanted ? 'Pause video' : 'Play video';
      if (wanted && visible) video.play().catch(() => { /* autoplay refused: leave the first frame */ });
      else video.pause();
    };
    d.on(toggle, 'click', () => { wanted = !wanted; sync(); });
    d.on(video, 'error', () => root.querySelector('.play-open__hero').classList.add('is-missing'), true);
    d.on(matchMedia('(prefers-reduced-motion: reduce)'), 'change', () => { wanted = !reducedMotion(); sync(); });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.05 });
      io.observe(video);
      d.add(() => io.disconnect());
    }
    const onVis = () => { if (document.hidden) video.pause(); else sync(); };
    d.on(document, 'visibilitychange', onVis);
    sync();

    d.add(() => { video.pause(); video.removeAttribute('src'); video.querySelector('source')?.remove(); video.load(); });
    return () => d.run();
  },
};
