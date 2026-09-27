/* ==========================================================================
   Router — History API, real URLs, client-side swaps.

   Design:
   • The URL is updated immediately on click (pushState). The page swap happens
     at the transition's midpoint and always renders whatever `location` says
     *at that moment*. So rapid clicks, Back, and Forward during a transition
     never stack animations — they just change what the midpoint renders, and
     a follow-up transition runs only if the URL moved again after the swap.
   • Scroll positions are remembered per history entry (in memory + session).
   • Sections of the same page (e.g. /#work on Home) are reached with a smooth
     in-page scroll — no transition, no new history entry.
   • A link into a section of another page (/about → /#work) swaps under the
     transition, lands just short of the section, then glides into place.
   • Retired URLs are rewritten before anything renders (`redirects`).
   ========================================================================== */

const SCROLL_KEY = 'sayf:scroll';

export class Router {
  /**
   * @param {object} o
   * @param {Record<string, () => Promise<any>>} o.pages   path → module loader
   * @param {() => Promise<any>} o.notFound
   * @param {{ run(midpoint: () => Promise<void>, info: object): Promise<void> }} o.transition
   * @param {(info: object) => void} [o.onChange]          after each swap
   * @param {HTMLElement} o.outlet
   * @param {Record<string, string>} [o.redirects]         old path → new path (may include #hash)
   * @param {object} [o.context]                          extra fields passed to every page's mount()
   */
  constructor({ pages, notFound, transition, onChange, outlet, redirects = {}, context = {} }) {
    this.pages = pages;
    this.redirects = redirects;
    this.context = context;
    this.notFound = notFound;
    this.transition = transition;
    this.onChange = onChange || (() => {});
    this.outlet = outlet;
    this.current = null;        // normalized path currently rendered
    this.cleanup = null;        // unmount function of current page
    this.busy = false;
    this.scroll = this.#loadScroll();
    this.firstRender = true;
    this.pendingHash = null;    // section to glide to once the transition clears
  }

  static normalize(pathname) {
    let p = pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  start() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    // Canonicalise /about/ → /about without adding an entry.
    const norm = Router.normalize(location.pathname);
    const key = history.state?.key || this.#newKey();
    if (norm !== location.pathname || !history.state?.key) {
      history.replaceState({ key }, '', norm + location.search + location.hash);
    }
    this.#redirect();

    document.addEventListener('click', this.#onClick);
    window.addEventListener('popstate', this.#onPop);
    window.addEventListener('scroll', this.#onScroll, { passive: true });
    window.addEventListener('pagehide', () => this.#saveScroll());

    return this.#swap({ initial: true });
  }

  /** Programmatic navigation. */
  navigate(path, { replace = false } = {}) {
    let url = new URL(path, location.origin);
    const moved = this.redirects[Router.normalize(url.pathname)];
    if (moved) url = new URL(moved, location.origin);
    const target = Router.normalize(url.pathname);
    if (target === this.current && !this.busy) {
      // Same page: scroll to the section (or the top). No transition, no new entry.
      history.replaceState(history.state, '', target + url.hash);
      this.#scrollToHash({ smooth: true, focus: true });
      return;
    }
    this.#rememberScroll();
    const state = { key: this.#newKey() };
    if (replace) history.replaceState(state, '', target + url.hash);
    else history.pushState(state, '', target + url.hash);
    this.#run();
  }

  /* ---------------- internals ---------------- */

  #onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.external !== undefined) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname) && !url.pathname.endsWith('.html')) return; // files (pdf, jpg…)
    if (url.pathname.startsWith('/tests/')) return;
    e.preventDefault();
    const target = Router.normalize(url.pathname);
    this.navigate(target + url.hash);
  };

  #onPop = () => {
    this.#redirect();
    if (Router.normalize(location.pathname) === this.current && !this.busy) {
      if (location.hash) this.#scrollToHash({ smooth: true });
      return;
    }
    this.#run();
  };

  /** Rewrite a retired URL in place (no new history entry). */
  #redirect() {
    const to = this.redirects[Router.normalize(location.pathname)];
    if (to) history.replaceState(history.state, '', to);
  }

  #hashTarget() {
    if (!location.hash) return null;
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return null; }
  }

  /** Scroll to location.hash (or the top when there is none). */
  #scrollToHash({ smooth = false, focus = false } = {}) {
    const el = this.#hashTarget();
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
    if (el) el.scrollIntoView({ block: 'start', behavior });
    else window.scrollTo({ top: 0, behavior });
    if (focus) {
      const to = el || this.outlet;
      if (!to.hasAttribute('tabindex')) to.setAttribute('tabindex', '-1');
      to.focus({ preventScroll: true });
    }
  }

  #onScroll = () => {
    const key = history.state?.key;
    if (key && !this.busy) this.scroll[key] = window.scrollY;
  };

  #rememberScroll() {
    const key = history.state?.key;
    if (key) this.scroll[key] = window.scrollY;
    this.#saveScroll();
  }

  async #run() {
    if (this.busy) return; // the in-flight midpoint will read the latest URL
    this.busy = true;
    try {
      const target = () => Router.normalize(location.pathname);
      // Loop: if the URL moved again while we were animating, go again.
      do {
        const from = this.current;
        const to = target();
        if (to === from) break;
        await this.transition.run(() => this.#swap({ initial: false }), { from, to, hash: location.hash });
      } while (target() !== this.current);
    } finally {
      this.busy = false;
    }
    // Arrived short of a section (see #swap): glide the rest of the way.
    const el = this.pendingHash;
    this.pendingHash = null;
    if (el?.isConnected && el === this.#hashTarget()) this.#scrollToHash({ smooth: true });
  }

  async #swap({ initial }) {
    const path = Router.normalize(location.pathname);
    const loader = this.pages[path] || this.notFound;
    const mod = await loader();
    const page = mod.default;

    if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } this.cleanup = null; }

    this.outlet.innerHTML = page.render();
    this.current = path;
    document.title = page.title || document.title;
    document.body.dataset.page = page.id || 'page';

    // Restore scroll for Back/Forward; a #hash target for fresh entries; else top.
    const saved = this.scroll[history.state?.key];
    const hash = this.#hashTarget();
    this.pendingHash = null;
    if (typeof saved === 'number' && !(initial && hash)) window.scrollTo(0, saved);
    else if (hash && !initial && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Land a little above the section under cover; #run glides the rest.
      const top = hash.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(hash).scrollMarginTop || 0);
      window.scrollTo(0, Math.max(0, top - window.innerHeight * 0.4));
      this.pendingHash = hash;
    }
    else if (hash) hash.scrollIntoView();
    else window.scrollTo(0, 0);

    this.cleanup = page.mount?.(this.outlet, {
      ...this.context,
      router: this,
      initial,
      first: this.firstRender,
      restoredScroll: typeof saved === 'number' ? saved : 0,
    }) || null;
    this.firstRender = false;

    this.onChange({ path, page, initial });

    if (!initial) {
      // Move focus to the new content for keyboard and screen-reader users.
      this.outlet.focus({ preventScroll: true });
    }
  }

  #newKey() { return Math.random().toString(36).slice(2, 10); }

  #loadScroll() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY)) || {}; } catch { return {}; }
  }
  #saveScroll() {
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(this.scroll)); } catch { /* private mode */ }
  }
}
