/* Loading state for the three News sections (privacy / quantum / btcfi).
   One shared file owning both the markup it creates and the CSS it injects
   once — three duplicated style blocks would drift, and css/styles.css is
   off limits. strk.html has no news block and never loads this.

   Two tiers, deliberately:
   - ONE ring loader for the whole block, with its text. Never one per card:
     privacy shows 12 visible cards of 31, and four rotating layers per card
     would be over a hundred permanently animated elements.
   - Skeleton cards for the items, one shimmer overlay each, staggered by
     animation-delay so the block reads as progressive.

   Lifecycle discipline (same as the hero field and the convergence scene):
   loader and skeletons are REMOVED from the DOM when content settles, not
   hidden; animations pause while the block is off screen or the tab is
   hidden; prefers-reduced-motion gets a static skeleton and a static loader
   with its text. Hooks are called by js/news-lazy.js during hydration. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = [
    /* ---- ring loader: 4 concentric conic rings clipped to annuli ---- */
    '.nl-anchor{position:relative}',
    /* the loader OVERLAYS the skeleton grid instead of displacing it:
       inserting an in-flow element above the grid shifted every card down
       and back up on removal, which is exactly the layout shift this
       component exists to avoid */
    '.nl-loader{position:absolute;left:50%;top:96px;transform:translateX(-50%);z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:6px;padding:22px 30px 19px;text-align:center;background:#0D0E13;border:1px solid rgba(245,242,236,.1);border-radius:16px;box-shadow:0 18px 50px -20px rgba(0,0,0,.8);max-width:min(420px,86vw)}',
    '.nl-rings{position:relative;width:72px;height:72px;margin-bottom:6px;animation:nlBreathe 4s ease-in-out infinite}',
    '.nl-rings i{position:absolute;inset:0;border-radius:50%;will-change:transform}',
    '.nl-rings .nlr1{background:conic-gradient(from 0deg,transparent 0deg,rgba(245,242,236,.5) 90deg,transparent 200deg);-webkit-mask:radial-gradient(closest-side,transparent 34.5%,#000 35% 41%,transparent 41.5%);mask:radial-gradient(closest-side,transparent 34.5%,#000 35% 41%,transparent 41.5%);animation:nlSpin 3s linear infinite}',
    '.nl-rings .nlr2{background:conic-gradient(from 140deg,transparent 0deg,rgba(var(--accent-rgb,167,139,250),.85) 100deg,transparent 220deg);-webkit-mask:radial-gradient(closest-side,transparent 41.5%,#000 42% 50%,transparent 50.5%);mask:radial-gradient(closest-side,transparent 41.5%,#000 42% 50%,transparent 50.5%);animation:nlSpin 2.5s linear infinite}',
    '.nl-rings .nlr3{background:conic-gradient(from 40deg,transparent 0deg,rgba(245,242,236,.35) 80deg,transparent 180deg);-webkit-mask:radial-gradient(closest-side,transparent 51.5%,#000 52% 58%,transparent 58.5%);mask:radial-gradient(closest-side,transparent 51.5%,#000 52% 58%,transparent 58.5%);animation:nlSpinRev 4s linear infinite}',
    '.nl-rings .nlr4{background:conic-gradient(from 260deg,transparent 0deg,rgba(var(--accent-rgb,167,139,250),.55) 70deg,transparent 160deg);-webkit-mask:radial-gradient(closest-side,transparent 60.5%,#000 61% 64%,transparent 64.5%);mask:radial-gradient(closest-side,transparent 60.5%,#000 61% 64%,transparent 64.5%);animation:nlSpin 3.5s linear infinite}',
    '@keyframes nlSpin{to{transform:rotate(360deg)}}',
    '@keyframes nlSpinRev{to{transform:rotate(-360deg)}}',
    '@keyframes nlBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}',
    '.nl-text{animation:nlPulse 2.8s ease-in-out infinite}',
    '@keyframes nlPulse{0%,100%{opacity:.9}50%{opacity:.5}}',
    '.nl-title{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(245,242,236,.75)}',
    /* ---- skeleton bones inside the existing .news-skel shimmer box ---- */
    '.nl-bones{position:absolute;inset:0;z-index:2;background:#0D0E13;padding:16px 18px;display:flex;flex-direction:column;gap:10px;border:1px solid rgba(245,242,236,.09);border-radius:12px}',
    '.nl-bones .nlb-head{display:flex;align-items:center;gap:10px}',
    '.nl-bones .nlb-av{width:36px;height:36px;border-radius:50%;background:rgba(245,242,236,.08);flex:none}',
    '.nl-bones .nlb-l{height:10px;border-radius:5px;background:rgba(245,242,236,.07)}',
    '.nl-bones .nlb-h1{width:38%}.nl-bones .nlb-h2{width:24%;margin-top:6px}',
    '.nl-bones .nlb-b1{width:96%}.nl-bones .nlb-b2{width:84%}.nl-bones .nlb-b3{width:58%}',
    /* shimmer: the ::after sweep already defined by news-lazy is staggered
       per card through a custom property */
    '.news-skel::after{animation-delay:var(--nl-d,0s)!important}',
    /* ---- visibility gating: pause, never run hidden work ---- */
    '.nl-paused .nl-rings,.nl-paused .nl-rings i,.nl-paused .nl-text{animation-play-state:paused}',
    '.nl-paused-section .news-skel::after{animation-play-state:paused}',
    /* ---- reduced motion: static state, still communicated ---- */
    '@media(max-width:600px){.nl-loader{top:120px;padding:16px 18px 14px;max-width:80vw}.nl-rings{width:48px;height:48px;margin-bottom:6px}}',
    '@media(prefers-reduced-motion:reduce){',
    '.nl-rings,.nl-rings i,.nl-text{animation:none}',
    '}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('newsLoadingStyles')) return;
    var st = document.createElement('style');
    st.id = 'newsLoadingStyles';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var pending = new Set();
  var loader = null, sectionEl = null, gridEl = null;
  var io = null, hardCap = null;

  function buildLoader() {
    var el = document.createElement('div');
    el.className = 'nl-loader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="nl-rings" aria-hidden="true"><i class="nlr1"></i><i class="nlr2"></i><i class="nlr3"></i><i class="nlr4"></i></div>' +
      '<div class="nl-text"><div class="nl-title">Loading posts from X</div></div>';
    return el;
  }

  function syncPause() {
    if (!loader) return;
    var hidden = document.hidden || !onScreen;
    loader.classList.toggle('nl-paused', hidden);
    if (sectionEl) sectionEl.classList.toggle('nl-paused-section', hidden);
  }
  var onScreen = true;
  document.addEventListener('visibilitychange', syncPause);

  function showLoader() {
    if (loader || !gridEl) return;
    injectCss();
    loader = buildLoader();
    sectionEl = gridEl.closest('.news-section') || gridEl.parentNode;
    sectionEl.classList.add('nl-anchor'); /* positioning context only */
    sectionEl.appendChild(loader);
    sectionEl.setAttribute('aria-busy', 'true');
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { onScreen = en.isIntersecting; });
        syncPause();
      }, { rootMargin: '80px 0px' });
      io.observe(loader);
    }
    syncPause();
    /* hard cap: whatever happens per card, the block-level loader never
       spins forever (per-card work is itself timeboxed by news-lazy) */
    hardCap = setTimeout(removeLoader, 15000);
  }

  function removeLoader() {
    if (hardCap) { clearTimeout(hardCap); hardCap = null; }
    if (io) { io.disconnect(); io = null; }
    if (sectionEl) { sectionEl.removeAttribute('aria-busy'); sectionEl.classList.remove('nl-paused-section'); sectionEl.classList.remove('nl-anchor'); }
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader); /* removed, not hidden */
    loader = null;
  }

  window.NewsLoading = {
    /* a card started hydrating: decorate its skeleton, count it, make sure
       the block-level ring exists */
    cardPending: function (cell, skel, grid) {
      injectCss();
      gridEl = grid || gridEl;
      pending.add(cell);
      var bones = document.createElement('div');
      bones.className = 'nl-bones';
      bones.setAttribute('aria-hidden', 'true');
      bones.innerHTML =
        '<div class="nlb-head"><span class="nlb-av"></span><span style="flex:1"><span class="nl-bones-lines"><span class="nlb-l nlb-h1" style="display:block"></span><span class="nlb-l nlb-h2" style="display:block"></span></span></span></div>' +
        '<span class="nlb-l nlb-b1"></span><span class="nlb-l nlb-b2"></span><span class="nlb-l nlb-b3"></span>';
      skel.appendChild(bones);
      var rank = typeof cell.__newsRank === 'number' ? cell.__newsRank : pending.size;
      skel.style.setProperty('--nl-d', ((rank % 12) * 0.12).toFixed(2) + 's');
      showLoader();
    },
    /* a card settled (embed rendered, fallback restored, or timed out) */
    cardResolved: function (cell, skel) {
      pending.delete(cell);
      if (skel) {
        var bones = skel.querySelector('.nl-bones');
        if (bones && bones.parentNode) bones.parentNode.removeChild(bones);
      }
      if (!pending.size) removeLoader();
    },
  };
})();
