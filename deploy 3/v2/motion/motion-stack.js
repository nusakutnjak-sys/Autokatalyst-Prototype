/* ==========================================================================
   Autokatalyst — stacked slides

   A section marked [data-stack] presents its children as full-height slides.
   When a slide reaches the top of the viewport its frame pins and its
   content tilts back into the perspective and shrinks away, so the next
   slide arrives over the top of it rather than beside it. Scroll drives the
   whole thing; scrolling up reverses it exactly.

   Used by the case studies and by the process section, so both read as the
   same gesture rather than two similar ones.

   The reference applies a small random Z rotation per slide. It is left out
   deliberately: nothing else on this site rotates for effect, and a random
   value cannot belong to a system. The depth comes from rotationX and scale
   alone, which reads as more considered.

   The fall-away runs on the exit curve, the same one the domino and every
   other leaving movement uses.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  /* Read from the reference. */
  var TILT = 40;      /* degrees of rotationX at full depth */
  var DEPTH = 0.7;    /* scale at full depth */
  var FADE_SPAN = 0.2; /* the last fifth of the pin is the fade */

  /* Slides need a full viewport to sit in. Below the desktop breakpoint the
     layout stacks and is intrinsically taller than the frame, so the section
     stays in normal flow and nothing pins. */
  var DESKTOP = "(min-width: 992px)";
  var bound = [];
  var resizeBound = false;

  function release() {
    bound.forEach(function (tween) {
      if (tween.scrollTrigger) tween.scrollTrigger.kill(true);
      tween.kill();
    });
    bound = [];
    core.toArray("[data-stack-content]").forEach(function (content) {
      window.gsap.set(content, { clearProps: "transform,opacity,visibility" });
    });
  }

  function initStackedSlides() {
    if (!core.hasGsap()) return;

    var slides = core.toArray("[data-stack-slide]");
    if (!slides.length) return;

    if (!resizeBound) {
      resizeBound = true;
      var timer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          release();
          bindSlides(slides);
          core.refresh();
        }, 250);
      });
    }

    bindSlides(slides);
  }

  function bindSlides(slides) {
    /* Reduced motion keeps every slide in place and readable. */
    if (core.prefersReducedMotion() || !core.hasScrollTrigger()) return;
    if (!window.matchMedia(DESKTOP).matches) return;

    slides.forEach(function (slide, index) {
      var frame = slide.querySelector("[data-stack-frame]");
      var content = slide.querySelector("[data-stack-content]");
      if (!frame || !content) return;

      /* The last slide reserves no space of its own: whatever follows scrolls
         up over it while it tilts away, so the closing card lands on the
         stack rather than queueing behind it. */
      var isLast = index === slides.length - 1;

      var timeline = window.gsap.timeline({
        scrollTrigger: {
          pin: frame,
          pinSpacing: !isLast,
          trigger: slide,
          start: "top top",
          end: "+=" + window.innerHeight,
          scrub: tokens.scroll.scrubDirect
        }
      })
        .to(content, {
          rotationX: TILT,
          scale: DEPTH,
          ease: core.ease.exit,
          duration: 1
        }, 0)
        /* The fade completes inside the pin, so the slide is already gone by
           the time the frame releases and the section below appears. */
        .to(content, {
          autoAlpha: 0,
          ease: core.ease.exit,
          duration: FADE_SPAN
        }, 1 - FADE_SPAN);

      bound.push(timeline);
    });
  }

  namespace.stack = { init: initStackedSlides };
})(window.ATK.motion);
