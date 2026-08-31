/* The four bridge phases, as a column accordion (#bcore).
   Modelled on js/proof-columns.js (the privacy page's proving properties) and
   kept as a separate file with its own prefix on purpose: btcfi and privacy
   must never share an id, a class or a window hook.
   One in, one out: activating a column slides its art panel UP into place
   while the previous one slides up and out, and the reading area above swaps
   in the same motion. At rest (pointer off the strip) the reading area falls
   back to the section's standing statement, head 0, so a phase reads as an
   overlay on it rather than replacing it. Hover, click, focus and the arrow
   keys all drive it.

   TWO DELIBERATE ADDITIONS over proof-columns.js, both forced by content this
   section has and privacy's does not:

   1. INERT. The OP_CAT paragraph carries two real outbound links. A head that
      is merely translated and faded is still in the tab order, so every head
      that is not showing is marked inert. Without this, tabbing through the
      page stops on invisible links.

   2. MEASURED READING AREA. The phase bodies (OP_CAT above all) are longer
      than privacy's, so a fixed vh band clips them on short viewports. The
      heads are measured once at init, again on fonts.ready and on debounced
      resize, and the band is pinned to the tallest of them through
      --bc-heads-h. The motion is unchanged: this only sets a height. */
(() => {
  const root = document.getElementById('bcore');
  if (!root) return;
  const strip = root.querySelector('.bcore-strip');
  const headsBox = root.querySelector('.bcore-heads');
  const cols = Array.from(root.querySelectorAll('.bcol'));
  const heads = Array.from(root.querySelectorAll('.bhead'));
  if (!strip || !headsBox || !cols.length || heads.length !== cols.length + 1) return;

  const CAN_HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const n = cols.length;
  let active = null; // null = the standing statement (head 0)

  /* a layer that has finished sliding up and out is snapped back below with no
     transition, so it always re-enters upward rather than dropping back down */
  const armReset = (el) => el.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform' || !el.classList.contains('-out')) return;
    el.style.transition = 'none';
    el.classList.remove('-out');
    void el.offsetWidth;
    el.style.transition = '';
  });
  const enter = (el) => {
    if (el.classList.contains('-out')) {
      el.style.transition = 'none';
      el.classList.remove('-out');
      void el.offsetWidth;
      el.style.transition = '';
    }
    el.classList.add('-in');
  };
  const exit = (el) => { el.classList.remove('-in'); el.classList.add('-out'); };

  cols.forEach((col) => armReset(col.querySelector('.bcol__media')));
  heads.forEach(armReset);

  /* only the head on screen may hold focus (see note 1 above) */
  const syncInert = () => heads.forEach((h) => { h.inert = !h.classList.contains('-in'); });

  const headFor = (i) => heads[i === null ? 0 : i + 1];

  function setActive(i, focus) {
    if (i === active) return;
    const prev = active;
    active = i;
    exit(headFor(prev));
    if (prev !== null) {
      cols[prev].classList.remove('-active');
      cols[prev].setAttribute('aria-selected', 'false');
      exit(cols[prev].querySelector('.bcol__media'));
    }
    enter(headFor(i));
    if (i !== null) {
      cols[i].classList.add('-active');
      cols[i].setAttribute('aria-selected', 'true');
      enter(cols[i].querySelector('.bcol__media'));
      if (focus) cols[i].focus();
    }
    syncInert();
  }

  cols.forEach((col, i) => {
    if (CAN_HOVER) col.addEventListener('pointerenter', () => setActive(i));
    col.addEventListener('click', () => setActive(i));
    col.addEventListener('focus', () => setActive(i));
    col.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { setActive((i + 1) % n, true); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { setActive((i - 1 + n) % n, true); e.preventDefault(); }
    });
  });
  // back to the standing statement once the pointer leaves the strip entirely
  if (CAN_HOVER) strip.addEventListener('pointerleave', () => {
    if (!strip.contains(document.activeElement)) setActive(null);
  });

  /* the band is as tall as the tallest state, never taller (see note 2) */
  function measure() {
    let tallest = 0;
    for (const h of heads) tallest = Math.max(tallest, h.scrollHeight);
    /* +4 covers scrollHeight's integer rounding, so the last line of the
       tallest state can never be shaved by a sub-pixel */
    if (tallest > 0) root.style.setProperty('--bc-heads-h', (tallest + 4) + 'px');
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 160); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  /* search.js reveal() adapter: a result whose anchor is a phase heading has
     to bring that phase's head on screen before the page scrolls to it. */
  window.__bcolShow = function(el) {
    const i = heads.indexOf(el);
    if (i < 0) return false;
    setActive(i === 0 ? null : i - 1);
    return true;
  };

  syncInert();
  requestAnimationFrame(() => requestAnimationFrame(() => { enter(heads[0]); syncInert(); }));
})();
