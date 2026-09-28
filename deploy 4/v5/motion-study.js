/* ==========================================================================
   Autokatalyst — case study page motion

   The full-width banner picture is cropped by its frame and drifts vertically
   inside it as the frame crosses the viewport. The frame itself never moves,
   so nothing in the page flow is displaced.

   The picture is set taller than its frame by twice the travel, and runs from
   the top of that overshoot to the bottom of it across the frame's whole
   passage — bound 1:1 to scroll, so it stops the instant scrolling stops. The
   travel is measured from the two boxes on every refresh rather than counted
   in pixels, so no edge is ever uncovered at any width. Vertical only.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  function initStudy() {
    if (!core || !core.hasScrollTrigger || !core.hasScrollTrigger()) return;
    if (core.prefersReducedMotion()) return;

    document.querySelectorAll("[data-study-crop] > img").forEach(function (picture) {
      if (!core.guard(picture, "StudyCrop")) return;

      var frame = picture.parentNode;

      /* Half the overshoot: the picture starts that far above its resting
         place and ends the same distance below it. */
      function reach() {
        return Math.max(0, (picture.offsetHeight - frame.offsetHeight) / 2);
      }

      window.gsap.fromTo(picture, { y: function () { return -reach(); } }, {
        y: function () { return reach(); },
        ease: core.ease.linear,
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: tokens.scroll.scrubDirect,
          invalidateOnRefresh: true
        }
      });
    });
  }

  namespace.study = { init: initStudy };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStudy);
  } else {
    initStudy();
  }

  /* A page transition swaps the container, so the shared entry point runs
     again on the new markup. */
  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initStudy();
    };
  }
})(window.ATK.motion);
