/* ==========================================================================
   Autokatalyst — motion core
   Owns: GSAP registration, easing registration, reduced-motion policy,
   global defaults, the module registry, and performance hygiene.

   Nothing in this file animates anything. It only makes motion possible
   and guarantees every animation in the project starts from the same rules.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var tokens = namespace.tokens;
  var registry = {};
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------------
     Capability
     ------------------------------------------------------------------ */

  function hasGsap() {
    return typeof window.gsap !== "undefined";
  }

  function hasScrollTrigger() {
    return hasGsap() && typeof window.ScrollTrigger !== "undefined";
  }

  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  /* ------------------------------------------------------------------
     Easing
     Registered as named GSAP eases so no animation ever inlines a curve.
     ------------------------------------------------------------------ */

  /* CSS form — for parity with motion.css and for any inline transition. */
  function toCssEase(points) {
    if (points === "none") return "linear";
    return "cubic-bezier(" + points.join(", ") + ")";
  }

  /* CustomEase form — a bare comma-separated control-point list. */
  function toCustomEase(points) {
    return points.join(", ");
  }

  var cssEase = {
    primary: toCssEase(tokens.ease.primary),
    secondary: toCssEase(tokens.ease.secondary),
    reveal: toCssEase(tokens.ease.reveal),
    response: toCssEase(tokens.ease.response),
    parallax: toCssEase(tokens.ease.parallax),
    exit: toCssEase(tokens.ease.exit),
    linear: "linear"
  };

  /* GSAP form. Starts on parseable stock eases so tweens are never left with
     an unusable value if CustomEase is missing, then upgrades to the exact
     registered curves once CustomEase is available. */
  var ease = {
    primary: "power2.out",
    secondary: "power1.inOut",
    reveal: "power3.out",
    response: "expo.out",
    parallax: "power3.inOut",
    exit: "power3.in",
    linear: "none"
  };

  var EASE_NAMES = {
    primary: "atk-primary",
    secondary: "atk-secondary",
    reveal: "atk-reveal",
    response: "atk-response",
    parallax: "atk-parallax",
    exit: "atk-exit"
  };

  function registerEases() {
    if (!hasGsap() || typeof window.CustomEase === "undefined") return false;
    try {
      window.gsap.registerPlugin(window.CustomEase);
      Object.keys(EASE_NAMES).forEach(function (key) {
        window.CustomEase.create(EASE_NAMES[key], toCustomEase(tokens.ease[key]));
        ease[key] = EASE_NAMES[key];
      });
      return true;
    } catch (error) {
      if (window.console && window.console.warn) {
        window.console.warn("ATK motion: CustomEase unavailable, falling back to stock eases.", error);
      }
      return false;
    }
  }

  /* ------------------------------------------------------------------
     Global defaults
     Every tween inherits these unless it states otherwise.
     ------------------------------------------------------------------ */

  function applyDefaults() {
    if (!hasGsap()) return;

    window.gsap.defaults({
      ease: ease.primary,
      duration: tokens.duration.standard,
      overwrite: "auto"
    });

    if (hasScrollTrigger()) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.defaults({
        start: tokens.scroll.start,
        end: tokens.scroll.end,
        toggleActions: "play none none none"
      });
      window.ScrollTrigger.config({ ignoreMobileResize: true });
    }
  }

  /* ------------------------------------------------------------------
     Reduced motion
     The system never simply disables itself — it collapses to the end
     state so hierarchy and reading order stay intact.
     ------------------------------------------------------------------ */

  function resolveDuration(seconds) {
    return prefersReducedMotion() ? 0 : seconds;
  }

  function resolveDistance(pixels) {
    return prefersReducedMotion() ? 0 : pixels;
  }

  function resolveStagger(seconds) {
    return prefersReducedMotion() ? 0 : seconds;
  }

  /* ------------------------------------------------------------------
     Axis discipline
     Movement is horizontal or vertical. Never both at once.
     ------------------------------------------------------------------ */

  function offset(axis, distance) {
    var value = resolveDistance(distance);
    return axis === tokens.axis.x ? { x: value, y: 0 } : { x: 0, y: value };
  }

  /* ------------------------------------------------------------------
     Performance hygiene
     will-change is promoted for the life of a tween and released after,
     so nothing sits on a compositor layer permanently.
     ------------------------------------------------------------------ */

  function promote(target) {
    var elements = toArray(target);
    elements.forEach(function (element) {
      element.classList.add("is-motion-active");
      element.classList.remove("is-motion-settled");
    });
  }

  function release(target) {
    var elements = toArray(target);
    elements.forEach(function (element) {
      element.classList.remove("is-motion-active");
      element.classList.add("is-motion-settled");
    });
  }

  function withPromotion(target, vars) {
    var settings = Object.assign({}, vars);
    var onStart = settings.onStart;
    var onComplete = settings.onComplete;

    settings.onStart = function () {
      promote(target);
      if (onStart) onStart.apply(this, arguments);
    };
    settings.onComplete = function () {
      release(target);
      if (onComplete) onComplete.apply(this, arguments);
    };

    return settings;
  }

  /* ------------------------------------------------------------------
     Reveal-state helpers
     Initial states are applied by JS only, so a scriptless or failed
     load never leaves content hidden.
     ------------------------------------------------------------------ */

  function arm(target, mask) {
    toArray(target).forEach(function (element) {
      element.classList.add("is-motion-ready");
      if (mask === "type") element.classList.add("is-motion-masked-type");
      else if (mask) element.classList.add("is-motion-masked");
    });
  }

  function armMaskOnly(target, mask) {
    toArray(target).forEach(function (element) {
      if (mask === "type") element.classList.add("is-motion-masked-type");
      else element.classList.add("is-motion-masked");
    });
  }

  function disarm(target) {
    toArray(target).forEach(function (element) {
      element.classList.remove("is-motion-ready");
      element.classList.remove("is-motion-masked");
      element.classList.remove("is-motion-masked-type");
    });
  }

  /* ------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------ */

  function toArray(target) {
    if (!target) return [];
    if (typeof target === "string") return Array.prototype.slice.call(document.querySelectorAll(target));
    if (target instanceof Element) return [target];
    return Array.prototype.slice.call(target);
  }

  function scoped(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function guard(root, key) {
    var flag = "motion" + key;
    if (root.dataset[flag]) return false;
    root.dataset[flag] = "true";
    return true;
  }

  function refresh() {
    if (hasScrollTrigger()) window.ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------
     Module registry
     Every future animation registers here. Nothing binds itself.
     ------------------------------------------------------------------ */

  function register(name, factory) {
    registry[name] = factory;
  }

  function get(name) {
    return registry[name];
  }

  function list() {
    return Object.keys(registry);
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  function boot() {
    if (!hasGsap()) return false;
    try {
      registerEases();
    } catch (error) {
      if (window.console && window.console.warn) {
        window.console.warn("ATK motion: easing registration failed.", error);
      }
    }
    applyDefaults();
    return true;
  }

  namespace.core = {
    boot: boot,
    hasGsap: hasGsap,
    hasScrollTrigger: hasScrollTrigger,
    prefersReducedMotion: prefersReducedMotion,
    ease: ease,
    cssEase: cssEase,
    resolveDuration: resolveDuration,
    resolveDistance: resolveDistance,
    resolveStagger: resolveStagger,
    offset: offset,
    promote: promote,
    release: release,
    withPromotion: withPromotion,
    arm: arm,
    armMaskOnly: armMaskOnly,
    disarm: disarm,
    toArray: toArray,
    scoped: scoped,
    guard: guard,
    refresh: refresh,
    register: register,
    get: get,
    list: list
  };
})(window.ATK.motion);
