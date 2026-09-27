/* ==========================================================================
   SayfWordmark
   The typographic identity. Two arrangements:

   stack    SAYF             ▪
            ─────────────
            ELKOUSY      سيف

   line     SAYF ELKOUSY │ سيف     (navigation / small sizes, HTML text)

   SAYF and ELKOUSY are forced to the same measure with SVG textLength
   (spacing only — glyphs are never stretched). The Arabic is never tracked,
   stretched, or split: it is set as one RTL run in a Kufi face.
   ========================================================================== */

const W = 520;
const H = 284;

/**
 * @param {object} o
 * @param {'fill'|'outline'} [o.mode]   fill = solid letters, outline = stroked letters
 * @param {boolean} [o.pip]             show the tiny red status pip
 * @param {boolean} [o.rule]            show the blue hairline between the lines
 * @param {boolean} [o.ar]              include the Arabic signature
 * @param {string}  [o.className]
 * @param {string}  [o.title]           accessible name; omit for decorative copies
 */
export function wordmarkStack(o = {}) {
  const { mode = 'fill', pip = true, rule = true, ar = true, className = '', title = '' } = o;
  const paint = mode === 'outline'
    ? 'fill="none" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"'
    : 'fill="currentColor"';
  const a11y = title
    ? `role="img" aria-label="${title}"`
    : 'aria-hidden="true" focusable="false"';

  return `
<svg class="wordmark wordmark--stack ${className}" viewBox="0 0 ${W} ${H}" ${a11y} xmlns="http://www.w3.org/2000/svg">
  <g ${paint}>
    <text x="-2" y="166" textLength="362" lengthAdjust="spacing"
      font-family="Big Shoulders Display, Arial Narrow, sans-serif" font-weight="800" font-size="198">SAYF</text>
    <text x="0" y="280" textLength="360" lengthAdjust="spacing"
      font-family="Big Shoulders Display, Arial Narrow, sans-serif" font-weight="700" font-size="98">ELKOUSY</text>
  </g>
  <!-- Arabic is always filled: outlining Kufi contours exposes overlapping joins -->
  ${ar ? `<text x="518" y="272" text-anchor="end" lang="ar" fill="currentColor"
    font-family="Reem Kufi, Geeza Pro, sans-serif" font-weight="500" font-size="66">سيف</text>` : ''}
  ${rule ? `<rect class="wm-rule" x="0" y="183" width="360" height="2.5" fill="var(--wm-rule, #2b63ff)" />
  <rect class="wm-rule" x="382" y="196" width="2" height="84" fill="var(--wm-rule, #2b63ff)" opacity="0.7" />` : ''}
  ${pip ? `<rect class="wm-pip" x="374" y="4" width="10" height="10" fill="var(--wm-pip, #ff304f)" />` : ''}
</svg>`;
}

/** One-line HTML lockup — crisp at small sizes, used in navigation. */
export function wordmarkLine({ className = '' } = {}) {
  return `
<span class="wordmark wordmark--line ${className}">
  <span class="wm-en">SAYF<span class="wm-gap"></span>ELKOUSY</span>
  <span class="wm-bar" aria-hidden="true"></span>
  <span class="wm-ar ar" lang="ar">سيف</span>
</span>`;
}
