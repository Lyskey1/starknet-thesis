/* The digest's showcase columns double as the feed's filter: picking a track
   switches the existing recap tabs (which own the filtering) and scrolls to
   the archive, so the columns add a way in without a second filter mechanism
   to keep in step. The same four tracks also appear as the numbered rows
   under the About statement (.dgx-card), wired through the same bridge. */
(() => {
  const cols = Array.from(document.querySelectorAll('.sc-col[data-filter], .dgx-card[data-filter]'));
  const feed = document.getElementById('latest-from-the-starknet-ecosystem');
  if (!cols.length) return;
  cols.forEach((col) => {
    col.addEventListener('click', () => {
      const want = col.dataset.filter;
      const tab = document.querySelector(`#recapTabs .toggle-btn[data-filter="${want}"]`);
      if (tab) tab.click();
      if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
