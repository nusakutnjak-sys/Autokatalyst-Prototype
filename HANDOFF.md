# Autokatalyst — Webflow handoff

Built to **Povio Webflow design v1.3.0 (21 September 2026)** from the Claude Design export
*Autokatalyst Claude Design V2*. The export is the visual source of truth; this build keeps
its design and restructures it on the Povio core template's variables, utilities and
components, so the Webflow rebuild is mechanical.

Token values here are read from the export. They are **not verified against a live Webflow
project** — confirm them when the site is created, and check the stand-in assumptions listed
under *Core template* below.

---

## 1. How the files map to Webflow

| File | In Webflow |
|---|---|
| `css/tokens.css` | The **Variables panel**. Re-value the existing variables, create the few marked *CREATE*, add the breakpoint modes. Not ported as code. |
| `css/core.css` | The **core template's** base styles and `u-*` utilities. Already on the site — do not port or recreate anything in it. |
| `css/style.css` | Every class, rebuilt natively in the **Style panel**. Blocks headed `EMBED` are the only CSS that becomes code (see §6). |
| `js/script.js` | **Global JS** (site-wide footer code). GSAP comes from Webflow's GSAP integration; Barba loads from jsDelivr. |
| `*.html` | Page structure, element types and classes. Nav, footer and the closing CTA are component instances. |

**Plugins to enable** in Webflow's GSAP integration: **ScrollTrigger** and **CustomEase**.
Nothing else. Don't also load GSAP from a CDN on the Webflow site; the `<script>` tags here
exist only so the static build runs.

---

## 2. Variables

### 2.1 Re-value — existing template variables

**Fonts** — `--_typography---font--primary` → **HW Cigars** (display, all titles);
`--font--secondary` → **Geist** (everything else); `--font--tertiary` → Geist (unused).
Upload `HWCigarsTRIAL-Regular` (licensed version) and `Geist-Variable` as custom fonts.

**Weights** — `title-normal` → **400** (the design sets titles in the regular cut). Others
keep their defaults: title-prominent-1 600, title-prominent-2 700, body-normal 400,
body-prominent-1 500, body-prominent-2 600.

**Colour**

| Variable | Value | Used for |
|---|---|---|
| `bg--default--bg` | `#ffffff` | Page ground |
| `bg--default--1` | `#f1f3d6` | Cream panel: domino bars, galaxy tiles, tile grounds, CTA large band |
| `bg--default--2` | `#ddd99b` | Khaki: galaxy tiles, CTA small band |
| `bg--inverted--bg` | `#0b0b0b` | Dark sections, footer, transition veil |
| `bg--inverted--1` | `#1b1b1c` | Specialize preview ground |
| `outline--default` | `rgba(11,11,11,.2)` | Hairlines on light |
| `outline--inverted` | `rgba(247,249,227,.2)` | Hairlines on dark |
| `text--default--1 / 2 / 3` | `#0b0b0b` / `rgba(11,11,11,.6)` / `rgba(11,11,11,.4)` | Ink / muted / faint |
| `text--inverted--1 / 2 / 3` | `#fefff1` / `#f7f9e3` / `rgba(254,255,241,.6)` | Cream / cream soft / cream muted |
| `text--brand--1` | `#a6a766` | Olive: case numbers and categories, Our Work meta |
| `interactive--primary` | on `#fefff1`, idle/hover/active `#0b0b0b` | Solid button |
| `interactive--secondary` | on `#0b0b0b`, idle/hover/active `#a6a766` | Olive button — **and every focus ring** |
| `interactive--outline` | on/idle/hover/active `#0b0b0b` | Ghost button on light |
| `interactive--outline-inverted` | on/idle/hover/active `#f7f9e3` | Ghost button on dark |
| `interactive--input` | on `#0b0b0b`, idle/hover/active `#f8f8f9`, on-disabled `rgba(11,11,11,.4)` | Form fields (on-disabled is also the placeholder) |

The design changes no colour on hover or press — the arrow swap is the feedback — so every
hover and active value equals idle. The states are bound, so a later design can change them in
one place. Disabled values are placeholders; the design has no disabled controls.

**Spacing** — the design's spacing is static, so every axis is re-valued to static values
(the template's are fluid clamps):

| Axis | Values |
|---|---|
| `gap` | 0 · 2xs .375 · xs .5 · sm 1 · md 1.5 · lg 2 · xl 2.5 · 2xl 3 · 3xl 5 (rem) |
| `inner` | 0 · xs .5 · sm 1 · md 1.5 · lg 2 · xl 2.5 · 2xl 3 |
| `margin` | 0 · xs .5 · **sm 1.5 — the page gutter** · md 2 · lg 3 · xl 5 |
| `section` | 0 · xs 2.5 · sm 5 · **md 7.5 → 5 → 3.5** · **lg 8.75 → 5 → 3.5** (desktop → tablet → portrait) |
| `static` | the template scale, unchanged |

**Container** — `--max-width--main` → **108rem** (1728px). Every section uses
`u-container-xl`; the two full-bleed blocks (case-study banner, featured insight) use
`u-container-0`. The page gutter is 1.5rem at every width.

**Radius** — unchanged. The design has no rounded corners; Button Main binds `--rounding--0`.

### 2.2 Typescale — the fifteen roles, re-valued

Sizes step at the breakpoints, as the design does: desktop → tablet (991) → mobile
landscape (767) → portrait (479). Display sizes scale with the viewport on desktop.

| Role | Font | Size | Line height | Tracking | Carries |
|---|---|---|---|---|---|
| headline-1 | HW Cigars | min(9rem, 8.47vw) → 5 → 3.5 → 3.5rem | 1 | −0.031em | Case and model numerals |
| headline-2 | HW Cigars | min(6.25rem, 5.82vw) → 4 → 2.75 → 2.25rem | 0.9 | −0.034em | Page titles, statements, figures, CTA |
| title-1 | HW Cigars | min(5.125rem, 4.76vw) → 3.25 → 2.25 → 2.25rem | 1.1 | −0.0417em | Work title, Our Work titles |
| title-2 | HW Cigars | 3 → 2.25 → 1.75 → 1.75rem | 1.1 | −0.0417em | Section titles, specialize list, case titles, galaxy |
| title-3 | HW Cigars | 2.5 → 2.5 → 2.5 → 2rem | 1.2 | −0.02em | Case-study outcome |
| title-4 | Geist | 1.625 → 1.375rem | 1.3 | −0.01em | Card and row titles, figures |
| title-5 | Geist | 1.625 → 1.25rem | 1.3 | −0.01em | Principles, standfirst, quote, "Next Work" |
| title-6 | Geist | 1.5rem | 1.3 | −0.01em | Contact details |
| body-1 | Geist | 1.625 → 1.25rem | 1.2 | 0 | Hero and head standfirsts, notes |
| body-2 | Geist | 1.125rem | 1.4 | 0 | Case-study prose and labels |
| body-3 | Geist | 1rem | 1.6 | 0 | Body copy |
| body-4 | Geist | 1.625 → 1.25rem | 1.2 | −0.03em | Section labels, CTA text |
| label-1 | Geist | 1rem | 1.4 | 0 | Nav, buttons, labels |
| label-2 | Geist | .875rem | 1.4 | .06em | Our Work meta (uppercase) |
| label-3 | Geist | .75rem | 1.35 | 0 | Legal line |

body-4 is the same size as body-1 with tighter tracking. The roles are ordered by what
they carry, not strictly by size.

### 2.3 Create — nothing existing fits

| Variable | Value | Why |
|---|---|---|
| `--grid--column` (default) | calc — one column of the 12-column page grid | The design indents and measures in whole columns; no template variable expresses a column width. |
| `--grid--step` (default) | column + gutter | Same. Used for every indent and column measure. |
| `--_color---outline--light` | `rgba(11,11,11,.14)` | The lighter hairline the design uses where rows sit closer (project list, case-study tables). |
| `--_typography---letter-spacing--headline-2-tight` | −0.045em | Closing headline. Snapping it widens the composition and moves the "forward" step. |
| `--_typography---line-height--title-1-compact` / `letter-spacing--title-1-loose` | 1.05 / −0.03em | Our Work project titles. |
| `--_typography---line-height--title-2-loose` / `letter-spacing--title-2-loose` | 1.2 / −0.03em | Homepage case titles (both); specialize list (tracking). Snapping shifts the case slides 9–15px. |
| `--_typography---line-height--title-4-compact` | 1.2 | Case-study figures. Snapping adds 22px to the page. |
| `--_typography---letter-spacing--body-1-tight` | −0.01em | About lede. Snapping rewraps it from 4 to 5 lines. |

Each typography create is used by one component class as an override on top of its
`u-text-style-*` role. To normalise the type system later, delete the variable and the
override together.

**Breakpoint modes.** The core template gives only the `default` collection breakpoint modes.
This design steps its type sizes and the section `md`/`lg` spacings at the breakpoints, so the
**typography and spacing collections need Tablet, Mobile landscape and Mobile portrait modes**
too. The values are the `@media` blocks at the foot of `tokens.css`. The alternative is to
re-value those roles as fluid `clamp()`s: desktop and phone stay exact, and tablet lands a
few pixels smaller.

### 2.4 Core template — assumptions in the stand-in

`core.css` reproduces the utility inventory from its documented purpose. Where the real
template differs, it wins; check these:

- `u-container-*` apply the gutter from `--_spacing---margin--margin-sm`. Only `u-container-xl`
  and `u-container-0` are used, and `u-container-0` is taken to mean full bleed with no gutter.
- `u-text-style-*`: headline and title-1–3 read the primary font; title-4–6, body and label
  read the secondary.
- Weight variables are named `--_typography---font-weight--*`.
- `u-cover-absolute` includes `object-fit: cover`.
- `u-color-*` and `u-bg-*` are unused — their mapping couldn't be confirmed, so colour is
  bound on component classes.

---

## 3. Components

**Template components, composed and restyled**

| Component | Classes here | Notes |
|---|---|---|
| **Nav** | `nav_component`, `nav_contain`, `nav_layout`, `nav_logo_link`, `nav_logo`, `nav_menu`, `nav_item`, `nav_link`, `nav_link_text` | One menu list. The logo is one inline SVG coloured by `currentColor`; the dark page adds `is-inverse` to the logo link and links. On phones the list drops under the logo. |
| **Footer** | `footer_wrap` … `footer_legal` | Five links in one list; the tagline sits on column seven. |
| **Button Main** | `button_main_wrap`, `button_main_element`, `button_main_text`, `button_main_arrow` (`is-lead`, `is-trail`) | Restyled: square, 48px, label 16px medium, capitalised. **Both arrows belong in the component definition, not the icon slot** — the hover swaps them. Variants: **Solid** (default), **Ghost**, **Ghost inverse**, **Olive**; the lead-arrow offset follows the variant (`is-ghost` / `is-olive` on the arrow). The template's `data-button` / `data-trigger` hover system isn't used — the swap is CSS (§6). |
| **Clickable** | `clickable_wrap`, `clickable_link` (`is-inset`), `clickable_btn`, `clickable_text` | The link layer of every button, and the cover link of every link card. `is-inset` draws the focus ring inside the card. |
| **Accordion List / Item** | `accordion_list`, `accordion_item`, `accordion_toggle`, `accordion_toggle_text`, `accordion_toggle_icon`, `accordion_panel` | The collaboration model rows. The toggle is a real `<button>` with `aria-expanded` / `aria-controls`. Match these to the template's eleven `accordion_*` class names; the behaviour (one row open, height held, §6) is custom. |
| **Contact Form** | `form_wrap`, `form_form`, `form_field_wrap`, `form_label`, `form_input` (`is-area`), `form_submit`, `form_success_*`, `form_error_*` | Match to the template's `form_*` classes. Success and error blocks exist and are hidden. |
| **Skip to Main** | `u-skip-to-main` | First element on every page. |
| **Content (Rich Text)** | `studybody_rich` + `u-rich-text` | Case-study prose; paragraph spacing via `.studybody_rich p`. |

**New component candidates** — promote these to Webflow components.

| Component | Used on | Properties |
|---|---|---|
| **CTA** (`cta_*`) | Home, About, Collaboration, Insights, Private Equity | Section ID (`talk` on four pages, none on About) |
| **Rule** (`rule_wrap`, `rule_label`, `is-inverse`) | Home ×2 | Label text, button, inverse |
| **Page transition layer** (`transition_wrap`, `transition_dark`) | Every page | — |
| **Link card pattern** — Clickable over a card whose Button Main is presentational | Work cards, cases, featured, articles, project rows, PE models, next work | Link, accessible name |

Presentational Button Main instances inside link cards have no Clickable. The instance is
`aria-hidden` with `u-pointer-off`, because the card's own Clickable carries the link. In
Webflow that's a Button Main variant with the Clickable hidden.

---

## 4. Page-by-page mapping notes

Element types: headings are Headings; prose is **Paragraph** (`<p>`); labels, eyebrows,
dates, stats and meta are **Text Blocks** (`<div>`). Link text always sits in its own Text
Block inside the link.

**Multi-line display headings** (home hero, CTA, work title, About statement, Collaboration
and Private Equity heads) are one Heading containing a **Span per line** with its own class
(`*_title_line`, `is-lead` / `is-trail`). The lines are indented and animated individually. This
is the one place a span carries content, because a Heading can't hold blocks. After pasting,
confirm each line kept its span and class.

**Home** — `hero_section` (100vh; domino band as `hero_domino_stage`), `specialize_section`,
`work_section`, `galaxy_section` (tiles are `galaxy_tile is-01…is-11`, placeholder colour
grounds), `cases_section` (`cases_list` of three `cases_slide` — **CMS: Case studies** — fields:
number, category, title, summary, result line, image, link), CTA.

**About** — `about_section` (statement + three staggered principles, `about_principle is-2/3`),
`credo_section` (dark band; the olive panel is an image layer, `credo_panel_contain`), `figures_section`
(`figures_list` of `figures_row`), CTA (no ID).

**Collaboration** — `collabhero_section`, `models_section`: `models_list` is a 12-column grid.
The rail (`models_rail`) shares the models' rows through **subgrid**, so each label sticks from
its own model to the end of the group — pure CSS, no measuring. Models are `model_item is-2/3`
with sticky number and title and an Accordion List. Then the CTA.

**Our Work** — `workdark_section`, visually hidden `<h1>`. `workdark_window` (8 cards) and
`workdark_stage` (8 frames) are two lists of the same projects — **CMS: Case studies** (meta,
title, short text, image, link). Two Collection Lists bound to one collection, not duplicated
content. The dark ground is set with `page_body is-dark` / `page_main is-dark-ground` and
`data-page-ground="dark"`.

**Insights** — `insightshero_section`, `articles_section`: `featured_card` (full bleed), then
`articles_list` of `article_card` (`article_img is-mid / is-short` set the rhythm) — **CMS:
Insights** (date, title, image, standfirst for the featured one, link). CTA.

**Private Equity** — `pehero_section`, `pehelp_section` (`pehelp_list` of five items),
`pecases_section` (`projects_list`: `projects_preview` window plus `projects_row` — **CMS: Case
studies**), `pemodels_section` (three `pemodel_card`, `is-2/3` stagger), CTA.

**Contact** — `masthead_section`, `contact_section` (12-column grid: sticky details, form, call
invitation).

**Case study** — `studyhero_section`, `studybanner_section` (full-bleed crop), `studybody_section`
(three `studybody_block`: label, prose as Rich Text, figures table, quote, figures),
`studynext_section`. Built as a page now; it's the natural **Case studies template page**.

**Placeholder** — `soon_section`. `noindex`.

---

## 5. States

| Element | Hover | Focus | Active / other |
|---|---|---|---|
| Button Main (all variants) | Arrow swap (§6); ground bound to `*--hover` | Olive ring 2px, 3px out | Ground bound to `*--active` |
| Link cards | Arrow swap on the card's button; picture zooms to 1.04 | Olive ring inset 4px | — |
| Nav, footer, collaboration rail | Other items dim to 50% | Olive ring | — |
| Specialize list | Row becomes the reading: ink, preview and caption change; "See more" follows the pointer | Same, on focus | Selection persists after leaving |
| Contact details, "Explore Our Work" | Fade to 50% / 55% | Olive ring | — |
| Form fields | Fill bound to `input--hover` | Olive ring on keyboard focus | Error and success blocks hidden |
| Accordion toggle | — | Olive ring | `aria-expanded`; icon rotates |

---

## 6. Custom code — the exceptions list

Every entry failed the native-first ladder at step 6: the requirement is genuinely
unsupported by the Style panel or Interactions.

**CSS embeds** — every block headed `EMBED` in `style.css`.

1. **Root scrollbar hidden** (`html`, `::-webkit-scrollbar`) — Global Page Codes. The root
   element can't take a class.
2. **Button Main arrow swap and state grounds** — Global Page Codes. The parent hover moves the
   child label and arrows, which is a parent-state descendant selector. It's gated on
   `(hover: hover) and (pointer: fine)` and no reduced-motion preference. It lists every card
   that drives it; add new card types to the list.
3. **Picture zoom and chip reveal on card hover** — section CSS. Parent-state descendants.
4. **Our Work hint arrow** — `@keyframes` plus a reduced-motion query.
5. **Collaboration rail** — `grid-template-rows: subgrid`, which the Style panel can't set.
6. **Reduced motion** — collapses CSS transitions to 1ms. A media-feature query, not a
   breakpoint.

**JavaScript** — Global JS, one file in two blocks.

- **Block A: simple motion.** These are candidates for Webflow Interactions (IX3) when that
  lands:
  - page-head entrance
  - band entrance
  - section parallax
  - work-title drift
  - CTA "forward" slide
  - About panel drift
  - case-study banner drift
  - stacked case slides (pinned ScrollTrigger timeline)
- **Block B: custom for good.**
  - nav/footer/rail dimming
  - specialize list with cursor-following control
  - project preview follow
  - rail click-to-scroll
  - accordion: one row open, the group held at its tallest height so nothing below moves
  - domino and CTA chains (contact-solved physics)
  - galaxy stream
  - Our Work track (wheel, drag, keys, touch; locks the page)
  - contact-form hold
  - **Barba page transitions** (Osmo overlapping-parallax, loaded from jsDelivr)

Reduced motion is handled throughout: each module drops or shortens its motion and nothing is
hidden. Nothing is pre-hidden in CSS either, so a failed script leaves every page readable.

---

## 7. Deviations — built differently from the export

**Structure and system**

- Sections carry their own asymmetric vertical padding, bound to spacing variables, instead
  of the symmetric section utility — the design's rhythm is asymmetric (deep feet for the
  parallax lift). Only the placeholder page and the zero-padding sections use `u-section-*`.
- A few off-scale layout values are kept as literals because they're compositional, not
  rhythm:
  - specialize foot 6.25rem;
  - figures foot 5.625rem;
  - credo top 14.625rem;
  - footer top 2.625rem;
  - principle stagger 8.5625 / 17.125rem;
  - featured body offset 14.0625rem;
  - card gaps 1.0625 / 1.1875rem;
  - models row gap 7.4375rem;
  - articles gap 8.875rem;
  - study title foot 5.5rem;
  - models/articles foot and second PE card offset 7.5rem.
- One-dimensional layouts are flex with column-derived widths. Grid stays where the layout is
  two-dimensional or layered: the caption stack, the models, contact, Our Work, and the
  project and next-work rows.
- The nav logo is one inline SVG coloured by its ground. The export used two image files and
  swapped them through a path hard-coded in JavaScript, which would break on Webflow's CDN.
- Clean URLs: `/about` instead of `about.html`. The duplicate `homepage.html` is gone.
- Link cards use the Clickable cover with a short accessible name, rather than one long link
  wrapping the whole card.

**Typography and colour** — sub-4px differences, accepted for the type system:

- The Our Work card copy uses body-3 (line height 1.6, was 1.5): +1.6px per paragraph.
- The quote attribution uses body-2: +1.8px.
- The contact labels use label-1: no visible change.
- The footer tagline tracking is 0 (was −0.3px).
- The placeholder title line height is 0.9 (was 1.0): 4px.
- Two in-between greys use the standard muted tone (60%): 75% on the collaboration rows, 50%
  on insight dates and summaries.

**Fixes to the export**

- **Phone nav**: the links wrapped upward out of a fixed 44px bar, hiding "Expertise". They
  now drop under the logo. Collaboration, case study and Our Work gain the top clearance on
  phones.
- **Galaxy statement**: it was a fixed 48px and clipped its first line and its link on phones.
  It now uses title-2 and steps down with the other section titles, which also makes it
  smaller on tablet.
- **Contact details**: below desktop the labels sat in a single grid column, which is
  narrower than "Location". The label ran into its value on tablet and overlapped it on
  phones. The labels now use a fixed 6.25rem column below desktop, matching the case-study
  details, and stack above their values at 479px and below.
- Links to the missing `V5.html#talk` / `V6.html#talk` now point to the page's own closing
  section.
- The homepage case slides were mis-nested (`<article>` closed by `</a>`). That was fixed in
  V2, and the new structure is validated on every build.
- The specialize preview files were named against the wrong rows. The images stay in the rows
  they were shown on, and the files are renamed to match.

**Accessibility additions**, none of them visible to mouse users:

- a skip link;
- a hidden `<h1>` on Our Work;
- real buttons for the accordion;
- a focus ring on form fields (the export had none);
- a consistent olive focus ring on every link.

**Assets**:

- PNG → WebP (10.6MB → 1.4MB), visually identical;
- byte-identical duplicates merged;
- oversized sources resized to about 2× their largest display size;
- only the one HW Cigars weight the design uses is shipped.

**Removed dead code**:

- `v2/styles.css`, `superior-serif.css` and the LT Superior Serif fonts;
- the unused light Our Work track;
- unused CSS (`.link`, `.is-light`, `work_row*`, `projects_wrap`);
- the unused motion modules (compress, align, odometer, focus list).

---

## 8. Assets

| File | Shows | Ratio | Used |
|---|---|---|---|
| `audience-private-equity.webp` … `audience-revenue-growth.webp` (5) | Pattern previews per audience | 2:1 (shown 2:1 crop) | Home — specialize |
| `case-study-1.webp` | Architecture, checkered mask | 3:2 | Home case 1, Our Work, case-study banner |
| `case-study-2.webp` | Caravans, checkered mask | 3:2 | Home case 2, Our Work, PE preview |
| `case-study-3.webp` | Timber, checkered mask | 3:2 | Home case 3, Our Work |
| `case-study-next.webp` | Next-work preview | 1:1 (shown 3:2) | Case study, PE preview |
| `case-study-map.webp`, `case-study-cuisine.webp` | Charts | 844:474 | Case study |
| `collab-tile-1/2/3.webp`, `pe-model-tile.webp` | Model motif tiles | 1:1 | Collaboration, PE |
| `pe-hero.webp` | PE motif | 720:359 | PE hero |
| `insight-featured.webp`, `insight-placeholder.webp` | Insight placeholders | 845:744 | Insights |
| `about-overlay.svg` | Perforated olive panel | 1512:680 | About credo |
| `how-we-work-icon-01/02/03.svg` | Work card icons | 1:1 | Home |
| `favicon.svg` | The mark (light/dark aware) | 1:1 | Every page |

Case-study and insight pictures are placeholders; where one file fills several slots, each slot
gets its own image when real material arrives.

---

## 9. Page metadata

| Page | Slug | Title | Description |
|---|---|---|---|
| Home | `/` | Autokatalyst — Better work starts with better decisions | We help middle-market companies find and implement high-impact AI opportunities. |
| About | `/about` | Autokatalyst — About | We bring strategy, analytics, technology, and execution together — business first… |
| Collaboration | `/collaboration` | Autokatalyst — Collaboration | Start where it makes sense. Build from there… |
| Our work | `/our-work` | Autokatalyst — Our work | Selected work from Autokatalyst — from data-driven lead generation… *(placeholder)* |
| Insights | `/insights` | Autokatalyst — Insights | Insights from Autokatalyst on data, analytics, AI… *(placeholder)* |
| Private Equity | `/private-equity` | Autokatalyst — Private Equity | We help private equity firms identify and execute practical value-creation… |
| Contact | `/contact` | Autokatalyst — Talk to us | Tell us what's on your mind… |
| Case study | `/case-study` | Autokatalyst — Data-Driven Lead Generation | How Autokatalyst built a targeted lead-generation system… |
| Placeholder | `/placeholder` | Autokatalyst — Page coming soon | *noindex* |

Titles are the export's; descriptions are drawn from each page's copy (two marked placeholder).
Open Graph title and description mirror them. Still needed: a **social sharing image** (the
mark or the domino band on cream, 1200×630), the **production domain** for canonical URLs, and
a **404 page** design (Vercel shows its default until then).

---

## 10. Self-check (Phase 4)

- ✅ Every style lives in the CSS files. There are no `<style>` blocks and no `style=""`, and
  JavaScript writes only GSAP runtime animation values. Enforced by `npm run check`.
- ✅ No hex, `rgb()` or named colour in `style.css`; every colour is a `--_color---*` variable
  (checked).
- ✅ No `url()` in `style.css` except `@font-face` (checked).
- ✅ No `px` except 1px hairlines and media-query bounds (checked, 0 warnings).
- ⚠️ Every text element carries a `u-text-style-*` role, but **six component classes override
  line height or tracking** through the created variables (§2.3). **Two titles also switch to
  another role's size below desktop**, bound to existing variables (contact title, Our Work
  titles). All eight are listed as typography exceptions.
- ⚠️ **Ten variables created**, all with reasons (§2.3), plus breakpoint modes on typography and
  spacing. No `u-*` class is redefined.
- ✅ No ID selectors. Bare tag selectors appear only in the global embed and the core stand-in.
  Descendant selectors are used only in the sanctioned cases: parent state and rich text.
- ⚠️ Type and spacing change at breakpoints **by variable mode** (like radius), not by
  per-class overrides — except the two title switches above.
- ✅ One DOM across breakpoints: one nav list, one logo, no duplicated content.
- ⚠️ Buttons and fields bind hover, focus and active to `interactive--*`. **Nav, footer, rail
  and specialize links use text colours**: their hover state is dimming, and their focus ring is
  bound to `interactive--secondary--idle`.
- ✅ Semantic tags, heading order and alt text all verified. Focus is visible everywhere.
- ✅ Every custom-code exception is justified (§6).
- ✅ Mapping notes, exceptions and deviations are complete.

**Verification.** Every page was compared against the export in the browser at 1512, 1280,
1024, 991, 768, 600, 390 and 375px, matching every text element and image by content:

- Page heights match exactly, except where a deviation above explains the difference.
- Scroll-linked motion matches value for value at 13 scroll positions: domino angles, both
  parallaxes, the stacked slides' tilt, scale and opacity, and the chain angles.
- Heading drift and the CTA slide differ by under 1px, because the export mixed rem and px
  when computing its grid.
- Interactions, page transitions (including the dark-ground swap to and from Our Work), the
  track, rail, accordion and previews were each exercised.

---

## 11. Open decisions and follow-ups

1. **Phone nav** — shipped as wrapped text links under the logo. A burger menu is the
   alternative if you want the page heads to start higher on phones.
2. **Galaxy statement on tablet** — now 36px (the system step). Say if you want 48px kept on
   tablet; it's one override.
3. **Homepage case links** go to placeholder pages, as in the export, though case 1 has a real
   page at `/case-study`.
4. **First-paint flash** — the skill forbids hiding content in CSS before the script runs, so
   on a cold first visit the page head can show for a frame before its entrance begins. In
   Webflow, GSAP loads in the head and the gap shrinks. A pre-hide with a timed fallback would
   remove it, as an exception.
5. **HW Cigars licence**, **form service**, **sharing image**, **domain**, **404 page** —
   before launch.
