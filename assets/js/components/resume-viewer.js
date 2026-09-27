/* ==========================================================================
   ResumeViewer — the real PDF, large, when it exists.

   Desktop: an embedded viewer framed like a document on a light table,
            with OPEN PDF and DOWNLOAD.
   Mobile:  no squeezed iframe — a document card that opens the actual PDF.
   Until the PDF is supplied (site.resume.available = false), everything is
   an honest placeholder and the buttons are disabled.
   ========================================================================== */

import { site } from '../data/site.js';
import { esc, real } from '../core/utils.js';

export function resumeMarkup() {
  const r = site.resume;
  if (!r.available) return ''; // nothing to show until the PDF exists
  const file = r.url.split('/').pop();
  const btns = r.available
    ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener" data-external data-cursor="OPEN">Open PDF <span class="arrow">↗</span></a>
       <a class="btn" href="${esc(r.url)}" download data-cursor="OPEN">Download <span class="arrow">↓</span></a>`
    : `<span class="btn" aria-disabled="true">Open PDF <span class="arrow">↗</span></span>
       <span class="btn" aria-disabled="true">Download <span class="arrow">↓</span></span>`;

  const viewer = r.available
    ? `<iframe class="rv__frame" src="${esc(r.url)}#view=FitH" title="Sayf Elkousy — résumé (PDF)" loading="lazy"></iframe>
       <a class="rv__card" href="${esc(r.url)}" target="_blank" rel="noopener" data-external>
         <span class="rv__sheet" aria-hidden="true">${'<i></i>'.repeat(14)}</span>
         <span class="mono">Open the PDF <span aria-hidden="true">↗</span></span>
       </a>`
    : `<div class="rv__missing">
         <div class="rv__sheet" aria-hidden="true">${'<i></i>'.repeat(14)}</div>
         <div class="rv__missing-text">
           <p class="ph__label">[RESUME PDF — NOT YET PROVIDED]</p>
           <p class="mono muted">Drop the file at <span class="blue">${esc(r.url)}</span><br>then set <span class="blue">resume.available = true</span> in data/site.js</p>
         </div>
       </div>`;

  return `
    <section class="resume section" id="resume" aria-labelledby="rv-title">
      <div class="wrap grid">
        <div class="rv__head">
          <p class="mono section-index" data-reveal="fade">Document</p>
          <h2 id="rv-title" class="display rv__title" data-reveal="mask">Resume</h2>
          <dl class="rv__meta mono">
            <div><dt>File</dt><dd>${esc(file)}</dd></div>
            ${real(r.updated) ? `<div><dt>Updated</dt><dd>${esc(r.updated)}</dd></div>` : ''}
            <div><dt>Format</dt><dd>PDF</dd></div>
          </dl>
          <div class="rv__btns">${btns}</div>
        </div>
        <div class="rv__viewer" data-reveal="wipe">
          <div class="rv__bar mono" aria-hidden="true"><span>${esc(file)}</span><span>${r.available ? 'PDF' : 'AWAITING FILE'}</span></div>
          ${viewer}
        </div>
      </div>
    </section>`;
}
