/* ==========================================================================
   Autokatalyst — image stream

   The scattered pictures are one slow continuous stream travelling upward.
   Not parallax: no tile's position is ever read from the scroll offset.

   One system, two inputs
   ----------------------
   A single velocity drives every tile. It has a base value that never falls
   to zero, and a boost that scroll velocity adds on top. Scrolling therefore
   pushes a stream that was already moving; letting go lets it settle back to
   its base speed rather than stopping.

     speed → eased toward (base + boost)
     boost → set from scroll velocity, decaying every frame
     y     → accumulates from speed; never assigned from scrollY

   Position is an accumulation, so the stream has no end state to arrive at
   and no reset to animate. Each tile carries a small multiplier, so the field
   has depth while staying one flow.

   Recycling
   ---------
   The canvas clips. Once a tile has travelled fully past the canvas's top
   edge it is invisible, and that is where it is returned to the foot of the
   canvas — a single silent assignment, never a tween. The stream is
   therefore unbounded: the reader is moving through a much larger canvas
   than the section that frames it.

   Everything is expressed per second and scaled by the real frame delta, so
   the speed is the same on any display, and the loop parks itself while the
   section is off screen.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;

  /* Base speed, px per second. Slow enough that the displacement reads over
     several seconds rather than moment to moment. */
  var BASE = 20;

  /* Scroll velocity, px/s, converted to extra stream speed, px/s. */
  var BOOST_FROM_SCROLL = 0.0425;
  var BOOST_MAX = 41;

  /* Per-second decay of the boost once scrolling stops, and the per-second
     rate at which the stream approaches its target speed. Both are gentle:
     the acceleration is never abrupt and the settle is never a bounce. */
  var BOOST_DECAY = 0.02;
  var APPROACH = 3.5;

  var MARGIN = 24;

  /* The fade band at each end of the canvas, in px. */
  var FADE = 96;

  function initStream() {
    if (!core || !core.prefersReducedMotion) return;
    if (core.prefersReducedMotion()) return;

    document.querySelectorAll("[data-galaxy]").forEach(function (field) {
      if (!core.guard || !core.guard(field, "GalaxyStream")) return;

      var tiles = Array.prototype.slice.call(field.querySelectorAll("[data-galaxy-tile]"));
      if (!tiles.length) return;

      var items = tiles.map(function (tile) {
        return {
          el: tile,
          multiplier: parseFloat(tile.dataset.galaxySpeed) || 1,
          baseTop: 0,
          height: 0,
          y: 0,
          opacity: 1
        };
      });

      var fieldHeight = 0;
      var speed = BASE;
      var boost = 0;
      var lastScroll = window.scrollY;
      var lastTime = 0;
      var onScreen = true;
      var frameId = null;

      function measure() {
        fieldHeight = field.offsetHeight;
        items.forEach(function (item) {
          item.baseTop = item.el.offsetTop;
          item.height = item.el.offsetHeight;
        });
      }

      function paint() {
        items.forEach(function (item) {
          item.el.style.transform = "translate3d(0, " + item.y.toFixed(2) + "px, 0)";
          item.el.style.opacity = item.opacity.toFixed(3);
        });
      }

      /* 0 at the canvas's top edge, 1 once the tile is a full band clear of it. */
      function edgeFade(item) {
        var bottom = item.baseTop + item.y + item.height;
        return Math.max(0, Math.min(bottom / FADE, 1));
      }

      function step(time) {
        frameId = window.requestAnimationFrame(step);

        if (!lastTime) lastTime = time;
        /* Clamp the delta so a backgrounded tab does not jump the stream. */
        var delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        if (!delta) return;

        /* Scroll contributes velocity, never position. */
        var scroll = window.scrollY;
        var scrolled = Math.abs(scroll - lastScroll);
        lastScroll = scroll;
        if (scrolled) {
          var candidate = Math.min((scrolled / delta) * BOOST_FROM_SCROLL, BOOST_MAX);
          if (candidate > boost) boost = candidate;
        }
        boost *= Math.pow(BOOST_DECAY, delta);
        if (boost < 0.5) boost = 0;

        speed += ((BASE + boost) - speed) * Math.min(APPROACH * delta, 1);

        var travel = speed * delta;

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          item.y -= travel * item.multiplier;
          /* Fully past the clipped top edge: return it below the foot, clear of
             the canvas by a margin, so it fades in on the way rather than
             appearing already inside the frame. The distance includes the
             tile's own height, so it is per tile. */
          while (item.baseTop + item.y + item.height < -MARGIN) {
            item.y += fieldHeight + item.height + (MARGIN * 2);
          }
          /* After the recycle, so opacity and position always agree. */
          item.opacity = edgeFade(item);
        }

        if (onScreen) paint();
      }

      measure();
      items.forEach(function (item) { item.opacity = edgeFade(item); });
      paint();

      /* The stream keeps its own time while off screen — it simply is not
         painted, so no layout work happens for a section nobody can see. */
      if (typeof window.IntersectionObserver === "function") {
        new window.IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting;
        }, { rootMargin: "20% 0px" }).observe(field);
      }

      var timer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(measure, 250);
      });

      frameId = window.requestAnimationFrame(step);
    });
  }

  namespace.galaxy = { init: initStream };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStream);
  } else {
    initStream();
  }

  /* A page transition swaps the container, so the shared entry point runs
     again on the new markup. This module has to follow it, or a field arrived
     at from another page comes in unbound. */
  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initStream();
    };
  }
})(window.ATK.motion);
