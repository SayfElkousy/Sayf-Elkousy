# Sayf Elkousy — personal site

A dark, cinematic, hand-built site. No framework, no build step, no dependencies.

## Run locally

```bash
python3 serve.py          # → http://localhost:8000
python3 serve.py 8001     # another port, if 8000 is taken
```

`serve.py` behaves like a static host: `/about`, `/play` load directly, `/work` redirects to `/#work`, unknown paths get the 404 page.
No Node or npm needed. In VS Code, **F5** starts the server and opens Chrome (`.vscode/launch.json` + `tasks.json`).
Don't open `index.html` from Finder (`file://`) — ES modules and the root-absolute `/assets/…` paths need a server.

## Test

With the server running:

- **http://localhost:8000/tests/**: route suite. It covers direct loads, the `/work` → `/#work` redirect, Home ↔ Work in-page scrolling (no transition) and scroll-aware nav state, clicks, Back/Forward, rapid-click stacking, Back during a transition, 404s, focus, titles, the Contact sidebar, the PSO visual's start/pause, and uncaught errors. The page title turns to `PASS` or `FAIL`.
- **http://localhost:8000/tests/styleguide.html**: the wordmark, color, and type specimens.
- **http://localhost:8000/tests/frame.html?src=/play&w=390&h=844**: any page rendered at an exact device size.

## Where to edit content

| What | File |
|---|---|
| Email / GitHub / LinkedIn (sidebar), resume toggle, subtitle, cursor on/off | `assets/js/data/site.js` |
| Selected work — one rounded card per achievement (Home, `/#work`) | `assets/js/data/work.js` |
| "What I'm involved in" map (Home, after Selected work) | `assets/js/data/experiences.js` |
| About article text, infobox facts, Thoth caption, portrait path (About) | `assets/js/data/about.js` — portrait goes at `assets/photos/portrait.jpg` |
| About illustrations (Thoth, chess knight) | `assets/js/components/illustrations.js` |
| Photos + hero video (Play) | `assets/js/data/photos.js` + files in `assets/photos/`, `assets/video/` |
| Travel map pins (Play) | `assets/js/data/travel.js` — one object per place |
| Resume PDF | `assets/resume/Sayf_Elkousy_Resume.pdf` |

Anything in `[BRACKETS]` (or a photo with `src: null`) is a placeholder and is **not rendered** —
sections with no real content simply don't appear, and show up once you fill them in.

### Adding an achievement

Add an object to `achievements` in `assets/js/data/work.js` (`title`, `description`, and optionally
`organization`, `date`, `link`). Give it its own visual: write a module like
`assets/js/components/visuals/pso-search-space.js` exporting `{ markup(), mount(el) → cleanup }`,
register it in `visuals` in `assets/js/components/achievement.js`, and set `visual: '<key>'`.
With `visual: null` the card renders as text only.

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
                           resume-viewer, travel-map, photo-canvas, photo-lightbox, next-stops, site-end, illustrations
assets/js/components/visuals/  pso-search-space (cube, projection, input, loop) · penguin-swarm (penguin SVG + PSO/flocking)
assets/js/data/world-map.js  generated map geometry (tools/bake_world_map.py, Natural Earth 110m)
assets/js/components/city/ city-hero (orchestrator), skyline, atmosphere, rain, lightning, searchlight
assets/js/pages/           home (city → #work → more), about, play, not-found

Navigation: HOME is `/`, WORK is `/#work` (a section of Home — reached by smooth scroll, never the route
transition; the nav lights HOME or WORK by scroll position), ABOUT and PLAY are routes. **Contact** (left of
the nav, beside the wordmark) opens the sidebar.
```

## Deploying

Upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages at a root domain). The generated route folders mean you need no rewrite rules. Asset paths are root-absolute (`/assets/…`), so the site must be served from a domain root, not a subpath.
