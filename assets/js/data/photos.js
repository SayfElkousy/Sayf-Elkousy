/* ==========================================================================
   PLAY MEDIA — the hero video and the photographs.

   ADD A PHOTO: put the file in /assets/photos/ (lowercase name, ~1800px on
   the long edge is plenty), then add one object to `photos` below.
     src       the file shown on the page
     full      optional larger file for the lightbox (defaults to src)
     width,    pixel size — the frame uses the photo's real proportions,
     height    so nothing is cropped or stretched
     group     which section it appears in (see `groups`)
     alt       what is visible in the photo, for screen readers
     location, year, caption, credit — all optional; empty = not shown

   Sections with no photos are simply not rendered, and each section
   recomposes itself for 1, 2, 3 or more photos. Nothing to delete.
   ========================================================================== */

export const heroVideo = {
  src: '/assets/video/play-hero.mp4',
  poster: null, // optional still, e.g. '/assets/photos/play-hero-poster.jpg' — used for reduced motion
  label: 'Looping video clip that opens the Play page',
};

// Order = order on the page. `word` is the large outlined word behind the section.
export const groups = [
  { id: 'sport',   label: 'My favorite soccer moment: scoring the game winner in second round of my high school team playoff run', word: 'Sport' },
  { id: 'friends', label: 'Friends',                    word: 'Friends' },
  { id: 'events',  label: 'Nights, events, everything else', word: 'Life' },
  { id: 'travel',  label: 'Elsewhere',                  word: 'Away' },
];

export const photos = [
  {
    id: 'elsik-goal',
    group: 'sport',
    src: '/assets/photos/elsikgoal-1800.jpg',
    full: '/assets/photos/elsikgoal.jpg',
    width: 3600,
    height: 2400,
    alt: 'Soccer players in white kits celebrating a goal together on a floodlit field at night.',
    location: null,
    year: null,
    caption: null,
    credit: 'Yuval Cohen Photography', // from the photo's own watermark/metadata
  },
  // { id: 'pickup', group: 'friends', src: '/assets/photos/pickup.jpg', width: 1800, height: 1200,
  //   alt: '…', location: '…', year: '…', caption: '…' },
];
