/* ==========================================================================
   Autokatalyst — motion tokens (JS mirror)
   Values here MUST match motion.css. CSS owns declarative transitions,
   JS owns sequenced and scroll-bound motion; both read the same numbers.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

window.ATK.motion.tokens = {

  /* Easing — GSAP CustomEase strings are registered in motion-core.js.
     Until then these are the raw cubic-bezier control points. */
  ease: {
    primary: [0.33, 0.02, 0.18, 1],
    secondary: [0.65, 0.05, 0.36, 1],
    reveal: [0.28, 0.06, 0.16, 1],
    response: [0.16, 1, 0.3, 1],
    parallax: [0.7, 0.05, 0.13, 1],
    exit: [0.76, 0, 0.9, 0.2],
    linear: "none"
  },

  /* Duration, in seconds (GSAP's unit) */
  duration: {
    hover: 0.28,
    fast: 0.42,
    standard: 0.7,
    editorial: 1.5,
    mask: 1.5,
    opacity: 0.52,
    page: 1.2
  },

  /* Stagger, in seconds */
  stagger: {
    tight: 0.06,
    base: 0.13,
    loose: 0.22
  },

  /* Distance, in pixels — derived from the 24px gutter / 118px column grid */
  distance: {
    hairline: 4,
    sm: 12,
    md: 24,
    lg: 48,
    parallax: 118
  },

  /* Scroll */
  scroll: {
    scrub: 1.2,
    scrubDirect: true,
    driftStart: "clamp(top bottom)",
    driftEnd: "clamp(bottom top)",
    alignStart: "clamp(top bottom)",
    alignEnd: "clamp(center center)",
    dominoStart: "top top",
    dominoEnd: "center top",
    heroParallax: 0.25,
    start: "top 85%",
    rowsStart: "top 60%",
    end: "bottom 15%",
    parallaxStart: "top bottom",
    parallaxEnd: "bottom top",
    once: true
  },

  /* Mask geometry — vertical and horizontal only */
  mask: {
    fromBottom: "inset(0% 0% 100% 0%)",
    fromTop: "inset(100% 0% 0% 0%)",
    fromLeft: "inset(0% 100% 0% 0%)",
    fromRight: "inset(0% 0% 0% 100%)",
    shown: "inset(0% 0% 0% 0%)",

    /* Type masks bleed past the text box so ascenders and descenders are
       never clipped at rest. */
    typeHidden: "inset(100% -0.06em -0.18em -0.06em)",
    typeHiddenX: "inset(-0.28em 100% -0.18em -0.06em)",
    typeShown: "inset(-0.28em -0.06em -0.18em -0.06em)"
  },

  /* Permitted axes. Diagonal movement is not part of this language. */
  axis: {
    x: "x",
    y: "y"
  }
};
