/* ==========================================================================
   Autokatalyst — page transitions

   Architecture, lifecycle and helper structure are the Osmo overlapping
   parallax transition, preserved as supplied: the same Barba hooks, the same
   once/leave/enter contract, the same layering and the same data attributes.

   One thing is adapted: every curve and duration is a motion token rather than a
   local value, so the transition belongs to the same language as the rest of
   the site.

   Lenis is not loaded here. Every call to it in the Osmo boilerplate is
   guarded by `hasLenis`, so the architecture is intact; adding the library
   is a single script tag if smooth scroll is wanted later.

   Barba itself is loaded lazily, and only once the page actually links to
   another page. On a single-page build nothing is fetched and nothing sits
   in the critical path.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  var transitionDuration = tokens.duration.page;

  /* The two pages travel together at different speeds: the outgoing page
     recedes a quarter of the viewport while the incoming page covers the
     whole of it, so the new page reads as passing over the old one. */
  var CURRENT_TRAVEL = "-25vh";
  var NEXT_FROM = "100vh";
  var VEIL_OPACITY = 0.8;

  var hasScrollTrigger = function () { return core.hasScrollTrigger(); };
  var hasLenis = typeof window.Lenis !== "undefined";
  var lenis = null;

  function reducedMotion() {
    return core.prefersReducedMotion();
  }

  /* The ground is part of the destination's own state: a container declares it
     with data-page-ground, and everything behind that container adopts it
     before the transition plays, so no default white is ever exposed. */
  function applyGround(container) {
    if (!container) return;
    var dark = container.getAttribute("data-page-ground") === "dark";
    var wrap = document.querySelector("[data-barba='wrapper']");
    container.classList.toggle("is-dark-ground", dark);
    if (wrap) wrap.classList.toggle("is-dark-ground", dark);
    document.body.classList.toggle("is-dark", dark);

    /* The bar sits outside the swapped container, so its treatment belongs to
       the destination's state too: it changes with the ground rather than
       after the slide has finished. */
    var links = document.querySelectorAll(".nav_link");
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle("is-inverse", dark);
    }
    var marks = document.querySelectorAll(".nav_logo_img");
    var next = dark ? "assets/logo-atk-light.svg" : "assets/logo-atk.svg";
    for (var j = 0; j < marks.length; j++) {
      swapMark(marks[j], next);
    }
  }

  /* The two versions cross rather than cut. */
  function swapMark(mark, next) {
    if (mark.getAttribute("src") === next) return;
    mark.classList.add("is-swapping");
    window.setTimeout(function () {
      mark.setAttribute("src", next);
      mark.classList.remove("is-swapping");
    }, 140);
  }

  /* ------------------------------------------------------------------
     Lifecycle
     ------------------------------------------------------------------ */

  function resetPage(container) {
    window.scrollTo(0, 0);
    window.gsap.set(container, { clearProps: "position,top,left,right" });
    if (hasLenis && lenis) {
      lenis.resize();
      lenis.start();
    }
  }

  /* Nothing to do on the first load: the page is already where it should be. */
  function runPageOnceAnimation() {
    return window.gsap.timeline();
  }

  function runPageLeaveAnimation(current) {
    var wrap = document.querySelector("[data-transition-wrap]");
    var veil = wrap ? wrap.querySelector("[data-transition-dark]") : null;

    var tl = window.gsap.timeline({
      onComplete: function () { current.remove(); }
    });

    if (reducedMotion()) return tl.set(current, { autoAlpha: 0 });

    if (wrap) tl.set(wrap, { zIndex: 2 }, 0);

    if (veil) {
      tl.fromTo(veil, { autoAlpha: 0 }, {
        autoAlpha: VEIL_OPACITY,
        duration: transitionDuration,
        ease: core.ease.parallax
      }, 0);
    }

    tl.fromTo(current, { y: "0vh" }, {
      y: CURRENT_TRAVEL,
      duration: transitionDuration,
      ease: core.ease.parallax
    }, 0);

    /* Cleared at the end of leave so the veil is ready for the next one. */
    if (veil) tl.set(veil, { autoAlpha: 0 });

    return tl;
  }

  function runPageEnterAnimation(next) {
    var tl = window.gsap.timeline();

    if (reducedMotion()) {
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady");
      tl.call(resetPage, [next], "pageReady");
      return new Promise(function (resolve) { tl.call(resolve, null, "pageReady"); });
    }

    tl.add("startEnter", 0);

    tl.set(next, { autoAlpha: 1, zIndex: 3 }, "startEnter");

    tl.fromTo(next, { y: NEXT_FROM }, {
      y: "0vh",
      duration: transitionDuration,
      clearProps: "all",
      ease: core.ease.parallax
    }, "startEnter");

    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");

    return new Promise(function (resolve) {
      tl.call(resolve, null, "pageReady");
    });
  }

  /* ------------------------------------------------------------------
     Barba wiring
     ------------------------------------------------------------------ */

  var BARBA_SRC = "https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js";

  /* Barba is only worth loading once there is somewhere to navigate to.
     On a single-page build nothing is fetched, so the library never sits in
     the critical path. */
  function hasInternalRoutes() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (!href || href.charAt(0) === "#") continue;
      if (/^([a-z]+:)?\/\//i.test(href) || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) continue;
      if (links[i].pathname !== window.location.pathname) return true;
    }
    return false;
  }

  function loadBarba(onReady) {
    if (typeof window.barba !== "undefined") {
      onReady();
      return;
    }
    var existing = document.querySelector("[data-barba-script]");
    if (existing) {
      existing.addEventListener("load", onReady);
      return;
    }
    var script = document.createElement("script");
    script.setAttribute("data-barba-script", "");
    script.async = true;
    script.src = BARBA_SRC;
    script.addEventListener("load", onReady);
    document.body.appendChild(script);
  }

  function initPageTransitions() {
    if (!core.hasGsap()) return;
    if (!document.querySelector("[data-barba='wrapper']")) return;
    if (initPageTransitions.done) return;
    if (!hasInternalRoutes()) return;

    loadBarba(function () {
      if (initPageTransitions.done || typeof window.barba === "undefined") return;
      initPageTransitions.done = true;
      startBarba();
    });
  }

  function startBarba() {
    window.history.scrollRestoration = "manual";
    applyGround(document.querySelector("[data-barba='container']"));

    /* Barba fires the enter hooks for the initial page as well as for real
       navigations, and `data.current` is not a reliable way to tell them
       apart by the time afterEnter runs. This flag is: it clears at the end
       of the first pass. Nothing may touch the page on that pass — making
       the container `position: fixed` collapses the document height, and a
       ScrollTrigger refresh landing in that window destroys every pinned
       section on the page. */
    var initialLoad = true;

    /* Only for real navigations. Barba fires enter hooks for the initial
       load too, and the page must be left untouched there. */
    window.barba.hooks.beforeEnter(function (data) {
      applyGround(data.next.container);
      if (initialLoad) return;
      window.gsap.set(data.next.container, {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0
      });
      if (lenis && typeof lenis.stop === "function") lenis.stop();

      /* The arriving page's entrance starts with the transition rather than
         after it: both are opacity and transform only, so they can overlap and
         the new page reads as already alive as it slides in. The scroll-bound
         work still waits for afterEnter, where the container is measurable. */
      if (namespace.hero && namespace.hero.enter) namespace.hero.enter(data.next.container);
      if (namespace.band && namespace.band.init) namespace.band.init();
    });

    window.barba.hooks.afterLeave(function () {
      if (initialLoad) return;
      if (hasScrollTrigger()) {
        window.ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(); });
      }
    });

    window.barba.hooks.afterEnter(function () {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      /* Every module re-binds against the new container and refreshes once. */
      if (namespace.init) namespace.init();
      if (hasLenis && lenis) {
        lenis.resize();
        lenis.start();
      }
      if (hasScrollTrigger()) window.ScrollTrigger.refresh();
    });

    window.barba.init({
      debug: false,
      timeout: 7000,
      preventRunning: true,
      transitions: [
        {
          name: "default",
          sync: true,
          once: function (data) { return runPageOnceAnimation(data.next.container); },
          leave: function (data) { return runPageLeaveAnimation(data.current.container, data.next.container); },
          enter: function (data) { return runPageEnterAnimation(data.next.container); }
        }
      ]
    });
  }

  namespace.transitions = { init: initPageTransitions };
})(window.ATK.motion);
