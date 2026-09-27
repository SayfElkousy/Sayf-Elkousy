/* ==========================================================================
   Sidebar — how to reach Sayf, then the four pages.

   One panel for every width: slides in from the left — the side its
   "Contact" trigger lives on — at ~360px on desktop, most of the screen on
   phones. The page behind dims and is inert. Esc, the close button, or a
   click outside closes it; focus returns to whichever control opened it.
   Reduced motion: fade only.

   Any element with [data-open-sidebar] opens it (nav Contact, site end).
   ========================================================================== */

import { routes, site } from '../data/site.js';
import { esc, reducedMotion } from '../core/utils.js';

export class Sidebar {
  constructor() {
    this.opener = null;
    this.isOpen = false;
    this.render();
    this.bind();
  }

  render() {
    const nav = routes.map((r) => `
      <li><a href="${r.path}" data-i="${r.index}">
        <span class="sb__idx mono">${r.index}</span>
        <span class="sb__label display">${r.label}</span>
      </a></li>`).join('');

    const contact = site.contact.filter((c) => c.href).map((c) => {
      const ext = c.href.startsWith('http');
      return `
      <li><a class="sb__contact" href="${esc(c.href)}" ${ext ? 'target="_blank" rel="noopener"' : ''} data-cursor="OPEN">
        <span class="mono">${esc(c.label)}</span>
        <span class="sb__value">${esc(c.value)}</span>
        <span class="sb__arrow" aria-hidden="true">${ext ? '↗' : '→'}</span>
      </a></li>`;
    }).join('');

    const wrap = document.createElement('div');
    wrap.className = 'sb';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="sb__scrim" data-sb-close></div>
      <aside class="sb__panel" id="site-panel" role="dialog" aria-modal="true" aria-labelledby="sb-title">
        <div class="sb__top">
          <p class="sb__name" id="sb-title">
            <span class="sb__en">Sayf Elkousy</span>
            <span class="sb__ar ar" lang="ar">${site.nameAr}</span>
          </p>
          <button type="button" class="sb__close mono" data-sb-close data-cursor="CLOSE">
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <p class="sb__sub">${esc(site.subtitle)}</p>

        <section class="sb__section" aria-labelledby="sb-contact">
          <p class="mono sb__head" id="sb-contact">Contact</p>
          <ul class="sb__list">${contact}</ul>
        </section>

        <nav class="sb__section" aria-label="Pages">
          <p class="mono sb__head">Pages</p>
          <ol class="sb__nav">${nav}</ol>
        </nav>

        <p class="sb__foot mono">© ${new Date().getFullYear()} Sayf Elkousy</p>
      </aside>`;
    document.body.appendChild(wrap);
    this.el = wrap;
    this.panel = wrap.querySelector('.sb__panel');
    this.closeBtn = wrap.querySelector('.sb__close');
    this.links = Array.from(wrap.querySelectorAll('.sb__nav a'));
  }

  bind() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-open-sidebar]');
      if (t) { e.preventDefault(); this.open(t); }
    });
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-sb-close]')) this.close();
    });
    // Page links: the router navigates (or scrolls, for a section of this
    // page) and moves focus to the new content.
    this.links.forEach((a) => a.addEventListener('click', () => this.close({ restoreFocus: false })));
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'Tab') this.trap(e);
    });
  }

  /** @param {string} key  a route path ('/about') or a section of one ('/#work') */
  setActive(key) {
    this.links.forEach((a) => {
      if (a.getAttribute('href') === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  open(opener) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.opener = opener || null;
    document.querySelectorAll('[aria-controls="site-panel"]').forEach((b) => b.setAttribute('aria-expanded', 'true'));

    // Lock background scroll without a layout jump.
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--sbw', `${sbw}px`);
    document.documentElement.classList.add('sb-open');
    ['main', 'site-nav'].forEach((id) => document.getElementById(id)?.setAttribute('inert', ''));

    this.el.hidden = false;
    this.el.classList.toggle('is-reduced', reducedMotion());
    void this.el.offsetWidth; // commit the closed state so the slide runs
    this.el.classList.add('is-open');
    this.closeBtn.focus({ preventScroll: true });
  }

  close({ restoreFocus = true } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('is-open');
    document.querySelectorAll('[aria-controls="site-panel"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.documentElement.classList.remove('sb-open');
    ['main', 'site-nav'].forEach((id) => document.getElementById(id)?.removeAttribute('inert'));

    clearTimeout(this.hideTimer);
    const hide = () => { if (!this.isOpen) this.el.hidden = true; };
    if (reducedMotion()) hide(); else this.hideTimer = setTimeout(hide, 320);

    if (restoreFocus && this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    this.opener = null;
  }

  trap(e) {
    const f = Array.from(this.panel.querySelectorAll('a[href], button'));
    const first = f[0], last = f[f.length - 1];
    if (!this.panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
