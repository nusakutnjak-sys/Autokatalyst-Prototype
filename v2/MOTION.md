# Autokatalyst — Motion System

The visual design is fixed. This document defines the one motion language every
future interaction inherits. No animation in this project is authored from
scratch: it is assembled from these tokens and these six modules.

---

## 1. Philosophy

Motion here behaves like a mechanism, not an effect. It has mass, it has a
direction, and it stops when it arrives. Three commitments:

**Typography stays the hero.** Type is revealed, never moved around. Headlines
open behind a mask edge; they do not slide, scale, fade in isolation, or drift
after settling.

**Movement follows the grid.** The page is a 12-column grid with a 24px gutter
and 118px columns. Every distance token is a fraction or multiple of those two
numbers, so motion lands on the same rhythm as the layout. Movement is
horizontal or vertical — never diagonal, never rotational.

**One axis per job.** Entrances are vertical: the hero's masks wipe upward and
its travel is vertical. Everything continuous or stateful is horizontal:
heading drift, the focus list's arrow and label. An element never changes axis
between one behaviour and another.

**Two amplitudes, and only two.** 12px (half a gutter) for anything that
travels; 4px (a sixth of a gutter) for anything that drifts continuously.
Nothing on the page moves further than half a gutter.

**Cause precedes effect.** Sequenced elements resolve in reading order at a
fixed interval. A row does not begin until the row above it has committed. This
is the domino rule, and it is what makes separate animations read as one system.

The page should never announce that it is animated.

---

## 2. Tokens

Declared once in `motion.css` (CSS custom properties) and mirrored in
`motion/motion-tokens.js` (seconds and pixels, for GSAP). The two files must
stay in sync; nothing else in the project may declare a curve, a duration, or a
travel distance.

### Easing — four curves, no more

| Token | Curve | Used for |
|---|---|---|
| `--ease-primary` | `cubic-bezier(0.33, 0.02, 0.18, 1)` | Default. State changes, reveals, component transitions. Near-zero departure velocity, long graceful settle. |
| `--ease-secondary` | `cubic-bezier(0.65, 0.05, 0.36, 1)` | Symmetric, heavy at both ends. Movement that both starts and ends on screen — scrubbed turnarounds, hover withdrawal, position swaps. |
| `--ease-reveal` | `cubic-bezier(0.28, 0.06, 0.16, 1)` | Softest departure, longest tail. The hero composition, masked type and imagery. |
| `--ease-parallax` | `cubic-bezier(0.7, 0.05, 0.13, 1)` | Weighted and symmetric. The page transition only. |
| `--ease-response` | `cubic-bezier(0.16, 1, 0.3, 1)` | Departs at full speed, settles over a long tail. For motion that answers the pointer, where any ramp-up reads as input lag. |
| `--ease-exit` | `cubic-bezier(0.76, 0, 0.9, 0.2)` | Heavy acceleration away. Leaving only. |
| `--ease-linear` | `linear` | Scroll-bound displacement with no turnaround (parallax). |

No spring, no back, no elastic, no bounce. Nothing overshoots and nothing
snaps. Every curve has a gentle departure and a settling tail.

### Duration

| Token | Value | Used for |
|---|---|---|
| `--dur-hover` | 280ms | Pointer feedback |
| `--dur-fast` | 420ms | Small state change: icon shift, tint, dim |
| `--dur-standard` | 700ms | Component transition |
| `--dur-editorial` | 1500ms | The composition duration — hero, text, imagery |
| `--dur-mask` | 1500ms | Clip-path reveals share the composition duration |
| `--dur-opacity` | 520ms | Opacity always resolves before the transform it accompanies |
| `--dur-page` | 1200ms | Page transition |

Opacity is deliberately shorter than movement. The element is fully present
while it is still travelling, so the eye reads position, not fade.

### Stagger — the domino interval

| Token | Value | Used for |
|---|---|---|
| `--stagger-tight` | 60ms | Bars, dots, characters |
| `--stagger-base` | 130ms | Heading lines, list rows |
| `--stagger-loose` | 220ms | Section-level blocks |

### Distance — derived from the grid

| Token | Value | Grid relation |
|---|---|---|
| `--move-sm` | 12px | Half gutter |
| `--move-md` | 24px | One gutter |
| `--move-lg` | 48px | Two gutters |
| `--move-parallax` | 118px | One column — the ceiling for any parallax travel |
| `--move-hairline` | 4px | A sixth of a gutter — the imperceptible one |

### Scroll

| Token | Value | Meaning |
|---|---|---|
| `--scroll-start` | 85% | Element enters at 85% of viewport height |
| `--scroll-end` | 15% | |
| `--scroll-scrub` | 1.2 | Seconds of smoothing — available, currently unused |
| `--scroll-scrub-direct` | true | Bound 1:1 to scroll. Movement stops the instant scrolling stops. Used by every scroll-bound behaviour on the page. |

Entrances play once. Nothing re-animates on scroll-back.

### Mask geometry

`--mask-from-bottom` / `--mask-from-top` / `--mask-from-left` /
`--mask-from-right` → `--mask-shown`. Single-edge `inset()` only. No circles,
no polygons, no diagonal wipes.

---

## 3. Architecture

```
motion.css                    tokens · opt-in initial states · reduced-motion policy
motion/motion-tokens.js       the same values for GSAP
motion/motion-core.js         boot · easing registration · defaults · registry · hygiene
motion/motion-modules.js      the six factories
motion/motion-init.js         single entry point; binds [data-motion] elements
```

Load order is `motion.css` → `styles.css`, then GSAP → tokens → core → modules
→ init. `styles.css` aliases its three legacy motion variables onto the shared
tokens, so the existing CSS hover transitions already inherit the system.

### Core guarantees

- **One boot.** `ATK.motion.init()` runs on `DOMContentLoaded`, registers the
  four curves as named GSAP eases (`atk-primary`, `atk-secondary`,
  `atk-reveal`, `atk-exit`), and sets `gsap.defaults()` and
  `ScrollTrigger.defaults()`. No tween anywhere may inline a curve.
- **Axis discipline.** `core.offset(axis, distance)` is the only way to produce
  a translation. It zeroes the other axis, which makes diagonal movement
  structurally impossible.
- **Reduced motion collapses, it does not disable.** `resolveDuration`,
  `resolveDistance` and `resolveStagger` return zero under
  `prefers-reduced-motion`, and the CSS tokens collapse in parallel. Content
  arrives instantly at its end state; nothing is hidden, nothing is skipped.
- **Never hide without script.** Initial states (`.is-motion-ready`,
  `.is-motion-masked`) are applied by JS at bind time, so a failed script load
  leaves the page fully readable.
- **Compositor hygiene.** `will-change` is promoted for the life of a tween via
  `.is-motion-active` and released to `.is-motion-settled` on completion.
  Nothing holds a layer permanently.
- **Transform, opacity, clip-path only.** No animated width, height, top, left,
  margin or background. No layout thrashing.

### The six modules

| Module | Job |
|---|---|
| `reveal` | Element enters along one axis. The default entrance. |
| `maskReveal` | Element is uncovered by a clip-path edge. Type does not move. `bleed: true` switches to the type mask, which extends past the text box so ascenders and descenders are never clipped at rest. |
| `textReveal` | The heading system. Each line of a heading is mask-revealed in reading order at the base interval. |
| `compress` | The one continuous behaviour on editorial headings. Multi-line headings drift their lines apart horizontally (first right, last left); single-line headings drift right. X axis only, one-way, linear, bound 1:1 to scroll over a clamped range, half a gutter at the outermost line. |
| `align` | Scroll-linked one-way travel from an element's typeset position to a measured alignment target above it. |
| `odometer` | A mechanical digit roll for changing metrics. Each digit position becomes a masked strip that rolls forward; non-digit characters hold their place, so alignment, typography and width are preserved. Digits stagger right to left at the tight interval. |
| `sequence` | A set of siblings resolves in reading order — the domino. Composes any per-element factory. |
| `parallax` | Scroll-bound displacement. Linear, bound 1:1 to scroll, capped at one column. |
| `hover` | Pointer intent. Arrives on the primary curve, withdraws on the secondary. Bound to focus as well as pointer. |
| `transition` | Page and view change. Out on exit, in on reveal, never overlapping. |

All are registered in the core registry and exposed on `ATK.motion.modules`.

---

## 4. What is implemented

`motion/motion-hero.js` composes the modules for the hero and for editorial
headings. It declares no curve, no duration and no distance of its own.

### Hero entrance — one composition

The hero is a single object coming into focus, not a sequence of elements
being introduced. Navigation, headline, supporting copy, CTA, stripe motif and
corner marks all begin at the same instant, share `--ease-reveal`, share
`--dur-editorial` (1500ms), and settle together. There is no stagger anywhere
in the hero.

Only the treatment differs:

| Element | Treatment |
|---|---|
| Headline (both lines at once) | Type mask, wipes upward from the baseline |
| Copy, CTA | Half a gutter of vertical travel |
| Stripe motif | Mask, wipes upward from its lower edge |
| Navigation, corner marks | Opacity only, no travel — chrome does not move |

The headline is uncovered, not moved: the mask band collapses to the baseline
and wipes upward while the type stays exactly where it was typeset. The
timeline waits for `document.fonts.ready` (capped at 600ms) so a masked
headline never reveals a fallback face and then swaps.

### Hero parallax

The hero lags the page as it scrolls away. Both hero layers — the content
column and the domino band — travel down a quarter of the hero's height across
its own passage, bound 1:1 to scroll, so the section below rides up over the
hero rather than pushing it. `.focus_wrap` sits a layer above for that reason.

### Domino — the chain falls

The band behind the hero stands upright and falls left to right as the hero
scrolls out. The page loads into the upright state; scrolling advances the
chain and scrolling back reverses it exactly. Contact geometry is
unchanged — a bar can still never pass through the face of its neighbour — and
is measured from layout boxes rather than bounding rects, since the bars are
rotated at rest.

### Editorial headings — no entrance, drift only

Headings outside the hero are **never revealed**. They are fully visible, at
full opacity, in their typeset position, from the moment they exist. No fade,
no mask, no vertical movement, no delay.

Their only motion is `compress`: a horizontal drift, bound 1:1 to scroll, that
stops the instant scrolling stops. Multi-line headings drift their first line
right and their last line left, the middle holding; single-line headings drift
right. Displacement is 12px — half a gutter — at the outermost line.

The scroll range is **clamped**, so a heading already in view at load starts at
zero and begins moving on the first pixel of scroll rather than arriving
part-way through its range.

Vertical position, opacity, line-height and spacing are never touched, so a
heading is fully legible at every scroll offset.

The closing block adds one more behaviour: `→ forward` starts with its right
edge flush to `your business` above it, plus two gutters of lead-in, and
travels rightward to its typeset position as the block scrolls in (`align`) —
about 130px at desktop.

The offset is measured from the **text extent** on both sides, using a Range
rather than the element box: the reference line is a `display: block` span, so
its box is the column width, not the width of its words. Measurement happens
only once the display font has loaded — against a fallback face the widths are
wrong and the offset can zero out, silently disabling the behaviour. It is
re-measured on resize, and only runs where the layout actually indents the
line; below 992px the row sits at the page margin with no designed composition
to resolve into.

This is the one movement on the page larger than half a gutter. It is a
compositional resolution rather than ambient drift, which is why it earns the
exception.

### Process rows

Each row in `How we work` is marked with a cluster of one, three or five dots.
On hover the cluster resolves as a chain — one dot after the next at
`stagger.tight` (60ms), right to left on the way in and left to right on the
way out. A hairline of horizontal travel, no scale. This is the domino the
rest of the system is named for, at its smallest scale.

### Image parallax

Not used. The `parallax` module is registered and available, but no image on
the page carries it — the composition reads as intended without it.

### The domino

The signature interaction, at the foot of the hero. Twenty bars fall left to
right as a chain reaction, driven entirely by scroll position: scrolling down
advances the sequence, scrolling up reverses it, and the scroll offset always
states the exact frame. Bound 1:1 to scroll like every other scroll behaviour,
over the hero's own passage.

Rhythm and geometry are read from the Figma reference, with its collision
flaw corrected:

- each bar pivots on its bottom-right edge, so its front face stays anchored
  and two parallel bars can never intersect
- the wave releases each bar in turn, but the handoff is **contact-driven**,
  not staggered: every frame the raw angles are clamped from the far end
  backwards against `θ ≤ φ + asin((p − w)·cosφ / h)`, the greatest angle a bar
  can hold before its top corner would cross the back face of the one in
  front
- a bar therefore cannot advance past the face of its neighbour, and the
  instant that neighbour starts to move it is free to continue — no pause,
  no intersection, at any scroll position or scroll direction
- geometry is measured from the DOM at bind and on refresh, so the limits
  stay correct at every width
- the fall runs on `--ease-exit`, accelerating into the impact that starts
  the next bar rather than easing out into a stop
- they come to rest at 78°, shingled onto one another just short of flat

Rotation is the one place this system uses it. It is the physical subject of
the piece rather than a decorative flourish, and it is confined to this module.

Under reduced motion the bars stay upright and the fall is dropped — the
composition is preserved, nothing is hidden.

### Stacked slides

The case studies present their items as full-height slides. When a slide
reaches the top of the viewport its frame pins and its content tilts back 40°
into a 250vw perspective while scaling to 0.7, then fades over the last 20vh
as the next slide arrives over the top of it. Bound 1:1 to scroll; scrolling up
reverses it exactly. The fade is folded into the pinned timeline — it runs
over the last fifth of the pin — so a slide is fully gone before its frame
releases and the section below is never revealed underneath a visible card.

The module is generic — any section marked with `[data-stack-slide]`,
`[data-stack-frame]` and `[data-stack-content]` inherits it — but only the case
studies use it. The process section is deliberately static. The fall-away runs
on `--ease-exit`, the same curve as the domino and every other leaving
movement.

The reference applies a small random Z rotation per slide. It is left out
deliberately — nothing else here rotates for effect, and a random value cannot
belong to a system. Depth comes from rotationX and scale alone.

Under reduced motion the slides stay in place and readable; nothing pins.

### Page transitions

Architecture is the Osmo overlapping parallax transition, preserved as
supplied: the same Barba hooks, the same `once`/`leave`/`enter` contract, the
same layering and the same data attributes. One thing is adapted — every curve
and duration is a motion token rather than a literal.

The two pages move at once, at different speeds. The outgoing page recedes 25vh
while the incoming page covers the full 100vh, so the new page reads as passing
over the old one rather than replacing it. A veil fades to 80% over the
outgoing page to deepen the sense of it receding, and resets at the end of
leave so it is ready for the next navigation.

Both run for `page` (1200ms) on `--ease-parallax`, a weighted symmetric curve
used nowhere else. Under reduced motion the whole thing collapses to an
immediate swap.

Barba is loaded lazily and only once the page actually links somewhere else, so
a single-page build never fetches it.

## 5. How future interactions inherit this

Two routes, both of which make the rules unavoidable.

**Declarative — attributes in the markup.** `motion-init.js` scans for
`[data-motion]` and builds the animation from tokens:

```html
<h2 class="work_title" data-motion="maskReveal" data-motion-edge="bottom"></h2>

<div class="work_list"
     data-motion="sequence"
     data-motion-children=".work_row"
     data-motion-stagger="base"
     data-motion-axis="y"
     data-motion-distance="md"></div>
```

The attributes accept token *names*, not values — `data-motion-distance="md"`,
not `data-motion-distance="24"`. An off-system number cannot be expressed.

**Programmatic — call a module.** For anything the attribute contract does not
cover, call the factory and pass token references:

```js
ATK.motion.modules.parallax(image, {
  axis: "y",
  distance: ATK.motion.tokens.distance.parallax
});
```

Either way the animation inherits the registered easing, the shared durations,
the grid-derived distances, the scroll thresholds, the reduced-motion policy
and the `will-change` lifecycle. Changing `--ease-primary` or
`--dur-editorial` in one place restyles every animation on the site at once.

---

## 6. Spec deviation

`Claude Design Webflow Spec §10` requires vanilla JS with no frameworks. GSAP
is used here as an explicit, scoped exception: sequenced timelines, scrubbed
scroll and clip-path interpolation are the spec's own listed cases for valid
custom JavaScript (§12), and GSAP is a library rather than a framework — it
owns no markup, no state and no rendering. It is loaded from CDN as a Webflow
custom-code embed in the page `<head>`/before `</body>`, and the motion modules
manipulate transform, opacity and clip-path only, so they do not fight IX2.

If GSAP is not acceptable, `motion-core.js` is the only file that touches the
GSAP API; the token set, the module contract and the markup attributes would
carry over to a Web Animations API implementation unchanged.
