# Sayf Elkousy — personal site

A dark, cinematic, hand-built site. No framework, no build step, no dependencies.

## Run locally

```bash
python3 serve.py          # → http://localhost:8000
python3 serve.py 8001     # another port, if 8000 is taken
```

`serve.py` behaves like a static host: `/about`, `/play` load directly, `/work` redirects to `/#work`, unknown paths get the 404 page.
No Node or npm needed. In VS Code, **F5** starts the server and opens Chrome (`.vscode/launch.json` + `tasks.json`).
Don't open `index.html` from Finder (`file://`) — ES modules need a server.

To see it exactly as GitHub Pages serves it (in a sub-folder, case-sensitive file names, `404.html` for
missing paths, no fallback):

```bash
python3 serve.py --base=/Sayf_Website/   # → http://localhost:8000/Sayf_Website/  (tests: …/Sayf_Website/tests/)
```

## Test

With the server running:

- **http://localhost:8000/tests/**: route suite. It covers direct loads, the `/work` → `/#work` redirect, Home ↔ Work in-page scrolling (no transition) and scroll-aware nav state, clicks, Back/Forward, rapid-click stacking, Back during a transition, 404s, focus, titles, the Contact sidebar, the PSO visual's start/pause, and uncaught errors. The page title turns to `PASS` or `FAIL`.
- **http://localhost:8000/tests/styleguide.html**: the wordmark, color, and type specimens.
- **http://localhost:8000/tests/frame.html?src=/play&w=390&h=844**: any page rendered at an exact device size.

## Where to edit content

| What | File |
|---|---|
| Email / LinkedIn / GitHub / Resume (Contact sidebar), subtitle, cursor on/off | `assets/js/data/site.js` |
| Résumé PDF (opened from Contact → Resume) | `assets/docs/sayf-elkousy-resume.pdf` |
| Selected work cards, Research, Technical Skills (Home, `/#work`) | `assets/js/data/work.js` |
| Work photos | originals in `assets/photos/` (exact names, case matters) + downsized copies in `assets/photos/web/` (`<name>-1600.jpg`, `<name>-800.jpg`, made with `sips -Z`); list them in `images:` in `data/work.js` |
| Research PDFs | `assets/docs/Research/` — linked from `research.entries` in `data/work.js` |
| Education (About) | `assets/js/data/about.js` → `education` |
| "What I'm involved in" map (Home, after Selected work) | `assets/js/data/experiences.js` |
| About article text, infobox facts, Thoth caption, portrait path (About) | `assets/js/data/about.js` — portrait goes at `assets/photos/professional-portrait.jpg` |
| About illustrations (Thoth, chess knight) | `assets/js/components/illustrations.js` |
| Photos + hero video (Play) | `assets/js/data/photos.js` + files in `assets/photos/`, `assets/video/` |
| Travel map pins (Play) | `assets/js/data/travel.js` — one object per place |
| Resume PDF | `assets/resume/Sayf_Elkousy_Resume.pdf` |

Anything in `[BRACKETS]` (or a photo with `src: null`) is a placeholder and is **not rendered** —
sections with no real content simply don't appear, and show up once you fill them in.

### Adding a Work activity

Add an object to `achievements` in `assets/js/data/work.js` (`title`, `organization`, `dates`, `location`,
`description`) with `images: []` holding 0, 1 or 2 photos (`{ src, web, w, h, alt, pos }` — see the comment
at the top of that file). 0 photos shows a quiet placeholder panel, 1 fills the visual side, 2 adds a docked
pane for the second photo. Only PSO has an interactive visual (`visual: 'pso'`).

## Structure

```
index.html                 shell (source of truth for <head>)
about/ play/ 404.html      generated shells → run `python3 tools/build_routes.py` after editing index.html <head>
work/index.html            generated redirect page (/work → /#work); same tool
assets/css/                tokens · base · components · nav · sidebar · transition · cursor · home · work (Selected
                           work + achievement card + resume) · pso · about · play
assets/js/main.js          wires router, nav, sidebar, transition, cursor
assets/js/core/            router (incl. redirects + in-page sections), reveals, scramble, utils
assets/js/components/      nav, sidebar, wordmark, route-transition, cursor, achievement, experience-explorer,
                           travel-map, photo-canvas, photo-lightbox, next-stops, site-end, illustrations
assets/js/components/visuals/  pso-search-space + penguin-swarm (the PSO card's interactive visual)
assets/js/data/world-map.js  generated map geometry (tools/bake_world_map.py, Natural Earth 110m)
assets/js/components/city/ city-hero (orchestrator), skyline, atmosphere, rain, lightning, searchlight
assets/js/pages/           home (city → #work → more), about, play, not-found

Navigation: HOME is `/`, WORK is `/#work` (a section of Home — reached by smooth scroll, never the route
transition; the nav lights HOME or WORK by scroll position), ABOUT and PLAY are routes. **Contact** (left of
the nav, beside the wordmark) opens the sidebar.
```

## Deploying

Upload the folder to any static host. It works from a domain root (Netlify, Cloudflare Pages, a custom
domain) **and** from a sub-folder (GitHub Pages project sites: `https://<user>.github.io/<repo>/`) with
no configuration:

- HTML shells use relative paths for their own depth (`assets/…`, `../assets/…`); run
  `python3 tools/build_routes.py` after editing `index.html` `<head>`.
- JavaScript finds the site folder from its own URL (`assets/js/core/base.js`) and builds every link and
  asset URL from it — so write data paths as `assets/…` (no leading `/`) and route paths as `/about`.
- `404.html` locates the site folder itself before loading anything (GitHub Pages serves it at any depth).
- `.nojekyll` tells GitHub Pages to publish the files as they are.
- File names are case-sensitive on the host: `Fajr.jpg` ≠ `fajr.jpg`.

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / `(root)`.
