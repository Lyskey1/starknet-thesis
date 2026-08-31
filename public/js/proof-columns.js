/* The four proving properties, as a column accordion (#pcore).
   One in, one out: activating a column slides its art panel up into place
   while the previous one slides up and out, and the reading area above swaps
   in the same motion. At rest (pointer off the strip) the reading area falls
   back to the section's standing statement, head 0, so the properties read as
   an overlay on it rather than replacing it. */
(() => {
  const root = document.getElementById('pcore');
  if (!root) return;
  const strip = root.querySelector('.pcore-strip');
  const cols = Array.from(root.querySelectorAll('.pcol'));
  const heads = Array.from(root.querySelectorAll('.phead'));
  if (!strip || !cols.length || heads.length !== cols.length + 1) return;

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

  cols.forEach((col) => armReset(col.querySelector('.pcol__media')));
  heads.forEach(armReset);

  const headFor = (i) => heads[i === null ? 0 : i + 1];

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

  requestAnimationFrame(() => requestAnimationFrame(() => enter(heads[0])));
})();
