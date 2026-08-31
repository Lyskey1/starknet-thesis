/* The ecosystem marquee's two rows, on stride's mechanic: horizontal offset is
   tied to scroll position (opposite directions per row), not autoplay, so the
   rows only move while the reader does. The set is repeated in the markup and
   each row's translate wraps into one set's width, which is what keeps it
   seamless and edge to edge at any width. */
(() => {
  const rows = Array.from(document.querySelectorAll('.lm-track'));
  if (!rows.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SPEED = 0.35;
  const state = rows.map((el) => ({ el, set: 0, cur: 0, target: 0 }));
  const measure = () => state.forEach((r) => { r.set = r.el.scrollWidth / 6; });
  measure();
  new ResizeObserver(measure).observe(document.body);

  let raf = 0;
  function frame() {
    raf = 0;
    let moving = false;
    state.forEach((r, i) => {
      if (!r.set) return;
      const dir = rows[i].dataset.dir === 'right' ? 1 : -1;
      r.target = window.scrollY * SPEED * dir;
      r.cur += (r.target - r.cur) * 0.12;
      if (Math.abs(r.target - r.cur) > 0.3) moving = true;
      // wrap into one set so the transform never grows without bound
      const m = ((r.cur % r.set) + r.set) % r.set;
      r.el.style.transform = `translate3d(${m - r.set}px,0,0)`;
    });
    if (moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();
})();
