/* The quantum films on the news grid.

   Selection used to come from the .qw-rail through thMorph, which swapped one
   visible chapter for another and measured heights to animate the box. On the
   grid all four chapters are on screen at once, so there is nothing to swap or
   measure: `is-on` now only marks which card is featured. This owns that flag
   directly rather than driving the hidden rail, and keeps the rail's
   aria-selected in step so the tablist still describes the state. */
(() => {
  const root = document.getElementById('qvVideos');
  if (!root) return;
  const slots = Array.from(root.querySelectorAll('.qw-ch'));
  const steps = Array.from(root.querySelectorAll('.qw-ped'));
  if (!slots.length) return;

  function select(i) {
    if (i < 0 || i >= slots.length || slots[i].classList.contains('is-on')) return;
    slots.forEach((el, k) => {
      const on = k === i;
      el.classList.toggle('is-on', on);
      // leaving a card stops its player and rewinds, so coming back starts at the poster
      if (!on) {
        const v = el.querySelector('.qv-player');
        if (v && !v.paused) { try { v.pause(); v.currentTime = 0; } catch (e) {} }
      }
    });
    steps.forEach((s, k) => {
      s.setAttribute('aria-selected', k === i ? 'true' : 'false');
      s.tabIndex = k === i ? 0 : -1;
    });
    if (window.pvVideoChrome) pvVideoChrome.refresh();
  }

  slots.forEach((slot, i) => {
    slot.addEventListener('click', (e) => {
      if (e.target.closest('.qv-editor, video, .vctl')) return;
      select(i);
    });
  });
  steps.forEach((step, i) => step.addEventListener('click', () => select(i)));
})();
