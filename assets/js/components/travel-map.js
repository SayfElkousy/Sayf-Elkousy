/* ==========================================================================
   TravelMap — where Sayf has been. Dark, minimal, data-driven.

   • One SVG: a faint graticule, the land silhouette and thin country
     borders (data/world-map.js, baked from Natural Earth 110m).
   • Pins are real <button>s laid over the SVG, generated from
     data/travel.js — keyboard focusable, screen-reader labelled
     ("Cairo, Egypt"). Their visible dot is small; the hit area is not.
   • Mouse: the pin nearest the cursor lights up and shows its card, so
     clustered cities (Amsterdam / Rotterdam) are still reachable.
     Touch: tap near a pin to show it (tap again to step through a
     cluster), tap elsewhere to close.
     Keyboard: Tab through pins; the card follows focus. Esc closes.
   • Region buttons zoom the viewBox (World / Americas / Europe / MENA).
     Reduced motion: the zoom jumps instead of gliding.
   ========================================================================== */

import { WORLD } from '../data/world-map.js';
import { travelLocations, travelRegions } from '../data/travel.js';
import { esc, disposer, reducedMotion, isNarrow } from '../core/utils.js';
import { asset } from '../core/base.js';

const K = WORLD.width / 360;
const project = (lon, lat) => [(lon + 180) * K, (WORLD.latTop - lat) * K];

const places = travelLocations.map((p, i) => ({ ...p, i, xy: project(p.lon, p.lat) }));

function graticule() {
  let d = '';
  for (let lon = -150; lon <= 180; lon += 30) { const [x] = project(lon, 0); d += `M${x} 0V${WORLD.height}`; }
  for (let lat = 60; lat >= -30; lat -= 30) { const [, y] = project(0, lat); d += `M0 ${y}H${WORLD.width}`; }
  return d;
}

function describe(p) {
  return [p.home ? 'Home' : '', p.year ? `Visited ${p.year}` : '', p.note || ''].filter(Boolean).join('. ');
}

function card(p) {
  return `
    ${p.photo?.src ? `<img class="tmap__tip-img" src="${esc(asset(p.photo.src))}" alt="${esc(p.photo.alt || '')}" loading="lazy">` : ''}
    <p class="tmap__tip-city display">${esc(p.city)}</p>
    ${p.city !== p.country ? `<p class="tmap__tip-country mono">${esc(p.country)}</p>` : ''}
    ${p.home ? '<p class="tmap__tip-meta mono"><span class="red-pip" aria-hidden="true"></span> Home</p>' : ''}
    ${p.year ? `<p class="tmap__tip-meta mono">Visited ${esc(p.year)}</p>` : ''}
    ${p.note ? `<p class="tmap__tip-note">${esc(p.note)}</p>` : ''}`;
}

export function travelMarkup() {
  const visited = places.filter((p) => !p.home);
  const countries = new Set(places.map((p) => p.country)).size;
  const pins = places.map((p) => `
    <li><button type="button" class="tmap__pin ${p.home ? 'is-home' : ''}" data-i="${p.i}">
      <span class="visually-hidden">${esc(p.city === p.country ? p.country : `${p.city}, ${p.country}`)}${describe(p) ? `. ${esc(describe(p))}` : ''}</span>
    </button></li>`).join('');
  const regions = travelRegions.map((r, k) => `
    <button type="button" class="tmap__region mono" data-region="${r.id}" aria-pressed="${k === 0}"${r.short ? ` aria-label="${esc(r.label)}"` : ''}>
      ${esc(r.short || r.label)}
    </button>`).join('');

  return `
    <section class="travel" id="travel" aria-labelledby="travel-title">
      <div class="travel__head">
        <p class="spread__label mono" data-reveal="fade">Travel</p>
        <h2 id="travel-title" class="display travel__title" data-reveal="mask">Where I've been</h2>
        <p class="travel__count mono">${visited.length} places · ${countries} countries</p>
      </div>
      <div class="tmap" data-reveal="fade">
        <div class="tmap__bar">
          <div class="tmap__regions" role="group" aria-label="Zoom the map">${regions}</div>
          <p class="tmap__legend mono" aria-hidden="true"><span class="tmap__key tmap__key--home"></span>Home <span class="tmap__key"></span>Visited</p>
        </div>
        <div class="tmap__stage">
          <svg class="tmap__svg" viewBox="0 0 ${WORLD.width} ${WORLD.height.toFixed(2)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
            <path class="tmap__grid" d="${graticule()}" />
            <path class="tmap__land" d="${WORLD.land}" />
            <path class="tmap__borders" d="${WORLD.borders}" />
          </svg>
          <ul class="tmap__pins" aria-label="Places I've visited">${pins}</ul>
          <div class="tmap__tip" aria-hidden="true" hidden></div>
        </div>
        <p class="tmap__hint mono" aria-hidden="true">${isNarrow() ? 'Tap a pin' : 'Hover a pin · Tab through places'}</p>
      </div>
    </section>`;
}

export function initTravelMap(root) {
  const el = root.querySelector('.tmap');
  if (!el) return () => {};
  const d = disposer();
  const stage = el.querySelector('.tmap__stage');
  const svg = el.querySelector('.tmap__svg');
  const tip = el.querySelector('.tmap__tip');
  const pins = Array.from(el.querySelectorAll('.tmap__pin'));
  const regionBtns = Array.from(el.querySelectorAll('.tmap__region'));

  let region = travelRegions[0];
  let vb = [0, 0, WORLD.width, WORLD.height];
  let active = null;   // index of the shown pin
  let mode = null;     // 'hover' | 'focus' | 'pinned'
  let anim = 0;

  /* ---------- geometry ---------- */
  const aspect = () => { const r = stage.getBoundingClientRect(); return r.width / Math.max(1, r.height); };

  function fit(reg) {
    let [w, n, e, s] = reg.bounds;
    // Phones: the whole globe is mostly ocean — frame just the places instead.
    if (reg.id === 'world' && isNarrow()) [w, n, e, s] = [-128, 62, 66, 2];
    const [x0, y0] = project(w, n);
    const [x1, y1] = project(e, s);
    let bw = x1 - x0, bh = y1 - y0;
    const cx = x0 + bw / 2, cy = y0 + bh / 2;
    const a = aspect();
    if (bw / bh > a) bh = bw / a; else bw = bh * a;
    return [cx - bw / 2, cy - bh / 2, bw, bh];
  }

  function place() {
    svg.setAttribute('viewBox', vb.map((v) => v.toFixed(2)).join(' '));
    pins.forEach((b) => {
      const [x, y] = places[+b.dataset.i].xy;
      const px = (x - vb[0]) / vb[2], py = (y - vb[1]) / vb[3];
      const out = px < 0.01 || px > 0.99 || py < 0.02 || py > 0.98;
      b.style.left = `${(px * 100).toFixed(3)}%`;
      b.style.top = `${(py * 100).toFixed(3)}%`;
      b.classList.toggle('is-out', out);
      b.tabIndex = out ? -1 : 0;
    });
    if (active != null) positionTip();
  }

  function zoomTo(reg, animate = true) {
    region = reg;
    regionBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.region === reg.id)));
    const to = fit(reg);
    cancelAnimationFrame(anim);
    if (!animate || reducedMotion()) { vb = to; place(); return; }
    const from = vb.slice();
    const t0 = performance.now(), dur = 700;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      vb = from.map((v, k) => v + (to[k] - v) * ease(t));
      place();
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  /* ---------- the card ---------- */
  function positionTip() {
    const b = pins[active];
    const sr = stage.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const x = br.left + br.width / 2 - sr.left, y = br.top + br.height / 2 - sr.top;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const left = Math.min(Math.max(8, x - tw / 2), sr.width - tw - 8);
    const below = y - th - 18 < 4;
    tip.style.left = `${left}px`;
    tip.style.top = `${below ? y + 18 : y - th - 18}px`;
    tip.classList.toggle('is-below', below);
  }

  function show(i, how) {
    if (active !== i) {
      pins[active]?.classList.remove('is-active');
      active = i;
      pins[i].classList.add('is-active');
      tip.innerHTML = card(places[i]);
      tip.hidden = false;
      tip.classList.remove('is-in'); void tip.offsetWidth; tip.classList.add('is-in');
    }
    mode = how;
    positionTip();
  }

  function hide() {
    if (active == null) return;
    pins[active].classList.remove('is-active');
    active = null; mode = null;
    tip.hidden = true;
  }

  /** Visible pins within `radius` px of a viewport point, nearest first. */
  function near(cx, cy, radius) {
    return pins.map((b, i) => {
      if (b.classList.contains('is-out')) return null;
      const r = b.getBoundingClientRect();
      return { i, d: Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) };
    }).filter((x) => x && x.d < radius).sort((x, y) => x.d - y.d).map((x) => x.i);
  }
  const nearest = (cx, cy, radius) => near(cx, cy, radius)[0] ?? null;

  /* ---------- events ---------- */
  d.on(stage, 'pointermove', (e) => {
    if (e.pointerType !== 'mouse' || mode === 'pinned' || mode === 'focus') return;
    const i = nearest(e.clientX, e.clientY, 22);
    if (i != null) show(i, 'hover'); else if (mode === 'hover') hide();
    stage.classList.toggle('is-pointing', i != null);
  });
  d.on(stage, 'pointerleave', () => { stage.classList.remove('is-pointing'); if (mode === 'hover') hide(); });
  d.on(stage, 'click', (e) => {
    // Keyboard activation of a pin reports (0,0); keep focus behaviour for it.
    if (e.detail === 0 && e.target.closest('.tmap__pin')) { show(+e.target.closest('.tmap__pin').dataset.i, 'pinned'); return; }
    const touch = e.pointerType === 'touch' || matchMedia('(hover: none)').matches;
    // Tapping the same cluster again steps to the next city in it
    // (Amsterdam → Rotterdam), so tight groups stay reachable by finger.
    const hits = near(e.clientX, e.clientY, touch ? 30 : 22);
    if (!hits.length) { hide(); return; }
    const k = hits.indexOf(active);
    show(k >= 0 && mode === 'pinned' ? hits[(k + 1) % hits.length] : hits[0], 'pinned');
  });
  d.on(document, 'pointerdown', (e) => { if (mode === 'pinned' && !stage.contains(e.target)) hide(); });
  pins.forEach((b) => {
    d.on(b, 'focus', () => { if (b.matches(':focus-visible')) show(+b.dataset.i, 'focus'); });
    d.on(b, 'blur', () => { if (mode === 'focus') hide(); });
  });
  d.on(el, 'keydown', (e) => { if (e.key === 'Escape' && active != null) { hide(); } });
  regionBtns.forEach((b) => d.on(b, 'click', () => {
    hide();
    zoomTo(travelRegions.find((r) => r.id === b.dataset.region));
  }));
  let rt = 0;
  d.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { vb = fit(region); place(); }, 80); });

  vb = fit(region);
  place();
  d.add(() => cancelAnimationFrame(anim));
  return () => d.run();
}
