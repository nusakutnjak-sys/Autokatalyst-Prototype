/* ==========================================================================
   Autokatalyst — focus list

   "We're working with": a typographic list where one row becomes the focal
   point and the rest recede. Not a tab set and not navigation — nothing is
   selected. The motion only reports where attention is.

   Two things happen, and nothing else:

     · the arrow enters from one gutter further left and settles one gutter
       clear of the hovered title. The title itself never moves.
     · every other title drops to half opacity. The hovered title never
       changes opacity.

   Response
   --------
   The whole interaction runs on the response curve, which departs at full
   speed and settles over a long tail. Any ramp-up at the start of a
   pointer-driven tween reads as input lag; this one answers immediately and
   spends its time arriving.

   Continuity
   ----------
   One controller owns the whole list. Arriving on a row applies the new
   state to all five rows in the same frame, and every tween carries
   overwrite: "auto", so the newest hover interrupts the previous one in
   place rather than queueing behind it. Two arrows can never coexist.

   Rest is only ever reached by leaving the list itself — never by crossing
   the boundary between two rows — so focus glides down the list instead of
   collapsing and restarting between neighbours.

   Leaving takes the fast duration and entering the standard one, so the
   incoming row always leads and the outgoing one is never seen catching up.
   ========================================================================== */

window.ATK = window.ATK || {};
window.ATK.motion = window.ATK.motion || {};

(function (namespace) {
  var core = namespace.core;
  var tokens = namespace.tokens;

  var DIM = 0.5;

  function initFocusList() {
    if (!core.hasGsap()) return;

    document.querySelectorAll("[data-focus-list]").forEach(function (list) {
      if (!core.guard(list, "FocusList")) return;

      var rows = core.scoped(list, "[data-focus-row]");
      if (!rows.length) return;

      var entries = rows.map(function (row) {
        return {
          row: row,
          label: row.querySelector("[data-focus-label]"),
          icon: row.querySelector("[data-focus-icon]")
        };
      }).filter(function (entry) { return entry.label && entry.icon; });
      if (!entries.length) return;

      var labels = entries.map(function (e) { return e.label; });
      var icons = entries.map(function (e) { return e.icon; });

      var gap = tokens.distance.md;
      var iconWidth = icons[0].getBoundingClientRect().width || gap;
      var iconActive = -(iconWidth + gap);
      var iconRest = iconActive - gap;

      function apply(entry, state) {
        var on = state === "active";
        var duration = core.resolveDuration(on ? tokens.duration.standard : tokens.duration.fast);

        window.gsap.to(entry.label, {
          opacity: state === "dim" ? DIM : 1,
          duration: duration,
          ease: core.ease.response,
          overwrite: "auto"
        });

        window.gsap.to(entry.icon, {
          x: core.resolveDistance(on ? iconActive : iconRest),
          opacity: on ? 1 : 0,
          duration: duration,
          ease: core.ease.response,
          overwrite: "auto"
        });
      }

      var current = null;

      function focus(entry) {
        if (current === entry) return;
        current = entry;
        entries.forEach(function (other) {
          apply(other, other === entry ? "active" : "dim");
        });
        core.promote(labels.concat(icons));
      }

      /* Rest is reached only by leaving the list, never by crossing between
         two rows — so neighbours hand focus over without a gap. */
      function release() {
        if (!current) return;
        current = null;
        entries.forEach(function (other) { apply(other, "rest"); });
        core.release(labels.concat(icons));
      }

      window.gsap.set(labels, { opacity: 1 });
      window.gsap.set(icons, { x: core.resolveDistance(iconRest), opacity: 0 });

      entries.forEach(function (entry) {
        entry.row.addEventListener("pointerenter", function () { focus(entry); });
        entry.row.addEventListener("focusin", function () { focus(entry); });
      });

      list.addEventListener("pointerleave", release);
      list.addEventListener("focusout", function (event) {
        if (!list.contains(event.relatedTarget)) release();
      });
    });
  }

  /* ------------------------------------------------------------------
     Dim groups
     The same focal reading, reduced to its opacity half: hovering one item
     in a group sends every other item to half strength. No movement, no
     arrow, nothing else. Used by the primary navigation.

     Same controller shape as the list above — one owner per group, rest
     reached only by leaving the group, overwrite on every tween — so the
     two interactions feel like one system.
     ------------------------------------------------------------------ */

  function initDimGroups() {
    if (!core.hasGsap()) return;

    document.querySelectorAll("[data-dim-group]").forEach(function (group) {
      if (!core.guard(group, "DimGroup")) return;

      var items = core.scoped(group, "[data-dim-item]");
      if (items.length < 2) return;

      function apply(active) {
        items.forEach(function (item) {
          window.gsap.to(item, {
            opacity: !active || item === active ? 1 : DIM,
            duration: core.resolveDuration(active ? tokens.duration.standard : tokens.duration.fast),
            ease: core.ease.response,
            overwrite: "auto"
          });
        });
      }

      var current = null;

      function focus(item) {
        if (current === item) return;
        current = item;
        apply(item);
      }

      function release() {
        if (!current) return;
        current = null;
        apply(null);
      }

      window.gsap.set(items, { opacity: 1 });

      items.forEach(function (item) {
        item.addEventListener("pointerenter", function () { focus(item); });
        item.addEventListener("focusin", function () { focus(item); });
      });

      group.addEventListener("pointerleave", release);
      group.addEventListener("focusout", function (event) {
        if (!group.contains(event.relatedTarget)) release();
      });
    });
  }

  namespace.focusList = { init: initFocusList };
  namespace.dimGroups = { init: initDimGroups };
})(window.ATK.motion);
