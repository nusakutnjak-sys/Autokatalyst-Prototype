# Autokatalyst — website

The Autokatalyst marketing site, migrated from the Claude Design export and rebuilt to the
Povio Webflow design rules (`povio-webflow-design`, v1.3.0). Plain HTML, CSS and JavaScript:
no framework, no bundler, no dependencies.

The Webflow rebuild notes — variables, components, exceptions and deviations — are in
[`HANDOFF.md`](HANDOFF.md).

## Run it locally

```bash
npm run dev
```

Serves `public/` at http://localhost:5500 with the same clean URLs Vercel uses
(`/about` serves `about.html`). Node 18+ is the only requirement.

```bash
npm run check
```

Checks every page: links, in-page anchors and assets resolve; no inline styles; one `<h1>`
per page; nav and footer identical everywhere; no literal colours or image `url()`s in
`style.css`; and every `var()` points at a variable that exists. Vercel runs this as the
build step, so a broken link or a mistyped variable fails the deploy instead of shipping.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, **Add New → Project** and import the repository.
3. Leave the settings as detected — `vercel.json` sets everything: no framework, build
   command `npm run build` (the check), output directory `public`, clean URLs.
4. Deploy.

## Structure

```
public/                  the deployed site
  *.html                 one file per page
  css/tokens.css         the variables — Webflow's Variables panel, re-valued for Autokatalyst
  css/core.css           stand-in for the Povio core template's base and u-* utilities
  css/style.css          the one site stylesheet, in page and section order
  js/script.js           behaviour: GSAP motion, interactions, Barba page transitions
  fonts/                 self-hosted HW Cigars (trial) and Geist, with licences
  images/                WebP images and SVGs
scripts/serve.mjs        local static server
scripts/check.mjs        the build check
vercel.json              Vercel configuration
HANDOFF.md               Webflow rebuild notes
```

`_reference/` and the two `.zip` files are the Claude Design source. They stay on your
machine for side-by-side comparison and are git-ignored. In Claude Code, the `original`
preview in `.claude/launch.json` serves the export at http://localhost:5501.

## Working on the site

- **Styling** lives in `css/style.css` only, as readable single-class rules bound to the
  variables in `css/tokens.css`. No `style=""`, no `<style>` blocks, no styles from
  JavaScript (GSAP's runtime animation values excepted).
- **Utilities first**: layout, gaps, text styles and weights come from the `u-*` classes in
  `css/core.css`. Never restyle a `u-*` class; add a component class instead.
- **Class names** follow `[section]_[element]`, with `is-*` combo classes for variants and
  states.
- **Text** carries one `u-text-style-*` role plus a weight utility. The roles, their sizes and
  the few exceptions are listed in `HANDOFF.md`.
- **Responsive** overrides sit at the Webflow breakpoints (991 / 767 / 479px), under each
  section's base rules.
- **Behaviour** is one `init…()` function per component in `js/script.js`, wired with
  `data-*` attributes and re-run after every page transition.
- **Nav, footer and the closing CTA** are repeated in every page file, as they would be
  component instances in Webflow; `npm run check` fails if the nav or footer drift apart.

## Before launch

- **HW Cigars is a trial font.** License it and replace `fonts/HWCigarsTRIAL-Regular.ttf`.
- **The contact form is not wired.** Submitting is held so the static site never posts
  anywhere; connect a form service, or use Webflow's native form after the rebuild.
- **Placeholder pages** (`/placeholder?p=…`) stand in for pages not designed yet.
- Add a social sharing image and the production domain (see `HANDOFF.md` → Page metadata).
