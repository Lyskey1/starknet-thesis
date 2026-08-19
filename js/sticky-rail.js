// ============================================================
// Sticky selector rail engine, extracted from privacy's section 04
// movement strip so quantum's chapter rail reuses one implementation
// instead of growing a second. The page passes its own class and
// custom-property names, so each page's CSS contract is untouched:
// privacy keeps pmv-*/--pmv-*, quantum runs qw-*/--qw-*.
//
// The row sticks in CSS; this engine decides WHEN it has stuck so it
// can condense, and reserves the height it gives up.
//
// This was an IntersectionObserver on a sentinel and it shipped
// broken. An observer only calls back when the intersection STATE
// changes, and the sentinel's last state change is the moment it
// crosses the root's top edge, which the negative nav root margin
// puts at y = navH. Measured on production: the final callback
// arrived with boundingClientRect.top = +20.1 and isIntersecting
// false, and no callback ever came again, all the way down to
// top = -1299.9. So the guard "not intersecting AND top < 0" was
// unreachable in practice: by the time top went negative there were
// no more callbacks to evaluate it in. An observer also stays silent
// when a deep link jumps the reader straight past the section,
// because the state is "outside" both before and after the jump.
//
// A scroll listener has none of those failure modes. It reads the
// root's own top, which is a static box, so the answer cannot drift
// with layout and there is no cached offset to go stale. Reading it
// costs one rect per frame, throttled by rAF and registered passive.
//
// The root is NOT the sticky box, the row inside it is, so the
// root's top is always the row's own resting position in the
// document. Toggling the class moves height between the row and the
// spacer, both inside the root, so the root's top never moves in
// response: the test cannot oscillate against itself.
//
// cfg: { root, row, stuckClass, measuringClass, spacerClass,
//        spacerProp, topProp, stickOnClass }
// Returns { isStuck(), navHeight(), rowHeight(), rewire() }.
// ============================================================
function thStickyRail(cfg){
  var root = cfg.root, row = cfg.row;
  var spacer = document.createElement('div');
  spacer.className = cfg.spacerClass;
  spacer.setAttribute('aria-hidden', 'true');
  root.insertBefore(spacer, row.nextSibling);
  var navH = 0, ticking = false;
  function navHeight(){
    var n = document.querySelector('nav');
    return n ? Math.round(n.getBoundingClientRect().height) : 0;
  }
  // How much height the row gives up when it condenses. Measured by
  // toggling the class with transitions suppressed and reading back,
  // all inside one task so no frame is ever painted in the
  // intermediate state. Assuming the number would break the moment
  // the strip's padding or glyph size changed.
  function measureSpacer(){
    var wasStuck = root.classList.contains(cfg.stuckClass);
    root.classList.add(cfg.measuringClass);
    root.classList.remove(cfg.stuckClass);
    var restH = row.getBoundingClientRect().height;
    root.classList.add(cfg.stuckClass);
    var condH = row.getBoundingClientRect().height;
    if (!wasStuck) root.classList.remove(cfg.stuckClass);
    root.classList.remove(cfg.measuringClass);
    root.style.setProperty(cfg.spacerProp, Math.max(0, restH - condH).toFixed(1) + 'px');
  }
  function evaluate(){
    root.classList.toggle(cfg.stuckClass, root.getBoundingClientRect().top <= navH);
  }
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){ ticking = false; evaluate(); });
  }
  function wireStick(){
    navH = navHeight();
    document.documentElement.style.setProperty(cfg.topProp, navH + 'px');
    measureSpacer();
    evaluate();
  }
  root.classList.add(cfg.stickOnClass);   // hands the row its sticky position
  wireStick();
  window.addEventListener('scroll', onScroll, { passive: true });
  // labels are mono webfont, so the row is a couple of pixels shorter
  // before it loads and the spacer would under-reserve by that much
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(wireStick);
  window.addEventListener('load', wireStick);
  var stickT = null;
  window.addEventListener('resize', function(){
    clearTimeout(stickT); stickT = setTimeout(wireStick, 150);
  });
  return {
    isStuck: function(){ return root.classList.contains(cfg.stuckClass); },
    navHeight: navHeight,
    rowHeight: function(){ return row.getBoundingClientRect().height; },
    rewire: wireStick
  };
}
