/* ==========================================================================
   Site base — where the site lives, found at runtime.

   The site may be served from a domain root (localhost, a custom domain) or
   from a sub-folder (GitHub Pages project sites: /<repo-name>/). Nothing is
   hard-coded: this file is always at <site>/assets/js/core/base.js, so the
   site root is three folders up from its own URL.

   The app thinks in *app paths* — '/', '/about', '/#work' — and converts at
   the edges:
     link('/about')         → '/Sayf_Website/about'      (for hrefs, history)
     asset('assets/x.jpg')  → '/Sayf_Website/assets/x.jpg'
     appPath(location.pathname) → '/about'  (null if outside the site)
   ========================================================================== */

export const BASE = new URL('../../../', import.meta.url).pathname; // always ends in '/'

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i; // http:, mailto:, data:, //cdn, #frag

/** A file inside the site ('assets/…' or '/assets/…') → an absolute URL path. */
export function asset(p) {
  if (p == null || p === '' || EXTERNAL.test(p)) return p;
  return BASE + String(p).replace(/^\.?\//, '');
}

/** An app path ('/', '/about', '/#work', '/play#travel') → a URL path for href/history. */
export function link(p) {
  if (p == null || EXTERNAL.test(p)) return p;
  return BASE + String(p).replace(/^\//, '');
}

/** A URL pathname → its app path ('/about'), or null when it's outside the site. */
export function appPath(pathname) {
  if (pathname.startsWith(BASE)) return '/' + pathname.slice(BASE.length);
  if (pathname + '/' === BASE) return '/';
  return null;
}
