/* The lineage stack (#lg). Two jobs: fade the title's light streaks as the
   head scrolls away (--st on the section), and open the card that sits in
   the middle band of the viewport (.is-open), leaving cards above it marked
   .is-past. The card's unfold and the art's stroke draw are CSS. */
(() => {
  const root = document.getElementById('lg');
  if (!root) return;
  const head = root.querySelector('.lg-head');
  const cards = Array.from(root.querySelectorAll('.lg-card'));

  let ticking = false;
  function fade() {
    ticking = false;
    const r = head.getBoundingClientRect();
    const st = Math.min(1, Math.max(0, 1 + r.top / (window.innerHeight * 0.55)));
    root.style.setProperty('--st', st.toFixed(3));
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
