/* ==========================================================================
   Autokatalyst — about page motion

   The perforated overlay on the dark band is set on the eighth column and
   drifts right as the band passes through the viewport, coming to rest one
   gutter clear of the right edge of the statement it crosses.

   The range is the band's own passage: the drift begins the moment the band
   first appears at the foot of the viewport and finishes when the band's
   centre reaches the viewport's centre, so the movement is spent by the time
   the reader is looking straight at it. Bound 1:1 to scroll, so it stops the
   instant scrolling stops.

   The distance is measured from the two elements themselves rather than
   counted in columns, and re-measured on refresh, so the overlay lands one
   gutter clear of the statement's edge at every width. Horizontal only.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  function initAbout() {
    if (!core || !core.hasScrollTrigger || !core.hasScrollTrigger()) return;
    if (core.prefersReducedMotion()) return;

    document.querySelectorAll("[data-about-overlay]").forEach(function (overlay) {
      if (!core.guard(overlay, "AboutOverlay")) return;

      var band = overlay.closest("[data-about-band]");
      if (!band) return;

      var mark = band.querySelector("[data-about-mark]");
      if (!mark) return;

      /* The overlay comes to rest one gutter clear of the mark's trailing edge,
         measured from the two elements rather than counted in columns, so it
         lands correctly at any width. Below the desktop breakpoint the overlay
         is withheld and has no box to measure, so the drift resolves to
         nothing. */
      function travel() {
        if (!overlay.offsetParent && overlay.style.position !== "fixed") return 0;

        var gutter = parseFloat(window.getComputedStyle(overlay.parentNode).columnGap) || 0;
        var current = window.gsap.getProperty(overlay, "x") || 0;
        var from = overlay.getBoundingClientRect().left - current;

        return Math.max(0, mark.getBoundingClientRect().right + gutter - from);
      }

      window.gsap.fromTo(overlay, { x: 0 }, {
        x: travel,
        ease: core.ease.linear,
        scrollTrigger: {
          trigger: band,
          start: "top bottom",
          end: "center center",
          scrub: tokens.scroll.scrubDirect,
          invalidateOnRefresh: true
        }
      });
    });
  }

  namespace.about = { init: initAbout };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAbout);
  } else {
    initAbout();
  }

  /* A page transition swaps the container, so the shared entry point runs
     again on the new markup. */
  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initAbout();
    };
  }
})(window.ATK.motion);
