/* ==========================================================================
   SiteEnd — a quiet closing moment. Contact details live in the sidebar;
   this only points to them.
   ========================================================================== */

export function siteEnd() {
  return `
    <footer class="site-end" aria-labelledby="end-title">
      <div class="wrap grid">
        <h2 id="end-title" class="site-end__title display" data-reveal="mask">Let's talk.</h2>
        <div class="site-end__cta">
          <button type="button" class="btn" data-open-sidebar aria-controls="site-panel" aria-expanded="false" data-cursor="OPEN">
            Contact <span class="arrow" aria-hidden="true">→</span>
          </button>
          <svg class="site-end__sig annot" viewBox="0 0 260 90" aria-hidden="true" data-draw>
            <path d="M8 62 C 30 20, 52 18, 44 50 S 70 78, 92 40 C 104 20, 110 60, 124 52 C 140 42, 150 30, 170 44 C 188 58, 200 40, 250 36" />
            <path d="M40 76 L 232 70" />
          </svg>
        </div>
        <div class="site-end__base mono">
          <span>© ${new Date().getFullYear()} Sayf Elkousy · <span class="ar" lang="ar">سيف</span></span>
          <a href="#main" class="site-end__top" data-to-top>Back to top <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </footer>`;
}

/** "Back to top" without a hash change. Call from a page's mount(). */
export function bindSiteEnd(root, d) {
  const top = root.querySelector('[data-to-top]');
  if (!top) return;
  d.on(top, 'click', (e) => {
    e.preventDefault();
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    document.getElementById('main')?.focus({ preventScroll: true });
  });
}
