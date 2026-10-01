/* ==========================================================================
   Autokatalyst — site behaviour
   Vanilla JS on GSAP (ScrollTrigger, CustomEase). Barba handles page
   transitions and is loaded only once a page links somewhere else.

   Two blocks, kept apart on purpose:

   A  Simple motion — tweens and scroll-bound timelines with literal targets
      and explicit start states. These are the candidates for Webflow's
      native interactions.
   B  Interaction and physics — pointer tracking, contact-solved dominos, the
      differentiator tabs, the Our Work track, the accordion and page
      transitions. These stay custom code.

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

  /* An element's top on the page, read from the layout, so a transform
     still running on it or around it (an entrance, a drift) can't shift it. */
  function pageTop(node) {
    var top = 0;
    for (; node; node = node.offsetParent) top += node.offsetTop;
    return top;
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
      /* A held section sits inside ScrollTrigger's pin spacer, so the section
         after it is the spacer's next sibling. */
      if (!next && section.parentElement && section.parentElement.classList.contains("pin-spacer")) {
        next = section.parentElement.nextElementSibling;
      }
      if (!next) return;

      /* A held section is ScrollTrigger's to move once it lets go, so the
         drift moves the layer inside it that the section names instead, and
         it starts only as the hold lets go, though the section after it may
         already be coming up the screen by then. */
      var layer = section.querySelector(":scope > [data-parallax-layer]") || section;
      var hold = window.ScrollTrigger.getAll().filter(function (trigger) { return trigger.pin === section; })[0];

      window.gsap.fromTo(layer, { yPercent: 0 }, {
        yPercent: parseFloat(section.dataset.parallax) || 50,
        ease: EASE.linear,
        scrollTrigger: {
          trigger: next,
          /* From the moment the next section shows, but never before the
             page has scrolled, so a section already in view on arrival
             doesn't open a gap above the head. */
          start: hold ? function () {
            var rising = next.getBoundingClientRect().top + window.scrollY - window.innerHeight;
            return Math.max(rising, hold.end);
          } : function () {
            return Math.max(0, pageTop(next) - window.innerHeight);
          },
          end: hold ? "top top" : function () { return pageTop(next); },
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
     Work cards — the pattern's return
     Hovering a card wipes its pattern away to the right (style.css). Leaving
     it doesn't play that back: the pattern takes is-returning and wipes in
     again from the left, so the sweep only ever runs one way.
     ------------------------------------------------------------------------ */

  var HOVER = "(hover: hover) and (pointer: fine)";

  function initWorkCards(scope) {
    all(scope, "[data-work-card]").forEach(function (card) {
      var pattern = card.querySelector("[data-work-pattern]");
      if (!pattern || !once(card, "WorkCard")) return;
      var open = false;

      function enter() {
        if (!window.matchMedia(HOVER).matches) return;
        pattern.classList.remove("is-returning");
        open = true;
      }
      function settle() {
        if (!open || card.matches(":hover, :focus-within")) return;
        open = false;
        pattern.classList.remove("is-returning");
        if (reduced()) return;
        /* Read layout once so the keyframes start again from the left. */
        void pattern.getBoundingClientRect();
        pattern.classList.add("is-returning");
      }

      card.addEventListener("pointerenter", enter);
      card.addEventListener("focusin", enter);
      card.addEventListener("pointerleave", settle);
      /* Focus has moved on only once the event is over. */
      card.addEventListener("focusout", function () { window.requestAnimationFrame(settle); });
      pattern.addEventListener("animationend", function () { pattern.classList.remove("is-returning"); });
    });
  }

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
     Case slider — the Expertise page's relevant work
     After Osmo's parallax image slider, which runs on Smooothy; the same
     behaviour on GSAP's ticker, so the site keeps one motion runtime. The
     track follows a target that a drag, a swipe or a sideways trackpad
     gesture moves, closes on it smoothly and never snaps. It loops: a slide
     more than half the set away wraps round to the other end while it is out
     of sight, and the set is copied as often as the screen needs. The
     pictures travel with their cards. Each card is a link; a drag is not a
     click. Positions are counted in slides; one slide is a card and its gap.
     ------------------------------------------------------------------------ */

  var CASE_SLIDER = {
    drag: 0.005,     /* slides per pixel dragged, as Smooothy */
    lerp: 0.3,       /* the catch-up's time constant, in seconds */
    threshold: 6     /* pixels of travel before a press is a drag, not a click */
  };

  /* A value folded into the band either side of zero, half the base wide. */
  function wrapAround(value, base) {
    var mod = value % base;
    if (Math.abs(mod) > base / 2) mod = mod > 0 ? mod - base : mod + base;
    return mod;
  }

  function initCaseSlider(scope) {
    if (!hasGsap()) return;

    all(scope, "[data-case-slider]").forEach(function (root) {
      var list = root.querySelector("[data-case-slider-list]");
      var originals = list ? all(list, "[data-case-slider-item]") : [];
      if (originals.length < 2 || !once(root, "CaseSlider")) return;

      var slides = originals.slice();
      var moves = [];
      var size = 1;
      var target = 0;
      var current = 0;
      var visible = true;
      var press = null;
      var travelled = 0;
      var last = window.performance.now();
      var watcher = null;
      var resizer = null;

      function bind() {
        moves = slides.map(function (slide) { return window.gsap.quickSetter(slide, "x", "px"); });
      }

      function render() {
        var count = slides.length;
        slides.forEach(function (slide, i) {
          moves[i]((wrapAround(current + i, count) - i) * size);
        });
      }

      /* Enough copies of the set that, wherever the track stands, a slide
         only wraps round while it is out of sight at either end. Copies are
         hidden from assistive technology and left out of the tab order, but
         still answer a click, since they come into view as the track moves. */
      function fill() {
        size = originals[0].offsetWidth || 1;
        var start = originals[0].offsetLeft;
        var span = root.clientWidth;
        var need = Math.max((2 * (span - start)) / size, 2 + (2 * start) / size);
        var sets = Math.max(1, Math.ceil(need / originals.length));
        if (sets * originals.length !== slides.length) {
          slides.slice(originals.length).forEach(function (copy) { copy.remove(); });
          slides = originals.slice();
          for (var set = 1; set < sets; set++) {
            originals.forEach(function (slide) {
              var copy = slide.cloneNode(true);
              copy.setAttribute("aria-hidden", "true");
              all(copy, "a, button").forEach(function (control) { control.setAttribute("tabindex", "-1"); });
              list.appendChild(copy);
              slides.push(copy);
            });
          }
        }
        if (moves.length !== slides.length) bind();
        render();
      }

      function release() {
        window.gsap.ticker.remove(tick);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (watcher) watcher.disconnect();
        if (resizer) resizer.disconnect();
      }

      function tick() {
        var now = window.performance.now();
        var elapsed = Math.min((now - last) / 1000, 0.1);
        last = now;
        if (!root.isConnected) {
          release();
          return;
        }
        if (!visible || current === target) return;
        var gap = target - current;
        current = reduced() || Math.abs(gap) < 0.0001 ? target : current + gap * (1 - Math.exp(-elapsed / CASE_SLIDER.lerp));
        render();
      }

      /* A drag moves the target from the first pixel; past a few pixels the
         press no longer counts as a click on the card. */
      function down(event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        press = { id: event.pointerId, x: event.clientX, from: target };
        travelled = 0;
      }

      function move(event) {
        if (!press || event.pointerId !== press.id) return;
        var delta = event.clientX - press.x;
        travelled = Math.max(travelled, Math.abs(delta));
        if (travelled > CASE_SLIDER.threshold) list.classList.add("is-dragging");
        target = press.from + delta * CASE_SLIDER.drag;
      }

      function up(event) {
        if (!press || (event && event.pointerId !== press.id)) return;
        press = null;
        list.classList.remove("is-dragging");
      }

      list.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      list.addEventListener("dragstart", function (event) { event.preventDefault(); });
      list.addEventListener("click", function (event) {
        if (travelled <= CASE_SLIDER.threshold) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);

      /* A sideways trackpad gesture moves the track one to one; an upright
         one is the page's. */
      root.addEventListener("wheel", function (event) {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        event.preventDefault();
        var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientWidth : 1;
        target -= (event.deltaX * unit) / size;
      }, { passive: false });

      /* A keyboard landing on a card brings it to the first place, the
         nearest way round. */
      list.addEventListener("focusin", function (event) {
        var index = slides.indexOf(event.target.closest("[data-case-slider-item]"));
        if (index < 0) return;
        var count = slides.length;
        target = count * Math.round((target + index) / count) - index;
      });

      if ("IntersectionObserver" in window) {
        watcher = new window.IntersectionObserver(function (entries) {
          visible = entries[entries.length - 1].isIntersecting;
          last = window.performance.now();
        }, { rootMargin: "50px" });
        watcher.observe(root);
      }

      if ("ResizeObserver" in window) {
        resizer = new window.ResizeObserver(debounce(fill, 60));
        resizer.observe(root);
      } else {
        window.addEventListener("resize", debounce(fill, 120));
      }

      list.scrollLeft = 0;
      list.classList.add("is-live");
      fill();
      window.gsap.ticker.add(tick);
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
     Collaboration — the models' pictures close on their titles
     On a desktop each model is held at its starting height, and from the
     moment it reaches the top band its picture shrinks by exactly as much as
     the page scrolls, down to the height of the number and title beside it.
     The model's content sits on the foot of the held box, so the number and
     title stay where they are while the picture shrinks and the rows rise
     under them; then the model scrolls on. No model changes height, so
     nothing below it moves. Without the script, below the desktop and with
     reduced motion, the pictures keep their full size.
     ------------------------------------------------------------------------ */

  var modelsRelease = null;

  function initModelPictures(scope) {
    if (!hasScrollTrigger()) return;
    var models = all(scope, "[data-collab-model]");
    if (!models.length || !once(models[0], "ModelPictures")) return;

    if (modelsRelease) modelsRelease();
    var media = window.gsap.matchMedia();
    modelsRelease = function () {
      media.revert();
      modelsRelease = null;
    };

    media.add(DESKTOP + " and (prefers-reduced-motion: no-preference)", function () {
      var parts = models.map(function (model) {
        return {
          model: model,
          head: model.querySelector("[data-model-head]"),
          frame: model.querySelector("[data-model-frame]"),
          from: 0,
          to: 0,
          ratio: 1
        };
      }).filter(function (part) { return part.head && part.frame; });
      if (!parts.length) return;

      /* Each refresh measures the models at rest first: the picture at its
         full size and the model at its natural height, which it then holds. */
      function measure() {
        /* A page transition took the models away: let go of them. */
        if (!parts[0].model.isConnected) {
          if (modelsRelease) modelsRelease();
          return;
        }
        parts.forEach(function (part) {
          window.gsap.set([part.model, part.frame], { clearProps: "height,width" });
        });
        parts.forEach(function (part) {
          part.from = part.frame.offsetHeight;
          part.ratio = part.frame.offsetWidth / (part.from || 1);
          part.to = Math.min(part.from, part.head.offsetHeight);
          part.held = part.model.offsetHeight;
        });
        parts.forEach(function (part) {
          window.gsap.set(part.model, { height: part.held });
        });
      }

      function paint(part, progress) {
        var height = part.from + (part.to - part.from) * progress;
        window.gsap.set(part.frame, { height: height, width: height * part.ratio });
      }

      models.forEach(function (model) { model.classList.add("is-live"); });
      measure();
      window.ScrollTrigger.addEventListener("refreshInit", measure);

      /* Where the model meets the top band, read from the layout rather than
         the screen, so an entrance still moving the section can't shift it. */
      function reach(part) {
        return pageTop(part.model) - tokenPx("--_spacing---static--spacing-18", 72);
      }

      parts.forEach(function (part) {
        window.ScrollTrigger.create({
          trigger: part.model,
          start: function () { return reach(part); },
          end: function () { return reach(part) + Math.max(1, part.from - part.to); },
          invalidateOnRefresh: true,
          onUpdate: function (self) { paint(part, self.progress); },
          onRefresh: function (self) { paint(part, self.progress); }
        });
      });

      return function () {
        window.ScrollTrigger.removeEventListener("refreshInit", measure);
        parts.forEach(function (part) {
          window.gsap.set([part.model, part.frame], { clearProps: "height,width" });
        });
        models.forEach(function (model) { model.classList.remove("is-live"); });
      };
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
     Home — differentiator: two approaches become one, and the one is the
     way in
     The bar under the statement holds the tailored solution (traditional
     consulting) in burgundy and proven approaches (established solutions) in
     khaki. On a screen at least 992×540 the
     sequence starts while the statement and the bar are a third of the way up
     the screen, once both can be read, and the section holds from the moment
     they are centred; one timeline, bound to the scroll, plays the sequence
     over the lead-in and the hold. The section doesn't stop dead:
     the statement and the bar glide on up and come to rest with the button's
     place on the middle of the screen. The halves slide in to the middle
     third, their outer ends together and their inner ends, where they
     collide, each at its own pace, and they shrink on their own centre from
     the moment they move. They comb through each other as four stripes that cover the
     labels and land together; the block turns dark as they land, the
     button's label comes in on it while it is still shrinking, and it
     shrinks on into the dark button. The statement above stays in view
     throughout.

     The stripes are cloned from the section's hidden templates in two
     layers: each half's own ground under the labels, and over them the
     crossing, where the colours overlap. Over the crossing, a copy of the
     button's label and arrow comes in; the button itself is the section's
     own, and takes over once the block has its size.
     Without the script, on a smaller screen and with reduced motion, the
     bar rests in its two halves with the button under it.
     ------------------------------------------------------------------------ */

  /* The screen the sequence needs, down to a 13-inch laptop's browser window;
     on a smaller one the bar rests. */
  var DIFFER_STAGE = "(min-width: 992px) and (min-height: 540px)";
  /* The hold, in screen heights of scrolling, and the lead-in before it: the
     sequence starts while the statement and the bar are a third of the way up
     the screen, a sixth of a screen before they are centred and the section
     holds. */
  var DIFFER_HOLD = 0.75;
  var DIFFER_LEAD = 1 / 6;
  var DIFFER_STRIPES = 4;
  /* Shares of the sequence: the halves slide in over the first, and the
     block is the button at the second. */
  var DIFFER_SLIDE = 0.55;
  var DIFFER_BUTTON = 0.9;
  /* How long each stripe's inner end waits before it slides, as a share of
     the slide, so the stripes collide unevenly and still land together. The
     two middle stripes carry the labels and wait least, so a label never
     shows past its own colour before the crossing covers it. */
  var DIFFER_WAIT = {
    left: [0.3, 0, 0.1, 0.22],
    right: [0.24, 0.08, 0, 0.3]
  };
  var differRelease = null;

  function initDifferentiator(scope) {
    var section = (scope || document).querySelector("[data-differ]");
    if (!section || !once(section, "Differ") || !hasScrollTrigger()) return;

    var layer = section.querySelector("[data-differ-glide]");
    var content = section.querySelector("[data-differ-content]");
    var band = section.querySelector("[data-differ-band]");
    var halves = all(section, "[data-differ-half]");
    var cta = section.querySelector("[data-differ-cta]");
    if (!layer || !content || !band || halves.length !== 2 || !cta) return;

    var control = cta.querySelector(".button_main_element");
    var link = cta.querySelector(".clickable_link");
    /* The button's label and the arrow after it. A copy of them comes in on
       the forming block; the button's own are never touched, so its hover
       motion stays theirs. */
    var face = all(cta, ".button_main_text, .button_main_arrow.is-trail");
    if (!control || !link || face.length !== 2) return;

    function clone(name) {
      var source = section.querySelector("[data-differ-template='" + name + "']");
      if (!source) return null;
      var node = source.cloneNode(false);
      node.removeAttribute("data-differ-template");
      node.setAttribute("aria-hidden", "true");
      return node;
    }

    /* A new page brings a new section; the old sequence leaves with it. */
    if (differRelease) differRelease();
    var media = window.gsap.matchMedia();
    differRelease = function () {
      media.revert();
      differRelease = null;
    };

    media.add(DIFFER_STAGE + " and (prefers-reduced-motion: no-preference)", function () {
      if (!section.isConnected) return;

      var ground = clone("rows");
      var crossing = clone("rows");
      var faceLayer = clone("face");
      if (!ground || !crossing || !faceLayer) return;
      crossing.classList.add("is-cross");
      var faceCopies = face.map(function (node) { return faceLayer.appendChild(node.cloneNode(true)); });

      /* Four stripes. In the ground each half has its own segment; in the
         crossing each stripe has one, in the colour on top there — burgundy
         on the first and third, khaki on the second and fourth — holding
         the dark it turns. */
      var lefts = [];
      var rights = [];
      var crosses = [];
      var darks = [];
      for (var r = 0; r < DIFFER_STRIPES; r++) {
        var groundRow = clone("row");
        var crossRow = clone("row");
        var left = clone("seg-left");
        var right = clone("seg-right");
        var cross = clone(r % 2 === 0 ? "seg-left" : "seg-right");
        var dark = clone("seg-dark");
        if (!groundRow || !crossRow || !left || !right || !cross || !dark) return;
        cross.classList.add("is-cross");
        groundRow.appendChild(left);
        groundRow.appendChild(right);
        cross.appendChild(dark);
        crossRow.appendChild(cross);
        ground.appendChild(groundRow);
        crossing.appendChild(crossRow);
        lefts.push(left);
        rights.push(right);
        crosses.push(cross);
        darks.push(dark);
      }

      band.appendChild(ground);
      band.appendChild(crossing);
      band.appendChild(faceLayer);
      section.classList.add("is-live");
      halves.forEach(function (half) { half.classList.add("is-live"); });
      cta.classList.add("is-live");

      /* Geometry, read again on every refresh. Places in the section come
         from the layout, not the screen, so no transform ever shifts them. */
      function offsetIn(node) {
        var top = 0;
        for (; node && node !== section; node = node.offsetParent) top += node.offsetTop;
        return top;
      }
      /* The middle of the statement and the bar together. */
      function groupCentre() { return (offsetIn(content) + offsetIn(band) + band.offsetHeight) / 2; }
      function buttonCentre() { return offsetIn(control) + control.offsetHeight / 2; }
      /* How far the statement and the bar glide on up once the hold begins:
         to the button's place on the middle of the screen, or less if the
         statement would otherwise come closer than a set space to the top. */
      function glide() {
        var toMiddle = buttonCentre() - groupCentre();
        var room = window.innerHeight / 2 - (groupCentre() - offsetIn(content)) - tokenPx("--_spacing---static--spacing-10", 40);
        return -Math.max(0, Math.min(toMiddle, room));
      }
      /* The label copy is unmasked as one sweep, from its first letter to the
         tip of its arrow. */
      function faceMask(edge) {
        var from = faceLayer.getBoundingClientRect().left;
        var reach = edge === "start" ? faceCopies[0].getBoundingClientRect().left : faceCopies[1].getBoundingClientRect().right;
        return "inset(0px " + (faceLayer.offsetWidth - (reach - from)) + "px 0px 0px)";
      }
      function barHeight() { return band.offsetHeight; }
      function buttonHeight() { return control.offsetHeight; }
      function buttonInset() {
        return ((band.offsetWidth - control.offsetWidth) / 2 / band.offsetWidth) * 100 + "%";
      }

      var hold = window.ScrollTrigger.create({
        trigger: section,
        pin: true,
        start: function () { return "top+=" + groupCentre() + " center"; },
        end: function () { return "+=" + Math.round(window.innerHeight * DIFFER_HOLD); },
        refreshPriority: 1,
        invalidateOnRefresh: true
      });

      var sequence = window.gsap.timeline({
        defaults: { ease: EASE.linear },
        scrollTrigger: {
          trigger: section,
          start: function () { return "top+=" + groupCentre() + " " + (50 + DIFFER_LEAD * 100) + "%"; },
          end: function () { return hold.end; },
          /* A short catch-up, so a quick flick of the wheel plays out
             rather than jumping. */
          scrub: DUR.fast,
          invalidateOnRefresh: true
        }
      });
      /* Where in the sequence the hold begins. */
      var holdAt = DIFFER_LEAD / (DIFFER_LEAD + DIFFER_HOLD);

      /* As the hold begins, the statement and the bar glide on up, easing to
         rest, so the section never stops dead. The glide keeps to whole
         pixels, so the stripes meet without a seam… */
      sequence.fromTo(layer, { y: 0 }, { y: glide, ease: EASE.response, duration: 1 - holdAt, snap: "y" }, holdAt);

      /* …while the halves' outer ends slide in to the middle third together,
         and from the moment they move the halves shrink on their centre
         towards the button's height. Until they move, the crossing stays
         hidden: at nothing wide it could still leave a sliver where the
         halves meet. */
      sequence
        .fromTo(crossing, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, 0)
        .fromTo(lefts, { left: "0%" }, { left: "33.3333%", ease: EASE.secondary, duration: DIFFER_SLIDE }, 0)
        .fromTo(rights, { right: "0%" }, { right: "33.3333%", ease: EASE.secondary, duration: DIFFER_SLIDE }, 0)
        .fromTo([ground, crossing], { height: barHeight }, { height: buttonHeight, ease: EASE.secondary, duration: DIFFER_BUTTON }, 0);

      /* …while their inner ends, where they collide, each wait their own time
         and all land together. The crossing grows between them: its left edge
         rides the khaki's inner end, its right edge the burgundy's. */
      for (var s = 0; s < DIFFER_STRIPES; s++) {
        var waitLeft = DIFFER_SLIDE * DIFFER_WAIT.left[s];
        var waitRight = DIFFER_SLIDE * DIFFER_WAIT.right[s];
        sequence
          .fromTo([lefts[s], crosses[s]], { right: "50%" }, { right: "33.3333%", ease: EASE.secondary, duration: DIFFER_SLIDE - waitLeft }, waitLeft)
          .fromTo([rights[s], crosses[s]], { left: "50%" }, { left: "33.3333%", ease: EASE.secondary, duration: DIFFER_SLIDE - waitRight }, waitRight);
      }

      /* The labels ride their halves, a quarter of the bar inwards, while the
         outer ends come in a third, so on a narrower screen a label could
         show past its colour. Each half is clipped to its ground: on its
         outer side to the outer end, top and foot to the shrinking height. */
      var slideEase = window.gsap.parseEase(EASE.secondary);
      function clipHalves() {
        var time = Math.min(sequence.time(), DIFFER_SLIDE);
        var side = (100 / 6) * slideEase(time / DIFFER_SLIDE);
        var rise = (barHeight() - buttonHeight()) * slideEase(time / DIFFER_BUTTON) / 2;
        /* A pixel inside the edge, so no sliver shows where the two meet. */
        var outer = side ? "calc(" + side + "% + 1px)" : "0%";
        window.gsap.set(halves[0], { clipPath: "inset(" + rise + "px 0% " + rise + "px " + outer + ")" });
        window.gsap.set(halves[1], { clipPath: "inset(" + rise + "px " + outer + " " + rise + "px 0%)" });
      }
      sequence.eventCallback("onUpdate", clipHalves);

      sequence
        /* The labels ride their halves until the crossing covers them. */
        .fromTo(halves[0], { xPercent: 0 }, { xPercent: 50, ease: EASE.secondary, duration: DIFFER_SLIDE }, 0)
        .fromTo(halves[1], { xPercent: 0 }, { xPercent: -50, ease: EASE.secondary, duration: DIFFER_SLIDE }, 0)
        /* The crossing turns dark as the stripes come in to land… */
        .fromTo(darks, { opacity: 0 }, { opacity: 1, ease: EASE.primary, duration: 0.22 }, DIFFER_SLIDE - 0.13)
        /* …and once landed it is the whole block and hides the rest, and
           narrows on to the button's width… */
        .fromTo([ground, halves[0], halves[1]], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0, immediateRender: false }, DIFFER_SLIDE)
        .fromTo(crosses, { left: "33.3333%", right: "33.3333%" }, { left: buttonInset, right: buttonInset, ease: EASE.secondary, duration: DIFFER_BUTTON - DIFFER_SLIDE, immediateRender: false }, DIFFER_SLIDE)
        /* …while the button's label and arrow come in on it, unmasked from
           the left in one sweep, well before it stops shrinking. */
        .fromTo(faceLayer, { clipPath: function () { return faceMask("start"); } }, { clipPath: function () { return faceMask("end"); }, ease: EASE.reveal, duration: 0.3 }, DIFFER_SLIDE + 0.01)
        /* The block is the button now, and the button takes over. */
        .fromTo([crossing, faceLayer], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0, immediateRender: false }, DIFFER_BUTTON)
        .to({}, { duration: 1 - DIFFER_BUTTON }, DIFFER_BUTTON);

      /* Until then the button waits under the stripes, where a pointer can't
         reach it; a keyboard can, and landing on it scrolls to the end of the
         hold, where the button rests. */
      function reachButton() {
        window.requestAnimationFrame(function () {
          if (sequence.progress() < 1) window.scrollTo(0, hold.end);
        });
      }
      link.addEventListener("focus", reachButton);

      /* Off the stage the generated pieces go and the bar rests again. */
      return function () {
        link.removeEventListener("focus", reachButton);
        ground.remove();
        crossing.remove();
        faceLayer.remove();
        section.classList.remove("is-live");
        window.gsap.set(halves, { clearProps: "clipPath" });
        halves.forEach(function (half) { half.classList.remove("is-live"); });
        cta.classList.remove("is-live");
      };
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
    initWorkCards(scope);
    initDifferentiator(scope);
    initStackedSlides();
    initDomino(scope);
    initSpecialize(scope);
    initSectionParallax(scope);
    initBandEntrance(scope);
    initChains(scope);
    initTipSlide(scope);
    initHeadingDrift(scope);
    initCaseSlider(scope);
    initAboutOverlay(scope);
    initModelsRail(scope);
    initAccordions(scope);
    initModelPictures(scope);
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

