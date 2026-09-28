/* ==========================================================================
   Autokatalyst — collaboration models

   Three systems, all reading the same motion tokens:

   1. The rail labels. Each label sits in flow at the top of its own model and
      sticks from there to the end of the group, so the set collects into a
      stack as the reader passes each block. Sticky positioning does the work;
      this module only measures the flow offsets — the vertical space each
      label needs before it, and the height each one holds at — and re-measures
      whenever a row opens or the viewport changes.

   2. Clicking a label carries the page to its model. Scroll is tweened on the
      shared page duration and easing rather than handed to the browser, so it
      moves at the same rate as a page transition.

   3. The rows are an accordion: one row open per model, height and opacity
      only, on the standard duration. Opening a row changes the model's height,
      so the rail is re-measured and ScrollTrigger refreshed on settle.

   Vertical movement only. No bounce, no spring, no travel beyond the height
   the content itself needs.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  /* The offset the rail and the model titles hold at, read from the token so
     the CSS and the scroll target can never drift apart. */
  function stickyTop() {
    var raw = window.getComputedStyle(document.documentElement)
      .getPropertyValue("--collab-sticky-top");
    return parseFloat(raw) * (raw.indexOf("rem") > -1 ? 16 : 1) || 72;
  }

  function isDesktop() {
    return window.matchMedia("(min-width: 992px)").matches;
  }

  /* ------------------------------------------------------------------
     Rail — the flow position of each label, and the height it holds at
     ------------------------------------------------------------------ */
  function initRail() {
    var rail = document.querySelector("[data-collab-rail]");
    if (!rail) return;

    var labels = Array.prototype.slice.call(rail.querySelectorAll("[data-collab-label]"));
    var models = Array.prototype.slice.call(document.querySelectorAll("[data-collab-model]"));
    if (!labels.length || labels.length !== models.length) return;

    /* The listeners of a previous container are dropped before the new ones are
       bound, so a page transition never leaves a measure running on markup that
       has been swapped out. */
    if (namespace.collabRelease) namespace.collabRelease();

    /* Offsets are read from the layout box rather than the viewport: a page
       transition holds a transform on the container while it plays, and a
       viewport reading taken mid-transition would be displaced by it. */
    function flowTop(element) {
      var y = 0;
      var node = element;
      while (node && node !== rail.offsetParent) {
        y += node.offsetTop;
        node = node.offsetParent;
      }
      return y;
    }

    /* flowTop is measured from the rail's offset parent, so the page position of
       that parent is added back when a scroll target is wanted. */
    function flowOrigin() {
      var parent = rail.offsetParent;
      if (!parent) return 0;
      return parent.getBoundingClientRect().top + window.scrollY;
    }

    function measure() {
      if (!isDesktop()) {
        labels.forEach(function (label) {
          label.style.marginTop = "";
          label.style.top = "";
        });
        return;
      }

      var railTop = flowTop(rail);
      var top = stickyTop();
      var filled = 0;   /* space already taken by the labels above */
      var stack = 0;    /* height the labels above hold at, plus their gaps */
      var gap = 8;      /* clear space between the stacked labels */

      labels.forEach(function (label, i) {
        label.style.marginTop = "0px";
        label.style.top = top + stack + "px";

        var lead = Math.max(0, flowTop(models[i]) - railTop - filled);

        label.style.marginTop = lead + "px";
        filled += lead + label.offsetHeight;
        stack += label.offsetHeight + gap;
      });
    }

    measure();
    namespace.collabMeasure = measure;

    /* The first pass runs on markup the browser may not have finished laying
       out — fonts, the tile images and an incoming page transition all settle
       after it — so the measure is taken again as each of those lands. */
    window.requestAnimationFrame(measure);
    var settleTimer = window.setTimeout(measure, tokens.duration.page * 1000);

    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    if (core && core.hasScrollTrigger && core.hasScrollTrigger()) {
      window.ScrollTrigger.addEventListener("refresh", measure);
    }

    namespace.collabRelease = function () {
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      if (core && core.hasScrollTrigger && core.hasScrollTrigger()) {
        window.ScrollTrigger.removeEventListener("refresh", measure);
      }
      namespace.collabRelease = null;
    };

    /* ----------------------------------------------------------------
       Clicking a label carries the page to its model
       ---------------------------------------------------------------- */
    labels.forEach(function (label, i) {
      if (!core || !core.guard(label, "CollabLabel")) return;

      label.addEventListener("click", function (event) {
        event.preventDefault();

        var target = flowTop(models[i]) + flowOrigin() - stickyTop();
        var to = Math.max(0, Math.round(target));

        if (!window.gsap || core.prefersReducedMotion()) {
          window.scrollTo(0, to);
          return;
        }

        /* ScrollToPlugin is not part of the site's bundle, so the position is
           tweened on a plain object and written to the window each frame. */
        var from = window.scrollY;
        var proxy = { y: from };
        window.gsap.killTweensOf(proxy);
        window.gsap.to(proxy, {
          y: to,
          duration: tokens.duration.page,
          ease: core.ease.primary,
          overwrite: true,
          onUpdate: function () {
            window.scrollTo(0, proxy.y);
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Accordion — one row open per model, as a single layout transition

     Switching rows is one measured move, not two. The group's height before
     and after the change are both read in the same frame, the group is then
     tweened between those two numbers while the outgoing content collapses
     and the incoming content expands inside it, and the group is released to
     its natural height only once the move has finished. The section below
     therefore travels once, continuously, instead of reacting to a collapse
     and an expansion in turn.

     The space between a row's head and its body belongs to the body, so it
     leaves with the body's height and the measured numbers stay exact.
     ------------------------------------------------------------------ */
  function initAccordion() {
    var models = Array.prototype.slice.call(document.querySelectorAll("[data-collab-model]"));

    models.forEach(function (model) {
      var heads = Array.prototype.slice.call(model.querySelectorAll("[data-collab-toggle]"));

      heads.forEach(function (head) {
        if (!core || !core.guard(head, "CollabRow")) return;

        head.addEventListener("click", function () {
          open(model, head);
        });

        head.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          open(model, head);
        });
      });
    });

    function bodyOf(head) {
      return head.parentNode.querySelector(".model_row_body");
    }

    function iconOf(head) {
      return head.querySelector(".model_row_icon");
    }

    function groupOf(model) {
      return model.querySelector(".model_rows");
    }

    /* Every accordion is held at the height of the tallest row in the tallest
       model, so switching rows moves nothing below it and the page never shifts
       under the reader. The rows themselves stay at the top of that height.
       Re-measured on resize, where the wrapping changes. */
    function lock() {
      var groups = models.map(groupOf).filter(Boolean);
      if (!groups.length) return;

      var state = models.map(function (model) {
        return openHeadsOf(model, null);
      });

      groups.forEach(function (group) {
        group.style.minHeight = "";
      });

      var tallest = 0;
      models.forEach(function (model) {
        var group = groupOf(model);
        if (!group) return;
        var heads = Array.prototype.slice.call(model.querySelectorAll("[data-collab-toggle]"));

        heads.forEach(function (head) {
          heads.forEach(function (other) {
            var body = bodyOf(other);
            if (!body) return;
            body.classList.toggle("is-collapsed", other !== head);
          });
          tallest = Math.max(tallest, group.offsetHeight);
        });
      });

      /* The rows go back to the state the reader left them in. */
      models.forEach(function (model, i) {
        var heads = Array.prototype.slice.call(model.querySelectorAll("[data-collab-toggle]"));
        heads.forEach(function (head) {
          var body = bodyOf(head);
          if (!body) return;
          body.classList.toggle("is-collapsed", state[i].indexOf(head) === -1);
        });
      });

      groups.forEach(function (group) {
        group.style.minHeight = tallest + "px";
      });
    }

    /* Every row that is currently showing, so an interrupted move can never
       leave a second row open behind the one being closed. */
    function openHeadsOf(model, except) {
      var heads = Array.prototype.slice.call(model.querySelectorAll("[data-collab-toggle]"));
      return heads.filter(function (head) {
        if (head === except) return false;
        var body = bodyOf(head);
        return body && !body.classList.contains("is-collapsed");
      });
    }

    function mark(head, isOpen) {
      head.setAttribute("aria-expanded", isOpen ? "true" : "false");
      iconOf(head).classList.toggle("is-collapsed", !isOpen);
    }

    /* The measurements the rail and any scroll-bound motion depend on are
       refreshed once the move has settled, never during it. */
    function settle() {
      if (namespace.collabMeasure) namespace.collabMeasure();
      if (core && core.hasScrollTrigger && core.hasScrollTrigger()) {
        window.ScrollTrigger.refresh();
      }
    }

    function bare(element) {
      window.gsap.set(element, { clearProps: "height,paddingTop,opacity,overflow" });
    }

    /* A page transition rebinds this, so the previous container's listeners are
       dropped first. */
    if (namespace.collabUnlock) namespace.collabUnlock();

    lock();
    if (namespace.collabMeasure) namespace.collabMeasure();

    var relock = function () {
      lock();
      if (namespace.collabMeasure) namespace.collabMeasure();
    };

    window.requestAnimationFrame(relock);
    window.addEventListener("resize", relock);
    window.addEventListener("load", relock);

    namespace.collabUnlock = function () {
      window.removeEventListener("resize", relock);
      window.removeEventListener("load", relock);
      namespace.collabUnlock = null;
    };

    function open(model, head) {
      var group = groupOf(model);
      var incoming = bodyOf(head);
      if (!group || !incoming || !incoming.classList.contains("is-collapsed")) return;

      /* A move already in flight is landed on its own end state first, so the
         next measurement reads a settled layout and no row is left half-open. */
      if (model.collabMove) model.collabMove();

      var outgoingHeads = openHeadsOf(model, head);
      var outgoing = outgoingHeads.map(bodyOf);

      mark(head, true);
      outgoingHeads.forEach(function (other) { mark(other, false); });

      function land() {
        outgoing.forEach(function (body) {
          body.classList.add("is-collapsed");
          bare(body);
        });
        bare(incoming);
        bare(group);
        model.collabMove = null;
        settle();
      }

      if (!window.gsap || (core && core.prefersReducedMotion())) {
        land();
        return;
      }

      window.gsap.killTweensOf([group, incoming].concat(outgoing));

      /* The incoming row's open height is read before anything is painted; the
         group's own height is fixed, so nothing outside it has to move. */
      var lead = window.getComputedStyle(incoming).paddingTop;
      var outFrom = outgoing.map(function (body) { return body.offsetHeight; });

      incoming.classList.remove("is-collapsed");
      window.gsap.set(incoming, { clearProps: "height,paddingTop,opacity" });
      var inTo = incoming.offsetHeight;

      window.gsap.set(group, { overflow: "hidden" });
      window.gsap.set(incoming, { height: 0, paddingTop: 0, opacity: 0 });
      outgoing.forEach(function (body, i) {
        window.gsap.set(body, { height: outFrom[i], opacity: 1 });
      });

      var move = window.gsap.timeline({ onComplete: land });

      /* Clicking another row mid-move calls this: the move is dropped and its
         end state applied at once, so the next one starts from a clean layout. */
      model.collabMove = function () {
        move.kill();
        land();
      };

       /* One duration, one easing, both contents moving together. */
      move.to(incoming, {
        height: inTo,
        paddingTop: lead,
        opacity: 1,
        duration: tokens.duration.standard,
        ease: core.ease.primary
      }, 0);

      if (outgoing.length) {
        move.to(outgoing, {
          height: 0,
          paddingTop: 0,
          opacity: 0,
          duration: tokens.duration.standard,
          ease: core.ease.primary
        }, 0);
      }
    }
  }

  function initCollab() {
    if (!document.querySelector("[data-collab-model]")) return;
    initRail();
    initAccordion();
  }

  namespace.collab = { init: initCollab };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCollab);
  } else {
    initCollab();
  }

  /* A page transition swaps the container, so the shared entry point runs
     again on the new markup. */
  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initCollab();
    };
  }
})(window.ATK.motion);
