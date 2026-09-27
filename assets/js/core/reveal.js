/* Scroll reveals. Elements opt in with [data-reveal="mask|wipe|fade|rise|line"]
   or [data-draw] (self-drawing annotations). Each fires once. */

export function initReveals(root) {
  // Measure self-drawing strokes so dash animation matches their real length.
  root.querySelectorAll('[data-draw]').forEach((svg) => {
    svg.querySelectorAll('path, line, polyline, ellipse').forEach((p) => {
      try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 2); } catch { /* not rendered yet */ }
    });
  });

  const targets = root.querySelectorAll('[data-reveal], [data-draw]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
    return () => {};
  }
  // Clipped elements (mask / wipe) have no visible area, so the observer
  // would never fire for them. Watch each element's unclipped parent instead.
  const watchers = new Map(); // observed node → targets it reveals
  targets.forEach((t) => {
    const clipped = t.dataset.reveal === 'mask' || t.dataset.reveal === 'wipe';
    const node = clipped ? t.parentElement : t;
    if (!watchers.has(node)) watchers.set(node, []);
    watchers.get(node).push(t);
  });
  const timers = [];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const el of watchers.get(e.target) || []) {
        const delay = parseInt(el.dataset.delay || '0', 10);
        if (delay) timers.push(setTimeout(() => el.classList.add('is-in'), delay));
        else el.classList.add('is-in');
      }
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  watchers.forEach((_, node) => io.observe(node));
  return () => { io.disconnect(); timers.forEach(clearTimeout); };
}
