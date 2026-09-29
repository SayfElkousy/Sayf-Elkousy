/* ==========================================================================
   SITE DATA — global facts and links.
   Anything in [BRACKETS] is a placeholder and is hidden from visitors.
   ========================================================================== */

export const site = {
  name: 'Sayf Elkousy',
  nameAr: 'سيف',

  // Custom cursor on desktop (auto-disabled on touch + reduced motion).
  customCursor: true,

  // Quiet subtitle under the hero signal, repeated in the sidebar.
  subtitle: 'Computer Science × Healthcare × Business',

  // Contact — shown in the sidebar (Contact, top left). Entries with `href: null` are hidden.
  // `newTab: true` opens a same-site file (the résumé PDF) in a new tab instead of navigating.
  contact: [
    { label: 'Email', value: 'sayfelkousy@gmail.com', href: 'mailto:sayfelkousy@gmail.com' },
    { label: 'LinkedIn', value: 'sayf-elkousy-9b5aba29b', href: 'https://www.linkedin.com/in/sayf-elkousy-9b5aba29b' },
    { label: 'GitHub', value: 'SayfElkousy', href: 'https://github.com/SayfElkousy' },
    { label: 'Resume', value: 'PDF', href: 'assets/docs/sayf-elkousy-resume.pdf', newTab: true },
  ],
};

/* Routes. `blurb` is the one-line description used in "Next" links.
   Work is a section of Home (/#work), not its own page; the old /work URL
   redirects there (see `redirects` below and tools/build_routes.py). */
export const routes = [
  { path: '/',      label: 'Home',  index: '01', blurb: 'Start here',                title: 'Sayf Elkousy' },
  { path: '/#work', label: 'Work',  index: '02', blurb: 'Selected work',             title: 'Sayf Elkousy' },
  { path: '/about', label: 'About', index: '03', blurb: 'Background and story',      title: 'About — Sayf Elkousy' },
  { path: '/play',  label: 'Play',  index: '04', blurb: 'Sport, travel, photographs', title: 'Play — Sayf Elkousy' },
];

/* Old URLs → where they live now. Applied by the router before rendering. */
export const redirects = {
  '/work': '/#work',
};
