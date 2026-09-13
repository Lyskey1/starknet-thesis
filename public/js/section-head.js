/* THE ECOSYSTEM PAGE'S ONE SECTION HEAD (2026-09-11).

   Before this file, THE PROJECTS and THE VOICES were two heads built by two
   modules with two different class sets, and they had drifted apart: the
   projects head was .ix-head, left-aligned, General Sans 600 at 76px; the
   voices head was .es-top, centred, General Sans 300 at a 62px clamp, with a
   lede. Same page, same rank, two typographies.

   Now both call this builder, so they render the same element with the same
   classes and there is exactly one rule set behind them (.es-shead in
   css/eco-stage.css). Changing a section head means changing it once.

   Classic script, loaded BEFORE the two page modules, so it is defined for
   js/eco-index.js (classic, defer) and js/eco-ring.js (module) alike.

   ecoSectionHead({ kicker, title, lede, extra, modifier }) -> markup string
     kicker   the mono eyebrow, required
     title    the h2, required. Carries .es-shead-h: that is the hook a
              caller re-reads when the title is live (the index rewrites it
              per filter), so do not query the tag.
     lede     optional. The page's section-intro line (.es-lede). Absent, it
              renders nothing at all: no empty element, no reserved space.
     extra    optional markup appended inside the head (the index's tab rail)
     modifier optional extra class on the container (the ring passes
              es-shead--stage, which only changes stacking and padding, never
              type) */
(function () {
  'use strict';
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  window.ecoSectionHead = function (o) {
    o = o || {};
    return '<div class="es-shead' + (o.modifier ? ' ' + o.modifier : '') + '">' +
      '<p class="es-kicker">' + esc(o.kicker) + '</p>' +
      '<h2 class="es-shead-h">' + esc(o.title) + '</h2>' +
      (o.lede ? '<p class="es-lede">' + esc(o.lede) + '</p>' : '') +
      (o.extra || '') +
    '</div>';
  };
})();
