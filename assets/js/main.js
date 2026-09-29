/* ==========================================================================
   Entry point. Wires navigation, sidebar, router, transition, cursor.
   ========================================================================== */
import { Router } from './core/router.js';
import { Nav } from './components/nav.js';
import { RouteTransition } from './components/route-transition.js';
import { routes, redirects } from './data/site.js';
import { initCursor } from './components/cursor.js';
import { Sidebar } from './components/sidebar.js';

const pages = {
  '/': () => import('./pages/home.js'),
  '/about': () => import('./pages/about.js'),
  '/play': () => import('./pages/play.js'),
};
const notFound = () => import('./pages/not-found.js');

// Pin <head> URLs (stylesheets, icon) to absolute: they're written relative to
// the page's folder, and the router tidies the address bar (/about/ → /about),
// after which the browser would re-resolve them against the wrong folder.
document.querySelectorAll('head link[href]').forEach((el) => el.setAttribute('href', el.href));

initCursor();
const nav = new Nav(document.getElementById('site-nav'));
const sidebar = new Sidebar();
const transition = new RouteTransition(document.getElementById('route-transition'));
const announcer = document.getElementById('route-announcer');

/** Light up a nav station. `key` is a route path ('/about') or a section of one ('/#work'). */
const setActive = (key) => {
  nav.setActive(key);
  sidebar.setActive(key);
};

const router = new Router({
  pages,
  notFound,
  transition,
  redirects,
  // Pages with sections (Home → Work) call setActive as the visitor scrolls.
  context: { setActive },
  outlet: document.getElementById('main'),
  onChange: ({ path, initial }) => {
    const section = routes.find((x) => x.path === path + location.hash);
    setActive(section ? section.path : path);
    sidebar.close({ restoreFocus: false });
    if (!initial) {
      const r = section || routes.find((x) => x.path === path);
      announcer.textContent = r ? `${r.label} page` : 'Page not found';
    }
  },
});

// Never leave the page hidden: the nav (and the Home fade-in) wait for
// .is-ready, so set it even if the first render fails.
const ready = () => document.documentElement.classList.add('is-ready');
setTimeout(ready, 4000);
router.start().catch((e) => { console.error(e); }).finally(ready).then(() => {
  // Warm the other pages so the transition midpoint never waits on the network.
  const warm = () => Object.values(pages).forEach((load) => load().catch(() => {}));
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
  else setTimeout(warm, 1500);
});

// Exposed for the local test harness only.
window.__sayf = { router, nav, transition, sidebar };
