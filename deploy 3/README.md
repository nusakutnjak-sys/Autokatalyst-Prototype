# Autokatalyst — static site

Plain static site: no build step, no dependencies.

## Deploy on Vercel
1. Push this folder's contents to a GitHub repository root.
2. In Vercel, import the repo. Framework preset: **Other**. Build command: none. Output directory: leave empty (root).
3. Deploy. `index.html` is the homepage (a copy of `homepage.html`, which the in-site links use).

## Structure
- `*.html` — pages
- `v5/styles.css` — site styles (Lumos naming, single-class selectors, rem units)
- `v2/motion.css`, `v2/motion/*.js` — motion tokens and modules
- `v5/motion-*.js` — per-section behaviour (Our Work carousel lives in `v5/motion-worktrack-dark.js`)
- `v2/main.js` — init
- `assets/` — images, icons, fonts

GSAP and Barba load from CDN at runtime.

## Notes
- Trial fonts (HW Cigars, LT Superior Serif) are included under `assets/fonts/`; license them before public launch.
