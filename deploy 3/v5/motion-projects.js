/* ==========================================================================
   Autokatalyst — project list preview

   Hovering a row in the "Our work" table opens that project's picture in a
   frame beside the list. The frame is a fixture, not a tooltip: it occupies
   the three columns the table holds clear for it, so its horizontal position
   never changes. Only its vertical position answers the pointer.

   Weight
   ------
   The frame does not track the pointer. Each frame the current position moves
   a fraction of the remaining distance toward the pointer's line, which is a
   plain exponential approach: it trails while the pointer is moving, and once
   the pointer stops it closes the gap and settles rather than arriving and
   stopping. There is no spring and no overshoot — the position can never pass
   its target, because the step is always a fraction of what is left.

   The loop parks itself once the frame is within a subpixel of its target, so
   a still pointer costs nothing.

   The window
   ----------
   Its size is literal and never animates. Changing row only changes which
   picture is showing: the layers cross over one another in place, both opaque
   through the crossing, so the window is never empty and never resizes.

   Focus
   -----
   Rows recede rather than the focal row brightening: nothing is dimmed until
   the reader is actually in the list. The dimming sits on each row's text,
   never on the row, because the row carries the divider and the divider is
   not part of the interaction. The row in focus is the only one carrying its
   control, and the arrow inside that control is the homepage button — the row
   is its hover parent, so the movement is the same rule.

   Every state change is a class, so the browser's own transitions carry them
   and a change of row interrupts the previous one in place.

   Rest is reached only by leaving the list, never by crossing between two
   rows, so focus hands over directly with no intermediate frame.

   Desktop only: below the table's breakpoint, and on any device without a
   fine pointer, there is nothing to follow and the module does not bind.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;

  /* Fraction of the remaining distance covered each frame at 60fps. Low
     enough to read as weight, high enough that the frame never feels adrift. */
  var APPROACH = 0.055;
  var SETTLED = 0.4;

  function canFollow() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      window.matchMedia("(min-width: 992px)").matches;
  }

  function initProjects() {
    if (core && core.prefersReducedMotion && core.prefersReducedMotion()) return;

    document.querySelectorAll("[data-projects-list]").forEach(function (list) {
      if (core && core.guard && !core.guard(list, "ProjectsPreview")) return;

      var preview = list.querySelector("[data-projects-preview]");
      var frames = Array.prototype.slice.call(list.querySelectorAll("[data-projects-frame]"));
      var rows = Array.prototype.slice.call(list.querySelectorAll("[data-projects-row]"));
      if (!preview || !rows.length || frames.length !== rows.length) return;

      var follow = canFollow();
      var current = -1;
      var target = 0;
      var position = 0;
      var height = 0;
      var running = false;
      var primed = false;

      var actions = rows.map(function (row) {
        return row.querySelector("[data-projects-action]");
      });

      /* The row carries the divider, and the divider is not part of the
         interaction — so the recession is applied to the text, never to the
         row itself. */
      var texts = rows.map(function (row) {
        return Array.prototype.slice.call(row.querySelectorAll(".projects_row_title, .projects_row_client"));
      });

      function recess(index, on) {
        texts[index].forEach(function (el) {
          el.classList.toggle("is-recessed", on);
        });
      }

      function measure() {
        height = preview.offsetHeight;
      }

      function paint() {
        preview.style.transform = "translate3d(0, " + position.toFixed(2) + "px, 0)";
      }

      function step() {
        var delta = target - position;
        if (Math.abs(delta) < SETTLED) {
          position = target;
          running = false;
        } else {
          position += delta * APPROACH;
          window.requestAnimationFrame(step);
        }
        paint();
      }

      function start() {
        if (running) return;
        running = true;
        window.requestAnimationFrame(step);
      }

      /* The pointer's line within the list, less half the frame, so the
         picture is centred on the pointer rather than hanging below it. */
      function aim(event) {
        var box = list.getBoundingClientRect();
        target = event.clientY - box.top - (height / 2);
        if (!primed) {
          primed = true;
          position = target;
          paint();
          return;
        }
        start();
      }

      function focus(index) {
        if (current === index) return;
        current = index;

        rows.forEach(function (row, i) {
          recess(i, i !== index);
          if (actions[i]) actions[i].classList.toggle("is-shown", i === index);
        });

        frames.forEach(function (frame, i) {
          frame.classList.toggle("is-current", i === index);
        });

        preview.classList.add("is-open");
      }

      function release() {
        if (current === -1) return;
        current = -1;
        primed = false;
        rows.forEach(function (row, i) {
          recess(i, false);
          if (actions[i]) actions[i].classList.remove("is-shown");
        });
        frames.forEach(function (frame) { frame.classList.remove("is-current"); });
        preview.classList.remove("is-open");
      }

      measure();

      if (!follow) return;

      rows.forEach(function (row, index) {
        row.addEventListener("pointerenter", function (event) {
          if (event.pointerType === "touch") return;
          measure();
          aim(event);
          focus(index);
        });
      });

      list.addEventListener("pointermove", function (event) {
        if (event.pointerType === "touch" || current === -1) return;
        aim(event);
      });

      list.addEventListener("pointerleave", release);

      var timer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          if (!canFollow()) release();
          measure();
        }, 250);
      });
    });
  }

  namespace.projects = { init: initProjects };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProjects);
  } else {
    initProjects();
  }

  /* A page transition swaps the container, so the shared entry point runs
     again on the new markup. This module has to follow it, or a list arrived
     at from another page comes in unbound. */
  var baseInit = namespace.init;
  if (typeof baseInit === "function") {
    namespace.init = function () {
      baseInit.apply(this, arguments);
      initProjects();
    };
  }
})(window.ATK.motion);
