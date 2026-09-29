/* ==========================================================================
   EXPERIENCES — the "Right now" map on Home.

   ⚠ ALL ENTRIES ARE PLACEHOLDERS except the sports themselves (soccer,
   basketball, pickleball are real interests). Replace [BRACKETS] with real
   organizations, roles, years, and descriptions. Nothing here was invented.

   Fields
     id        unique
     district  tech | policy | business | community | sport
     org       organization / activity name        (collapsed state)
     role      your role                            (collapsed state)
     year      '2024–now', '2023', …                (collapsed state)
     desc      1–3 sentences                        (expanded)
     skills    short list                           (expanded)
     image     'assets/img/…' or null              (expanded)
     link      { label, href } or null              (expanded)
     related   ids of connected experiences (draws a line on the map)
     at        [x, y] position on the map, 0–1000 × 0–640
   ========================================================================== */

export const districts = [
  { id: 'tech',      label: 'Tech',      index: 'A', poly: '40,36 440,36 440,300 300,300 300,330 40,330', labelAt: [60, 300] },
  { id: 'policy',    label: 'Policy',    index: 'B', poly: '490,36 960,36 960,230 700,230 700,262 490,262', labelAt: [510, 236] },
  { id: 'business',  label: 'Business',  index: 'C', poly: '480,300 770,300 770,604 560,604 480,540', labelAt: [498, 590] },
  { id: 'community', label: 'Community', index: 'D', poly: '40,372 340,372 340,356 440,356 440,604 40,604', labelAt: [58, 590] },
  { id: 'sport',     label: 'Sport',     index: 'E', poly: '806,268 960,268 960,604 806,604', labelAt: [822, 590] },
];

const TBD = '[PLACEHOLDER — one or two sentences: what you do here, and why it matters to you.]';

export const experiences = [
  { id: 'tech-1', district: 'tech', org: '[ORGANIZATION]', role: '[ROLE]', year: '[YEAR]', desc: TBD, skills: ['[SKILL]', '[SKILL]'], image: null, link: null, related: ['biz-1'], at: [118, 108] },
  { id: 'tech-2', district: 'tech', org: '[PROJECT / CLUB]', role: '[ROLE]', year: '[YEAR]', desc: TBD, skills: ['[SKILL]'], image: null, link: null, related: ['policy-1', 'com-1'], at: [300, 212] },
  { id: 'policy-1', district: 'policy', org: '[ORGANIZATION]', role: '[ROLE]', year: '[YEAR]', desc: TBD, skills: ['[SKILL]'], image: null, link: null, related: ['biz-2'], at: [590, 120] },
  { id: 'biz-1', district: 'business', org: '[ORGANIZATION]', role: '[ROLE]', year: '[YEAR]', desc: TBD, skills: ['[SKILL]'], image: null, link: null, related: [], at: [548, 372] },
  { id: 'biz-2', district: 'business', org: '[VENTURE / PROGRAM]', role: '[ROLE]', year: '[YEAR]', desc: TBD, skills: ['[SKILL]'], image: null, link: null, related: ['com-1'], at: [640, 486] },
  { id: 'com-1', district: 'community', org: '[ORGANIZATION]', role: '[ROLE]', year: '[YEAR]', desc: TBD, skills: ['[SKILL]'], image: null, link: null, related: [], at: [150, 452] },
  { id: 'soccer', district: 'sport', org: 'Soccer', role: '[POSITION]', year: '[YEARS]', desc: '[PLACEHOLDER — where and how you play.]', skills: [], image: null, link: null, related: ['basketball'], at: [826, 318] },
  { id: 'basketball', district: 'sport', org: 'Basketball', role: '[POSITION]', year: '[YEARS]', desc: '[PLACEHOLDER — where and how you play.]', skills: [], image: null, link: null, related: ['pickleball'], at: [826, 416] },
  { id: 'pickleball', district: 'sport', org: 'Pickleball', role: '[CONTEXT]', year: '[YEARS]', desc: '[PLACEHOLDER — who you play with.]', skills: [], image: null, link: null, related: [], at: [826, 510] },
];
