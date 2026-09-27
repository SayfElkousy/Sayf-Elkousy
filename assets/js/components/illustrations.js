/* ==========================================================================
   Illustrations — small editorial line drawings for the About article.
   Inline SVG, drawn in currentColor so they sit in the site's palette;
   strokes use the shared annotation style (and self-draw with [data-draw]).
   ========================================================================== */

/** The chess knight — the About page's original drawing, unchanged. */
export function knightSVG() {
  return `
    <svg class="illo illo--knight" viewBox="0 0 90 120" aria-hidden="true" focusable="false" data-draw>
      <path d="M22 108 H 70 M 26 100 H 66 L 62 88 H 30 Z" />
      <path d="M32 88 C 34 70, 44 64, 38 56 C 30 58, 22 60, 18 52 C 16 44, 30 34, 34 24 C 36 18, 40 14, 44 16 C 62 20, 70 44, 62 88" />
      <path d="M40 22 L 36 12 L 46 17" /><path d="M30 38 h 0.1" />
    </svg>`;
}

/**
 * Thoth — an original line drawing of a standing ibis-headed figure on a
 * plinth (a statuette, like the one on Sayf's shelf): lunar disc above,
 * striated wig, broad collar, pleated kilt, striding pose, sceptre and ankh.
 * Thin engraved linework; the moon is the one blue element.
 */
export function thothSVG() {
  return `
    <svg class="illo illo--thoth" viewBox="0 0 160 220" aria-hidden="true" focusable="false" data-draw>
      <g class="illo__blue">
        <ellipse cx="81" cy="15" rx="9.5" ry="9.5" />
        <path d="M67 18 C 71 29, 91 29, 95 18" />
      </g>
      <!-- head + beak -->
      <path d="M72 42 C 71 33, 80 28, 87 31 C 90 32, 92 35, 92 38" />
      <path d="M92 38 C 106 42, 118 52, 126 68 C 114 57, 102 49, 89 46" />
      <path d="M85 36.5 h 0.1" />
      <!-- wig -->
      <path d="M72 40 C 66 50, 65 63, 69 74 L 87 74 C 85 63, 85 53, 89 45" />
      <path d="M75 45 C 73 55, 73 64, 74 73 M 80 47 C 79 56, 79 65, 80 73 M 85 48 C 84 57, 84 65, 85 73" />
      <!-- shoulders, collar, torso -->
      <path d="M56 80 C 66 75, 96 75, 106 80" />
      <path d="M61 79 C 68 92, 94 92, 101 79" />
      <path d="M65 84 C 72 96, 90 96, 97 84" />
      <path d="M56 80 C 58 94, 64 104, 67 114 M 106 80 C 103 94, 97 104, 95 114" />
      <!-- back arm + ankh -->
      <path d="M57 84 C 53 98, 53 108, 55 118" />
      <ellipse cx="55" cy="124" rx="3.2" ry="4.4" />
      <path d="M49 129 H 61 M 55 129 V 142" />
      <!-- front arm + sceptre -->
      <path d="M105 84 C 114 94, 120 100, 131 103" />
      <path d="M130 100 H 138 M 130 106 H 138" />
      <path d="M134 46 V 192 M 134 46 L 141 41 M 134 192 L 130 196 M 134 192 L 138 196" />
      <!-- kilt -->
      <path d="M66 114 H 96 L 101 142 H 61 Z" />
      <path d="M72 116 L 68 140 M 78 116 L 76 140 M 84 116 L 84 140 M 90 116 L 92 140" />
      <!-- striding legs -->
      <path d="M68 142 C 68 160, 69 176, 70 190 M 76 142 C 76 160, 76 176, 76 190 M 64 192 H 80" />
      <path d="M86 142 C 89 160, 93 176, 96 190 M 94 142 C 97 160, 101 176, 103 190 M 92 192 H 110" />
      <!-- plinth -->
      <path d="M46 196 H 144 V 206 H 46 Z M 40 206 H 150 V 214 H 40 Z" />
      <!-- catalogue scale -->
      <path d="M18 6 V 214 M 14 6 H 22 M 14 214 H 22 M 15 110 H 21" />
    </svg>`;
}
