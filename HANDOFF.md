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
| `bg--default--1` | `#f1f3d6` | Cream panel: domino bars, tile grounds, CTA large band |
| `bg--default--2` | `#ddd99b` | Khaki: CTA small band, the differentiator's proven-approaches half |
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
| title-1 | HW Cigars | min(5.125rem, 4.76vw) → 3.25 → 2.25 → 2.25rem | 1.1 | −0.0417em | Our Work titles |
| title-2 | HW Cigars | 3 → 2.25 → 1.75 → 1.75rem | 1.1 | −0.0417em | Section titles, specialize list, case titles, How we work title and differentiator statement (both sized by `title-2-large`) |
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
| `--_color---outline--light` | `rgba(11,11,11,.14)` | The lighter hairline the design uses where rows sit closer (case-study tables). |
| `--_color---bg--brand--1` | `#44011c` | The brand burgundy, new with the differentiator section: the traditional-consulting bar in the differentiator. Nothing in the palette is burgundy. |
| `--_color---bg--default--light` | `#fefff1` | The light cream ground introduced with the global update: How we work, the Expertise, Collaboration, About and Contact heroes, the Expertise models. Lighter than `bg--default--1`; the only palette match is a text role (`text--inverted--1`), which a background must not borrow. |
| `--_typography---letter-spacing--headline-2-tight` | −0.045em | Closing headline. Snapping it widens the composition and moves the "forward" step. |
| `--_typography---line-height--title-1-compact` / `letter-spacing--title-1-loose` | 1.05 / −0.03em | Our Work project titles. |
| `--_typography---line-height--title-2-loose` / `letter-spacing--title-2-loose` | 1.2 / −0.03em | Homepage case titles (both); specialize list (tracking). Snapping shifts the case slides 9–15px. |
| `--_typography---line-height--title-4-compact` | 1.2 | Case-study figures. Snapping adds 22px to the page. |
| `--_typography---letter-spacing--body-1-tight` | −0.01em | About lede. Snapping rewraps it from 4 to 5 lines. |
| `--_typography---font-size--title-2-large` | clamp(3rem, 4.2328vw, 4rem) → 2.25 → 1.75rem | The How we work title and the differentiator statement, between title-2 and title-1: 48px up to about 1134px wide, growing with the screen to 64px at 1512. |
| `--_typography---font-size--title-3-small` | 1.375 → 1.125rem (991px) | The differentiator bar labels: the serif (title-3 role) at 22px. No serif role is smaller than title-3's 2.5rem. |

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

**Home** — `hero_section` (100vh, khaki `bg--default--2` ground; domino band as
`hero_domino_stage`, its bars in the cream `bg--default--light`), `specialize_section`,
`work_section` (cream ground: `work_intro` — the title with the "Explore our approach" button
40px under it — then, 96px below, `work_grid` of three `work_card`), `differ_section` (below), `cases_section` (`cases_list` of three `cases_slide` — **CMS: Case studies** — fields:
number, category, title, summary, result line, image, link), CTA.

**Home — differentiator** (`differ_section`, the bars-into-a-button version, artifact v5):
centred in `differ_content`, the statement (`differ_title`, title-2 role with the
`title-2-large` size, nine columns plus a column) and under it the supporting line
(`differ_text`, body-3, 50ch). Under them the bar (`differ_band`, seven columns plus a column)
in two halves, `differ_half is-left`, burgundy, and `differ_half is-right`, khaki, each holding
a centred `differ_copy` stack: a `differ_label` Text Block in title-3 sized by `title-3-small`
(22px) — "Tailored solution" / "Proven approaches" — and 12px under it a `differ_note` in
body-3 at the half's quieter colour (`text--default--2`; `differ_note is-inverse`,
`text--inverted--3`, on the burgundy) — "Traditional consulting" / "Established solutions", and under the bar `differ_cta`, a solid Button Main, "Find what’s worth
doing", to the page's CTA (`#talk`). That resting state is all the markup carries, and it is
what shows without the script, on a screen under 992×540 and with reduced motion. Live, the
section holds once it is centred on the screen, gliding to a stop (`differ_contain`, marked
`data-differ-glide` and `data-parallax-layer`). The halves slide in, shrinking about their own
centres, and comb through each other as four stripes that cover the labels and land together;
the block turns dark as the button's label comes in on it, and it shrinks on into the dark
button. The script clones the stripes from `differ_hidden`: `differ_rows` (with
`u-cover-absolute u-vflex-stretch-top`), `differ_row`, `differ_seg is-left / is-right /
is-dark`, `differ_face` (the copy of the button's label and arrow), and the crossing layer
`differ_rows is-cross` with `differ_seg is-left / is-right is-cross`. `differ_hidden` also keeps
the runtime combos `differ_half is-live` and `differ_cta is-live`. The section's padding is
section-lg on top and section-md at the foot. `differ_section is-live` drops the bottom
padding, so the button forms on the bar's centre, and takes a spacing-10 negative bottom
margin, giving back part of the glide's travel so the button sits closer to the case studies.

**About** — `about_section` (cream ground: the "About Us" title, then `about_body` on the last
five columns, two `about_group` of two body-2 `about_text` paragraphs), `credo_section` (dark
band; the olive panel is an image layer, `credo_panel_contain`), `figures_section`
(`figures_intro` — the lede and a solid "Let’s work together" button to /contact — and
`figures_list` of `figures_row`). The page has no CTA section; the figures run into the footer.

**Work card** (`work_card`, shared by Home and Private Equity, always inside a `work_grid`): a
khaki card (`bg--default--2`) with `work_card_media` across the top (17.5rem tall): the photo
(`work_card_image`, cover) under `work_card_pattern`, an inline SVG of bars in the card colour
whose gaps show the photo through. Each card has its own pattern (checker, fine lattice, coarse
lattice), drawn as plain rects that take the fill from the class. On hover or focus (EMBED,
parent-state selectors) the card and pattern turn `bg--brand--1`, the type turns
`text--inverted--1` (text `inverted--3`, the control `outline-inverted`), and the pattern is
wiped away from the left in 575ms (its `clip-path` inset runs from nothing to the full
width) while the photo under it grows a tenth about its centre (the media box clips it). The
wipe only runs one way: on leaving, a small script (`data-work-card`, `data-work-pattern`)
sets `work_card_pattern is-returning`, which plays keyframes that wipe the pattern back in
from the left instead of retracing it. The keyframes and the hover rules are custom code. Without hover the pattern stays. Then
`work_card_content` — `work_card_label` (body-3), `work_card_head` (h3, title-4),
`work_card_text` (body-3, text-default-2) and a ghost "Learn more" control held to the foot.
The whole card is the link (`clickable_wrap`). Make it a **Webflow component** with props for
image, label, heading, text and link. Each position has its own photo, the same on both
pages: `work-card-1/2/3.webp`. The cards sit in a row with a gap-md gutter and stack at 767px.

**Collaboration** — `collabhero_section` (`data-parallax="35"`, as the Expertise hero: it falls
behind while the models section rises over it), `models_section` (40px above its title row):
`models_list` is a 12-column grid.
The rail (`models_rail`) shares the models' rows through **subgrid**, so each label sticks from
its own model to the end of the group — pure CSS, no measuring. Each label also keeps the
lines of the labels after it free below itself (`margin-bottom`), so where the group ends and
pushes them all up they leave as a stack instead of overlapping. Models are `model_item is-2/3`
(a column, gap-md): `model_top` — `model_head` (`data-model-head`: the number in
`text--brand--1` and the title, on columns 4–7) and `model_media` (`data-model-frame`, columns
9–12, upright 472:580, held to the right edge) holding the homepage's photo (`model_img`) under
an upright version of its pattern (`model_pattern`, khaki, no hover) — then `model_rows`, the
Accordion List and, 40px under it, `model_action`: a solid Button Main, "Talk to us", to the
Contact page, on the rows' left edge. On a desktop each picture closes on its title (Block A); `model_item is-live`
puts the content on the foot of the held model. Then the CTA.

**Our Work** — `workdark_section`, visually hidden `<h1>`. `workdark_window` (8 cards) and
`workdark_stage` (8 frames) are two lists of the same projects — **CMS: Case studies** (meta,
title, short text, image, link). Two Collection Lists bound to one collection, not duplicated
content. The dark ground is set with `page_body is-dark` / `page_main is-dark-ground` and
`data-page-ground="dark"`.

**Insights** — `insightshero_section`, `articles_section`: `featured_card` (full bleed), then
`articles_list` of `article_card` (`article_img is-mid / is-short` set the rhythm) — **CMS:
Insights** (date, title, image, standfirst for the featured one, link). CTA.

**Private Equity** — `pehero_section` (cream ground, no picture, the same layout as
`collabhero_section` at every breakpoint: the title across the grid with its first line one
step in, the standfirst under it on columns 8–12; the two are one pattern and can share a
class in Webflow), `pehelp_section` (`pehelp_list` of
five items), `relevant_section` (below), `pemodels_section` (cream ground: the title and a ghost
"Explore Our Approach" across the top, then the shared `work_grid` of three `work_card`, with
the homepage's copy), CTA. `collabhero_section` sits on the cream ground too.

**Relevant work** (`relevant_section`, one section on the Expertise page and the case study
page — make it a Webflow component, with the heading as a text property: "Relevant Work" on
the Expertise page, "More Work" on the case study page): the title row
(`relevant_head`, the heading and a ghost "Explore Our Work", closed by a hairline in
`outline--default`) inside the container,
then the case studies as a slider that runs from the page margin off the right edge of the
screen, after Osmo's parallax image slider. `caseslider_wrap` (`data-case-slider`, clips)
holds `caseslider_list` (`data-case-slider-list`, the track; its left padding puts the first
card on the page margin however wide the screen) of `caseslider_item`
(`data-case-slider-item`: one card plus its gap-md gutter as right padding). Each
`caseslider_card` is a dark card, 50rem wide (40rem at 991px) and 30rem tall, and the whole
card is the link to its case study (`clickable_wrap`): `caseslider_content` on the left half
(`caseslider_category` in `text--brand--1`, `caseslider_title` title-3 in cream,
`caseslider_text` with `u-line-clamp-2`, and a presentational ghost inverse "See more"
control) and `caseslider_media` on the right half holding `caseslider_img`. Hovering a card
(or focusing it) grows its picture a tenth and moves the control's arrows (EMBED,
parent-state selectors). On a phone the picture sits above the text. **CMS: Case studies** —
client (the category line), title, summary, image, link; bind the Collection List to
`caseslider_list` and the items to `caseslider_item`. On the case study template, filter the
list to leave out the current case study (the prototype shows the other two). Without the
script the track is a native horizontal scroller; `caseslider_list is-live` and
`is-dragging` are runtime combos.

**Contact** — `masthead_section`, `contact_section` (12-column grid: sticky details, form, call
invitation).

**Case study** — `studyhero_section`, `studybanner_section` (full-bleed crop), `studybody_section`
(three `studybody_block`: label, prose as Rich Text, figures table, quote, figures),
`relevant_section` (the shared Relevant work slider, in place of the former Next Work list).
Built as a page now; it's the natural **Case studies template page**.

**Placeholder** — `soon_section`. `noindex`.

---

## 5. States

| Element | Hover | Focus | Active / other |
|---|---|---|---|
| Button Main (all variants) | Arrow swap (§6); ground bound to `*--hover` | Olive ring 2px, 3px out | Ground bound to `*--active` |
| Link cards | Arrow swap on the card's button; picture zooms to 1.04 | Olive ring inset 4px | — |
| Nav, footer, collaboration rail | Other items dim to 50% | Olive ring | — |
| Specialize list | Row becomes the reading: ink, preview and caption change; "See more" follows the pointer | Same, on focus | Selection persists after leaving |
| Contact details | Fade to 50% | Olive ring | — |
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

The differentiator's styles need no embed. Its only query is the native tablet breakpoint.
The sequence's 992×540 bound lives in the script alone. It reaches down to a 13-inch
MacBook's browser window (a 1280×800 screen leaves roughly 1280×620–700 once the menu bar,
toolbar and Dock are taken). One embed: under 1280px the statement takes the full measure
(`max-width: 1279px`, between breakpoints), so it keeps to three lines.

**JavaScript** — Global JS, one file in two blocks.

- **Block A: simple motion.** These are candidates for Webflow Interactions (IX3) when that
  lands:
  - page-head entrance
  - band entrance
  - section parallax (a held section is found through ScrollTrigger's pin spacer; its drift
    moves the layer marked `data-parallax-layer` and starts once the hold lets go). The drift
    runs from the moment the next section shows to when it reaches the top, read from the
    layout and never starting before the page has scrolled, so a next section already in view
    on arrival can't open a gap above the head.
  - Collaboration model pictures: on a desktop each model is held at its starting height (GSAP
    sets it on every refresh), and from the moment it reaches the top band its picture shrinks
    by exactly as much as the page scrolls, down to the height of the number and title. The
    content sits on the foot of the held box, so the number and title stay put while the
    picture shrinks and the rows rise under them; then the model scrolls on. No model changes
    height, so nothing below moves and no pin is needed. The start is read from the layout
    (offsetTop), so the section's entrance can't shift it.
  - work-title drift
  - CTA "forward" slide
  - About panel drift
  - case-study banner drift
  - stacked case slides (pinned ScrollTrigger timeline)
- **Block B: custom for good.**
  - nav/footer/rail dimming
  - specialize list with cursor-following control
  - case slider: the Relevant work slider (Expertise and case study pages), after Osmo's parallax image slider
    (which runs on Smooothy), rebuilt on GSAP's ticker so the site keeps one motion runtime.
    The track follows a target that a drag (0.005 slides per pixel, as Smooothy), a swipe or a
    sideways trackpad gesture (one to one) moves, and closes on it with a 0.3s exponential
    catch-up; it never snaps. It loops: a slide more than half the set away wraps round out of
    sight, and the script copies the set as often as the screen needs (copies are
    `aria-hidden`, their links out of the tab order). The pictures travel with their cards;
    Osmo's picture drift is left out. A drag of more than 6px is not a click; a keyboard
    landing on a card's link brings that card to the first place. Reduced motion drops the
    catch-up.
  - rail click-to-scroll
  - accordion: one row open, the group held at its tallest height so nothing below moves
  - domino and CTA chains (contact-solved physics)
  - differentiator: on a screen at least 992×540 the section holds for three quarters of a
    screen once it is centred, after a sixth-of-a-screen lead-in, while one scroll-bound
    timeline plays the sequence: over the first 55% the halves slide in, each stripe's inner
    end after its own wait, shrinking as they go, and comb through each other as four stripes
    covering the labels; the block turns dark as they land, the button's label comes in on it,
    and by 90% it is the section's own solid button. The stripes and the label copy are cloned
    from the section's hidden templates.
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
  - work card image 17.5rem (12.5rem at 991px, 15rem at 767px);
  - featured body offset 14.0625rem;
  - card gaps 1.0625 / 1.1875rem;
  - models row gap 7.4375rem;
  - articles gap 8.875rem;
  - study title foot 5.5rem;
  - models/articles foot 7.5rem.
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
- **Contact details**: below desktop the labels sat in a single grid column, which is
  narrower than "Location". The label ran into its value on tablet and overlapped it on
  phones. The labels now use a fixed 6.25rem column below desktop, matching the case-study
  details, and stack above their values at 479px and below.
- **Case study links**: only Our Work's first case opened the case study page. Every other
  case card, including Metal Fabricator on the homepage, went to a placeholder. Every case
  card now opens the case study page, as a stand-in until each case has its own page.
- **Next Work**: its "Explore Our Work" link was a one-off with a dimming hover. It is now the
  ghost Button Main, with the same arrow hover as every other button, and looks the same at
  rest.
- Links to the missing `V5.html#talk` / `V6.html#talk` now point to the page's own closing
  section.
- The homepage case slides were mis-nested (`<article>` closed by `</a>`). That was fixed in
  V2, and the new structure is validated on every build.
- The specialize preview files were named against the wrong rows. The images stay in the rows
  they were shown on, and the files are renamed to match.

**Differentiator — the v5 bars-into-a-button version**

- The statement is centred and set between title-2 and title-1 (`title-2-large`), with the
  supporting line in body-3 under it; the bar is eight columns wide in two halves.
- The stripes slide at their own pace and land together; where the halves overlap, the two
  colours comb through each other as four stripes and cover the labels, which never fade.
- The block turns dark in place and shrinks on its own centre into the system's solid Button
  Main, "Find what’s worth doing", whose label comes in while it is still shrinking.
- Under 992×540, and with reduced motion, the bar rests in its two halves with the button
  under it.
- The labels ride their halves a quarter of the bar inwards while the outer ends come in a
  third, so on a narrow screen a label could show past its colour. The script clips each half
  to its ground's outer end and shrinking height (`clip-path`, written by GSAP as it plays), so
  it never can; at 22px the labels clear the edge anyway down to about 1000px.

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
| `case-study-1.webp` | Architecture, checkered mask | 3:2 | Home case 1, Our Work, case-study banner, PE slider |
| `case-study-2.webp` | Caravans, checkered mask | 3:2 | Home case 2, Our Work, PE slider |
| `case-study-3.webp` | Timber, checkered mask | 3:2 | Home case 3, Our Work, PE slider |
| `case-study-map.webp`, `case-study-cuisine.webp` | Charts | 844:474 | Case study |
| `work-card-1/2/3.webp` | Work card photos: floating stairs, label rolls, woven rope (the pattern is a separate SVG layer) | 3:2 (shown 477:280 and 472:580 crops) | Home and PE work cards, Collaboration models |
| `insight-featured.webp`, `insight-placeholder.webp` | Insight placeholders | 845:744 | Insights |
| `about-overlay.svg` | Perforated olive panel | 1512:680 | About credo |
| `favicon.svg` | The mark (light/dark aware) | 1:1 | Every page |

No longer used, kept in `images/` until confirmed: `pe-hero.webp` (the PE hero's motif),
`pe-model-tile.webp`, `collab-tile-1/2/3.webp`, `case-study-next.webp`,
`how-we-work-icon-01/02/03.svg`.

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
- ✅ Comments and scripts name variables, never token values: no literal sizes, colours or
  font names (checked). The script reads the display face from
  `--_typography---font--primary`.
- ⚠️ Every text element carries a `u-text-style-*` role, but **six component classes override
  line height or tracking** through the created variables (§2.3). **Two titles also switch to
  another role's size below desktop**, bound to existing variables (contact title, Our Work
  titles). All eight are listed as typography exceptions.
- ⚠️ **Eleven variables created**, all with reasons (§2.3): ten from the migration and the
  differentiator's burgundy, plus breakpoint modes on typography and spacing. No `u-*` class is redefined.
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
- The differentiator is the v5 bars-into-a-button sequence, restored from that snapshot. It
  was checked at 992×540, 1024×560, 1280×620, 1440×760, 1512×860 and 1920×1050: the hold,
  the combing stripes (the labels never show past their colour) and the button it lands as.
- Full check after the October update, at 1512×860, 820×1100 and 390×844 on all nine pages:
  no console errors, every image loads, both fonts load, one `<h1>` per page, no sideways
  scroll; page transitions through every nav page rebuild their scroll effects; the work-card
  hover and its one-way return, the Relevant work slider (drag, click, trackpad, keyboard
  focus, loop), the Collaboration models (sticky title and shrinking picture, accordion held
  at its tallest, rail labels stacking at the end), the hero parallaxes and the Our Work track
  were each exercised.

---

## 11. Open decisions and follow-ups

1. **Phone nav** — shipped as wrapped text links under the logo. A burger menu is the
   alternative if you want the page heads to start higher on phones.
2. **Case study pages** — every case card opens the one designed case study (Metal
   Fabricator) as a stand-in. In Webflow the page becomes the Case studies CMS template, so
   each card links to its own item.
3. **First-paint flash** — the skill forbids hiding content in CSS before the script runs, so
   on a cold first visit the page head can show for a frame before its entrance begins. In
   Webflow, GSAP loads in the head and the gap shrinks. A pre-hide with a timed fallback would
   remove it, as an exception.
4. **Differentiator on smaller screens** — under 992×540 (tablets and phones) the bar rests in
   its two halves under the text. A shorter version of the sequence for tablets is possible if
   you want it.
5. **HW Cigars licence**, **form service**, **sharing image**, **domain**, **404 page** —
   before launch.
