/* 404 — a street that isn't on the map. */
import { siteEnd } from '../components/site-end.js';

export default {
  id: 'lost',
  title: 'Lost — Sayf Elkousy',
  render: () => `
    <section class="lost wrap page-top" aria-labelledby="lost-title">
      <p class="page-code mono"><span>404</span><span class="line"></span><span>${location.pathname.replace(/[<>&"]/g, '')}</span></p>
      <h1 id="lost-title" class="display lost__title">This street<br><span class="muted">doesn't exist.</span></h1>
      <p class="lead lost__lead">Try one of these instead:</p>
      <p class="lost__links mono">
        <a class="btn" href="/">Home <span class="arrow">→</span></a>
        <a class="btn" href="/#work">Work <span class="arrow">→</span></a>
        <a class="btn" href="/about">About <span class="arrow">→</span></a>
        <a class="btn" href="/play">Play <span class="arrow">→</span></a>
      </p>
    </section>
    ${siteEnd()}`,
  mount() {},
};
