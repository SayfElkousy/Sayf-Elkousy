/* ==========================================================================
   WORK DATA — Selected Work on Home (/#work).

   The website tells the strongest story; the résumé PDF (Contact → Resume)
   keeps the full detail. Every fact here comes from that résumé.

   ACTIVITIES — one object per card, rendered in order by
   components/achievement.js. Every card shares one structure:
     VISUAL | label · title · organization · dates · location · description

     id            unique; also the anchor ('/#soccer')
     title         the project name, or the role
     organization  string, or an array of lines
     dates, location, tools   optional
     description   one strong paragraph
     visual        an interactive visual (only 'pso'); otherwise the card
                   shows its photographs
     images        0, 1 or 2 photos, first = main:
                     src     the original file in /assets/photos/ (exact name — case matters)
                     web     optional base name of the downsized copies in
                             /assets/photos/web/ (<web>-1600.jpg, <web>-800.jpg);
                             the browser picks the lightest one that looks sharp
                     w, h    the original's pixel size (the second photo keeps its shape)
                     alt     what's in the photo
                     pos     optional crop focus for the main photo, e.g. '62% 35%'
                   0 photos → a quiet "Photo coming soon" panel
                   1 photo  → it fills the visual side
                   2 photos → the first fills it; the second sits in a pane
                              docked into a corner, uncropped
     insetCorner   optional: 'bl' (default) or 'tr' — which corner the second
                   photo's pane docks into (move it off faces)
   ========================================================================== */

export const achievements = [
  {
    id: 'pso',
    title: 'Particle Swarm Optimization in Quantum Engineering',
    organization: 'QuERY Engineering Program',
    tools: ['Python', 'NumPy'],
    description: 'Built a Particle Swarm Optimization simulation that models 100+ particles converging on a solution, demonstrating PSO as a heuristic, derivative-free approach to quantum engineering problems not suited to calculus-based optimization.',
    visual: 'pso',
    images: [], // optional: one photo here appears as a small pane over the cube
  },
  {
    id: 'soccer',
    title: 'Starter & Captain',
    organization: ['Bellaire High School Varsity Soccer', 'Rise Soccer Club ECNL / MLS NEXT'],
    dates: 'September 2021 – June 2026',
    location: 'Houston, TX',
    description: 'Captained and started for Bellaire High School Varsity Soccer while competing with Rise Soccer Club in ECNL and MLS NEXT. Ranked #19 in Texas for Boys 2008 by PrepSoccer, selected as a 2023 MLS NEXT All-Star, and invited to four U.S. Youth National Team trials. I also earned First Team All-District honors twice, All-Academic recognition, and helped Bellaire win a 6A HISD District title.',
    images: [
      { src: 'assets/photos/captain.jpg', web: 'captain', w: 5204, h: 3469, pos: '66% 35%',
        alt: 'Three Bellaire players in red kits on the field at night; number 10 wears the captain’s armband.' },
    ],
  },
  {
    id: 'sports-science',
    title: 'Founder & President',
    organization: 'Sports Science Club',
    dates: 'September 2024 – June 2026',
    location: 'Houston, TX',
    description: 'Founded and grew a 60-member Sports Science Club focused on the intersection of athletics, training, and science. I recruited professional weightlifters and trainers to lead lectures and hands-on sessions for 40+ students, and helped raise $300+ for the Challenged Athletes Foundation through a pickleball tournament and social events.',
    images: [
      { src: 'assets/photos/sportsscience.jpg', web: 'sportsscience', w: 6449, h: 4299, pos: '50% 62%',
        alt: 'Sports Science Club members lined up arm in arm on an outdoor court.' },
      { src: 'assets/photos/science.jpg', web: 'science', w: 1400, h: 1692,
        alt: 'Students at desks in a classroom during a club session, with a presentation on the screen.' },
    ],
    insetCorner: 'tr', // the team fills the lower half; the pane sits over the sky
  },
  {
    id: 'fajr',
    title: 'Volunteer & Community Organizer',
    organization: 'Fajr Scientific',
    dates: 'September 2023 – August 2026',
    location: 'Houston, TX',
    description: 'Supported two medical missions that enabled 300+ surgeries by organizing patient data, surgical schedules, and equipment. I also helped raise $2M toward rebuilding infrastructure in war-affected regions and supported major fundraising events and medical-mission logistics.',
    images: [
      { src: 'assets/photos/Fajr.jpg', web: 'fajr', w: 1086, h: 1448, pos: '50% 22%',
        alt: 'Two people standing beside a FAJR Global banner at a fundraising event.' },
      { src: 'assets/photos/fajrsurgicalcare.jpg', w: 447, h: 447,
        alt: 'A clinician and a family member walking beside a young patient on a hospital stretcher.' },
    ],
  },
  {
    id: 'eas',
    title: 'Officer — Youth Leaders & Volunteer Branches',
    organization: 'Egyptian American Society (EAS)',
    dates: 'September 2024 – August 2026',
    location: 'Houston, TX',
    description: 'Helped lead volunteer and youth programming for the Egyptian American Society, coordinating five food distributions that served 1,000+ meals and 200+ care packages while leading teams of up to 20 volunteers. I also helped organize events for 75+ youth members and distributed gifts to 30+ refugee families during major holidays.',
    images: [
      { src: 'assets/photos/EAS.jpg', web: 'eas', w: 1406, h: 1666, pos: '50% 30%',
        alt: 'EAS youth volunteers behind a table of packed care bags.' },
      { src: 'assets/photos/Dabke.jpg', web: 'dabke', w: 1402, h: 1674,
        alt: 'Four students in traditional embroidered Dabke outfits in a school hallway.' },
    ],
  },
  {
    id: 'amaanah',
    title: 'Assistant Coach',
    organization: 'AMAANAH Refugee Organization',
    dates: 'October 2023 – August 2026',
    location: 'Houston, TX',
    description: 'Helped provide free soccer instruction and equipment to 100+ students at low-income schools and co-led a free clinic for 30+ children at the Refugee Day Festival. As an assistant coach for AMAANAH’s 40+ player refugee men’s team, I helped run practices as the team earned promotion to a higher league.',
    images: [], // add a photo: { src: 'assets/photos/amaanah.jpg', w: …, h: …, alt: '…' }
  },
];

/* RESEARCH — editorial, after the cards. PDFs live in /assets/docs/Research/. */
export const research = {
  title: 'Research Intern',
  organization: 'Fondren Orthopedic Research Institute',
  dates: 'January 2025 – July 2025',
  location: 'Houston, TX',
  description: 'Conducted orthopedic outcomes research at Fondren Orthopedic Research Institute, contributing to multiple clinical studies and publications. I analyzed a year of patient outcomes showing a 25% improvement in post-operative satisfaction following structured pre-operative education, taught 60+ University of Houston medical students, and co-authored a 162-patient shoulder-replacement study in Seminars in Arthroplasty: JSES examining differences in meaningful clinical improvement.',
  entries: [
    {
      kind: 'Case report',
      title: 'Endoscopic Management of Calcific Tendinopathy in the Proximal Hamstring: Two Case Reports',
      venue: 'Case Reports in Orthopedics · 2026',
      role: 'Co-author',
      pdf: 'assets/docs/Research/calcific-tendinopathy-case-report-2026.pdf',
    },
    {
      kind: 'Outcomes study',
      title: 'The Influence of Insurance Type on Achievement of Patient-Reported Outcome Thresholds in Anatomic and Reverse Shoulder Arthroplasty',
      venue: 'Seminars in Arthroplasty: JSES · 2026',
      role: 'Co-author · 162 patients',
      pdf: 'assets/docs/Research/shoulder-arthroplasty-insurance-outcomes-2026.pdf',
    },
    {
      kind: 'Fajr Scientific',
      title: 'Sports Medicine in Medical Missions',
      venue: 'A paper evaluating the utility of sports medicine within medical missions to underserved and conflict-affected regions.',
      role: null,
      pdf: null, // no final PDF yet — see README
    },
  ],
};

/* TECHNICAL SKILLS — a compact reference. No proficiency meters. */
export const skills = [
  ['Languages', ['Python', 'Java', 'HTML', 'CSS']],
  ['Frameworks / Libraries', ['NumPy', 'Pandas', 'PyTorch']],
  ['Developer Tools', ['Google Colab', 'Video Editing Software', 'Git', 'Claude Code']],
];
