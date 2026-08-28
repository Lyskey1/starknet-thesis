/* The architecture videos' row cards select on click: the (visually hidden)
   chip tablist still owns selection, so a click on a card just clicks its
   chip and everything downstream (pause, rewind, roving focus) stays as is. */
(() => {
  const chips = Array.from(document.querySelectorAll('.pvv-chip'));
  const slots = Array.from(document.querySelectorAll('#pvVideos .video-slot'));
  if (!chips.length || !slots.length) return;
  slots.forEach((sl) => {
    sl.addEventListener('click', (e) => {
      if (sl.classList.contains('is-on')) return;
      if (e.target.closest('.qv-editor')) return;
      const chip = chips.find((c) => c.dataset.v === sl.dataset.pv);
      if (chip) chip.click();
      sl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
})();
