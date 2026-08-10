/* ==========================================================================
   Autokatalyst — domino

   The signature interaction. A chain reaction behind the hero, driven
   entirely by scroll position: scrolling down advances the chain, scrolling
   up reverses the identical sequence, and the scroll offset always states
   the exact frame.

   Contact-driven, not time-driven
   -------------------------------
   There is no stagger and no delay anywhere in this module. A bar moves only
   because the bar behind it is pressing on it, and the bar behind it holds
   exactly the angle at which their faces meet. Every angle on screen is
   solved from the geometry.

   The solution
   ------------
   Each bar pivots on its bottom-right edge. With bar width w, pitch d and
   height h, take a leader at angle a and the follower in front of it at
   angle b. The leader's top-right corner is (h·sin a, h·cos a) from its own
   pivot; the follower's back face is the line through its bottom-left corner
   inclined at b. Setting the corner on that face gives

       h · sin(a − b)  =  d · cos b − w

   so the leader's angle is fully determined by the follower's:

       a  =  b + asin( (d·cos b − w) / h )

   With the follower upright this is the contact angle θc = asin(g / h),
   where g is the gap between bars. Two bars in contact can never overlap,
   and no gap can open between them, because contact is the relation that
   defines the state rather than something checked after the fact.

   The sequence
   ------------
   One bar is the frontier at any moment: the one currently being pushed
   over. Everything behind it is solved by applying the relation backwards
   down the chain, so those bars keep moving too, staying exactly in contact.
   Everything in front of it is untouched and perfectly upright.

   At 0% the frontier is bar 2 at zero — which puts bar 1 at θc, already
   leaning on it. The chain runs until bar 4 reaches bar 5, and stops there.
   Bar 5 and everything after it never move.

   Rotation is the one place this system uses it. It is the physical subject
   of the piece rather than a decorative flourish, and it is confined here.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  /* The chain begins at the first contact and ends at the fourth: bars 2, 3
     and 4 are pushed over in turn, and bar 5 is the one they stop against.

     data-domino-first overrides where the chain starts. At 1 the leading bar
     is already resting against its neighbour at rest; at 0 every bar stands
     fully upright until the scroll begins. */
  var FIRST_MOVER = 1;
  var LAST_MOVER = 3;
  var DEG = Math.PI / 180;

  function initDomino() {
    if (!core.hasGsap()) return;

    document.querySelectorAll("[data-domino]").forEach(function (root) {
      if (!core.guard(root, "Domino")) return;

      var bars = core.scoped(root, "[data-domino-bar]");
      if (bars.length < 2) return;

      var firstMover = root.dataset.dominoFirst === undefined
        ? FIRST_MOVER
        : parseInt(root.dataset.dominoFirst, 10) || 0;

      /* data-domino-last extends the chain: the run ends against the bar one
         past it, which never moves. Defaults to the four-bar signature. */
      var lastMover = root.dataset.dominoLast === undefined
        ? LAST_MOVER
        : parseInt(root.dataset.dominoLast, 10) || 0;
      lastMover = Math.max(firstMover, Math.min(lastMover, bars.length - 2));

      window.gsap.set(bars, { rotate: 0, transformOrigin: "bottom right" });

      /* Reduced motion keeps the composition and drops the fall. */
      if (core.prefersReducedMotion() || !core.hasScrollTrigger()) return;

      var setters = bars.map(function (bar) {
        return window.gsap.quickSetter(bar, "rotate", "deg");
      });

      var count = bars.length;
      var g = { width: 1, pitch: 1, height: 1 };

      function measure() {
        /* Layout boxes, not bounding rects: the bars are rotated, so a
           bounding rect reports the rotated envelope rather than the bar. */
        g.width = bars[0].offsetWidth || 1;
        g.pitch = (bars[1].offsetLeft - bars[0].offsetLeft) || g.width;
        g.height = bars[0].offsetHeight || 1;
      }

      /* The angle a bar must hold for its top corner to rest exactly on the
         back face of the bar in front, which sits at `front`. Both degrees. */
      function leaning(front) {
        var ratio = ((g.pitch * Math.cos(front * DEG)) - g.width) / g.height;
        if (ratio <= 0) return front;
        if (ratio >= 1) return front + 90;
        return front + (Math.asin(ratio) / DEG);
      }

      var contact = 0;

      /* Progress is divided evenly between the bars that get pushed over.
         Within a phase the frontier bar rotates from upright to contact, and
         every bar behind it is solved backwards from its angle, so the whole
         leaning run advances together and stays touching. */
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

      function refresh(progress) {
        measure();
        contact = leaning(0);
        render(progress);
      }

      refresh(0);

      /* Driven straight off the trigger's own progress rather than a scrubbed
         proxy tween: the mapping is 1:1, so the scroll offset alone states the
         frame and reversing is exact. */
      /* data-domino-trigger points the chain at an element other than the
         hero — needed when the hero itself is pinned and its own box no
         longer states a scroll range. */
      var triggerEl = root.dataset.dominoTrigger
        ? document.querySelector(root.dataset.dominoTrigger)
        : null;

      window.ScrollTrigger.create({
        trigger: triggerEl || root.closest("[data-motion-hero]") || root,
        start: root.dataset.dominoStart || tokens.scroll.dominoStart,
        end: root.dataset.dominoEnd || tokens.scroll.dominoEnd,
        onRefresh: function (self) { refresh(self.progress); },
        onUpdate: function (self) { render(self.progress); }
      });
    });
  }

  namespace.domino = { init: initDomino };
})(window.ATK.motion);
