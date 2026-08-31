/* stride's page interactions, ported to the static STRK page.

   1. Hero shrink: the stage collapses into a rounded inset as it scrolls, via
      clip-path (inset + radius) so nothing resizes and no layout runs.
   2. Works: a scroll-driven 3D card stack. Cards sit on a vertical cylinder,
      evenly spaced by arc so they never intersect; scroll advances a float
      index and each card is transformed relative to it.
   3. Showcase columns reveal their art on hover with a clip-path wipe.
   All three read scroll through one rAF, and all three sit out under
   prefers-reduced-motion. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 1. hero shrink ---------- */
  const hero = document.querySelector('.sk-stage');
  const INSET = 24, RADIUS = 24, SHRINK_VH = 0.6;

  /* ---------- 2. works stack ---------- */
  const works = document.getElementById('wk');
  const cards = works ? Array.from(works.querySelectorAll('.wk-card')) : [];
  const backs = works ? Array.from(works.querySelectorAll('.wk-back')) : [];
  const idxEl = works && works.querySelector('.wk-idx');
  const nameEl = works && works.querySelector('.wk-name');
  const RADIUS3D = 1350, STEP = 27;
  let cur = 0;
  const pad = (n) => String(n).padStart(2, '0');

  function paintWorks(v) {
    cards.forEach((el, i) => {
      const rel = i - v;
      const rad = (rel * STEP * Math.PI) / 180;
      const y = RADIUS3D * Math.sin(rad);
      const z = RADIUS3D * Math.cos(rad) - RADIUS3D;
      const d = Math.abs(rel);
      el.style.transform = `translate3d(0px, ${y}px, ${z}px) rotateX(${rel * STEP}deg) translate(-50%, -50%)`;
      el.style.opacity = d > 3.6 ? 0 : Math.max(0, 1 - d * 0.24);
      const scrim = el.querySelector('.wk-scrim');
      if (scrim) scrim.style.opacity = Math.min(0.35, d * 0.22);
    });
    backs.forEach((el, i) => {
      el.style.opacity = Math.max(0, 1 - Math.abs(i - v));
      el.style.transform = `translateY(${(i - v) * 22}%) scale(1.6)`;
    });
    const k = clamp(Math.round(v), 0, cards.length - 1);
    if (idxEl && idxEl.textContent !== pad(k + 1)) {
      idxEl.textContent = pad(k + 1);
      if (nameEl) nameEl.textContent = cards[k].dataset.name || '';
    }
  }

  let raf = 0;
  function frame() {
    raf = 0;
    if (hero) {
      const p = clamp(window.scrollY / (innerHeight * SHRINK_VH), 0, 1);
      hero.style.clipPath = `inset(${p * INSET}px round ${p * RADIUS}px)`;
      const ui = hero.querySelector('.sk-inner');
      if (ui) ui.style.transform = `scale(${1 - p * 0.1})`;
    }
    if (cards.length) {
      const r = works.getBoundingClientRect();
      const range = r.height - innerHeight;
      const p = range > 0 ? clamp(-r.top / range, 0, 1) : 0;
      // run a touch past each end so the end cards keep a hint of motion
      const target = -0.18 + p * (cards.length - 1 + 0.36);
      cur += (target - cur) * 0.14;
      paintWorks(cur);
      if (Math.abs(target - cur) > 0.002) raf = requestAnimationFrame(frame);
    }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  if (!reduced) {
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
  }
  if (cards.length) paintWorks(0);
  kick();

  /* ---------- 3. showcase hover wipe ---------- */
  document.querySelectorAll('.sc-col').forEach((col) => {
    const art = col.querySelector('.sc-art');
    if (!art) return;
    const on = () => { art.style.clipPath = 'inset(0% 0% 0% 0%)'; col.classList.add('is-on'); };
    const off = () => { art.style.clipPath = 'inset(100% 0% 0% 0%)'; col.classList.remove('is-on'); };
    off();
    col.addEventListener('pointerenter', on);
    col.addEventListener('pointerleave', off);
    col.addEventListener('focusin', on);
    col.addEventListener('focusout', (e) => { if (!col.contains(e.relatedTarget)) off(); });
  });
})();
