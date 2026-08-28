/* The lineage scrubber (#lg). One state: the active stop. Ticks and the
   next button set it; a timer advances it and paints .lg-prog-fill along the
   way. Hover or focus inside the section holds the timer, the pause button
   stops it, and prefers-reduced-motion never starts it. The visual is not
   swapped per stop: each stop hands the clip a new --focus (object-position)
   and the caption. */
(() => {
  const root = document.getElementById('lg');
  if (!root) return;
  const ticks = Array.from(root.querySelectorAll('.lg-tick'));
  const panels = Array.from(root.querySelectorAll('.lg-panel'));
  const rail = root.querySelector('.lg-rail');
  const visual = root.querySelector('.lg-visual');
  const capYr = root.querySelector('.lg-cap-yr');
  const capT = root.querySelector('.lg-cap-t');
  const fill = root.querySelector('.lg-prog-fill');
  const count = root.querySelector('.lg-count-cur');
  const playBtn = root.querySelector('.lg-play');
  const nextBtn = root.querySelector('.lg-next');
  const n = ticks.length;
  if (!n || panels.length !== n) return;

  const FOCUS = ['68% 42%', '40% 30%', '76% 60%', '30% 55%', '60% 20%', '50% 45%'];
  const DWELL = 6500;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let i = 0, playing = !reduced, held = false, raf = 0, t0 = 0, elapsed = 0;

  function show(k) {
    i = (k + n) % n;
    ticks.forEach((t, j) => {
      t.classList.toggle('is-on', j === i);
      t.classList.toggle('is-past', j < i);
      t.setAttribute('aria-selected', j === i ? 'true' : 'false');
      t.tabIndex = j === i ? 0 : -1;
    });
    panels.forEach((p, j) => { p.hidden = j !== i; p.classList.toggle('is-on', j === i); });
    rail.style.setProperty('--pos', n > 1 ? (i / (n - 1)).toFixed(4) : '0');
    visual.style.setProperty('--focus', FOCUS[i % FOCUS.length]);
    capYr.textContent = ticks[i].querySelector('.lg-yr').textContent;
    capT.textContent = panels[i].querySelector('.lg-h').textContent;
    count.textContent = String(i + 1).padStart(2, '0');
    elapsed = 0; t0 = performance.now();
    fill.style.width = '0%';
  }

  function tick(now) {
    raf = 0;
    if (!playing || held || document.hidden) { t0 = now - elapsed; raf = requestAnimationFrame(tick); return; }
    elapsed = now - t0;
    if (elapsed >= DWELL) { show(i + 1); }
    else fill.style.width = ((elapsed / DWELL) * 100).toFixed(2) + '%';
    raf = requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    playing = on;
    playBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    if (on && !raf) { t0 = performance.now() - elapsed; raf = requestAnimationFrame(tick); }
  }

  ticks.forEach((t, j) => t.addEventListener('click', () => { show(j); }));
  nextBtn.addEventListener('click', () => show(i + 1));
  playBtn.addEventListener('click', () => setPlaying(!playing));
  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); ticks[i].focus(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); ticks[i].focus(); }
  });
  root.addEventListener('pointerenter', () => { held = true; });
  root.addEventListener('pointerleave', () => { held = false; });
  root.addEventListener('focusin', () => { held = true; });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) held = false; });

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    es.forEach((en) => { if (en.isIntersecting) { if (playing && !raf) { t0 = performance.now() - elapsed; raf = requestAnimationFrame(tick); } } else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  }, { threshold: 0.2 }) : null;

  show(0);
  playBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  if (io) io.observe(root); else if (playing) raf = requestAnimationFrame(tick);
})();
