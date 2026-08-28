/**
 * Drives the lineage timeline's scroll-pinned reveal (#vt-band).
 * Same mechanic as js/quote-scroll.js: CSS pins .vt-sticky for the height of
 * #vt-band, this turns how far that pin has scrolled into a 0-1 progress
 * value, then staggers each .vt-item's --amt custom property off it so the
 * years light up in order, finishing as the pin releases.
 */
(() => {
  const band = document.getElementById('vt-band');
  if (!band) return;
  const sticky = band.querySelector('.vt-sticky');
  const items = Array.from(band.querySelectorAll('.vt-item'));
  if (!items.length || !sticky) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    items.forEach((el) => el.style.setProperty('--amt', '1'));
    return;
  }

  const EASE = 0.16; // fraction of total progress each item takes to light up
  const n = items.length;
  let ticking = false;

  function update() {
    ticking = false;
    const rect = band.getBoundingClientRect();
    const range = rect.height - sticky.offsetHeight;
    let progress = range > 0 ? -rect.top / range : rect.top <= 0 ? 1 : 0;
    progress = Math.min(1, Math.max(0, progress));

    items.forEach((el, i) => {
      const start = n > 1 ? (i * (1 - EASE)) / (n - 1) : 0;
      const amt = Math.min(1, Math.max(0, (progress - start) / EASE));
      el.style.setProperty('--amt', amt.toFixed(3));
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
