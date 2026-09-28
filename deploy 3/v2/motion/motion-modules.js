/* ==========================================================================
   Autokatalyst — motion modules
   Six factories. Every future animation in this project is built by calling
   one of them; none of them bind themselves to the page.

   reveal      — element enters along one axis
   maskReveal  — element is uncovered by a clip-path edge
   sequence    — a set of elements resolves in order (the domino)
   parallax    — scroll-bound displacement, linear only
   hover       — pointer intent, never decoration
   transition  — page and view changes

   Rules enforced here, not by the caller:
   · one axis per movement, never diagonal
   · opacity resolves faster than the transform it accompanies
   · scroll-bound motion is linear and scrubbed
   · reduced motion collapses distance and duration, never hides content
   · will-change is promoted for the tween and released after
   ========================================================================== */

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  /* ------------------------------------------------------------------
     reveal
     The default entrance. A short, single-axis displacement with the
     fade already finished before the movement settles.

     reveal(target, {
       axis: "y" | "x",
       distance: tokens.distance.md,
       duration: tokens.duration.editorial,
       delay: 0,
       ease: core.ease.primary,
       trigger: Element | null      // scroll-triggered when provided
     })
     ------------------------------------------------------------------ */

  function reveal(target, options) {
    if (!core.hasGsap()) return null;

    var settings = Object.assign({
      axis: tokens.axis.y,
      distance: tokens.distance.md,
      duration: tokens.duration.editorial,
      delay: 0,
      ease: core.ease.primary,
      scroll: true,
      trigger: null
    }, options || {});

    var elements = core.toArray(target);
    if (!elements.length) return null;

    var from = core.offset(settings.axis, settings.distance);

    core.arm(elements, false);

    var tween = window.gsap.fromTo(
      elements,
      { x: from.x, y: from.y, autoAlpha: 0 },
      core.withPromotion(elements, {
        x: 0,
        y: 0,
        autoAlpha: 1,
        duration: core.resolveDuration(settings.duration),
        delay: settings.delay,
        ease: settings.ease,
        scrollTrigger: settings.scroll ? buildTrigger(settings.trigger || elements[0]) : undefined,
        onComplete: function () {
          core.disarm(elements);
        }
      })
    );

    return tween;
  }

  /* ------------------------------------------------------------------
     maskReveal
     For typography and imagery. The mask edge travels along one axis;
     the element itself does not move, so the type never drifts.

     maskReveal(target, { edge: "bottom" | "top" | "left" | "right", ... })
     ------------------------------------------------------------------ */

  var MASK_EDGES = {
    bottom: tokens.mask.fromBottom,
    top: tokens.mask.fromTop,
    left: tokens.mask.fromLeft,
    right: tokens.mask.fromRight
  };

  function maskReveal(target, options) {
    if (!core.hasGsap()) return null;

    var settings = Object.assign({
      edge: "bottom",
      bleed: false,
      duration: tokens.duration.mask,
      delay: 0,
      ease: core.ease.reveal,
      scroll: true,
      trigger: null
    }, options || {});

    var elements = core.toArray(target);
    if (!elements.length) return null;

    var closed = settings.bleed
      ? tokens.mask.typeHidden
      : (MASK_EDGES[settings.edge] || tokens.mask.fromBottom);
    var open = settings.bleed ? tokens.mask.typeShown : tokens.mask.shown;

    core.armMaskOnly(elements, settings.bleed ? "type" : "box");

    return window.gsap.fromTo(
      elements,
      { clipPath: closed },
      core.withPromotion(elements, {
        clipPath: open,
        duration: core.resolveDuration(settings.duration),
        delay: settings.delay,
        ease: settings.ease,
        scrollTrigger: settings.scroll ? buildTrigger(settings.trigger || elements[0]) : undefined,
        onComplete: function () {
          core.disarm(elements);
          window.gsap.set(elements, { clearProps: "clipPath" });
        }
      })
    );
  }
  /* ------------------------------------------------------------------
     textReveal
     The heading system. Each line is uncovered by a type-bleed mask, in
     reading order, at the base interval. The type itself never moves.

     textReveal(heading, { lines: "[data-motion-line]", ... })
     ------------------------------------------------------------------ */

  function textReveal(target, options) {
    if (!core.hasGsap()) return null;

    var settings = Object.assign({
      lines: "[data-motion-line]",
      interval: tokens.stagger.base,
      duration: tokens.duration.mask,
      delay: 0,
      ease: core.ease.reveal,
      scroll: true,
      trigger: null
    }, options || {});

    var heading = core.toArray(target)[0];
    if (!heading) return null;

    var lines = core.scoped(heading, settings.lines);
    if (!lines.length) lines = [heading];

    var interval = core.resolveStagger(settings.interval);
    var timeline = window.gsap.timeline({
      delay: settings.delay,
      scrollTrigger: settings.scroll ? buildTrigger(settings.trigger || heading) : undefined
    });

    lines.forEach(function (line, index) {
      var tween = maskReveal(line, {
        bleed: true,
        duration: settings.duration,
        ease: settings.ease,
        scroll: false
      });
      if (tween) timeline.add(tween, index * interval);
    });

    return timeline;
  }

  /* ------------------------------------------------------------------
     compress
     The one continuous behaviour on large editorial headings. Lines drift
     horizontally as the block passes through the viewport, so the
     composition reads as gently tightening.

     X axis only — vertical position, opacity, line-height and spacing are
     never touched, so a heading is fully legible at every scroll offset.

     Multi-line: the first line drifts right, the last drifts left, the
     middle holds. Single line: it drifts right.

     One-way and linear across the whole passage, bound 1:1 to scroll, so
     the movement begins the moment the heading is on screen and stops the
     instant scrolling stops. The range is clamped, so a heading that is
     already in view at load still starts from zero.
     ------------------------------------------------------------------ */

  function compress(target, options) {
    if (!core.hasScrollTrigger()) return null;
    if (core.prefersReducedMotion()) return null;

    var settings = Object.assign({
      lines: "[data-motion-line]",
      distance: tokens.distance.sm,
      trigger: null,
      scrub: tokens.scroll.scrubDirect
    }, options || {});

    var heading = core.toArray(target)[0];
    if (!heading) return null;

    var lines = core.scoped(heading, settings.lines);
    if (!lines.length) lines = [heading];

    var distance = core.resolveDistance(settings.distance);
    var timeline = window.gsap.timeline({
      scrollTrigger: {
        trigger: settings.trigger || heading,
        start: tokens.scroll.driftStart,
        end: tokens.scroll.driftEnd,
        scrub: settings.scrub
      }
    });

    if (lines.length === 1) {
      timeline.fromTo(lines[0], { x: 0 }, {
        x: distance,
        duration: 1,
        ease: core.ease.linear
      }, 0);
      return timeline;
    }

    var mid = (lines.length - 1) / 2;

    lines.forEach(function (line, index) {
      var factor = (mid - index) / mid;
      if (!factor) return;
      timeline.fromTo(line, { x: 0 }, {
        x: factor * distance,
        duration: 1,
        ease: core.ease.linear
      }, 0);
    });

    return timeline;
  }

  /* ------------------------------------------------------------------
     align
     A scroll-linked one-way travel from an element's typeset position to a
     measured alignment target. Used where a line should arrive flush with
     something above it. Linear and directly scrubbed, like every other
     scroll-bound movement.
     ------------------------------------------------------------------ */

  function align(target, options) {
    if (!core.hasScrollTrigger()) return null;

    var settings = Object.assign({
      from: 0,
      to: 0,
      axis: tokens.axis.x,
      trigger: null,
      scrub: tokens.scroll.scrubDirect
    }, options || {});

    var element = core.toArray(target)[0];
    if (!element || settings.from === settings.to) return null;
    if (core.prefersReducedMotion()) return null;

    var start = core.offset(settings.axis, settings.from);
    var destination = core.offset(settings.axis, settings.to);

    return window.gsap.fromTo(element, { x: start.x, y: start.y }, {
      x: destination.x,
      y: destination.y,
      ease: core.ease.linear,
      scrollTrigger: {
        trigger: settings.trigger || element,
        start: tokens.scroll.alignStart,
        end: tokens.scroll.alignEnd,
        scrub: settings.scrub
      }
    });
  }

  /* ------------------------------------------------------------------
     sequence
     The domino. A set of siblings resolves in reading order at a fixed
     interval. Use `each` for the per-element factory so a sequence can
     be built from reveals, mask reveals, or anything else.

     sequence(targets, {
       interval: tokens.stagger.base,
       from: "start" | "end",
       each: function (element, index) { return tween; }
     })
     ------------------------------------------------------------------ */

  function sequence(targets, options) {
    if (!core.hasGsap()) return null;

    var settings = Object.assign({
      interval: tokens.stagger.base,
      from: "start",
      trigger: null,
      each: null
    }, options || {});

    var elements = core.toArray(targets);
    if (!elements.length) return null;

    var ordered = settings.from === "end" ? elements.slice().reverse() : elements;
    var interval = core.resolveStagger(settings.interval);
    var timeline = window.gsap.timeline({
      scrollTrigger: buildTrigger(settings.trigger || ordered[0])
    });

    ordered.forEach(function (element, index) {
      var child = settings.each ? settings.each(element, index) : null;
      if (child) timeline.add(child, index * interval);
    });

    return timeline;
  }

  /* ------------------------------------------------------------------
     parallax
     Scroll-bound displacement along one axis. Always linear, always
     scrubbed, never further than one grid column.
     ------------------------------------------------------------------ */

  function parallax(target, options) {
    if (!core.hasScrollTrigger()) return null;

    var settings = Object.assign({
      axis: tokens.axis.y,
      distance: tokens.distance.parallax,
      trigger: null,
      scrub: tokens.scroll.scrubDirect
    }, options || {});

    var elements = core.toArray(target);
    if (!elements.length) return null;
    if (core.prefersReducedMotion()) return null;

    var travel = core.offset(settings.axis, settings.distance);

    return window.gsap.fromTo(
      elements,
      { x: -travel.x / 2, y: -travel.y / 2 },
      {
        x: travel.x / 2,
        y: travel.y / 2,
        ease: core.ease.linear,
        scrollTrigger: {
          trigger: settings.trigger || elements[0],
          start: tokens.scroll.parallaxStart,
          end: tokens.scroll.parallaxEnd,
          scrub: settings.scrub
        }
      }
    );
  }

  /* ------------------------------------------------------------------
     hover
     Pointer intent. Short, single-axis, reversible. The enter and leave
     curves are deliberately different: intent arrives on the primary
     curve, withdrawal returns on the secondary curve.
     ------------------------------------------------------------------ */

  function hover(root, options) {
    if (!core.hasGsap()) return null;

    var settings = Object.assign({
      target: null,
      axis: tokens.axis.x,
      distance: tokens.distance.sm,
      duration: tokens.duration.hover,
      vars: null
    }, options || {});

    var element = core.toArray(root)[0];
    if (!element) return null;

    var moving = settings.target ? core.toArray(settings.target) : [element];
    var to = core.offset(settings.axis, settings.distance);
    var enterVars = settings.vars || { x: to.x, y: to.y };
    var leaveVars = { x: 0, y: 0 };

    function enter() {
      window.gsap.to(moving, Object.assign({}, enterVars, {
        duration: core.resolveDuration(settings.duration),
        ease: core.ease.primary
      }));
    }

    function leave() {
      window.gsap.to(moving, Object.assign({}, leaveVars, {
        duration: core.resolveDuration(settings.duration),
        ease: core.ease.secondary
      }));
    }

    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("focusin", enter);
    element.addEventListener("focusout", leave);

    return {
      destroy: function () {
        element.removeEventListener("pointerenter", enter);
        element.removeEventListener("pointerleave", leave);
        element.removeEventListener("focusin", enter);
        element.removeEventListener("focusout", leave);
      }
    };
  }

  /* ------------------------------------------------------------------
     transition
     Page and view changes. Out uses the exit curve, in uses reveal, and
     the two never overlap — one movement finishes before the next starts.
     ------------------------------------------------------------------ */

  function transition(options) {
    if (!core.hasGsap()) return null;

    var settings = Object.assign({
      out: null,
      in: null,
      axis: tokens.axis.y,
      distance: tokens.distance.md,
      duration: tokens.duration.page
    }, options || {});

    var timeline = window.gsap.timeline();
    var travel = core.offset(settings.axis, settings.distance);
    var half = core.resolveDuration(settings.duration) / 2;

    if (settings.out) {
      timeline.to(core.toArray(settings.out), {
        x: -travel.x,
        y: -travel.y,
        autoAlpha: 0,
        duration: half,
        ease: core.ease.exit
      });
    }

    if (settings.in) {
      timeline.fromTo(
        core.toArray(settings.in),
        { x: travel.x, y: travel.y, autoAlpha: 0 },
        { x: 0, y: 0, autoAlpha: 1, duration: half, ease: core.ease.reveal }
      );
    }

    return timeline;
  }

  /* ------------------------------------------------------------------
     odometer
     A mechanical digit roll for changing metrics. Each digit position
     becomes a masked strip; the strip rolls forward to the new digit.
     Non-digit characters hold their place, so alignment, typography and
     width are preserved and nothing reflows.

     Digits stagger right to left at the tight interval, so a number reads
     as one mechanism settling rather than several counters running.

     odometer(element, "02/03", { duration, ease, stagger })
     ------------------------------------------------------------------ */

  var ODOMETER_CYCLES = 2;

  function odometerStep(element) {
    var computed = window.getComputedStyle(element);
    var lineHeight = computed.lineHeight;
    if (lineHeight === "normal") return 1.2;
    return parseFloat(lineHeight) / parseFloat(computed.fontSize);
  }

  function odometerValue(element) {
    return (element.getAttribute("data-odometer-value") || element.textContent || "").trim();
  }

  function odometerSettle(element, text) {
    element.textContent = text;
    element.setAttribute("data-odometer-value", text);
  }

  function odometer(target, newText, options) {
    if (!core.hasGsap()) return null;

    var element = core.toArray(target)[0];
    if (!element) return null;

    var current = odometerValue(element);
    if (current === newText) return null;

    if (core.prefersReducedMotion()) {
      odometerSettle(element, newText);
      return null;
    }

    var settings = Object.assign({
      duration: tokens.duration.standard,
      ease: core.ease.reveal,
      stagger: tokens.stagger.tight
    }, options || {});

    var step = odometerStep(element);
    var incoming = String(newText).split("");
    var outgoing = String(current).split("");
    var rollers = [];

    element.setAttribute("data-odometer-value", newText);
    element.innerHTML = "";

    incoming.forEach(function (character, index) {
      if (!/\d/.test(character)) {
        var stat = document.createElement("span");
        stat.className = "odometer_static";
        stat.setAttribute("data-odometer-part", "static");
        stat.style.height = step + "em";
        stat.style.lineHeight = step;
        stat.textContent = character;
        element.appendChild(stat);
        return;
      }

      var previous = outgoing[index];
      var from = /\d/.test(previous || "") ? parseInt(previous, 10) : 0;
      var to = parseInt(character, 10);

      var mask = document.createElement("span");
      mask.className = "odometer_mask";
      mask.setAttribute("data-odometer-part", "mask");
      mask.style.height = step + "em";
      mask.style.lineHeight = step;

      var roller = document.createElement("span");
      roller.className = "odometer_roller";
      roller.setAttribute("data-odometer-part", "roller");
      roller.style.lineHeight = step;

      var cells = [];
      for (var d = 0; d < 10 * ODOMETER_CYCLES; d++) cells.push(d % 10);
      roller.textContent = cells.join("\n");

      mask.appendChild(roller);
      element.appendChild(mask);

      window.gsap.set(roller, { y: -from * step + "em" });
      rollers.push({ roller: roller, target: to > from ? to : 10 + to });
    });

    var timeline = window.gsap.timeline({
      onComplete: function () {
        odometerSettle(element, newText);
      }
    });

    var interval = core.resolveStagger(settings.stagger);

    rollers.forEach(function (entry, index) {
      var order = rollers.length - 1 - index;
      timeline.to(entry.roller, {
        y: -entry.target * step + "em",
        duration: core.resolveDuration(settings.duration),
        ease: settings.ease,
        force3D: true
      }, order * interval);
    });

    return timeline;
  }

  /* ------------------------------------------------------------------
     Shared ScrollTrigger shape
     ------------------------------------------------------------------ */

  function buildTrigger(element) {
    if (!core.hasScrollTrigger() || !element) return undefined;
    return {
      trigger: element,
      start: tokens.scroll.start,
      once: tokens.scroll.once
    };
  }

  /* ------------------------------------------------------------------
     Registration
     ------------------------------------------------------------------ */

  core.register("reveal", reveal);
  core.register("maskReveal", maskReveal);
  core.register("textReveal", textReveal);
  core.register("compress", compress);
  core.register("align", align);
  core.register("odometer", odometer);
  core.register("sequence", sequence);
  core.register("parallax", parallax);
  core.register("hover", hover);
  core.register("transition", transition);

  namespace.modules = {
    reveal: reveal,
    maskReveal: maskReveal,
    textReveal: textReveal,
    compress: compress,
    align: align,
    odometer: odometer,
    sequence: sequence,
    parallax: parallax,
    hover: hover,
    transition: transition
  };
})(window.ATK.motion);
