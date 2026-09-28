/* ==========================================================================
   Autokatalyst — hero and editorial heading motion

   Composes the registered modules. Declares no curve, no duration and no
   distance of its own: every value below is a token reference.

   The hero is ONE composition, not a sequence. Navigation, headline,
   supporting copy, CTA and the stripe motif all begin at the same instant,
   share the same curve and the same duration, and settle together. Only the
   treatment differs — some are uncovered by a mask, some travel half a
   gutter, some only resolve in opacity. Every part of it moves vertically or
   not at all: entrances in this system are vertical, and horizontal movement
   is reserved for continuous and state motion.

   Editorial headings elsewhere on the page are never revealed. They are
   fully visible, at full opacity, in their typeset position, from the moment
   they exist. Their only motion is a horizontal scroll-linked drift.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;
  var modules = namespace.modules;

  var FONT_TIMEOUT = 120;
  var DISPLAY_FACE = '1em "HW Cigars"';

  /* Masked type must not reveal a fallback face and then swap, but the wait is
     for the display face alone and never for the whole document's fonts: when
     that face is already available — a warm cache, a repeat visit, a page
     transition — the entrance starts in the same frame, with nothing between
     the page appearing and the composition beginning to move. */
  function whenTypeIsReady(callback) {
    if (!document.fonts || !document.fonts.load) {
      callback();
      return;
    }

    if (document.fonts.check && document.fonts.check(DISPLAY_FACE)) {
      callback();
      return;
    }

    var done = false;
    function run() {
      if (done) return;
      done = true;
      callback();
    }
    document.fonts.load(DISPLAY_FACE).then(run, run);
    window.setTimeout(run, FONT_TIMEOUT);
  }

  /* The lines travel three quarters of a grid column, so the distance is read
     off the grid the titles are set on rather than counted in pixels. Re-read on
     every entrance, so it holds at any width. */
  var TRAVEL_COLUMNS = 0.5;

  function gridColumnWidth() {
    var root = window.getComputedStyle(document.documentElement);
    var base = parseFloat(root.fontSize) || 16;

    function toPx(value, fallback) {
      var text = String(value).trim();
      var number = parseFloat(text);
      if (!number) return fallback;
      return text.indexOf("rem") > -1 ? number * base : number;
    }

    var margin = toPx(root.getPropertyValue("--page-margin"), 24);
    var gutter = toPx(root.getPropertyValue("--grid-gutter"), 24);
    var max = toPx(root.getPropertyValue("--container-max"), 1728);
    var content = Math.min(window.innerWidth, max) - (margin * 2);

    return ((content - (gutter * 11)) / 12) * TRAVEL_COLUMNS;
  }

  /* ------------------------------------------------------------------
     Hero entrance — every part at position 0
     ------------------------------------------------------------------ */

  function buildEntrance(hero, nav) {
    var heading = hero.querySelector("[data-motion-heading]");
    var copy = hero.querySelector("[data-motion-copy]");
    var cta = hero.querySelector("[data-motion-cta]");
    var motif = hero.querySelector("[data-motion-motif]");
    var marks = core.scoped(hero, "[data-motion-mark]");

    var duration = tokens.duration.editorial;
    var ease = core.ease.reveal;
    var timeline = window.gsap.timeline();

    function together(tween) {
      if (tween) timeline.add(tween, 0);
    }

    /* The navigation sits outside the swapped container, so it survives a
       page transition. It arrives once, with the first hero, and is left
       alone on every arrival after that. */
    together(nav && core.guard(nav, "NavEntrance") && modules.reveal(nav, {
      axis: tokens.axis.y,
      distance: 0,
      duration: duration,
      ease: ease,
      scroll: false
    }));

    /* The headline assembles rather than being uncovered. Each line starts
       displaced by half a gutter in the same direction it drifts on scroll —
       line one from the right, the last from the left, the middle holding —
       and resolves to its typeset position while fading up.
       data-motion-lines="reverse" flips which end each line comes from.

       The displacement rides on xPercent, measured per line so the travel
       is equal in pixels whatever the line's width. That leaves the x
       channel free for the scrubbed compression, which writes to the same
       elements and would otherwise fight this tween. */
    if (heading) {
      var lines = core.scoped(heading, "[data-motion-line]");
      var mid = (lines.length - 1) / 2;
      /* The opening row always comes in from the left; the rows after it lean
         in from the other side. data-motion-lines="reverse" flips the pair. */
      var direction = heading.dataset.motionLines === "reverse" ? 1 : -1;
      var travel = core.resolveDistance(gridColumnWidth());
      lines.forEach(function (line, index) {
        /* A title set on a single line has no pair to lean against, so it
           comes in from the right on its own. */
        var factor = lines.length === 1 ? 1 : (mid ? (((mid - index) / mid) * direction) : 0);
        var width = line.getBoundingClientRect().width || 1;
        together(window.gsap.fromTo(line, {
          xPercent: (travel / width) * 100 * factor,
          opacity: 0
        }, {
          xPercent: 0,
          opacity: 1,
          duration: core.resolveDuration(duration),
          ease: ease,
          onComplete: function () {
            core.disarm(line);
            window.gsap.set(line, { clearProps: "xPercent,opacity" });
          }
        }));
      });
    }

    together(copy && modules.reveal(copy, {
      axis: tokens.axis.y,
      distance: tokens.distance.sm,
      duration: duration,
      ease: ease,
      scroll: false
    }));

    together(cta && modules.reveal(cta, {
      axis: tokens.axis.y,
      distance: tokens.distance.sm,
      duration: duration,
      ease: ease,
      scroll: false
    }));

    together(motif && modules.maskReveal(motif, {
      edge: "top",
      duration: duration,
      ease: ease,
      scroll: false
    }));

    if (marks.length) {
      together(modules.reveal(marks, {
        axis: tokens.axis.y,
        distance: 0,
        duration: duration,
        ease: ease,
        scroll: false
      }));
    }

    return timeline;
  }

  /* ------------------------------------------------------------------
     Editorial headings
     Drift only. No reveal, no fade, no vertical movement, no delay.
     ------------------------------------------------------------------ */

  function bindHeading(heading) {
    if (heading.dataset.motionCompress === "off") return;
    modules.compress(heading, {
      distance: tokens.distance.sm
    });
  }

  /* ------------------------------------------------------------------
     Alignment
     An element marked [data-motion-align] starts with its own text flush to
     the right edge of its reference line above — plus two gutters of
     lead-in — and travels rightward to its typeset position as the block
     scrolls in.

     The offset is measured from the text extent on both sides — the
     reference line is a block, so its box is the column width, not the
     width of its words. Measurement happens only once the display font has
     loaded; against a fallback face the widths are wrong and the offset can
     zero out entirely.

     Re-measured on resize, so crossing a breakpoint cannot leave a stale
     offset behind.
     ------------------------------------------------------------------ */

  var alignTweens = [];
  var alignResizeBound = false;

  /* The reference line is a block — its box is the column width, not the
     width of the words in it. Measure the text extent on both sides so the
     two are compared on the same basis. */
  function inkRight(element) {
    var range = document.createRange();
    range.selectNodeContents(element);
    var box = range.getBoundingClientRect();
    range.detach && range.detach();
    return box.width ? box.right : element.getBoundingClientRect().right;
  }

  function measureAlign(element) {
    var scope = element.closest("[data-motion-heading]") || document;
    var reference = scope.querySelector("[data-motion-align-ref]");
    if (!reference) return 0;

    var mover = element.querySelector("[data-motion-align-target]") || element;
    var applied = window.gsap.getProperty(element, "x") || 0;

    return inkRight(reference) - (inkRight(mover) - applied);
  }

  function bindAlign() {
    alignTweens.forEach(function (tween) {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
    });
    alignTweens = [];

    core.toArray("[data-motion-align]").forEach(function (element) {
      window.gsap.set(element, { x: 0 });

      /* Only where the layout actually indents the line — on the line
         itself or on the heading that holds it. On narrower layouts both sit
         at the page margin, there is no designed composition to resolve
         into, and the travel would be absurd. */
      var scopeEl = element.closest("[data-motion-heading]");
      var indent = parseFloat(window.getComputedStyle(element).marginLeft) || 0;
      if (indent <= 0 && (!scopeEl || (parseFloat(window.getComputedStyle(scopeEl).marginLeft) || 0) <= 0)) return;

      var offset = measureAlign(element);
      if (offset >= 0) return;

      var tween = modules.align(element, {
        from: offset - tokens.distance.lg,
        to: 0,
        axis: tokens.axis.x
      });
      if (tween) alignTweens.push(tween);
    });

    if (alignResizeBound) return;
    alignResizeBound = true;

    var timer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        bindAlign();
        core.refresh();
      }, 250);
    });
  }

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  /* The entrance alone — opacity and transform, nothing measured against the
     scroll. It can therefore run the moment a page transition begins, while
     the incoming container is still held fixed, rather than waiting for the
     transition to finish. Guarded, so the later full init leaves it alone. */
  function runEntrance(scope) {
    if (!core.hasGsap()) return;

    /* During a transition both containers are in the DOM and the outgoing one
       comes first, so the arriving container is passed in and the hero is
       resolved inside it. The navigation lives outside the swapped container,
       so it is always resolved from the document. */
    var hero = (scope || document).querySelector("[data-motion-hero]");
    var nav = document.querySelector("[data-motion-nav]");

    whenTypeIsReady(function () {
      if (hero && core.guard(hero, "HeroEntrance")) {
        buildEntrance(hero, nav);
      } else if (nav && core.guard(nav, "NavEntrance")) {
        /* Pages without a hero still need the navigation to arrive. */
        modules.reveal(nav, {
          axis: tokens.axis.y,
          distance: 0,
          duration: tokens.duration.editorial,
          ease: core.ease.reveal,
          scroll: false
        });
      }
    });
  }

  function initHeroMotion() {
    if (!core.hasGsap()) return;

    var headings = core.toArray("[data-motion-heading]");

    headings.forEach(function (heading) {
      if (!core.guard(heading, "Heading")) return;
      bindHeading(heading);
    });

    runEntrance();

    whenTypeIsReady(function () {
      bindAlign();
      core.refresh();
    });
  }

  namespace.hero = { init: initHeroMotion, enter: runEntrance };
})(window.ATK.motion);
