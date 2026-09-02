/* The four proving properties, as a column accordion (#pcore).
   One in, one out: activating a column slides its art panel up into place
   while the previous one slides up and out, and the reading area above swaps
   in the same motion. At rest, property 03 stays open so the strip lands in
   the same active-column posture as the BTCFi reference. */
(() => {
  const root = document.getElementById('pcore');
  if (!root) return;
  const strip = root.querySelector('.pcore-strip');
  const headsBox = root.querySelector('.pcore-heads');
  const cols = Array.from(root.querySelectorAll('.pcol'));
  const heads = Array.from(root.querySelectorAll('.phead'));
  if (!strip || !headsBox || !cols.length || heads.length !== cols.length + 1) return;

  const CAN_HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const n = cols.length;
  const RESTING_ACTIVE = Math.min(2, n - 1);
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

  cols.forEach((col) => armReset(col.querySelector('.pcol__media')));
  heads.forEach(armReset);

  const syncInert = () => heads.forEach((h) => { h.inert = !h.classList.contains('-in'); });
  const headFor = (i) => heads[i === null ? 0 : i + 1];

  function measure() {
    const on = heads.find((h) => h.classList.contains('-in')) || heads[0];
    if (!on) return;
    const h = on.scrollHeight + 4;
    if (h > 0) root.style.setProperty('--pc-heads-h', h + 'px');
  }

  function setActive(i, focus) {
    if (i === active) return;
    const prev = active;
    active = i;
    exit(headFor(prev));
    if (prev !== null) {
      cols[prev].classList.remove('-active');
      cols[prev].setAttribute('aria-selected', 'false');
      exit(cols[prev].querySelector('.pcol__media'));
    }
    enter(headFor(i));
    if (i !== null) {
      cols[i].classList.add('-active');
      cols[i].setAttribute('aria-selected', 'true');
      enter(cols[i].querySelector('.pcol__media'));
      if (focus) cols[i].focus();
    }
    syncInert();
    measure();
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
  // back to the reference-like default once the pointer leaves the strip entirely
  if (CAN_HOVER) strip.addEventListener('pointerleave', () => {
    if (!strip.contains(document.activeElement)) setActive(RESTING_ACTIVE);
  });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 160); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  window.__pcolShow = function(el) {
    const i = heads.indexOf(el);
    if (i < 0) return false;
    setActive(i === 0 ? null : i - 1);
    return true;
  };

  syncInert();
  requestAnimationFrame(() => requestAnimationFrame(() => setActive(RESTING_ACTIVE)));
})();
