/* ==========================================================================
   Autokatalyst — project track, dark variant

   The same one-number track as the light page, recomposed as two parts: the
   active project's information on the left, the pictures on the right. There
   is no list of names — the pictures are the only sign that other projects
   exist, so the track has to make plain which one is active.

   Movement is fluid, focus is decisive
   -----------------------------------
   Position is continuous: input adds to a target, the current value trails it
   and closes the gap when the input stops, and every picture sits at its
   distance times one pitch. Nothing about the position snaps.

   Focus is not continuous. A picture is either the active one, at full, or it
   is not, at a flat dim value — the handoff is taken inside a narrow band
   around the halfway point, so passing a project reads as a click rather than
   a long dissolve. The left-hand block is cut from the same threshold, so
   exactly one project is ever readable and it is always the one in focus.

   Even pitch
   ----------
   Unlike the light page the pictures hold one size, set one pitch apart, so
   the previous and next projects are cut off by the top and bottom of the
   viewport rather than shrunk. The track therefore runs off both edges, which
   is what the composition wants.

   The loop
   --------
   Position is unbounded and distance is wrapped into ±half the set, so the
   wrap always happens at the far end of the track, which is well outside the
   clipped stage — and the last stretch before it is faded out, so the seam
   has nothing to show whatever the viewport height.

   Desktop only. Below the breakpoint, and for a reader who has asked for
   reduced motion, nothing binds and nothing is locked: the markup is a plain
   vertical list of projects and pictures with the footer under it.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;

  /* Scale step between neighbouring pictures, read off the reference. */
  var RATIO = 0.66;

  /* Vertical air between two pictures, px. */
  var FRAME_GAP = 16;

  /* Two states, not a gradient: the active project at full, every other one
     at the same dim value however far away it is. */
  var DIM = 0.3;

  /* The handoff is taken inside a narrow band either side of the halfway
     point — about a sixth of a project. Short enough to read as a step,
     long enough not to flash. */
  var FOCUS_HOLD = 0.42;
  var FOCUS_SWITCH = 0.58;

  /* The left-hand block is driven by the same distance the pictures are, so
     it is never a separate animation: its opacity is a plain function of how
     close its project is to focus. Stop halfway and it sits halfway; reverse
     and it reverses from where it is. Nothing else changes — the block holds
     one position and one size, and the swap is opacity alone.

     The block holds full while its project is the active one and is spent in
     a tenth of a project either side of the halfway point: quick enough to
     read as a state switch, and at the crossover both are at two percent — no
     overlap, no gap. */
  var CARD_HOLD = 0.4;
  var CARD_SWITCH = 0.51;

  /* Fraction of the remaining distance covered per second. */
  var APPROACH = 12;

  /* Input travel, in px, that advances the track by one project. Dragging
     reads the same number, so a drag and a wheel of the same length move the
     track by the same amount. */
  var STEP_INPUT = 420;
  var KEY_STEP = 1;

  /* Seconds of the release velocity spent as momentum. Enough to carry a
     flick, short enough that the track never sails away. */
  var MOMENTUM = 0.16;

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function wrap(raw, count) {
    var half = count / 2;
    return (((raw + half) % count) + count) % count - half;
  }

  /* Offset of a picture's centre from the stage centre: half this picture,
     the gap, half the next, summed outwards. Size and position therefore
     agree — a picture grows into focus because the stack closes around it. */
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

  function ramp(from, to, value) {
    if (value <= from) return 0;
    if (value >= to) return 1;
    var t = (value - from) / (to - from);
    return t * t * (3 - (2 * t));
  }

  /* Full inside a small window around the centre, the flat dim value
     everywhere else, and nothing at all in the last stretch before the wrap
     so the loop has no seam to show. */
  function frameFade(absolute, count) {
    var focus = 1 - ramp(FOCUS_HOLD, FOCUS_SWITCH, absolute);
    var half = count / 2;
    var edge = 1 - ramp(half - 0.8, half - 0.2, absolute);
    return (DIM + ((1 - DIM) * focus)) * edge;
  }

  function cardWeight(absolute) {
    return 1 - ramp(CARD_HOLD, CARD_SWITCH, absolute);
  }

  function wheelDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  var boundSection = null;
  var frozenSection = null;

  function initDarkTrack() {
    if (!core) return;

    /* During a page swap both containers are briefly mounted; the arriving one
       is the last. Binding to it keeps the outgoing page's markup out of the
       lookup, so the ground and the track always follow the page on screen. */
    var containers = document.querySelectorAll("[data-barba='container']");
    var scope = containers.length ? containers[containers.length - 1] : document;
    var section = scope.querySelector("[data-workdark]");

    /* The composition is held back until the track has painted its first
       frame, so the reader never sees the document-flow fallback — every
       project's text at once — before the stack takes over. Every path out of
       this function reveals it, including the ones that never bind. */
    function reveal() {
      if (section) section.classList.add("is-ready");
    }

    /* Already bound to this very section — a second pass over the same page
       (the container is inserted, then the module list re-runs) must not
       re-bind, only make sure it is showing. */
    if (section && section === boundSection) {
      reveal();
      return;
    }
    boundSection = section;

    /* Barba swaps the container, not the body, so the page's ground is set
       from the section that is actually present. */
    document.body.classList.toggle("is-dark", !!section);

    /* Arriving on any other page: hold the outgoing track still while it is
       still on screen, and only give the document back once it is gone. */
    if (!section) {
      if (namespace.workDarkFreeze) {
        namespace.workDarkFreeze();
        return;
      }
      /* Still frozen and still mounted: the exit is mid-flight, and reverting
         now would put every project's text back into flow on screen. */
      if (frozenSection && frozenSection.isConnected) return;
      frozenSection = null;
      if (namespace.workDarkRelease) namespace.workDarkRelease();
      if (document.querySelector("[data-worktrack]")) return;
      document.body.classList.remove("is-locked");
      toArray(document.querySelectorAll(".footer_wrap")).forEach(function (footer) {
        footer.classList.remove("is-hidden");
      });
      return;
    }

    if (!window.gsap || !core.guard || !core.guard(section, "WorkDark")) {
      reveal();
      return;
    }

    var layout = section.querySelector("[data-workdark-layout]");
    var windowEl = section.querySelector("[data-workdark-window]");
    var stage = section.querySelector("[data-workdark-stage]");
    var cards = toArray(section.querySelectorAll("[data-workdark-card]"));
    var frames = toArray(section.querySelectorAll("[data-workdark-frame]"));
    var footer = document.querySelector(".footer_wrap");

    var count = frames.length;
    if (!layout || !stage || !count || cards.length !== count) {
      reveal();
      return;
    }

    var lede = section.querySelector(".workdark_lede");
    var hint = section.querySelector("[data-workdark-hint]");
    var hintArrow = section.querySelector(".workdark_hint_arrow");
    var shells = [layout, lede, windowEl, stage, hint, hintArrow].filter(Boolean);
    var live = shells.concat(cards, frames);

    var media = window.gsap.matchMedia();

    namespace.workDarkRelease = function () {
      media.revert();
      namespace.workDarkRelease = null;
    };

    media.add("(min-width: 992px)", function () {
      if (core.prefersReducedMotion && core.prefersReducedMotion()) {
        reveal();
        return;
      }

      live.forEach(function (element) { element.classList.add("is-live"); });
      document.body.classList.add("is-locked");
      if (footer) footer.classList.add("is-hidden");

      var height = frames[0].offsetHeight || 320;
      var current = 0;
      var target = 0;
      var lastTime = 0;
      var frameId = null;
      var hintX = window.innerWidth / 2;
      var hintY = window.innerHeight * 0.72;
      var hintMoved = true;
      var navBar = document.querySelector(".nav_wrap");
      var navBottom = navBar ? navBar.getBoundingClientRect().bottom : 0;
      if (hint) hint.classList.add("is-shown");

      function paint(position) {
        for (var i = 0; i < count; i++) {
          var distance = wrap(i - position, count);
          var absolute = Math.abs(distance);

          var frame = frames[i];
          frame.style.transform = "translateY(-50%) translateY(" +
            frameOffset(distance, height).toFixed(2) + "px) scale(" +
            Math.pow(RATIO, absolute).toFixed(4) + ")";
          frame.style.opacity = frameFade(absolute, count).toFixed(3);
          frame.style.zIndex = String(Math.round(40 - (absolute * 8)));
          /* Every picture that can be seen is its project's link. */
          frame.style.pointerEvents = frameFade(absolute, count) > 0.1
            ? "auto" : "none";

          var card = cards[i];
          var weight = cardWeight(absolute);
          /* Opacity alone: the block does not move, scale or resize. The
             pictures carry all the movement. */
          card.style.opacity = weight.toFixed(3);
          card.style.pointerEvents = weight > 0.55 ? "auto" : "none";
        }
      }

      function step(time) {
        frameId = window.requestAnimationFrame(step);
        if (hintMoved && hint) {
          hint.style.transform = "translate3d(" + (hintX + 20) + "px, calc(" + hintY + "px - 50%), 0)";
          hintMoved = false;
        }
        if (!lastTime) lastTime = time;
        var delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        var gap = target - current;
        if (Math.abs(gap) < 0.00025) {
          current = target;
        } else {
          current += gap * Math.min(APPROACH * delta, 1);
        }

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
        if (hint) hint.classList.add("is-gone");
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

      /* Dragging the pictures spends the same input on the same target as the
         wheel does, so the two can never disagree. Touch keeps its own swipe
         handler — pointer events would otherwise count it twice. */
      var dragging = false;
      var dragPointer = null;
      var dragY = 0;
      var dragTime = 0;
      var dragVelocity = 0;
      var dragged = 0;

      function onPointerDown(event) {
        if (event.pointerType === "touch") return;
        if (event.button) return;
        dragging = true;
        dragPointer = event.pointerId;
        dragY = event.clientY;
        dragTime = (window.performance && window.performance.now()) || Date.now();
        dragVelocity = 0;
        dragged = 0;
        stage.classList.add("is-dragging");
      }

      /* A press on a picture starts a drag, not a native image drag. */
      function onDragStart(event) {
        event.preventDefault();
      }

      function onPointerMove(event) {
        if (!dragging || event.pointerId !== dragPointer) return;
        /* The button was released somewhere this handler could not see it. */
        if (event.buttons === 0) {
          onPointerUp(event);
          return;
        }
        var now = (window.performance && window.performance.now()) || Date.now();
        var units = (dragY - event.clientY) / STEP_INPUT;
        advance(units);
        dragVelocity = units / Math.max((now - dragTime) / 1000, 0.008);
        dragged += Math.abs(dragY - event.clientY);
        dragY = event.clientY;
        dragTime = now;
      }

      function onPointerUp(event) {
        if (!dragging || event.pointerId !== dragPointer) return;
        dragging = false;
        dragPointer = null;
        stage.classList.remove("is-dragging");
        /* Released while stationary is not a flick: a velocity read more than
           a few frames ago is stale and spends nothing. What is left is capped
           at half a project, so the throw is inertia rather than a jump. */
        var now = (window.performance && window.performance.now()) || Date.now();
        if (now - dragTime > 90) dragVelocity = 0;
        var throwUnits = dragVelocity * MOMENTUM;
        if (Math.abs(throwUnits) > 0.02) {
          advance(Math.max(-0.5, Math.min(0.5, throwUnits)));
        }
      }

      /* A drag that moved is not a click on the picture. */
      function onClick(event) {
        if (dragged > 6) {
          event.preventDefault();
          event.stopPropagation();
        }
        dragged = 0;
      }

      function onResize() {
        height = frames[0].offsetHeight || height;
        navBottom = navBar ? navBar.getBoundingClientRect().bottom : 0;
      }

      /* The label is written in the same frame the stack is painted in, from
         the last pointer position seen, so it never trails the cursor by a
         style recalculation of its own. */
      function onHintMove(event) {
        if (!hint) return;
        hintX = event.clientX;
        hintY = event.clientY;
        hintMoved = true;
        hint.classList.add("is-shown");
        /* The label is centred on the pointer, so it reaches half its own
           height above it: the threshold sits that much lower than the bar. */
        hint.classList.toggle("is-away", hintY <= navBottom + 40);
      }

      function attach() {
        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("keydown", onKey);
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("resize", onResize);
        window.addEventListener("pointermove", onHintMove);
        stage.addEventListener("pointerdown", onPointerDown);
        stage.addEventListener("dragstart", onDragStart);
        stage.addEventListener("click", onClick, true);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        document.addEventListener("click", onExitClick, true);
        document.body.classList.add("is-locked");
        if (footer) footer.classList.add("is-hidden");
        lastTime = 0;
        frameId = window.requestAnimationFrame(step);
      }

      attach();
      paint(0);
      reveal();

      /* Leaving the page: the track stops taking input and stops painting, and
         the block that is currently in focus is the only one left standing.
         The live layout is deliberately kept — the page is about to be removed,
         and dropping it would put every project's text back into flow for the
         length of the exit. */
      function detach() {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("resize", onResize);
        stage.removeEventListener("pointerdown", onPointerDown);
        stage.removeEventListener("dragstart", onDragStart);
        stage.removeEventListener("click", onClick, true);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        window.removeEventListener("pointermove", onHintMove);
        document.removeEventListener("click", onExitClick, true);
        stage.classList.remove("is-dragging");
        document.body.classList.remove("is-locked");
        if (footer) footer.classList.remove("is-hidden");
      }

      function armFreeze() {
        namespace.workDarkFreeze = null;
        frozenSection = section;
        detach();
        if (hint) hint.classList.add("is-gone");
        /* One text block, settled on the project the reader was looking at. */
        var focus = Math.round(current);
        for (var i = 0; i < count; i++) {
          var settled = wrap(i - focus, count) === 0;
          cards[i].style.opacity = settled ? "1" : "0";
          cards[i].style.pointerEvents = "none";
        }

        /* A navigation that never happens — an aborted route, a modifier click
           Barba ignores — must not leave the track dead. The live layout stays
           exactly as it is; only the input and the loop come back. */
        window.setTimeout(function () {
          if (frozenSection !== section || !section.isConnected) return;
          frozenSection = null;
          namespace.workDarkFreeze = armFreeze;
          if (hint) hint.classList.remove("is-gone");
          attach();
          paint(current);
        }, 1200);
      }

      namespace.workDarkFreeze = armFreeze;

      /* The freeze happens as the reader commits to leaving, not when the next
         page arrives, so the block on screen at the click is the one that
         stays there for the exit. */
      function onExitClick(event) {
        if (dragged > 6) return;
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
        if (!link) return;
        if (link.target === "_blank" || link.hasAttribute("download")) return;
        var href = link.getAttribute("href");
        if (!href || href.charAt(0) === "#") return;
        if (/^([a-z]+:)?\/\//i.test(href) || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
        if (link.pathname === window.location.pathname) return;
        if (namespace.workDarkFreeze) namespace.workDarkFreeze();
      }

      document.addEventListener("click", onExitClick, true);

      return function () {
        namespace.workDarkFreeze = null;
        frozenSection = null;
        detach();
        if (hint) hint.classList.remove("is-gone");
        if (hint) hint.classList.remove("is-away");
        if (hint) hint.classList.remove("is-shown");
        live.forEach(function (element) {
          element.classList.remove("is-live");
          element.style.transform = "";
          element.style.opacity = "";
          element.style.zIndex = "";
          element.style.pointerEvents = "";
        });
      };
    });

    /* matchMedia binds synchronously, so by here the stack has been laid out
       and the composition can show at once — during the page transition rather
       than after it. */
    reveal();
  }

  namespace.workDark = { init: initDarkTrack };

  /* The container is inserted before the transition plays, so the track binds
     and the composition shows from that moment rather than waiting for the
     slide to finish. */
  function watchContainers() {
    var wrapper = document.querySelector("[data-barba='wrapper']");
    if (!wrapper || typeof window.MutationObserver !== "function") return;
    new window.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var lists = [records[i].addedNodes, records[i].removedNodes];
        for (var k = 0; k < lists.length; k++) {
          for (var j = 0; j < lists[k].length; j++) {
            var node = lists[k][j];
            if (node.nodeType !== 1) continue;
            if (node.hasAttribute("data-barba") || node.querySelector("[data-barba='container']")) {
              initDarkTrack();
              return;
            }
          }
        }
      }
    }).observe(wrapper, { childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initDarkTrack();
      watchContainers();
    });
  } else {
    initDarkTrack();
    watchContainers();
  }

  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initDarkTrack();
    };
  }
})(window.ATK.motion);
