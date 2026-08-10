/* ==========================================================================
   Autokatalyst — specialize list

   "We specialize in": five audiences on the right, one preview panel on the
   left. Arriving on a row makes that row the reading — its title takes full
   ink, the others recede, the panel changes to that audience, and the
   control slides to sit on the row.

   Selection, not focus
   --------------------
   Unlike the focus list, this one holds. Leaving the list does not reset it:
   the last row you arrived on stays selected, because the panel beside it is
   showing that audience's material and a panel that empties on mouse-out
   reads as a fault. Rest is only ever the first row, before any input.

   Continuity
   ----------
   One controller owns the list, the panel and the control. Arriving on a row
   applies the new state to all of them in the same frame, and every tween
   carries overwrite: "auto", so a fast run down the list interrupts in place
   rather than queueing.

   The panel crossfades on the opacity duration, the incoming picture
   settling out of a small zoom — the same 1.04 the case-study images take on
   hover — while the titles change on the shorter hover duration, so the text
   answers the pointer before the picture does.

   The control is carried by the cursor rather than parked on a row: it
   follows the pointer inside the list and leaves with it.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  var ZOOM = 1.04;

  function initSpecialize() {
    if (!core || !core.hasGsap()) return;

    document.querySelectorAll("[data-specialize-list]").forEach(function (list) {
      if (!core.guard(list, "Specialize")) return;

      var section = list.closest(".specialize_body") || document;
      var rows = core.scoped(list, "[data-specialize-row]");
      var labels = rows.map(function (row) { return row.querySelector("[data-specialize-label]"); });
      var images = core.scoped(section, "[data-specialize-image]");
      var captions = core.scoped(section, "[data-specialize-caption]");
      var more = list.querySelector("[data-specialize-more]");
      if (rows.length < 2) return;

      var current = 0;

      /* The control only follows the cursor while the desktop layout lifts it
         out of flow. Below that it sits under the list, visible and still. */
      function tracks() {
        return !!more && window.getComputedStyle(more).position === "absolute";
      }

      function fade(elements, index, duration) {
        elements.forEach(function (element, i) {
          window.gsap.to(element, {
            opacity: i === index ? 1 : 0,
            duration: core.resolveDuration(duration),
            ease: core.ease.primary,
            overwrite: "auto"
          });
        });
      }

      function select(index) {
        if (index === current) return;
        current = index;

        labels.forEach(function (label, i) {
          if (!label) return;
          window.gsap.to(label, {
            color: i === index ? "rgb(11, 11, 11)" : "rgba(11, 11, 11, 0.4)",
            duration: core.resolveDuration(tokens.duration.hover),
            ease: core.ease.response,
            overwrite: "auto"
          });
        });

        images.forEach(function (image, i) {
          if (i !== index) {
            window.gsap.to(image, {
              opacity: 0,
              duration: core.resolveDuration(tokens.duration.opacity),
              ease: core.ease.primary,
              overwrite: "auto"
            });
            return;
          }
          window.gsap.fromTo(image, { opacity: 0 }, {
            opacity: 1,
            duration: core.resolveDuration(tokens.duration.opacity),
            ease: core.ease.primary,
            overwrite: "auto"
          });
        });
        fade(captions, index, tokens.duration.opacity);

        var href = rows[index].dataset.specializeHref;
        if (more && href) more.setAttribute("href", href);
      }

      /* The class-driven rest state is handed over to the tween channel once,
         so the two can never disagree about who owns opacity. */
      images.forEach(function (image, i) { window.gsap.set(image, { opacity: i === 0 ? 1 : 0 }); });
      captions.forEach(function (caption, i) { window.gsap.set(caption, { opacity: i === 0 ? 1 : 0 }); });
      labels.forEach(function (label, i) {
        if (label) window.gsap.set(label, { color: i === 0 ? "rgb(11, 11, 11)" : "rgba(11, 11, 11, 0.4)" });
      });
      if (more) window.gsap.set(more, { x: 0, y: 0, opacity: tracks() ? 0 : 1 });

      rows.forEach(function (row, index) {
        row.addEventListener("pointerenter", function () { select(index); });
        row.addEventListener("focusin", function () { select(index); });
      });

      /* The control rides the cursor inside the list, sitting off its bottom
         right so the pointer icon is never covered, clamped so it can never
         leave the block it belongs to, and going with the pointer on the way
         out — quickly, so it never trails behind the hand. */
      var CURSOR_GAP = 16;
      if (more) {
        var moveX = window.gsap.quickTo(more, "x", {
          duration: core.resolveDuration(tokens.duration.fast),
          ease: core.ease.response
        });
        var moveY = window.gsap.quickTo(more, "y", {
          duration: core.resolveDuration(tokens.duration.fast),
          ease: core.ease.response
        });

        list.addEventListener("pointermove", function (event) {
          if (!tracks()) return;
          var box = list.getBoundingClientRect();
          var size = more.getBoundingClientRect();
          var x = event.clientX - box.left + CURSOR_GAP;
          var y = event.clientY - box.top + CURSOR_GAP;
          moveX(Math.min(Math.max(x, 0), box.width - size.width));
          moveY(Math.min(Math.max(y, 0), box.height - size.height));
        });

        list.addEventListener("pointerenter", function () {
          if (!tracks()) return;
          core.promote(more);
          window.gsap.to(more, {
            opacity: 1,
            duration: core.resolveDuration(tokens.duration.hover),
            ease: core.ease.primary,
            overwrite: "auto"
          });
        });

        list.addEventListener("pointerleave", function () {
          if (!tracks()) return;
          window.gsap.to(more, {
            opacity: 0,
            duration: core.resolveDuration(tokens.duration.hover),
            ease: core.ease.exit,
            overwrite: "auto",
            onComplete: function () { core.release(more); }
          });
        });

        more.addEventListener("focusin", function () {
          window.gsap.set(more, { opacity: 1 });
        });
      }

      var timer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          if (!more) return;
          window.gsap.set(more, { x: 0, y: 0, opacity: tracks() ? 0 : 1 });
        }, 250);
      });
    });
  }

  namespace.specialize = { init: initSpecialize };

  /* ------------------------------------------------------------------
     Line drift
     A single editorial line travels a measured grid distance into its
     typeset position as the block scrolls in. Scroll-bound and linear, like
     every other continuous movement in the system; horizontal only. Lines
     start left of the typeset position and resolve rightward.

       data-v5-drift="1.5"   starts one and a half grid steps left
     ------------------------------------------------------------------ */

  function gridColumn() {
    var root = window.getComputedStyle(document.documentElement);
    var margin = parseFloat(root.getPropertyValue("--page-margin")) || 24;
    var gutter = parseFloat(root.getPropertyValue("--grid-gutter")) || 24;
    var max = (parseFloat(root.getPropertyValue("--container-max")) || 108) * 16;
    var content = Math.min(window.innerWidth, max) - (margin * 2);
    return { column: (content - (gutter * 11)) / 12, gutter: gutter };
  }

  var drifts = [];

  function bindDrift() {
    if (!core || !core.hasGsap() || !namespace.modules) return;

    drifts.forEach(function (tween) {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
    });
    drifts = [];

    var grid = gridColumn();

    core.toArray("[data-v5-drift]").forEach(function (line) {
      window.gsap.set(line, { x: 0 });
      if (window.getComputedStyle(line).display === "inline") return;

      var steps = parseFloat(line.dataset.v5Drift) || 1;
      var indent = parseFloat(window.getComputedStyle(line).marginLeft) || 0;
      var reach = steps * (grid.column + grid.gutter);
      /* The travel can only use the room the line's own indent gives it —
         flush at the page margin there is none, so the drift is dropped
         rather than pushed into the clipped edge. */
      var from = -Math.min(reach, indent);
      if (!from) return;

      var tween = namespace.modules.align(line, { from: from, to: 0, axis: tokens.axis.x });
      if (tween) drifts.push(tween);
    });

    /* Independent horizontal travel for graphics rather than type: the same
       scroll-bound resolve as the drifting lines, measured in grid steps,
       with each element free to run at its own rate. */
    core.toArray("[data-v5-slide]").forEach(function (element) {
      window.gsap.set(element, { x: 0 });

      var steps = parseFloat(element.dataset.v5Slide) || 1;
      var from = -(steps * (grid.column + grid.gutter));

      var tween = namespace.modules.align(element, { from: from, to: 0, axis: tokens.axis.x });
      if (tween) drifts.push(tween);
    });
  }

  namespace.drift = { init: bindDrift };

  /* ------------------------------------------------------------------
     Section parallax
     A section falls behind the scroll while the one after it rises over
     the top of it, so the two read as separate planes. Scroll-bound,
     linear, vertical, and expressed as a share of the section's own
     height so it holds at any viewport.

       data-v5-parallax="<selector>"   the section that rises over it
       data-v5-parallax-amount="50"    percent of its own height
     ------------------------------------------------------------------ */

  function initSectionParallax() {
    if (!core || !core.hasScrollTrigger() || core.prefersReducedMotion()) return;

    core.toArray("[data-v5-parallax]").forEach(function (section) {
      if (!core.guard(section, "SectionParallax")) return;

      var next = document.querySelector(section.dataset.v5Parallax);
      if (!next) return;

      var amount = parseFloat(section.dataset.v5ParallaxAmount);
      if (!amount) amount = 50;

      window.gsap.fromTo(section, { yPercent: 0 }, {
        yPercent: amount,
        ease: core.ease.linear,
        scrollTrigger: {
          trigger: next,
          start: "top bottom",
          end: "top top",
          scrub: tokens.scroll.scrubDirect,
          invalidateOnRefresh: true
        }
      });
    });
  }

  namespace.sectionParallax = { init: initSectionParallax };

  /* ------------------------------------------------------------------
     Band entrance
     The band shares the hero's start instant and settles with it. It does
     not slide in: it stands two rows low and nearly transparent, and fades
     up as it rises — the same reveal curve the type uses.
     ------------------------------------------------------------------ */

  var BAND_DELAY = 0;
  var BAND_DURATION = tokens.duration.editorial;
  var BAND_ROWS = 2;
  var BAND_OPACITY = 0.12;

  /* The rise is stated in hero rows, so it scales with the grid the
     composition is set on rather than with a fixed pixel step. */
  function bandRise() {
    var row = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue("--hero-row"));
    if (!row) row = (window.innerHeight - 144) / 12;
    return row * BAND_ROWS;
  }

  function initBand() {
    if (!core || !core.hasGsap()) return;

    core.toArray("[data-v5-band]").forEach(function (band) {
      if (!core.guard(band, "BandEntrance")) return;

      if (core.prefersReducedMotion()) {
        core.disarm(band);
        return;
      }

      window.gsap.fromTo(band, {
        y: core.resolveDistance(bandRise()),
        opacity: BAND_OPACITY
      }, {
        y: 0,
        opacity: 1,
        duration: core.resolveDuration(BAND_DURATION),
        delay: BAND_DELAY,
        ease: core.ease.reveal,
        onStart: function () { core.promote(band); },
        onComplete: function () {
          core.release(band);
          core.disarm(band);
          window.gsap.set(band, { clearProps: "y,opacity" });
        }
      });
    });
  }

  namespace.band = { init: initBand };

  /* ------------------------------------------------------------------
     CTA domino chain
     The same contact geometry the hero band uses, on the two drawn bands
     in the closing section. Every bar starts upright; the first few are
     pushed over by the scroll, each pivoting on its bottom-right edge and
     holding exactly the angle at which its face meets the bar in front, so
     the leaning run stays touching and can never overlap.

     With bar width w, pitch d and height h, a leader resting on a follower
     at angle b holds

         a = b + asin((d·cos b − w) / h)

     and against an upright follower that is the contact angle asin(g / h),
     g being the gap. Both bands read one shared passage, each entering it
     at its own point, so the sequence staggers across the composition.

       data-v5-chain            a band of upright bars
       data-v5-chain-last="2"   index of the last bar that gets pushed
       data-v5-chain-delay=".25"  share of the passage it waits out
       data-v5-tip-slide="0.4"  a line joining the sequence, in grid steps
       data-v5-tip-delay="0"    the line's share of the passage
     ------------------------------------------------------------------ */

  /* Share of the passage one member's move occupies. The rest is headroom
     for the later members to trail into. */
  var TIP_SPAN = 0.5;

  function tipPassage(element) {
    return {
      trigger: document.querySelector(".cta_motif") || element,
      start: "top 95%",
      end: "top 30%",
      scrub: tokens.scroll.scrubDirect,
      invalidateOnRefresh: true
    };
  }

  function bindChain(band) {
    var bars = Array.prototype.slice.call(band.querySelectorAll("rect"));
    if (bars.length < 3) return;

    var last = Math.min(parseInt(band.dataset.v5ChainLast, 10) || 2, bars.length - 2);
    var lag = parseFloat(band.dataset.v5ChainDelay) || 0;

    var w = parseFloat(bars[0].getAttribute("width"));
    var h = parseFloat(bars[0].getAttribute("height"));
    var pitch = parseFloat(bars[1].getAttribute("x")) - parseFloat(bars[0].getAttribute("x"));
    var contact = Math.asin(Math.max(0, Math.min(1, (pitch - w) / h))) * 180 / Math.PI;

    var pivots = bars.map(function (bar) {
      return (parseFloat(bar.getAttribute("x")) + w) + " " + h;
    });

    function put(index, angle) {
      bars[index].setAttribute("transform", "rotate(" + angle + " " + pivots[index] + ")");
    }

    /* The angle a bar holds for its top corner to rest on the back face of
       the bar in front, which sits at `front`. Both in degrees. */
    function leaning(front) {
      var b = front * Math.PI / 180;
      var reach = (pitch * Math.cos(b) - w) / h;
      if (reach <= 0) return front;
      return front + (Math.asin(Math.min(1, reach)) * 180 / Math.PI);
    }

    function render(progress) {
      var movers = last + 1;
      var span = Math.max(0, Math.min(1, (progress - lag) / TIP_SPAN));
      var phase = Math.min(Math.floor(span * movers), movers - 1);
      var local = (span * movers) - phase;
      if (span >= 1) { phase = movers - 1; local = 1; }

      for (var i = last; i > phase; i--) put(i, 0);

      var angle = contact * local;
      put(phase, angle);
      for (var j = phase - 1; j >= 0; j--) {
        angle = leaning(angle);
        put(j, angle);
      }
    }

    render(0);
    if (core.prefersReducedMotion()) return;

    window.ScrollTrigger.create(Object.assign(tipPassage(band), {
      onUpdate: function (self) { render(self.progress); },
      onRefresh: function (self) { render(self.progress); }
    }));
  }

  function initTip() {
    if (!core || !core.hasGsap()) return;

    core.toArray("[data-v5-chain]").forEach(function (band) {
      if (!core.guard(band, "DominoChain")) return;
      if (!core.hasScrollTrigger()) return;
      bindChain(band);
    });

    core.toArray("[data-v5-tip-slide]").forEach(function (element) {
      if (!core.guard(element, "DominoTip")) return;
      if (core.prefersReducedMotion() || !core.hasScrollTrigger()) return;

      var grid = gridColumn();
      var lag = parseFloat(element.dataset.v5TipDelay) || 0;
      var reach = -(parseFloat(element.dataset.v5TipSlide) || 1) * (grid.column + grid.gutter);

      /* A scrubbed timeline is scaled to its own length, so it is padded to
         a full passage and the move placed inside it. Without the pad the
         lag is simply absorbed and the group moves together. */
      var timeline = window.gsap.timeline({ scrollTrigger: tipPassage(element) });
      timeline.to({}, { duration: 1 }, 0);
      timeline.fromTo(element, { x: reach },
        { x: 0, duration: TIP_SPAN, ease: core.ease.linear }, lag);
    });
  }

  namespace.tip = { init: initTip };

  /* Everything this file owns, bound in one pass. */
  function initV5() {
    initSpecialize();
    initSectionParallax();
    initBand();
    initTip();
    bindDrift();
    core.refresh();
  }

  namespace.v5 = { init: initV5 };

  document.addEventListener("DOMContentLoaded", initV5);

  /* A page transition swaps the container, so the shared entry point runs
     again on the new markup. These modules have to follow it or the incoming
     homepage arrives with its entrances unbound. */
  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initV5();
    };
  }

  var driftTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(driftTimer);
    driftTimer = window.setTimeout(function () {
      bindDrift();
      core.refresh();
    }, 250);
  });
})(window.ATK.motion);
