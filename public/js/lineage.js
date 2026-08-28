/* The lineage stack (#lg). Two jobs: run the pinned intro (the light-streak
   curtain parts outward, --open, while the title comes up, --tt, over the
   170vh head band), and open the card that sits in
   the middle band of the viewport (.is-open), leaving cards above it marked
   .is-past. The card's unfold and the art's stroke draw are CSS. */
(() => {
  const root = document.getElementById('lg');
  if (!root) return;
  const head = root.querySelector('.lg-head');
  const cards = Array.from(root.querySelectorAll('.lg-card'));

  let ticking = false;
  const pin = head.querySelector('.lg-pin');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
  function fade() {
    ticking = false;
    const r = head.getBoundingClientRect();
    const range = r.height - pin.offsetHeight;
    const p = range > 0 ? clamp(-r.top / range) : (r.top <= 0 ? 1 : 0);
    // the curtain holds, then parts outward; the title comes up as it opens
    root.style.setProperty('--open', ease(0.18, 0.85, p).toFixed(3));
    root.style.setProperty('--tt', ease(0.2, 0.6, p).toFixed(3));
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(fade); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  fade();

  if (!('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('is-open')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const c = en.target;
      if (en.isIntersecting) {
        c.classList.add('is-open'); c.classList.remove('is-past');
      } else {
        c.classList.remove('is-open');
        c.classList.toggle('is-past', en.boundingClientRect.top < 0);
      }
    });
  }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
  cards.forEach((c) => io.observe(c));
})();
