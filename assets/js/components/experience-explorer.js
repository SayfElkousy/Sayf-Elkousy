/* ==========================================================================
   ExperienceExplorer — "Right now", as a city plan.

   Home, after Selected Work: the city seen from above. Interests are districts (TECH, POLICY, BUSINESS, COMMUNITY, SPORT),
   experiences are sites. Related sites are joined by transit-style lines
   (horizontal + 45°, like the navigation). Selecting a site draws a leader
   line out to the detail panel.

   Desktop: spatial map + detail panel. Hover previews connections.
   Mobile:  the same data as a district-grouped list; tap to expand.
            Nothing essential depends on hover.
   ========================================================================== */

import { districts as allDistricts, experiences as allExperiences } from '../data/experiences.js';
import { esc, disposer, isPlaceholder, real } from '../core/utils.js';
import { scramble } from '../core/scramble.js';

// Only entries with a real name and description are shown; the rest wait in the data file.
const experiences = allExperiences.filter((e) => !isPlaceholder(e.org) && !isPlaceholder(e.desc));
const districts = allDistricts.filter((d) => experiences.some((e) => e.district === d.id));
export const hasExperiences = experiences.length > 0;

const byId = Object.fromEntries(experiences.map((e) => [e.id, e]));
const dist = Object.fromEntries(districts.map((d) => [d.id, d]));

/** Transit path between two points: straight run + a 45° diagonal. */
function transit([ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  if (Math.abs(dx) > Math.abs(dy)) {
    const run = dx - Math.sign(dx) * Math.abs(dy);
    return `M${ax} ${ay} h${run} L${bx} ${by}`;
  }
  const run = dy - Math.sign(dy) * Math.abs(dx);
  return `M${ax} ${ay} v${run} L${bx} ${by}`;
}

const meta = (e) => [real(e.role), real(e.year)].filter(Boolean).map(esc).join(' <span class="blue">—</span> ');

function detail(e, i) {
  const d = dist[e.district];
  const img = e.image ? `<div class="panel__img"><img src="${esc(e.image)}" alt="${esc(e.org)}" loading="lazy"></div>` : '';
  const skills = (e.skills || []).filter((s) => !isPlaceholder(s));
  const related = (e.related || []).concat(experiences.filter((x) => x.related?.includes(e.id)).map((x) => x.id));
  const rel = [...new Set(related)].map((id) => byId[id]).filter(Boolean);
  return `
    <div class="panel__head">
      <span class="mono panel__district" data-scramble>${d.index} / ${esc(d.label)}</span>
      <span class="mono">${String(i + 1).padStart(2, '0')} of ${String(experiences.length).padStart(2, '0')}</span>
    </div>
    <h3 class="panel__org display">${esc(e.org)}</h3>
    <p class="panel__role mono">${meta(e)}</p>
    ${img}
    <p class="panel__desc">${esc(e.desc)}</p>
    ${skills.length ? `<div class="tags">${skills.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="panel__foot">
      ${e.link ? `<a class="btn" href="${esc(e.link.href)}" target="_blank" rel="noopener" data-cursor="OPEN">${esc(e.link.label)} <span class="arrow">↗</span></a>` : ''}
      ${rel.length ? `<p class="panel__rel mono">Connected →
        ${rel.map((r) => `<button type="button" class="panel__jump" data-jump="${r.id}">${esc(r.org)}</button>`).join('<span aria-hidden="true"> / </span>')}</p>` : ''}
    </div>`;
}

export function explorerMarkup() {
  if (!hasExperiences) return '';
  const polys = districts.map((d) => `
    <g class="plan__district" data-district="${d.id}">
      <polygon points="${d.poly}" />
      <text x="${d.labelAt[0]}" y="${d.labelAt[1]}" class="plan__label">${d.label.toUpperCase()}</text>
      <text x="${+d.poly.split(/[ ,]/)[0] + 12}" y="${+d.poly.split(/[ ,]/)[1] + 24}" class="plan__index">${d.index}</text>
    </g>`).join('');

  const pairs = [];
  experiences.forEach((e) => (e.related || []).forEach((r) => byId[r] && pairs.push([e.id, r])));
  const lines = pairs.map(([a, b]) => `<path class="plan__link" data-a="${a}" data-b="${b}" d="${transit(byId[a].at, byId[b].at)}" />`).join('');

  const sites = experiences.map((e) => {
    const left = e.at[0] / 10, top = (e.at[1] / 640) * 100;
    return `
      <li class="site" style="left:${left}%;top:${top}%" data-district="${e.district}">
        <button type="button" class="site__btn" data-id="${e.id}" aria-pressed="false" data-cursor="OPEN">
          <span class="site__mark" aria-hidden="true"></span>
          <span class="site__org">${esc(e.org)}</span>
          <span class="site__meta mono">${meta(e)}</span>
        </button>
      </li>`;
  }).join('');

  const list = districts.map((d) => {
    const items = experiences.filter((e) => e.district === d.id).map((e) => `
      <li class="xl__item">
        <button type="button" class="xl__btn" aria-expanded="false" aria-controls="xl-${e.id}">
          <span class="xl__org">${esc(e.org)}</span>
          <span class="xl__meta mono">${meta(e)}</span>
          <span class="xl__plus" aria-hidden="true"></span>
        </button>
        <div class="xl__detail" id="xl-${e.id}" hidden>${detail(e, experiences.indexOf(e))}</div>
      </li>`).join('');
    return `<div class="xl__group"><h3 class="xl__district mono"><span class="blue">${d.index}</span> / ${esc(d.label)}</h3><ul>${items}</ul></div>`;
  }).join('');

  return `
    <section id="involved" class="explorer section" aria-labelledby="now-title">
      <div class="wrap grid explorer__head">
        <p class="mono section-index explorer__kicker" data-reveal="fade">What I'm involved in</p>
        <h2 id="now-title" class="display explorer__title" data-reveal="mask">Right<br>now</h2>
        <p class="lead explorer__lead" data-reveal="rise" data-delay="120">
          Not a résumé. A plan of the city as it stands today — the places my time actually goes, and the roads between them.
        </p>
        <div class="annot explorer__annot" aria-hidden="true">
          <svg viewBox="0 0 200 120" data-draw>
            <path d="M20 18 C 70 8, 120 30, 132 70 C 138 90, 136 100, 128 112" />
            <path d="M116 100 L 128 113 L 140 98" />
          </svg>
          <span class="hand">start anywhere</span>
        </div>
      </div>

      <div class="wrap grid explorer__body">
        <div class="explorer__map" data-reveal="fade">
          <svg class="plan" viewBox="0 0 1000 640" aria-hidden="true" focusable="false">
            <defs>
              <pattern id="plan-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="9.5" y="9.5" width="1" height="1" fill="rgba(157,167,179,0.22)" />
              </pattern>
            </defs>
            <rect width="1000" height="640" fill="url(#plan-dots)" />
            <path class="plan__bayou" d="M-10 350 C 120 330, 180 360, 250 344 S 380 318, 460 334 S 560 280, 640 284 S 780 262, 1010 252" />
            <text class="plan__bayou-label" x="236" y="338">BAYOU</text>
            <path class="plan__avenue" d="M460 640 L 800 0" />
            ${polys}
            <g class="plan__links">${lines}</g>
            <g class="plan__ticks">
              <text x="0" y="-8">0</text><text x="492" y="-8">500</text><text x="970" y="-8">1000</text>
            </g>
          </svg>
          <ul class="explorer__sites" aria-label="Experiences on the map">${sites}</ul>
        </div>

        <aside class="explorer__panel" aria-live="polite" aria-label="Selected experience">
          <div class="panel__empty">
            <p class="mono panel__district">— / Select a site</p>
            <p class="panel__prompt">Choose a place on the map to read more.</p>
            <ul class="panel__legend">
              ${districts.map((d) => `<li><button type="button" data-legend="${d.id}"><span class="blue mono">${d.index}</span> ${esc(d.label)} <span class="mono muted">${experiences.filter((e) => e.district === d.id).length}</span></button></li>`).join('')}
            </ul>
          </div>
          <div class="panel__detail" hidden></div>
        </aside>

        <svg class="explorer__leader" aria-hidden="true"><path /></svg>
      </div>

      <div class="wrap explorer__list">${list}</div>
    </section>`;
}

export class ExperienceExplorer {
  constructor(root) {
    this.root = root;
    if (!root) return;
    this.d = disposer();
    this.map = root.querySelector('.explorer__map');
    this.body = root.querySelector('.explorer__body');
    this.panel = root.querySelector('.explorer__panel');
    this.empty = root.querySelector('.panel__empty');
    this.detailEl = root.querySelector('.panel__detail');
    this.leader = root.querySelector('.explorer__leader');
    this.leaderPath = this.leader.querySelector('path');
    this.links = Array.from(root.querySelectorAll('.plan__link'));
    this.districtsEl = Array.from(root.querySelectorAll('.plan__district'));
    this.btns = Array.from(root.querySelectorAll('.site__btn'));
    this.selected = null;

    this.btns.forEach((b) => {
      this.d.on(b, 'click', () => this.select(b.dataset.id === this.selected ? null : b.dataset.id));
      this.d.on(b, 'pointerenter', () => this.preview(b.dataset.id));
      this.d.on(b, 'pointerleave', () => this.preview(null));
      this.d.on(b, 'focus', () => this.preview(b.dataset.id));
      this.d.on(b, 'blur', () => this.preview(null));
    });
    this.d.on(root, 'click', (e) => {
      const j = e.target.closest('[data-jump]');
      if (j) {
        const id = j.dataset.jump;
        if (getComputedStyle(this.map.querySelector('.explorer__sites')).display !== 'none') {
          this.select(id);
          this.btns.find((b) => b.dataset.id === id)?.focus();
        } else {
          const t = root.querySelector(`.xl__btn[aria-controls="xl-${id}"]`);
          if (t && t.getAttribute('aria-expanded') !== 'true') t.click();
          t?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          t?.focus({ preventScroll: true });
        }
      }
      const l = e.target.closest('[data-legend]');
      if (l) this.flashDistrict(l.dataset.legend);
    });
    this.d.on(this.panel, 'pointerover', (e) => {
      const l = e.target.closest('[data-legend]');
      this.highlightDistrict(l ? l.dataset.legend : null);
    });
    this.d.on(root, 'keydown', (e) => { if (e.key === 'Escape' && this.selected) this.select(null); });
    this.d.on(window, 'resize', () => this.drawLeader(false));

    // Mobile list: tap to expand (one at a time).
    root.querySelectorAll('.xl__btn').forEach((b) => this.d.on(b, 'click', () => {
      const open = b.getAttribute('aria-expanded') === 'true';
      root.querySelectorAll('.xl__btn[aria-expanded="true"]').forEach((o) => {
        o.setAttribute('aria-expanded', 'false');
        document.getElementById(o.getAttribute('aria-controls')).hidden = true;
      });
      if (!open) {
        b.setAttribute('aria-expanded', 'true');
        document.getElementById(b.getAttribute('aria-controls')).hidden = false;
      }
    }));
  }

  preview(id) {
    const active = id || this.selected;
    this.links.forEach((l) => l.classList.toggle('is-on', !!active && (l.dataset.a === active || l.dataset.b === active)));
    const d = active ? byId[active].district : null;
    this.highlightDistrict(d);
    this.btns.forEach((b) => {
      const e = byId[b.dataset.id];
      const linked = active && (e.id === active || e.related?.includes(active) || byId[active].related?.includes(e.id));
      b.parentElement.classList.toggle('is-dim', !!active && !linked);
    });
  }

  highlightDistrict(id) {
    this.districtsEl.forEach((g) => g.classList.toggle('is-on', g.dataset.district === id));
  }

  flashDistrict(id) {
    this.highlightDistrict(id);
    const first = experiences.find((e) => e.district === id);
    if (first) this.btns.find((b) => b.dataset.id === first.id)?.focus();
  }

  select(id) {
    this.selected = id;
    this.btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    this.btns.forEach((b) => b.parentElement.classList.toggle('is-selected', b.dataset.id === id));
    if (!id) {
      this.empty.hidden = false;
      this.detailEl.hidden = true;
      this.preview(null);
      this.drawLeader(false);
      return;
    }
    const e = byId[id];
    this.detailEl.innerHTML = detail(e, experiences.indexOf(e));
    this.empty.hidden = true;
    this.detailEl.hidden = false;
    this.detailEl.classList.remove('is-in');
    void this.detailEl.offsetWidth;
    this.detailEl.classList.add('is-in');
    const lab = this.detailEl.querySelector('[data-scramble]');
    scramble(lab, lab.textContent, { duration: 360 });
    this.preview(null);
    this.drawLeader(true);
  }

  /** A line extends from the selected site to the panel. */
  drawLeader(animate) {
    if (!this.selected || getComputedStyle(this.map).display === 'none') {
      this.leaderPath.setAttribute('d', '');
      return;
    }
    const b = this.body.getBoundingClientRect();
    const btn = this.btns.find((x) => x.dataset.id === this.selected);
    const m = btn.querySelector('.site__mark').getBoundingClientRect();
    const p = this.panel.getBoundingClientRect();
    const ax = m.left + m.width / 2 - b.left, ay = m.top + m.height / 2 - b.top;
    const px = p.left - b.left - 14, py = p.top - b.top + 22;
    this.leader.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    this.leader.setAttribute('width', b.width);
    this.leader.setAttribute('height', b.height);
    const dy = py - ay;
    const kneeX = px - Math.abs(dy);
    const d = kneeX > ax + 20
      ? `M${ax} ${ay} H${kneeX} L${px} ${py} H${px + 10}`
      : `M${ax} ${ay} L${px} ${py} H${px + 10}`;
    this.leaderPath.setAttribute('d', d);
    const len = this.leaderPath.getTotalLength();
    this.leaderPath.style.transition = 'none';
    this.leaderPath.style.strokeDasharray = `${len}`;
    this.leaderPath.style.strokeDashoffset = animate ? `${len}` : '0';
    if (animate) {
      void this.leaderPath.getBoundingClientRect();
      this.leaderPath.style.transition = '';
      this.leaderPath.style.strokeDashoffset = '0';
    }
  }

  destroy() { this.d?.run(); }
}
