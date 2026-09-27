/* ==========================================================================
   ABOUT DATA — one short article, in Sayf's own words.

   The copy below is Sayf's, lightly edited for rhythm only. Keep it in his
   voice: first person, specific, no résumé language.

   Inline links: write [label](/path) inside a paragraph. Only link to pages
   that exist.
   ========================================================================== */

// ---- Portrait (infobox, top right of the article) ----
// To add the professional photo: save it as /assets/photos/portrait.jpg
// (portrait orientation, ~4:5, ~1200px tall is plenty) and set src below.
// While src is null, a designed "Professional portrait — coming soon"
// placeholder is shown in the same spot.
export const portrait = {
  src: null, // → '/assets/photos/portrait.jpg'
  alt: 'Sayf Elkousy',
};

// ---- Infobox facts (all from the article below) ----
export const facts = [
  ['Born', 'Houston, Texas'],
  ['Family', 'Egyptian and Libyan'],
  ['Languages', 'Arabic, English'],
  ['Exploring', 'Software engineering, tech entrepreneurship'],
  ['Music', 'Piano and violin'],
];

// ---- The article ----
export const sections = [
  {
    id: 'background',
    title: 'Background',
    paras: [
      'I was born and raised in Houston, Texas. My parents are Egyptian and Libyan, so I grew up in a bilingual household speaking both Arabic and English. I’ve visited Egypt twice and hope to study abroad in an Arab country at some point.',
    ],
    after: ['[See where else I’ve been →](/play#travel)'],
  },
  {
    id: 'exploring',
    title: 'What I’m Exploring',
    paras: [
      'I’m broadly interested in technology and am currently exploring software engineering and tech entrepreneurship. I’m not committed to any one academic field yet, but I’m especially drawn to projects and internship opportunities that are:',
    ],
    criteria: [
      ['Impact-Driven', 'Work that has a clear purpose or creates meaningful value.'],
      ['Collaborative', 'I enjoy working with other people and being part of a team.'],
      ['Eclectic', 'Projects that bring together ideas from multiple academic disciplines.'],
    ],
    after: ['[Selected work →](/#work)'],
  },
  {
    id: 'outside',
    title: 'Outside of Academics',
    paras: [
      'I’m more of an athlete-student (I do not play a varsity sport): outside of academics, I enjoy playing soccer with friends, joining pickup basketball games, and lifting weights on a push-pull-SKIP LEGS rotation.',
      'Music has also been a big part of my life. I’ve played piano and violin since first grade and listen to a lot of classical music. I also dance Dabke, a traditional Arab folk dance commonly performed at weddings and celebrations.',
    ],
  },
];

// Exact wording — keep as written.
export const thothCaption = 'This is the God of Wisdom, Thoth, my favorite ancient Egyptian god. I have a small statue of him in my room!';
