/* ==========================================================================
   Autokatalyst — motion init
   The single entry point. Boots the system, then binds any element that
   opts in via data-motion.

   No element in the page carries data-motion yet, so nothing animates.
   Adding an interaction later means adding attributes to the markup —
   not writing a new animation from scratch.

   Markup contract:
     data-motion="reveal"            module name (required)
     data-motion-axis="y|x"          movement axis
     data-motion-distance="sm|md|lg" grid-derived distance token
     data-motion-duration="fast|standard|editorial|mask"
     data-motion-edge="bottom|top|left|right"   mask reveals only
     data-motion-stagger="tight|base|loose"     sequences only
     data-motion-children="<selector>"          sequences only
     data-motion-trigger="<selector>"           overrides the scroll trigger
   ========================================================================== */

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  function readDistance(element) {
    var key = element.dataset.motionDistance || "md";
    return tokens.distance[key] !== undefined ? tokens.distance[key] : tokens.distance.md;
  }

  function readDuration(element, fallback) {
    var key = element.dataset.motionDuration;
    return key && tokens.duration[key] !== undefined ? tokens.duration[key] : fallback;
  }

  function readStagger(element) {
    var key = element.dataset.motionStagger || "base";
    return tokens.stagger[key] !== undefined ? tokens.stagger[key] : tokens.stagger.base;
  }

  function readAxis(element) {
    return element.dataset.motionAxis === "x" ? tokens.axis.x : tokens.axis.y;
  }

  function readTrigger(element) {
    var selector = element.dataset.motionTrigger;
    return selector ? document.querySelector(selector) : element;
  }

  function bind(element) {
    var name = element.dataset.motion;
    var factory = core.get(name);
    if (!factory) return;

    if (name === "sequence") {
      var childSelector = element.dataset.motionChildren;
      var children = childSelector ? core.scoped(element, childSelector) : core.toArray(element.children);
      factory(children, {
        interval: readStagger(element),
        trigger: readTrigger(element),
        each: function (child) {
          return core.get("reveal")(child, {
            axis: readAxis(element),
            distance: readDistance(element),
            duration: readDuration(element, tokens.duration.editorial),
            trigger: null
          });
        }
      });
      return;
    }

    factory(element, {
      axis: readAxis(element),
      distance: readDistance(element),
      duration: readDuration(element, tokens.duration.editorial),
      edge: element.dataset.motionEdge || "bottom",
      trigger: readTrigger(element)
    });
  }

  function initMotion() {
    if (!core.boot()) {
      /* Failsafe: if GSAP never arrives, release every armed element so the
         page is fully readable rather than partly invisible. */
      core.disarm(".is-motion-ready");
      core.disarm(".is-motion-masked");
      core.disarm(".is-motion-masked-type");
      document.documentElement.dataset.motion = "unavailable";
      return;
    }

    document.documentElement.dataset.motion = core.prefersReducedMotion() ? "reduced" : "ready";

    document.querySelectorAll("[data-motion]").forEach(function (element) {
      if (!core.guard(element, "Bound")) return;
      bind(element);
    });

    if (namespace.hero && namespace.hero.init) namespace.hero.init();
    if (namespace.focusList && namespace.focusList.init) namespace.focusList.init();
    if (namespace.dimGroups && namespace.dimGroups.init) namespace.dimGroups.init();
    if (namespace.stack && namespace.stack.init) namespace.stack.init();
    if (namespace.domino && namespace.domino.init) namespace.domino.init();
    if (namespace.transitions && namespace.transitions.init) namespace.transitions.init();

    core.refresh();
  }

  namespace.init = initMotion;

  document.addEventListener("DOMContentLoaded", function () {
    initMotion();
  });
})(window.ATK.motion);
