/* ==========================================================================
   Autokatalyst — site behaviour
   Vanilla JS on GSAP (ScrollTrigger, CustomEase). Barba handles page
   transitions and is loaded only once a page links somewhere else.

   Two blocks, kept apart on purpose:

   A  Simple motion — tweens and scroll-bound timelines with literal targets
      and explicit start states. These are the candidates for Webflow's
      native interactions.
   B  Interaction and physics — pointer tracking, contact-solved dominos, the
      galaxy stream, the Our Work track, the accordion and page transitions.
      These stay custom code.

   Every behaviour is one init function, scoped to its component root, guarded
   against running twice, and wired by data-* attributes. Styles come from
   style.css: the script toggles classes, and only GSAP writes inline values
   while it animates. Nothing is hidden before the script runs, so a failed
   load leaves every page readable.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     Motion values — the same numbers as the CSS transitions
     ------------------------------------------------------------------------ */

  var CURVES = {
    primary: "0.33, 0.02, 0.18, 1",
    secondary: "0.65, 0.05, 0.36, 1",
    reveal: "0.28, 0.06, 0.16, 1",
    response: "0.16, 1, 0.3, 1",
    parallax: "0.7, 0.05, 0.13, 1",
    exit: "0.76, 0, 0.9, 0.2"
  };

  /* Stock eases until CustomEase registers the exact curves below. */
  var EASE = {
    primary: "power2.out",
    secondary: "power1.inOut",
    reveal: "power3.out",
    response: "expo.out",
    parallax: "power3.inOut",
    exit: "power3.in",
    linear: "none"
  };

  var DUR = {
    hover: 0.28,
    fast: 0.42,
    standard: 0.7,
    editorial: 1.5,
    opacity: 0.52,
    page: 1.2
  };

  var DESKTOP = "(min-width: 992px)";
  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  function reduced() {
    return reducedQuery.matches;
  }

  function hasGsap() {
    return typeof window.gsap !== "undefined";
  }

  function hasScrollTrigger() {
    return hasGsap() && typeof window.ScrollTrigger !== "undefined";
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function all(scope, selector) {
    return toArray((scope || document).querySelectorAll(selector));
  }

  /* Marks an element as bound so a second pass leaves it alone. */
  function once(element, key) {
    var flag = "init" + key;
    if (element.dataset[flag]) return false;
    element.dataset[flag] = "true";
    return true;
  }

  function isDesktop() {
    return window.matchMedia(DESKTOP).matches;
  }

  /* Reads a length variable from tokens.css in pixels. */
  function tokenPx(name, fallback) {
    var root = window.getComputedStyle(document.documentElement);
    var raw = root.getPropertyValue(name).trim();
    var value = parseFloat(raw);
    if (!value) return fallback;
    if (raw.indexOf("rem") > -1) return value * (parseFloat(root.fontSize) || 16);
    return value;
  }

  /* The page grid in pixels: one column, one gutter, and a step of both. */
  function grid() {
    var margin = tokenPx("--_spacing---margin--margin-sm", 24);
    var gutter = tokenPx("--_spacing---gap--gap-md", 24);
    var max = tokenPx("--max-width--main", 1728);
    var content = Math.min(window.innerWidth, max) - (margin * 2);
    var column = (content - (gutter * 11)) / 12;
    return { column: column, gutter: gutter, step: column + gutter };
  }

  function debounce(callback, wait) {
    var timer = null;
    return function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(callback, wait);
    };
  }

  function refresh() {
    if (hasScrollTrigger()) window.ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------------
     GSAP setup — one boot, the four curves registered by name
     ------------------------------------------------------------------------ */

  var booted = false;

  function bootGsap() {
    if (booted || !hasGsap()) return booted;
    booted = true;

    if (typeof window.CustomEase !== "undefined") {
      window.gsap.registerPlugin(window.CustomEase);
      Object.keys(CURVES).forEach(function (key) {
        window.CustomEase.create("atk-" + key, CURVES[key]);
        EASE[key] = "atk-" + key;
      });
    }

    window.gsap.defaults({ ease: EASE.primary, duration: DUR.standard, overwrite: "auto" });

    if (hasScrollTrigger()) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.defaults({ toggleActions: "play none none none" });
      window.ScrollTrigger.config({ ignoreMobileResize: true });
    }
    return true;
  }

  /* ========================================================================
     BLOCK A — SIMPLE MOTION
     ======================================================================== */

  /* ------------------------------------------------------------------------
     Page-head entrance
     The head is one composition coming into focus: the nav, the title lines
     and the supporting copy all begin at the same instant on the reveal
     curve and settle together. Title lines lean in half a grid column from
     alternate sides — the first from the left, the last from the right, a
     middle line holding — while they fade up; a single-line title comes in
     from the right. Copy and control rise into place.

     The entrance waits for the display face (at most 120ms), so a line never
     arrives in a fallback face and then swaps.
     ------------------------------------------------------------------------ */

  /* The display face is the first family in the primary font variable, so the
     wait follows tokens.css rather than naming the face. */
  function displayFace() {
    var stack = window.getComputedStyle(document.documentElement)
      .getPropertyValue("--_typography---font--primary");
    var family = stack.split(",")[0].trim();
    return family ? "1em " + family : "";
  }

  /* A face the browser can't parse counts as loaded, so it never holds the
     entrance back. */
  function isFaceLoaded(face) {
    try {
      return !!(document.fonts.check && document.fonts.check(face));
    } catch (error) {
      return true;
    }
  }

  function whenTypeIsReady(callback) {
    var face = displayFace();
    if (!face || !document.fonts || !document.fonts.load || isFaceLoaded(face)) {
      callback();
      return;
    }
    var done = false;
    function run() {
      if (done) return;
      done = true;
      callback();
    }
    document.fonts.load(face).then(run, run);
    window.setTimeout(run, 120);
  }

  function initHeroEntrance(scope) {
    if (!hasGsap()) return;

    var hero = (scope || document).querySelector("[data-hero]");
    var nav = document.querySelector("[data-nav]");

    /* The nav lives outside the swapped container, so it arrives once, with
       the first page, and is left alone on every arrival after that. */
    var withNav = !!nav && once(nav, "Entrance");
    var withHero = !!hero && once(hero, "Entrance");
    if ((!withNav && !withHero) || reduced()) return;

    var lines = withHero ? all(hero, "[data-hero-line]") : [];
    var fades = withHero ? all(hero, "[data-hero-fade]") : [];

    /* Held at the start state straight away, so nothing is seen before the
       composition begins. */
    if (lines.length) window.gsap.set(lines, { opacity: 0 });
    if (fades.length) window.gsap.set(fades, { autoAlpha: 0 });
    if (withNav) window.gsap.set(nav, { autoAlpha: 0 });

    whenTypeIsReady(function () {
      var travel = grid().column * 0.5;
      var mid = (lines.length - 1) / 2;
      var timeline = window.gsap.timeline();

      if (withNav) {
        timeline.fromTo(nav, { autoAlpha: 0 }, {
          autoAlpha: 1,
          duration: DUR.editorial,
          ease: EASE.reveal
        }, 0);
      }

      lines.forEach(function (line, index) {
        var factor = lines.length === 1 ? 1 : (mid ? ((mid - index) / mid) * -1 : 0);
        var width = line.getBoundingClientRect().width || 1;
        timeline.fromTo(line, {
          xPercent: (travel / width) * 100 * factor,
          opacity: 0
        }, {
          xPercent: 0,
          opacity: 1,
          duration: DUR.editorial,
          ease: EASE.reveal,
          clearProps: "transform,opacity"
        }, 0);
      });

      fades.forEach(function (element) {
        timeline.fromTo(element, { y: 12, autoAlpha: 0 }, {
          y: 0,
          autoAlpha: 1,
          duration: DUR.editorial,
          ease: EASE.reveal,
          clearProps: "transform,opacity,visibility"
        }, 0);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Band entrance
     The first band under a page head shares the head's start instant. It
     does not slide in: it stands two hero rows low and nearly transparent,
     and fades up as it rises. data-band="slow" takes the editorial duration;
     data-band-fade="off" only rises.
     ------------------------------------------------------------------------ */

  function initBandEntrance(scope) {
    if (!hasGsap()) return;

    all(scope, "[data-band]").forEach(function (band) {
      if (!once(band, "Band") || reduced()) return;

      var slow = band.dataset.band === "slow";
      var fades = band.dataset.bandFade !== "off";
      var rise = ((window.innerHeight - 144) / 12) * 2;

      window.gsap.fromTo(band, { y: rise, opacity: fades ? 0.12 : 1 }, {
        y: 0,
        opacity: 1,
        duration: slow ? DUR.editorial : DUR.standard,
        ease: EASE.reveal,
        clearProps: "transform,opacity"
      });
    });
  }

  /* ------------------------------------------------------------------------
     Section parallax
     A section falls behind the scroll while the one after it rises over it,
     so the two read as separate planes. data-parallax is the share of its own
     height it travels while the next section crosses the viewport.
     ------------------------------------------------------------------------ */

  function initSectionParallax(scope) {
    if (!hasScrollTrigger() || reduced()) return;

    all(scope, "[data-parallax]").forEach(function (section) {
      if (!once(section, "Parallax")) return;
      var next = section.nextElementSibling;
      if (!next) return;

      window.gsap.fromTo(section, { yPercent: 0 }, {
        yPercent: parseFloat(section.dataset.parallax) || 50,
        ease: EASE.linear,
        scrollTrigger: {
          trigger: next,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Heading drift
     An indented heading line travels a measured grid distance into its
     typeset position as the block scrolls in — linear and bound to scroll.
     data-drift is the distance in grid steps; the travel never exceeds the
     line's own indent, so it is dropped where the line sits at the margin.
     ------------------------------------------------------------------------ */

  var drifts = [];

  function initHeadingDrift(scope) {
    if (!hasScrollTrigger()) return;

    drifts = drifts.filter(function (tween) {
      if (tween.targets()[0] && tween.targets()[0].isConnected) return true;
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      return false;
    });

    all(scope, "[data-drift]").forEach(function (line) {
      if (!once(line, "Drift")) return;
      bindDrift(line);
    });
  }

  function bindDrift(line) {
    drifts = drifts.filter(function (tween) {
      if (tween.targets()[0] !== line) return true;
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      return false;
    });

    window.gsap.set(line, { x: 0 });
    if (reduced()) return;

    var indent = parseFloat(window.getComputedStyle(line).marginLeft) || 0;
    var reach = (parseFloat(line.dataset.drift) || 1) * grid().step;
    var from = -Math.min(reach, indent);
    if (!from) return;

    drifts.push(window.gsap.fromTo(line, { x: from }, {
      x: 0,
      ease: EASE.linear,
      scrollTrigger: {
        trigger: line,
        start: "clamp(top bottom)",
        end: "clamp(center center)",
        scrub: true
      }
    }));
  }

  /* ------------------------------------------------------------------------
     Closing headline — the last line slides home
     "forward" joins the domino sequence below it: it starts a measured
     distance left of its typeset place and resolves rightward across the
     same scroll passage the bars fall over.
     ------------------------------------------------------------------------ */

  var TIP_SPAN = 0.5;

  function chainPassage(section) {
    return {
      trigger: section.querySelector("[data-chain-passage]") || section,
      start: "top 95%",
      end: "top 30%",
      scrub: true,
      invalidateOnRefresh: true
    };
  }

  function initTipSlide(scope) {
    if (!hasScrollTrigger() || reduced()) return;

    all(scope, "[data-tip-slide]").forEach(function (line) {
      if (!once(line, "Tip")) return;
      var section = line.closest("section") || document.body;
      var reach = -(parseFloat(line.dataset.tipSlide) || 1) * grid().step;
      var lag = parseFloat(line.dataset.tipDelay) || 0;

      /* A scrubbed timeline is scaled to its own length, so it is padded to a
         full passage and the move placed inside it. */
      var timeline = window.gsap.timeline({ scrollTrigger: chainPassage(section) });
      timeline.to({}, { duration: 1 }, 0);
      timeline.fromTo(line, { x: reach }, { x: 0, duration: TIP_SPAN, ease: EASE.linear }, lag);
    });
  }

  /* ------------------------------------------------------------------------
     About — the credo panel drifts home
     The perforated panel drifts right as the band crosses the viewport and
     comes to rest one gutter clear of the statement it crosses, measured from
     the two elements on every refresh.
     ------------------------------------------------------------------------ */

  function initAboutOverlay(scope) {
    if (!hasScrollTrigger() || reduced()) return;

    all(scope, "[data-about-overlay]").forEach(function (overlay) {
      if (!once(overlay, "AboutOverlay")) return;
      var band = overlay.closest("[data-about-band]");
      var mark = band && band.querySelector("[data-about-mark]");
      if (!band || !mark) return;

      function travel() {
        /* Below desktop the panel is withheld and has no box to measure. */
        if (!overlay.offsetParent) return 0;
        var gutter = grid().gutter;
        var from = overlay.getBoundingClientRect().left - (window.gsap.getProperty(overlay, "x") || 0);
        return Math.max(0, mark.getBoundingClientRect().right + gutter - from);
      }

      window.gsap.fromTo(overlay, { x: 0 }, {
        x: travel,
        ease: EASE.linear,
        scrollTrigger: {
          trigger: band,
          start: "top bottom",
          end: "center center",
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Case study — banner drift
     The picture is taller than its frame by twice the travel and runs from
     the top of that overshoot to the bottom across the frame's passage.
     ------------------------------------------------------------------------ */

  function initStudyBanner(scope) {
    if (!hasScrollTrigger() || reduced()) return;

    all(scope, "[data-study-crop] > img").forEach(function (picture) {
      if (!once(picture, "StudyCrop")) return;
      var frame = picture.parentNode;

      function reach() {
        return Math.max(0, (picture.offsetHeight - frame.offsetHeight) / 2);
      }

      window.gsap.fromTo(picture, { y: function () { return -reach(); } }, {
        y: function () { return reach(); },
        ease: EASE.linear,
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Home — stacked case slides
     When a slide reaches the top of the viewport its frame pins and its
     content tilts back 40° into the perspective while scaling to 0.7, then
     fades over the last fifth of the pin as the next slide arrives over it.
     The last slide reserves no space of its own, so the section below lands
     on the stack. Desktop only: below it the slides return to normal flow.
     ------------------------------------------------------------------------ */

  var stackTimelines = [];
  var stackResizeBound = false;

  function releaseStack() {
    stackTimelines.forEach(function (timeline) {
      if (timeline.scrollTrigger) timeline.scrollTrigger.kill(true);
      timeline.kill();
    });
    stackTimelines = [];
    all(document, "[data-stack-content]").forEach(function (content) {
      window.gsap.set(content, { clearProps: "transform,opacity,visibility" });
    });
  }

  function bindStack() {
    if (!hasScrollTrigger() || reduced() || !isDesktop()) return;
    var slides = all(document, "[data-stack-slide]");

    slides.forEach(function (slide, index) {
      var frame = slide.querySelector("[data-stack-frame]");
      var content = slide.querySelector("[data-stack-content]");
      if (!frame || !content) return;

      var timeline = window.gsap.timeline({
        scrollTrigger: {
          trigger: slide,
          pin: frame,
          pinSpacing: index !== slides.length - 1,
          start: "top top",
          end: "+=" + window.innerHeight,
          scrub: true
        }
      })
        .to(content, { rotationX: 40, scale: 0.7, ease: EASE.exit, duration: 1 }, 0)
        .to(content, { autoAlpha: 0, ease: EASE.exit, duration: 0.2 }, 0.8);

      stackTimelines.push(timeline);
    });
  }

  function initStackedSlides() {
    if (!hasGsap() || !document.querySelector("[data-stack-slide]")) return;

    if (!stackResizeBound) {
      stackResizeBound = true;
      window.addEventListener("resize", debounce(function () {
        if (!document.querySelector("[data-stack-slide]")) return;
        releaseStack();
        bindStack();
        refresh();
      }, 250));
    }

    releaseStack();
    bindStack();
  }

  /* ========================================================================
     BLOCK B — INTERACTION AND PHYSICS
     ======================================================================== */

  /* ------------------------------------------------------------------------
     Dim groups — nav, footer and the collaboration rail
     Arriving on one item sends every other item in the group to half
     strength. Rest is reached only by leaving the group, so focus hands over
     between neighbours with no gap. The classes carry the look; the engaged
     state lengthens the transition while the reader is in the group.
     ------------------------------------------------------------------------ */

  function initDimGroups(scope) {
    all(scope, "[data-dim-group]").forEach(function (group) {
      if (!once(group, "DimGroup")) return;

      var items = all(group, "[data-dim-item]");
      if (items.length < 2) return;
      var current = null;

      function focus(item) {
        if (current === item) return;
        current = item;
        items.forEach(function (other) {
          other.classList.add("is-engaged");
          other.classList.toggle("is-dimmed", other !== item);
        });
      }

      function release() {
        if (!current) return;
        current = null;
        items.forEach(function (other) {
          other.classList.remove("is-engaged", "is-dimmed");
        });
      }

      items.forEach(function (item) {
        var trigger = item.closest("a") || item;
        trigger.addEventListener("pointerenter", function () { focus(item); });
        trigger.addEventListener("focusin", function () { focus(item); });
      });

      group.addEventListener("pointerleave", release);
      group.addEventListener("focusout", function (event) {
        if (!group.contains(event.relatedTarget)) release();
      });
    });
  }

  /* ------------------------------------------------------------------------
     Home — specialize list
     Arriving on a row makes it the reading: its title takes full ink, the
     others recede, and the panel changes to that audience. Leaving the list
     does not reset it — the panel is showing that audience's material, and a
     panel that empties on mouse-out reads as a fault.

     On desktop the "See more" control rides the pointer inside the list,
     sitting off its lower right so the pointer is never covered, and leads
     to the row in focus.
     ------------------------------------------------------------------------ */

  function initSpecialize(scope) {
    all(scope, "[data-specialize]").forEach(function (body) {
      if (!once(body, "Specialize")) return;

      var list = body.querySelector("[data-specialize-list]");
      var rows = all(body, "[data-specialize-row]");
      var labels = all(body, "[data-specialize-label]");
      var images = all(body, "[data-specialize-image]");
      var captions = all(body, "[data-specialize-caption]");
      var more = body.querySelector("[data-specialize-more]");
      var moreLink = more && more.querySelector("a[href]");
      if (!list || rows.length < 2) return;

      var current = 0;

      function select(index) {
        if (index === current) return;
        current = index;
        [labels, images, captions].forEach(function (set) {
          set.forEach(function (element, i) {
            element.classList.toggle("is-current", i === index);
          });
        });
        if (moreLink && labels[index]) moreLink.setAttribute("href", labels[index].getAttribute("href"));
      }

      rows.forEach(function (row, index) {
        row.addEventListener("pointerenter", function () { select(index); });
        row.addEventListener("focusin", function () { select(index); });
      });

      if (!more || !hasGsap()) return;

      /* The control only follows while the desktop layout lifts it out of
         flow. Below that it sits under the list, visible and still. */
      function tracks() {
        return window.getComputedStyle(more).position === "absolute";
      }

      var moveX = window.gsap.quickTo(more, "x", { duration: reduced() ? 0 : DUR.fast, ease: EASE.response });
      var moveY = window.gsap.quickTo(more, "y", { duration: reduced() ? 0 : DUR.fast, ease: EASE.response });
      window.gsap.set(more, { x: 0, y: 0, opacity: tracks() ? 0 : 1 });

      list.addEventListener("pointermove", function (event) {
        if (!tracks()) return;
        var box = list.getBoundingClientRect();
        var size = more.getBoundingClientRect();
        moveX(Math.min(Math.max(event.clientX - box.left + 16, 0), box.width - size.width));
        moveY(Math.min(Math.max(event.clientY - box.top + 16, 0), box.height - size.height));
      });

      list.addEventListener("pointerenter", function () {
        if (!tracks()) return;
        window.gsap.to(more, { opacity: 1, duration: reduced() ? 0 : DUR.hover, ease: EASE.primary });
      });

      list.addEventListener("pointerleave", function () {
        if (!tracks()) return;
        window.gsap.to(more, { opacity: 0, duration: reduced() ? 0 : DUR.hover, ease: EASE.exit });
      });

      more.addEventListener("focusin", function () {
        window.gsap.set(more, { opacity: 1 });
      });

      window.addEventListener("resize", debounce(function () {
        if (!more.isConnected) return;
        window.gsap.set(more, { x: 0, y: 0, opacity: tracks() ? 0 : 1 });
      }, 250));
    });
  }

  /* ------------------------------------------------------------------------
     Private equity — project list preview
     Hovering a row opens that project's picture in a window beside the list.
     The window never moves sideways; its height closes on the pointer's line
     by a fixed fraction of the remaining distance each frame, so it trails
     while the pointer moves and settles when it stops, never overshooting.
     Changing row only crosses one picture into the next, in place.
     Desktop with a fine pointer only.
     ------------------------------------------------------------------------ */

  function initProjectsPreview(scope) {
    all(scope, "[data-projects]").forEach(function (list) {
      if (!once(list, "Projects") || reduced()) return;

      var preview = list.querySelector("[data-projects-preview]");
      var frames = all(list, "[data-projects-frame]");
      var rows = all(list, "[data-projects-row]");
      if (!preview || !rows.length || frames.length !== rows.length) return;

      var actions = rows.map(function (row) { return row.querySelector("[data-projects-action]"); });
      var texts = rows.map(function (row) { return all(row, "[data-projects-text]"); });

      var current = -1;
      var target = 0;
      var position = 0;
      var height = preview.offsetHeight;
      var running = false;
      var primed = false;
      var setY = hasGsap() ? window.gsap.quickSetter(preview, "y", "px") : null;

      function canFollow() {
        return window.matchMedia("(hover: hover) and (pointer: fine)").matches && isDesktop();
      }

      function paint() {
        if (setY) setY(position);
      }

      function step() {
        var delta = target - position;
        if (Math.abs(delta) < 0.4) {
          position = target;
          running = false;
        } else {
          position += delta * 0.055;
          window.requestAnimationFrame(step);
        }
        paint();
      }

      /* The pointer's line within the list, less half the window, so the
         picture is centred on the pointer rather than hanging below it. */
      function aim(event) {
        target = event.clientY - list.getBoundingClientRect().top - (height / 2);
        if (!primed) {
          primed = true;
          position = target;
          paint();
          return;
        }
        if (!running) {
          running = true;
          window.requestAnimationFrame(step);
        }
      }

      function focus(index) {
        if (current === index) return;
        current = index;
        rows.forEach(function (row, i) {
          texts[i].forEach(function (text) { text.classList.toggle("is-recessed", i !== index); });
          if (actions[i]) actions[i].classList.toggle("is-shown", i === index);
        });
        frames.forEach(function (frame, i) { frame.classList.toggle("is-current", i === index); });
        preview.classList.add("is-open");
      }

      function release() {
        if (current === -1) return;
        current = -1;
        primed = false;
        rows.forEach(function (row, i) {
          texts[i].forEach(function (text) { text.classList.remove("is-recessed"); });
          if (actions[i]) actions[i].classList.remove("is-shown");
        });
        frames.forEach(function (frame) { frame.classList.remove("is-current"); });
        preview.classList.remove("is-open");
      }

      if (!canFollow() || !setY) return;

      rows.forEach(function (row, index) {
        row.addEventListener("pointerenter", function (event) {
          if (event.pointerType === "touch") return;
          height = preview.offsetHeight;
          aim(event);
          focus(index);
        });
      });

      list.addEventListener("pointermove", function (event) {
        if (event.pointerType === "touch" || current === -1) return;
        aim(event);
      });

      list.addEventListener("pointerleave", release);

      window.addEventListener("resize", debounce(function () {
        if (!canFollow()) release();
        height = preview.offsetHeight;
      }, 250));
    });
  }

  /* ------------------------------------------------------------------------
     Collaboration — the rail carries the page to its model
     The labels stick in CSS; clicking one tweens the scroll on the page
     duration, so it moves at the same rate as a page transition.
     ------------------------------------------------------------------------ */

  function initModelsRail(scope) {
    all(scope, "[data-collab-label]").forEach(function (label) {
      if (!once(label, "CollabLabel")) return;

      label.addEventListener("click", function (event) {
        var model = document.querySelector(label.getAttribute("href"));
        if (!model) return;
        event.preventDefault();

        var stickyTop = tokenPx("--_spacing---static--spacing-18", 72);
        var to = Math.max(0, Math.round(model.getBoundingClientRect().top + window.scrollY - stickyTop));

        if (!hasGsap() || reduced()) {
          window.scrollTo(0, to);
          return;
        }

        var proxy = { y: window.scrollY };
        window.gsap.to(proxy, {
          y: to,
          duration: DUR.page,
          ease: EASE.primary,
          overwrite: true,
          onUpdate: function () { window.scrollTo(0, proxy.y); }
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Collaboration — model rows (Accordion List / Accordion Item)
     One row open per model. Every group is held at the height of the tallest
     row in the tallest model, so switching rows moves nothing below it and
     the page never shifts under the reader. Switching is one move: the
     outgoing body collapses while the incoming one opens, on one duration
     and one curve, and the layout is refreshed once it settles.
     ------------------------------------------------------------------------ */

  var accordionUnlock = null;

  function initAccordions(scope) {
    var lists = all(scope, "[data-accordion]");
    if (!lists.length) return;

    function toggles(list) { return all(list, "[data-accordion-toggle]"); }
    function panelOf(toggle) { return document.getElementById(toggle.getAttribute("aria-controls")); }
    function iconOf(toggle) { return toggle.querySelector(".accordion_toggle_icon"); }

    function openToggles(list, except) {
      return toggles(list).filter(function (toggle) {
        var panel = panelOf(toggle);
        return toggle !== except && panel && !panel.classList.contains("is-collapsed");
      });
    }

    function mark(toggle, isOpen) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      var icon = iconOf(toggle);
      if (icon) icon.classList.toggle("is-collapsed", !isOpen);
    }

    /* Measures every group with each of its rows open in turn, then holds
       them all at the tallest height. */
    function lock() {
      if (!lists[0].isConnected) return;
      var state = lists.map(function (list) { return openToggles(list, null); });
      if (hasGsap()) window.gsap.set(lists, { clearProps: "minHeight" });

      var tallest = 0;
      lists.forEach(function (list) {
        var heads = toggles(list);
        heads.forEach(function (head) {
          heads.forEach(function (other) {
            var panel = panelOf(other);
            if (panel) panel.classList.toggle("is-collapsed", other !== head);
          });
          tallest = Math.max(tallest, list.offsetHeight);
        });
      });

      lists.forEach(function (list, i) {
        toggles(list).forEach(function (head) {
          var panel = panelOf(head);
          if (panel) panel.classList.toggle("is-collapsed", state[i].indexOf(head) === -1);
        });
      });

      if (hasGsap()) window.gsap.set(lists, { minHeight: tallest });
    }

    function settle() {
      refresh();
    }

    function bare(element) {
      if (hasGsap()) window.gsap.set(element, { clearProps: "height,paddingTop,opacity,overflow" });
    }

    function open(list, toggle) {
      var incoming = panelOf(toggle);
      if (!incoming || !incoming.classList.contains("is-collapsed")) return;

      /* A move already in flight lands on its end state first. */
      if (list.accordionMove) list.accordionMove();

      var outgoingToggles = openToggles(list, toggle);
      var outgoing = outgoingToggles.map(panelOf);

      mark(toggle, true);
      outgoingToggles.forEach(function (other) { mark(other, false); });

      function land() {
        outgoing.forEach(function (panel) {
          panel.classList.add("is-collapsed");
          bare(panel);
        });
        bare(incoming);
        list.accordionMove = null;
        settle();
      }

      if (!hasGsap() || reduced()) {
        incoming.classList.remove("is-collapsed");
        land();
        return;
      }

      window.gsap.killTweensOf([incoming].concat(outgoing));

      var lead = window.getComputedStyle(incoming).paddingTop;
      var outFrom = outgoing.map(function (panel) { return panel.offsetHeight; });

      incoming.classList.remove("is-collapsed");
      window.gsap.set(incoming, { clearProps: "height,paddingTop,opacity" });
      var inTo = incoming.offsetHeight;

      window.gsap.set(incoming, { height: 0, paddingTop: 0, opacity: 0, overflow: "hidden" });
      outgoing.forEach(function (panel, i) {
        window.gsap.set(panel, { height: outFrom[i], opacity: 1, overflow: "hidden" });
      });

      var move = window.gsap.timeline({ onComplete: land });
      list.accordionMove = function () {
        move.kill();
        land();
      };

      move.to(incoming, {
        height: inTo,
        paddingTop: lead,
        opacity: 1,
        duration: DUR.standard,
        ease: EASE.primary
      }, 0);

      if (outgoing.length) {
        move.to(outgoing, {
          height: 0,
          paddingTop: 0,
          opacity: 0,
          duration: DUR.standard,
          ease: EASE.primary
        }, 0);
      }
    }

    lists.forEach(function (list) {
      if (!once(list, "Accordion")) return;
      toggles(list).forEach(function (toggle) {
        toggle.addEventListener("click", function () { open(list, toggle); });
      });
    });

    /* A page transition rebinds this, so the previous page's listeners go
       first. */
    if (accordionUnlock) accordionUnlock();
    var relock = function () { lock(); };
    lock();
    window.requestAnimationFrame(relock);
    window.addEventListener("resize", relock);
    window.addEventListener("load", relock);
    accordionUnlock = function () {
      window.removeEventListener("resize", relock);
      window.removeEventListener("load", relock);
      accordionUnlock = null;
    };
  }

  /* ------------------------------------------------------------------------
     Domino — contact-solved, bound to scroll
     Each bar pivots on its bottom-right edge. With bar width w, pitch d and
     height h, a bar leaning on the one in front of it (at angle b) holds

         a = b + asin((d·cos b − w) / h)

     so a bar can never pass through the face of its neighbour. Progress is
     shared evenly between the bars that get pushed over; the frontier bar
     rotates from upright to contact and every bar behind it is solved
     backwards from its angle, so the leaning run advances together.
     ------------------------------------------------------------------------ */

  var DEG = Math.PI / 180;

  function initDomino(scope) {
    if (!hasGsap()) return;

    all(scope, "[data-domino]").forEach(function (root) {
      if (!once(root, "Domino")) return;

      var bars = all(root, "[data-domino-bar]");
      if (bars.length < 2) return;

      var firstMover = parseInt(root.dataset.dominoFirst, 10) || 0;
      var lastMover = root.dataset.dominoLast === undefined ? 3 : parseInt(root.dataset.dominoLast, 10) || 0;
      lastMover = Math.max(firstMover, Math.min(lastMover, bars.length - 2));

      window.gsap.set(bars, { rotate: 0, transformOrigin: "bottom right" });

      /* Reduced motion keeps the composition and drops the fall. */
      if (reduced() || !hasScrollTrigger()) return;

      var setters = bars.map(function (bar) { return window.gsap.quickSetter(bar, "rotate", "deg"); });
      var count = bars.length;
      var geometry = { width: 1, pitch: 1, height: 1 };
      var contact = 0;

      /* Layout boxes, not bounding rects: the bars are rotated. */
      function measure() {
        geometry.width = bars[0].offsetWidth || 1;
        geometry.pitch = (bars[1].offsetLeft - bars[0].offsetLeft) || geometry.width;
        geometry.height = bars[0].offsetHeight || 1;
      }

      function leaning(front) {
        var ratio = ((geometry.pitch * Math.cos(front * DEG)) - geometry.width) / geometry.height;
        if (ratio <= 0) return front;
        if (ratio >= 1) return front + 90;
        return front + (Math.asin(ratio) / DEG);
      }

      function render(progress) {
        var moves = lastMover - firstMover + 1;
        var scaled = Math.min(Math.max(progress, 0), 1) * moves;
        var phase = Math.min(Math.floor(scaled), moves - 1);
        var local = scaled - phase;
        var frontier = firstMover + phase;
        var angle = contact * local;

        for (var i = count - 1; i > frontier; i--) setters[i](0);
        setters[frontier](angle);
        for (var j = frontier - 1; j >= 0; j--) {
          angle = leaning(angle);
          setters[j](angle);
        }
      }

      function update(progress) {
        measure();
        contact = leaning(0);
        render(progress);
      }

      update(0);

      /* data-domino-trigger="next" reads the scroll off the section after
         the hero, because the hero itself falls behind with the parallax. */
      var hero = root.closest("[data-hero]");
      var trigger = root.dataset.dominoTrigger === "next" && hero && hero.nextElementSibling
        ? hero.nextElementSibling
        : hero || root;

      window.ScrollTrigger.create({
        trigger: trigger,
        start: root.dataset.dominoStart || "top top",
        end: root.dataset.dominoEnd || "center top",
        onRefresh: function (self) { update(self.progress); },
        onUpdate: function (self) { render(self.progress); }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Closing section — the drawn bands fall as a chain
     The same contact geometry on the two SVG bands. Both read one shared
     passage, each entering at its own point (data-chain-delay), so the
     sequence staggers across the composition. data-chain-last is the last bar
     that gets pushed over.
     ------------------------------------------------------------------------ */

  function initChains(scope) {
    if (!hasScrollTrigger()) return;

    all(scope, "[data-chain]").forEach(function (band) {
      if (!once(band, "Chain")) return;

      var bars = all(band, "rect");
      if (bars.length < 3) return;

      var section = band.closest("section") || document.body;
      var last = Math.min(parseInt(band.dataset.chainLast, 10) || 2, bars.length - 2);
      var lag = parseFloat(band.dataset.chainDelay) || 0;
      var w = parseFloat(bars[0].getAttribute("width"));
      var h = parseFloat(bars[0].getAttribute("height"));
      var pitch = parseFloat(bars[1].getAttribute("x")) - parseFloat(bars[0].getAttribute("x"));
      var contact = Math.asin(Math.max(0, Math.min(1, (pitch - w) / h))) / DEG;
      var pivots = bars.map(function (bar) { return (parseFloat(bar.getAttribute("x")) + w) + " " + h; });

      function put(index, angle) {
        bars[index].setAttribute("transform", "rotate(" + angle + " " + pivots[index] + ")");
      }

      function leaning(front) {
        var reach = (pitch * Math.cos(front * DEG) - w) / h;
        if (reach <= 0) return front;
        return front + (Math.asin(Math.min(1, reach)) / DEG);
      }

      function render(progress) {
        var movers = last + 1;
        var span = Math.max(0, Math.min(1, (progress - lag) / TIP_SPAN));
        var phase = Math.min(Math.floor(span * movers), movers - 1);
        var local = (span * movers) - phase;
        if (span >= 1) {
          phase = movers - 1;
          local = 1;
        }

        for (var i = last; i > phase; i--) put(i, 0);
        var angle = contact * local;
        put(phase, angle);
        for (var j = phase - 1; j >= 0; j--) {
          angle = leaning(angle);
          put(j, angle);
        }
      }

      render(0);
      if (reduced()) return;

      var passage = chainPassage(section);
      passage.onUpdate = function (self) { render(self.progress); };
      passage.onRefresh = function (self) { render(self.progress); };
      window.ScrollTrigger.create(passage);
    });
  }

  /* ------------------------------------------------------------------------
     Home — galaxy stream
     The scattered pictures are one slow continuous stream travelling upward.
     A single velocity drives every tile: a base that never falls to zero,
     plus a boost that scroll velocity adds and that decays once scrolling
     stops. Position accumulates from speed and is never read from the scroll
     offset. Once a tile has passed the clipped top edge it is returned,
     unseen, below the foot. Everything is per second and scaled by the real
     frame delta; the loop paints only while the section is near the screen.
     ------------------------------------------------------------------------ */

  var STREAM = {
    base: 20,
    boostFromScroll: 0.0425,
    boostMax: 41,
    boostDecay: 0.02,
    approach: 3.5,
    margin: 24,
    fade: 96
  };

  function initGalaxy(scope) {
    if (reduced() || !hasGsap()) return;

    all(scope, "[data-galaxy]").forEach(function (field) {
      if (!once(field, "Galaxy")) return;

      var items = all(field, "[data-galaxy-tile]").map(function (tile) {
        return {
          el: tile,
          setY: window.gsap.quickSetter(tile, "y", "px"),
          setOpacity: window.gsap.quickSetter(tile, "opacity"),
          multiplier: parseFloat(tile.dataset.galaxySpeed) || 1,
          baseTop: 0,
          height: 0,
          y: 0,
          opacity: 1
        };
      });
      if (!items.length) return;

      var fieldHeight = 0;
      var speed = STREAM.base;
      var boost = 0;
      var lastScroll = window.scrollY;
      var lastTime = 0;
      var onScreen = true;

      function measure() {
        fieldHeight = field.offsetHeight;
        items.forEach(function (item) {
          item.baseTop = item.el.offsetTop;
          item.height = item.el.offsetHeight;
        });
      }

      function paint() {
        items.forEach(function (item) {
          item.setY(item.y);
          item.setOpacity(item.opacity);
        });
      }

      /* 0 at the canvas's top edge, 1 once the tile is a full band clear. */
      function edgeFade(item) {
        return Math.max(0, Math.min((item.baseTop + item.y + item.height) / STREAM.fade, 1));
      }

      function step(time) {
        /* The page was swapped away: the stream ends with it. */
        if (!field.isConnected) return;
        window.requestAnimationFrame(step);

        if (!lastTime) lastTime = time;
        var delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        if (!delta) return;

        var scroll = window.scrollY;
        var scrolled = Math.abs(scroll - lastScroll);
        lastScroll = scroll;
        if (scrolled) {
          var candidate = Math.min((scrolled / delta) * STREAM.boostFromScroll, STREAM.boostMax);
          if (candidate > boost) boost = candidate;
        }
        boost *= Math.pow(STREAM.boostDecay, delta);
        if (boost < 0.5) boost = 0;

        speed += ((STREAM.base + boost) - speed) * Math.min(STREAM.approach * delta, 1);
        var travel = speed * delta;

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          item.y -= travel * item.multiplier;
          while (item.baseTop + item.y + item.height < -STREAM.margin) {
            item.y += fieldHeight + item.height + (STREAM.margin * 2);
          }
          item.opacity = edgeFade(item);
        }

        if (onScreen) paint();
      }

      measure();
      items.forEach(function (item) { item.opacity = edgeFade(item); });
      paint();

      if (typeof window.IntersectionObserver === "function") {
        new window.IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting;
        }, { rootMargin: "20% 0px" }).observe(field);
      }

      window.addEventListener("resize", debounce(function () {
        if (field.isConnected) measure();
      }, 250));

      window.requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------------------
     Our Work — the project track
     One position value drives the page: input adds to a target, the current
     value closes on it, and every picture sits at its distance from focus.
     The pictures hold one size and one pitch, run off both edges of the
     viewport, and scale from the right margin. Focus is decisive rather than
     continuous: a project is either active or at a flat dim value, and the
     text block on the left is cut from the same threshold, so exactly one
     project is ever readable.

     The page is one viewport tall and does not scroll: wheel, trackpad,
     keys, touch and drag are spent on the track. Desktop only — below it,
     and for reduced motion, the markup is a plain list with the footer.
     ------------------------------------------------------------------------ */

  var TRACK = {
    ratio: 0.66,
    frameGap: 16,
    dim: 0.3,
    focusHold: 0.42,
    focusSwitch: 0.58,
    cardHold: 0.4,
    cardSwitch: 0.51,
    approach: 12,
    stepInput: 420,
    keyStep: 1,
    momentum: 0.16
  };

  function wrapDistance(raw, count) {
    var half = count / 2;
    return (((raw + half) % count) + count) % count - half;
  }

  /* Half this picture, the gap and half the next, summed outwards, so size
     and position agree: a picture grows into focus as the stack closes. */
  function frameOffset(distance, height) {
    var absolute = Math.abs(distance);
    var index = Math.floor(absolute);
    var fraction = absolute - index;
    var offset = 0;
    for (var step = 0; step < index; step++) {
      offset += (height * Math.pow(TRACK.ratio, step) / 2) + TRACK.frameGap +
        (height * Math.pow(TRACK.ratio, step + 1) / 2);
    }
    if (fraction) {
      offset += fraction * ((height * Math.pow(TRACK.ratio, index) / 2) + TRACK.frameGap +
        (height * Math.pow(TRACK.ratio, index + 1) / 2));
    }
    return distance < 0 ? -offset : offset;
  }

  function ramp(from, to, value) {
    if (value <= from) return 0;
    if (value >= to) return 1;
    var t = (value - from) / (to - from);
    return t * t * (3 - (2 * t));
  }

  /* Full near the centre, the flat dim value elsewhere, and nothing in the
     last stretch before the wrap, so the loop has no seam to show. */
  function frameFade(absolute, count) {
    var focus = 1 - ramp(TRACK.focusHold, TRACK.focusSwitch, absolute);
    var half = count / 2;
    var edge = 1 - ramp(half - 0.8, half - 0.2, absolute);
    return (TRACK.dim + ((1 - TRACK.dim) * focus)) * edge;
  }

  function cardWeight(absolute) {
    return 1 - ramp(TRACK.cardHold, TRACK.cardSwitch, absolute);
  }

  function wheelDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  var track = {
    bound: null,
    frozen: null,
    freeze: null,
    release: null
  };

  function currentContainer() {
    var containers = document.querySelectorAll("[data-barba='container']");
    return containers.length ? containers[containers.length - 1] : document;
  }

  function initWorkTrack() {
    var section = currentContainer().querySelector("[data-workdark]");

    /* The composition fades in once the track has painted, so the reader
       never sees the document-flow fallback before the stack takes over. */
    function reveal() {
      if (!section || !isDesktop() || !once(section, "TrackReveal") || !hasGsap() || reduced()) return;
      window.gsap.fromTo(section, { autoAlpha: 0 }, { autoAlpha: 1, duration: DUR.standard, ease: EASE.primary });
    }

    if (section && section === track.bound) return;
    track.bound = section;

    document.body.classList.toggle("is-dark", !!section);

    /* Arriving on any other page: hold the outgoing track still while it is
       on screen, and give the document back once it has gone. */
    if (!section) {
      if (track.freeze) {
        track.freeze();
        return;
      }
      if (track.frozen && track.frozen.isConnected) return;
      track.frozen = null;
      if (track.release) track.release();
      document.body.classList.remove("is-locked");
      all(document, ".footer_wrap").forEach(function (footer) { footer.classList.remove("is-hidden"); });
      return;
    }

    if (!hasGsap() || !once(section, "Track")) return;

    var layout = section.querySelector("[data-workdark-layout]");
    var windowEl = section.querySelector("[data-workdark-window]");
    var stage = section.querySelector("[data-workdark-stage]");
    var cards = all(section, "[data-workdark-card]");
    var frames = all(section, "[data-workdark-frame]");
    var footer = document.querySelector(".footer_wrap");
    var count = frames.length;
    if (!layout || !stage || !count || cards.length !== count) return;

    var lede = section.querySelector(".workdark_lede");
    var hint = section.querySelector("[data-workdark-hint]");
    var hintArrow = section.querySelector(".workdark_hint_arrow");
    var live = [layout, lede, windowEl, stage, hint, hintArrow].filter(Boolean).concat(cards, frames);
    var media = window.gsap.matchMedia();

    track.release = function () {
      media.revert();
      track.release = null;
    };

    media.add(DESKTOP, function () {
      if (reduced()) return;

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
      var navBar = document.querySelector("[data-nav]");
      var navBottom = navBar ? navBar.getBoundingClientRect().bottom : 0;
      if (hint) hint.classList.add("is-shown");

      /* GSAP owns the transforms from here: the stack is centred on the
         stage by yPercent and placed by y. */
      window.gsap.set(frames, { yPercent: -50, y: 0, scale: 1 });
      if (hint) window.gsap.set(hint, { yPercent: -50 });
      var frameSet = frames.map(function (frame) {
        return {
          y: window.gsap.quickSetter(frame, "y", "px"),
          scaleX: window.gsap.quickSetter(frame, "scaleX"),
          scaleY: window.gsap.quickSetter(frame, "scaleY"),
          opacity: window.gsap.quickSetter(frame, "opacity"),
          zIndex: window.gsap.quickSetter(frame, "zIndex"),
          pointer: window.gsap.quickSetter(frame, "pointerEvents")
        };
      });
      var cardSet = cards.map(function (card) {
        return {
          opacity: window.gsap.quickSetter(card, "opacity"),
          pointer: window.gsap.quickSetter(card, "pointerEvents")
        };
      });

      function paint(position) {
        for (var i = 0; i < count; i++) {
          var distance = wrapDistance(i - position, count);
          var absolute = Math.abs(distance);
          var fade = frameFade(absolute, count);
          frameSet[i].y(frameOffset(distance, height));
          var scale = Math.pow(TRACK.ratio, absolute);
          frameSet[i].scaleX(scale);
          frameSet[i].scaleY(scale);
          frameSet[i].opacity(fade);
          frameSet[i].zIndex(Math.round(40 - (absolute * 8)));
          /* Every picture that can be seen is its project's link. */
          frameSet[i].pointer(fade > 0.1 ? "auto" : "none");

          /* Opacity alone: the block does not move, scale or resize. */
          var weight = cardWeight(absolute);
          cardSet[i].opacity(weight);
          cardSet[i].pointer(weight > 0.55 ? "auto" : "none");
        }
      }

      function step(time) {
        frameId = window.requestAnimationFrame(step);
        if (hintMoved && hint) {
          window.gsap.set(hint, { x: hintX + 20, y: hintY });
          hintMoved = false;
        }
        if (!lastTime) lastTime = time;
        var delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        var gap = target - current;
        if (Math.abs(gap) < 0.00025) current = target;
        else current += gap * Math.min(TRACK.approach * delta, 1);

        /* Fold both values back by whole projects; nothing changes on screen. */
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
        advance(wheelDelta(event) / TRACK.stepInput);
      }

      function onKey(event) {
        if (event.key === "ArrowDown" || event.key === "PageDown") advance(TRACK.keyStep);
        else if (event.key === "ArrowUp" || event.key === "PageUp") advance(-TRACK.keyStep);
        else return;
        event.preventDefault();
      }

      var touchY = 0;

      function onTouchStart(event) {
        touchY = event.touches[0].clientY;
      }

      function onTouchMove(event) {
        var y = event.touches[0].clientY;
        advance((touchY - y) / (TRACK.stepInput * 0.55));
        touchY = y;
        event.preventDefault();
      }

      /* Dragging spends the same input on the same target as the wheel. */
      var dragging = false;
      var dragPointer = null;
      var dragY = 0;
      var dragTime = 0;
      var dragVelocity = 0;
      var dragged = 0;

      function now() {
        return (window.performance && window.performance.now()) || Date.now();
      }

      function onPointerDown(event) {
        if (event.pointerType === "touch" || event.button) return;
        dragging = true;
        dragPointer = event.pointerId;
        dragY = event.clientY;
        dragTime = now();
        dragVelocity = 0;
        dragged = 0;
        stage.classList.add("is-dragging");
      }

      function onDragStart(event) {
        event.preventDefault();
      }

      function onPointerMove(event) {
        if (!dragging || event.pointerId !== dragPointer) return;
        if (event.buttons === 0) {
          onPointerUp(event);
          return;
        }
        var time = now();
        var units = (dragY - event.clientY) / TRACK.stepInput;
        advance(units);
        dragVelocity = units / Math.max((time - dragTime) / 1000, 0.008);
        dragged += Math.abs(dragY - event.clientY);
        dragY = event.clientY;
        dragTime = time;
      }

      /* A release while stationary is not a flick; what is thrown is capped
         at half a project, so it reads as inertia rather than a jump. */
      function onPointerUp(event) {
        if (!dragging || event.pointerId !== dragPointer) return;
        dragging = false;
        dragPointer = null;
        stage.classList.remove("is-dragging");
        if (now() - dragTime > 90) dragVelocity = 0;
        var thrown = dragVelocity * TRACK.momentum;
        if (Math.abs(thrown) > 0.02) advance(Math.max(-0.5, Math.min(0.5, thrown)));
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

      function onHintMove(event) {
        if (!hint) return;
        hintX = event.clientX;
        hintY = event.clientY;
        hintMoved = true;
        hint.classList.add("is-shown");
        /* Centred on the pointer, the label reaches half its height above it:
           the threshold sits that much lower than the bar. */
        hint.classList.toggle("is-away", hintY <= navBottom + 40);
      }

      /* The freeze happens as the reader commits to leaving, so the block on
         screen at the click is the one that stays for the exit. */
      function onExitClick(event) {
        if (dragged > 6 || event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
        if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
        var href = link.getAttribute("href");
        if (!href || href.charAt(0) === "#") return;
        if (/^([a-z]+:)?\/\//i.test(href) || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
        if (link.pathname === window.location.pathname) return;
        if (track.freeze) track.freeze();
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

      function detach() {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onHintMove);
        stage.removeEventListener("pointerdown", onPointerDown);
        stage.removeEventListener("dragstart", onDragStart);
        stage.removeEventListener("click", onClick, true);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        document.removeEventListener("click", onExitClick, true);
        stage.classList.remove("is-dragging");
        document.body.classList.remove("is-locked");
        if (footer) footer.classList.remove("is-hidden");
      }

      /* Leaving the page: the track stops taking input and painting, and the
         block in focus is the only one left standing for the exit. A
         navigation that never happens gives the track back after 1.2s. */
      function armFreeze() {
        track.freeze = null;
        track.frozen = section;
        detach();
        if (hint) hint.classList.add("is-gone");
        var focus = Math.round(current);
        for (var i = 0; i < count; i++) {
          cardSet[i].opacity(wrapDistance(i - focus, count) === 0 ? 1 : 0);
          cardSet[i].pointer("none");
        }

        window.setTimeout(function () {
          if (track.frozen !== section || !section.isConnected) return;
          track.frozen = null;
          track.freeze = armFreeze;
          if (hint) hint.classList.remove("is-gone");
          attach();
          paint(current);
        }, 1200);
      }

      track.freeze = armFreeze;
      attach();
      paint(0);

      return function () {
        track.freeze = null;
        track.frozen = null;
        detach();
        if (hint) hint.classList.remove("is-gone", "is-away", "is-shown");
        live.forEach(function (element) { element.classList.remove("is-live"); });
        window.gsap.set(live, { clearProps: "transform,opacity,zIndex,pointerEvents" });
      };
    });

    reveal();
  }

  /* The arriving container is inserted before the transition plays, so the
     track binds and shows from that moment rather than after the slide. */
  function watchContainers() {
    var wrapper = document.querySelector("[data-barba='wrapper']");
    if (!wrapper || typeof window.MutationObserver !== "function") return;
    new window.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var lists = [records[i].addedNodes, records[i].removedNodes];
        for (var k = 0; k < lists.length; k++) {
          for (var j = 0; j < lists[k].length; j++) {
            var node = lists[k][j];
            if (node.nodeType === 1 && node.hasAttribute("data-barba")) {
              initWorkTrack();
              return;
            }
          }
        }
      }
    }).observe(wrapper, { childList: true });
  }

  /* ------------------------------------------------------------------------
     Contact form — inert until a form service is chosen
     In Webflow the native form handles submission. Here the submit is held
     so the page never posts to a static host.
     ------------------------------------------------------------------------ */

  function initContactForm(scope) {
    all(scope, "[data-form]").forEach(function (form) {
      if (!once(form, "Form")) return;
      form.addEventListener("submit", function (event) {
        event.preventDefault();
      });
    });
  }

  /* ------------------------------------------------------------------------
     Page transitions — the Osmo overlapping parallax transition on Barba
     Both pages move at once: the outgoing page recedes a quarter of the
     viewport under a veil while the incoming page covers the whole of it.
     The ground and the nav's treatment are part of the destination's state,
     so they change as the transition starts rather than after it.
     ------------------------------------------------------------------------ */

  var BARBA_SRC = "https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js";
  var transitionsStarted = false;

  function swapLogo(logoLink, dark) {
    var logo = logoLink.querySelector(".nav_logo");
    if (!logo || logoLink.classList.contains("is-inverse") === dark) return;
    logo.classList.add("is-swapping");
    window.setTimeout(function () {
      logoLink.classList.toggle("is-inverse", dark);
      logo.classList.remove("is-swapping");
    }, 140);
  }

  function applyGround(container) {
    if (!container) return;
    var dark = container.getAttribute("data-page-ground") === "dark";
    var wrap = document.querySelector("[data-barba='wrapper']");
    container.classList.toggle("is-dark-ground", dark);
    if (wrap) wrap.classList.toggle("is-dark-ground", dark);
    document.body.classList.toggle("is-dark", dark);
    all(document, ".nav_link").forEach(function (link) { link.classList.toggle("is-inverse", dark); });
    all(document, "[data-nav-logo]").forEach(function (logoLink) { swapLogo(logoLink, dark); });
  }

  function resetPage(container) {
    window.scrollTo(0, 0);
    window.gsap.set(container, { clearProps: "position,top,left,right" });
  }

  function leaveAnimation(current) {
    var wrap = document.querySelector("[data-transition-wrap]");
    var veil = wrap ? wrap.querySelector("[data-transition-dark]") : null;
    var timeline = window.gsap.timeline({ onComplete: function () { current.remove(); } });

    if (reduced()) return timeline.set(current, { autoAlpha: 0 });

    if (wrap) timeline.set(wrap, { zIndex: 2 }, 0);
    if (veil) {
      timeline.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: DUR.page, ease: EASE.parallax }, 0);
    }
    timeline.fromTo(current, { y: "0vh" }, { y: "-25vh", duration: DUR.page, ease: EASE.parallax }, 0);
    /* Cleared at the end of leave so the veil is ready for the next one. */
    if (veil) timeline.set(veil, { autoAlpha: 0 });
    return timeline;
  }

  function enterAnimation(next) {
    var timeline = window.gsap.timeline();

    if (reduced()) {
      timeline.set(next, { autoAlpha: 1 });
      timeline.add("pageReady");
      timeline.call(resetPage, [next], "pageReady");
      return new Promise(function (resolve) { timeline.call(resolve, null, "pageReady"); });
    }

    timeline.add("startEnter", 0);
    timeline.set(next, { autoAlpha: 1, zIndex: 3 }, "startEnter");
    timeline.fromTo(next, { y: "100vh" }, {
      y: "0vh",
      duration: DUR.page,
      clearProps: "all",
      ease: EASE.parallax
    }, "startEnter");
    timeline.add("pageReady");
    timeline.call(resetPage, [next], "pageReady");

    return new Promise(function (resolve) { timeline.call(resolve, null, "pageReady"); });
  }

  /* Barba is only worth loading once there is somewhere to navigate to. */
  function hasInternalRoutes() {
    return all(document, "a[href]").some(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return false;
      if (/^([a-z]+:)?\/\//i.test(href) || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return false;
      return link.pathname !== window.location.pathname;
    });
  }

  function loadBarba(onReady) {
    if (typeof window.barba !== "undefined") {
      onReady();
      return;
    }
    var script = document.createElement("script");
    script.async = true;
    script.src = BARBA_SRC;
    script.addEventListener("load", onReady);
    document.body.appendChild(script);
  }

  function initPageTransitions() {
    if (transitionsStarted || !hasGsap()) return;
    if (!document.querySelector("[data-barba='wrapper']") || !hasInternalRoutes()) return;
    transitionsStarted = true;
    loadBarba(startBarba);
  }

  function startBarba() {
    if (typeof window.barba === "undefined") return;
    window.history.scrollRestoration = "manual";
    applyGround(document.querySelector("[data-barba='container']"));

    /* Barba runs its enter hooks for the first page too. Nothing may touch
       the page on that pass: fixing the container collapses the document,
       and a refresh in that window would destroy every pinned section. */
    var initialLoad = true;

    window.barba.hooks.beforeEnter(function (data) {
      applyGround(data.next.container);
      if (initialLoad) return;
      window.gsap.set(data.next.container, { position: "fixed", top: 0, left: 0, right: 0 });
      /* The arriving head starts with the transition: both are opacity and
         transform only, so they overlap and the page arrives alive. */
      initHeroEntrance(data.next.container);
      initBandEntrance(data.next.container);
    });

    window.barba.hooks.afterLeave(function () {
      if (initialLoad) return;
      if (hasScrollTrigger()) window.ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(); });
    });

    window.barba.hooks.afterEnter(function (data) {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      initPage(data.next.container);
    });

    window.barba.init({
      debug: false,
      timeout: 7000,
      preventRunning: true,
      transitions: [{
        name: "default",
        sync: true,
        once: function () { return window.gsap.timeline(); },
        leave: function (data) { return leaveAnimation(data.current.container); },
        enter: function (data) { return enterAnimation(data.next.container); }
      }]
    });
  }

  /* ========================================================================
     Init — every behaviour, in page order
     ======================================================================== */

  function initPage(scope) {
    bootGsap();

    initHeroEntrance(scope);
    initDimGroups(document);
    initStackedSlides();
    initDomino(scope);
    initSpecialize(scope);
    initSectionParallax(scope);
    initBandEntrance(scope);
    initChains(scope);
    initTipSlide(scope);
    initHeadingDrift(scope);
    initGalaxy(scope);
    initProjectsPreview(scope);
    initAboutOverlay(scope);
    initModelsRail(scope);
    initAccordions(scope);
    initStudyBanner(scope);
    initWorkTrack();
    initContactForm(scope);

    refresh();
  }

  function boot() {
    initPage(document);
    watchContainers();
    initPageTransitions();

    /* Layout settles once the faces arrive; the scroll-bound work re-reads
       it then. */
    whenTypeIsReady(refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    window.addEventListener("resize", debounce(function () {
      all(document, "[data-drift]").forEach(bindDrift);
      refresh();
    }, 250));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
