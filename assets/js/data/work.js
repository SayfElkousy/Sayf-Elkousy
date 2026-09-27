/* ==========================================================================
   WORK DATA — Selected work on Home (/#work).

   One object per achievement, rendered in order by components/achievement.js
   as a single rounded card: VISUAL | label · title · description · details.

   Fields
     id            unique, used for anchors ('/#pso')
     title         required
     description   required — rendered exactly as written
     visual        key of a visual in components/achievement.js (`visuals`).
                   Each project gets its own; don't reuse one for an
                   unrelated project. null → the card renders without a visual.
     label         optional small kicker; defaults to 'Selected work / 0N'
     organization  optional
     date          optional ('2025', 'Summer 2024', …)
     link          optional { label, href }

   Leave optional fields out (or null) rather than guessing. Anything in
   [BRACKETS] is treated as a placeholder and not shown.
   ========================================================================== */

export const achievements = [
  {
    id: 'pso',
    title: 'Particle Swarm Optimization in Quantum Engineering',
    description: 'Built a Particle Swarm Optimization simulation that models 100+ particles converging on a solution, demonstrating PSO as a heuristic, derivative-free approach to quantum engineering problems not suited to calculus-based optimization.',
    visual: 'pso',
    organization: null,
    date: null,
    link: null,
  },
];
