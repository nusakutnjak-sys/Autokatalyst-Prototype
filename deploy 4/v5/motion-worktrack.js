/* ==========================================================================
   Autokatalyst — project track

   One virtual vertical track of projects, drawn three ways at once: client
   names on the left, pictures in the centre, the project's use case and
   result on the right. All three read the SAME position value, so they can
   never disagree — there is one number in this module and everything else is
   a function of it.

   A fixed page
   ------------
   The page is one viewport tall and does not scroll. Wheel, trackpad, touch
   and key input are read directly and spent on the track instead, so there is
   no page movement, no scrollbar and no scroll position to restore. The
   navigation therefore never leaves.

   Position, not slides
   --------------------
   Input adds to a target position in project units (2.5 means "halfway
   between the third and fourth project"). Each frame the current position
   moves a fraction of the remaining distance toward the target: it trails a
   little while the wheel is moving and closes the gap the moment it stops.
   Nothing snaps — stopping halfway leaves the track halfway, which is the
   point.

   Geometry
   --------
   A frame's distance from the focus decides everything about it. Scale falls
   off geometrically (each step out is RATIO of the one before) and the offset
   from the centre is the running sum of those sizes, so a frame's position
   and its size always agree: the next picture grows into the focal position
   through the geometry of the stack rather than by a separate tween.

   The loop
   --------
   Position is unbounded and distance is wrapped into ±half the set, so the
   project furthest from focus is always the one behind the reader. By the
   time a frame reaches that distance it is scaled to nothing and fully
   transparent, well outside the clipped stage — the wrap happens where there
   is nothing to see, so the track runs forever in both directions with no
   seam, no rewind and no reset. Target and current are folded back by whole
   projects together, which is invisible for the same reason.

   Desktop only. Below the breakpoint, and for a reader who has asked for
   reduced motion, nothing binds and nothing is locked: the markup is a plain
   vertical list of names, pictures and notes with the footer under it, which
   is what the CSS describes without the live state class.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;

  /* Two states, not a gradient. The project in focus is at full; every other
     one sits at the same dim value however far away it is, so at any moment
     exactly one project reads as active. */
  var DIM = 0.3;

  /* The handoff is taken inside a narrow band either side of the halfway
     point — about a sixth of a project, so it is a click rather than a
     dissolve, but still a movement of opacity rather than a cut. Continuous
     in position, so reversing the wheel reverses it. */
  var FOCUS_HOLD = 0.42;
  var FOCUS_SWITCH = 0.58;

  /* Scale step between neighbouring frames, read off the design. */
  var RATIO = 0.66;

  /* Vertical air between two frames, px. */
  var FRAME_GAP = 16;

  /* Row pitch of the name list is measured from the type, not fixed: the name
     size answers the viewport, so the pitch has to as well. */
  var NAME_PITCH_RATIO = 1.41;

  /* The note is carried by its fade, not by its travel: it drifts a little
     over a line's worth of space while the opacity does the work. The mask is
     then only containment — nothing reaches its edge. */
  var CARD_TRAVEL = 28;

  /* The note is a state, not a blend. It holds at full while its project is
     the nearest one and hands over inside a narrow band either side of the
     halfway point — a fifth of a step, so the two notes cross at half
     opacity and are never both readable. Still a function of position, so
     reversing the wheel reverses the handover. */
  var CARD_HOLD = 0.41;
  var CARD_SWITCH = 0.59;

  /* Fraction of the remaining distance covered per second. High enough to
     feel directly connected to a trackpad, low enough to carry weight. */
  var APPROACH = 12;

  /* Input travel, in px, that advances the track by one project. */
  var STEP_INPUT = 420;

  /* One key press or one swipe, in project units. */
  var KEY_STEP = 1;

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  /* Signed distance from focus, wrapped into (-count/2, count/2]. */
  function wrap(raw, count) {
    var half = count / 2;
    return (((raw + half) % count) + count) % count - half;
  }

  /* Offset of a frame's centre from the stage centre. Each step out is half
     this frame, the gap, and half the next — so at every whole position the
     stack is exactly stacked, and between them the value runs straight from
     one resting place to the next. Size and position therefore agree: a
     picture grows into focus because the stack is closing around it. */
  function frameOffset(distance, height) {
    var absolute = Math.abs(distance);
    var index = Math.floor(absolute);
    var fraction = absolute - index;

    var offset = 0;
    for (var step = 0; step < index; step++) {
      offset += (height * Math.pow(RATIO, step) / 2) + FRAME_GAP +
        (height * Math.pow(RATIO, step + 1) / 2);
    }
    if (fraction) {
      offset += fraction * ((height * Math.pow(RATIO, index) / 2) + FRAME_GAP +
        (height * Math.pow(RATIO, index + 1) / 2));
    }
    return distance < 0 ? -offset : offset;
  }

  /* Smooth 0→1 ramp between two edges — the one curve every focus state is
     cut from, so they all sharpen and soften together. */
  function ramp(from, to, value) {
    if (value <= from) return 0;
    if (value >= to) return 1;
    var t = (value - from) / (to - from);
    return t * t * (3 - (2 * t));
  }

  /* Focus, spent early and spent all at once: full inside a small window
     around the centre, the flat dim value everywhere else. The edge term is
     containment only — it takes the furthest items, which are already outside
     the clipped stage, to nothing so the loop's wrap has nothing to show. */
  function focusFade(absolute) {
    var focus = 1 - ramp(FOCUS_HOLD, FOCUS_SWITCH, absolute);
    var edge = 1 - ramp(2.6, 3.2, absolute);
    return (DIM + ((1 - DIM) * focus)) * edge;
  }

  /* The note's own weight: full while its project is nearest, handed over
     inside the narrow band around halfway. */
  function cardWeight(absolute) {
    return 1 - ramp(CARD_HOLD, CARD_SWITCH, absolute);
  }

  /* Wheel deltas arrive in three units depending on the device. */
  function wheelDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  function initTrack() {
    if (!core) return;

    var section = document.querySelector("[data-worktrack]");

    /* Arriving on any other page: release the track and give the document
       back. A page transition swaps the container without ending the media
       query, so the binding has to be torn down here or its input capture
       would follow the reader onto every other page. */
    if (!section) {
      if (namespace.workTrackRelease) namespace.workTrackRelease();
      /* The dark variant may be the one holding the document. */
      if (document.querySelector("[data-workdark]")) return;
      document.body.classList.remove("is-locked");
      toArray(document.querySelectorAll(".footer_wrap")).forEach(function (footer) {
        footer.classList.remove("is-hidden");
      });
      return;
    }

    if (!window.gsap || !core.guard || !core.guard(section, "WorkTrack")) return;

    var layout = section.querySelector("[data-worktrack-layout]");
    var nameShell = section.querySelector("[data-worktrack-names]");
    var stage = section.querySelector("[data-worktrack-stage]");
    var infoShell = section.querySelector("[data-worktrack-info]");
    var windowEl = section.querySelector("[data-worktrack-window]");
    var names = toArray(section.querySelectorAll("[data-worktrack-name]"));
    var frames = toArray(section.querySelectorAll("[data-worktrack-frame]"));
    var cards = toArray(section.querySelectorAll("[data-worktrack-card]"));
    var footer = document.querySelector(".footer_wrap");
    var nav = document.querySelector(".nav_wrap");

    var count = frames.length;
    if (!layout || !stage || !count) return;
    if (names.length !== count || cards.length !== count) return;

    var shells = [layout, nameShell, stage, infoShell, windowEl].filter(Boolean);
    var live = shells.concat(names, frames, cards);

    var media = window.gsap.matchMedia();

    namespace.workTrackRelease = function () {
      media.revert();
      namespace.workTrackRelease = null;
    };

    media.add("(min-width: 992px)", function () {
      if (core.prefersReducedMotion && core.prefersReducedMotion()) return;

      live.forEach(function (element) { element.classList.add("is-live"); });
      document.body.classList.add("is-locked");
      if (footer) footer.classList.add("is-hidden");

      /* The composition sits under the navigation, and centres in what is
         left rather than in the whole viewport. */
      function measureNav() {
        layout.style.setProperty("--worktrack-nav",
          ((nav && nav.offsetHeight) || 0) + "px");
      }

      function measurePitch() {
        var line = parseFloat(window.getComputedStyle(names[0]).lineHeight);
        if (!line) line = 31;
        return line * NAME_PITCH_RATIO;
      }

      measureNav();

      var height = frames[0].offsetHeight || 320;
      var pitch = measurePitch();
      var current = 0;
      var target = 0;
      var lastTime = 0;
      var frameId = null;

      function paint(position) {
        for (var i = 0; i < count; i++) {
          var distance = wrap(i - position, count);
          var absolute = Math.abs(distance);

          var frame = frames[i];
          frame.style.transform = "translate3d(-50%, -50%, 0) translateY(" +
            frameOffset(distance, height).toFixed(2) + "px) scale(" +
            Math.pow(RATIO, absolute).toFixed(4) + ")";
          frame.style.opacity = focusFade(absolute).toFixed(3);
          frame.style.zIndex = String(Math.round(40 - (absolute * 8)));
          /* Only the picture in focus is the link. */
          frame.style.pointerEvents = absolute < 0.4 ? "auto" : "none";

          var name = names[i];
          var nameScale = RATIO + ((1 - RATIO) * Math.max(0, 1 - absolute));
          name.style.transform = "translate3d(0, " +
            (distance * pitch).toFixed(2) + "px, 0) scale(" +
            nameScale.toFixed(4) + ")";
          var nameOpacity = focusFade(absolute);
          name.style.opacity = nameOpacity.toFixed(3);
          name.style.pointerEvents = nameOpacity < 0.12 ? "none" : "auto";

          /* Travel and scale are spent on the handover itself rather than on
             the whole journey: the note leaves by a few pixels as it hands
             over and is already still by the time it is unreadable. */
          var card = cards[i];
          var weight = cardWeight(absolute);
          var direction = distance < 0 ? -1 : 1;
          card.style.transform = "translate3d(0, " +
            ((1 - weight) * CARD_TRAVEL * direction).toFixed(2) +
            "px, 0) scale(" + (0.985 + (0.015 * weight)).toFixed(4) + ")";
          card.style.opacity = weight.toFixed(3);
        }
      }

      function step(time) {
        frameId = window.requestAnimationFrame(step);
        if (!lastTime) lastTime = time;
        var delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        var gap = target - current;
        if (Math.abs(gap) < 0.00025) {
          current = target;
        } else {
          current += gap * Math.min(APPROACH * delta, 1);
        }

        /* Fold both values back by whole projects so neither can drift far
           from zero. Moving them together changes nothing on screen. */
        if (current > count && target > count) {
          current -= count;
          target -= count;
        } else if (current < -count && target < -count) {
          current += count;
          target += count;
        }

        paint(current);
      }

      function advance(units) {
        target += units;
      }

      function onWheel(event) {
        event.preventDefault();
        advance(wheelDelta(event) / STEP_INPUT);
      }

      function onKey(event) {
        var key = event.key;
        if (key === "ArrowDown" || key === "PageDown") advance(KEY_STEP);
        else if (key === "ArrowUp" || key === "PageUp") advance(-KEY_STEP);
        else return;
        event.preventDefault();
      }

      var touchY = 0;

      function onTouchStart(event) {
        touchY = event.touches[0].clientY;
      }

      function onTouchMove(event) {
        var y = event.touches[0].clientY;
        advance((touchY - y) / (STEP_INPUT * 0.55));
        touchY = y;
        event.preventDefault();
      }

      function onResize() {
        measureNav();
        height = frames[0].offsetHeight || height;
        pitch = measurePitch();
      }

      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKey);
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("resize", onResize);

      paint(0);
      frameId = window.requestAnimationFrame(step);

      return function () {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("resize", onResize);
        document.body.classList.remove("is-locked");
        if (footer) footer.classList.remove("is-hidden");
        layout.style.removeProperty("--worktrack-nav");
        live.forEach(function (element) {
          element.classList.remove("is-live");
          element.style.transform = "";
          element.style.opacity = "";
          element.style.zIndex = "";
          element.style.pointerEvents = "";
        });
      };
    });
  }

  namespace.workTrack = { init: initTrack };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTrack);
  } else {
    initTrack();
  }

  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initTrack();
    };
  }
})(window.ATK.motion);
