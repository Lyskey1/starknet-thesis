/**
 * Drives the Satoshi quote's scroll-pinned word reveal (#sq-band).
 * CSS pins .sq-sticky for the height of #sq-band; this just turns how far
 * that pin has scrolled into a 0-1 progress value, then staggers each
 * .sq-w word's --amt custom property off it so the line lights up in
 * order and finishes exactly as the pin releases.
 */
(() => {
  const band = document.getElementById('sq-band');
  if (!band) return;
  const sticky = band.querySelector('.sq-sticky');
  const words = Array.from(band.querySelectorAll('.sq-w'));
  if (!words.length || !sticky) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    words.forEach((w) => w.style.setProperty('--amt', '1'));
    return;
  }

  const EASE = 0.12; // fraction of total progress each word takes to light up
  const n = words.length;
  let ticking = false;

  function update() {
    ticking = false;
    const rect = band.getBoundingClientRect();
    // The pin releases when the band's remaining height can no longer hold
    // the sticky element, i.e. at bandHeight - stickyHeight of scroll, not
    // bandHeight - viewportHeight (the sticky box is shorter than the
    // viewport on purpose; see the CSS comment on .sq-sticky).
    const range = rect.height - sticky.offsetHeight;
    let progress = range > 0 ? -rect.top / range : rect.top <= 0 ? 1 : 0;
    progress = Math.min(1, Math.max(0, progress));

    words.forEach((w, i) => {
      const start = n > 1 ? (i * (1 - EASE)) / (n - 1) : 0;
      const amt = Math.min(1, Math.max(0, (progress - start) / EASE));
      w.style.setProperty('--amt', amt.toFixed(3));
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
