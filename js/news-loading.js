/* Shared loading module: the ring loader used by the News sections
   (privacy / quantum / btcfi) and the privacy pool-metrics chart panels.
   One file owns the markup it creates and the CSS it injects once —
   css/styles.css is off limits and duplicated style blocks would drift.
   strk.html stays untouched: its chart explorer has its own affordance.

   Consumers:
   - window.NewsLoading  (hooks called by js/news-lazy.js): one ring for the
     whole news block plus skeleton bones per card. The ring is scoped
     INSIDE the first pending skeleton box, so it never covers real content.
   - window.ChartLoading (hooks called by the privacy pmx engine): one ring
     per chart plot area, first-load-empty ONLY. A silent refresh keeps the
     last good chart and never shows a loader; the engine only calls
     pending() from its non-silent skeleton path, and this module never
     invents a loading state on its own.

   Lifecycle discipline: loaders are REMOVED from the DOM on settle, never
   hidden; rings only mount when their host is on screen
   (IntersectionObserver) and pause on document.hidden; bounded timeouts
   resolve to the consumer's existing fallback state; prefers-reduced-motion
   gets a static ring. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var CSS = [
    /* ---- ring: 4 concentric conic rings clipped to annuli; size via --nl-size ---- */
    '.nl-rings{position:relative;width:var(--nl-size,72px);height:var(--nl-size,72px);animation:nlBreathe 4s ease-in-out infinite}',
    '.nl-rings i{position:absolute;inset:0;border-radius:50%;will-change:transform}',
    '.nl-rings .nlr1{background:conic-gradient(from 0deg,transparent 0deg,rgba(245,242,236,.5) 90deg,transparent 200deg);-webkit-mask:radial-gradient(closest-side,transparent 34.5%,#000 35% 41%,transparent 41.5%);mask:radial-gradient(closest-side,transparent 34.5%,#000 35% 41%,transparent 41.5%);animation:nlSpin 3s linear infinite}',
    '.nl-rings .nlr2{background:conic-gradient(from 140deg,transparent 0deg,rgba(var(--accent-rgb,167,139,250),.85) 100deg,transparent 220deg);-webkit-mask:radial-gradient(closest-side,transparent 41.5%,#000 42% 50%,transparent 50.5%);mask:radial-gradient(closest-side,transparent 41.5%,#000 42% 50%,transparent 50.5%);animation:nlSpin 2.5s linear infinite}',
    '.nl-rings .nlr3{background:conic-gradient(from 40deg,transparent 0deg,rgba(245,242,236,.35) 80deg,transparent 180deg);-webkit-mask:radial-gradient(closest-side,transparent 51.5%,#000 52% 58%,transparent 58.5%);mask:radial-gradient(closest-side,transparent 51.5%,#000 52% 58%,transparent 58.5%);animation:nlSpinRev 4s linear infinite}',
    '.nl-rings .nlr4{background:conic-gradient(from 260deg,transparent 0deg,rgba(var(--accent-rgb,167,139,250),.55) 70deg,transparent 160deg);-webkit-mask:radial-gradient(closest-side,transparent 60.5%,#000 61% 64%,transparent 64.5%);mask:radial-gradient(closest-side,transparent 60.5%,#000 61% 64%,transparent 64.5%);animation:nlSpin 3.5s linear infinite}',
    '@keyframes nlSpin{to{transform:rotate(360deg)}}',
    '@keyframes nlSpinRev{to{transform:rotate(-360deg)}}',
    '@keyframes nlBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}',
    /* ---- loader shells. Charts: an overlay inside the empty plot area.
       News: ONE block-level row in normal flow ABOVE the skeleton grid,
       never inside a card and covering nothing ---- */
    '.nl-host{position:relative}',
    '.nl-loader{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:none;text-align:center}',
    '.nl-done{opacity:0;visibility:hidden}',
    '.nl-done .nl-rings,.nl-done .nl-rings i,.nl-done .nl-text{animation:none!important}',
    '.nl-block{position:static;inset:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:none;text-align:center;padding:10px 0 26px}',
    '.nl-text{animation:nlPulse 2.8s ease-in-out infinite}',
    '@keyframes nlPulse{0%,100%{opacity:.9}50%{opacity:.5}}',
    '.nl-title{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(245,242,236,.75)}',
    '.nl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    /* ---- news skeleton bones (unchanged from the news batch) ---- */
    '.nl-bones{position:absolute;inset:0;z-index:2;background:#0D0E13;padding:16px 18px;display:flex;flex-direction:column;gap:10px;border:1px solid rgba(245,242,236,.09);border-radius:12px}',
    '.nl-bones .nlb-head{display:flex;align-items:center;gap:10px}',
    '.nl-bones .nlb-av{width:36px;height:36px;border-radius:50%;background:rgba(245,242,236,.08);flex:none}',
    '.nl-bones .nlb-l{height:10px;border-radius:5px;background:rgba(245,242,236,.07)}',
    '.nl-bones .nlb-h1{width:38%}.nl-bones .nlb-h2{width:24%;margin-top:6px}',
    '.nl-bones .nlb-b1{width:96%}.nl-bones .nlb-b2{width:84%}.nl-bones .nlb-b3{width:58%}',
    '.news-skel{position:relative}',
    '.news-skel::after{animation-delay:var(--nl-d,0s)!important}',
    /* ---- visibility gating: pause, never run hidden work ---- */
    '.nl-paused .nl-rings,.nl-paused .nl-rings i,.nl-paused .nl-text{animation-play-state:paused}',
    '.nl-block .nl-rings{margin-bottom:2px}',
    '.nl-paused-section .news-skel::after{animation-play-state:paused}',
    /* ---- reduced motion: static ring, state still communicated ---- */
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

  function buildRing(sizePx, titleText, srText) {
    var el = document.createElement('div');
    el.className = 'nl-loader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.setProperty('--nl-size', sizePx + 'px');
    el.innerHTML =
      '<div class="nl-rings" aria-hidden="true"><i class="nlr1"></i><i class="nlr2"></i><i class="nlr3"></i><i class="nlr4"></i></div>' +
      (titleText ? '<div class="nl-text"><div class="nl-title">' + titleText + '</div></div>' : '') +
      (srText ? '<span class="nl-sr">' + srText + '</span>' : '');
    return el;
  }

  /* ================= NEWS: block ring + per-card bones ================= */

  var pending = new Set();
  var loader = null, sectionEl = null, gridEl = null, hardCap = null, io = null;
  var onScreen = true;

  /* never let a subtree removal bounce focus onto the accordion toggle: if
     focus is inside the node about to be removed (an X embed iframe can
     take it during hydration), park it nowhere, exactly where it was for
     a reader who never focused anything */
  function guardFocus(node) {
    var ae = document.activeElement;
    if (node && ae && ae !== document.body && node.contains(ae) && ae.blur) ae.blur();
  }

  function syncPause() {
    if (loader) {
      var off = document.hidden || !onScreen;
      loader.classList.toggle('nl-paused', off);
      if (sectionEl) sectionEl.classList.toggle('nl-paused-section', off);
    }
    syncChartPause();
  }
  document.addEventListener('visibilitychange', syncPause);

  /* ONE ring for the whole block, in normal flow ABOVE the skeleton grid:
     never inside a card, never covering the cards it announces */
  function mountRing(cell) {
    if (loader) return;
    injectCss();
    gridEl = cell.closest('.news-grid') || cell.parentNode;
    loader = buildRing(48, 'Loading posts from X', '');
    loader.classList.remove('nl-loader');
    loader.classList.add('nl-block');
    gridEl.parentNode.insertBefore(loader, gridEl);
    sectionEl = gridEl.closest('.news-section');
    if (sectionEl) sectionEl.setAttribute('aria-busy', 'true');
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { onScreen = en.isIntersecting; });
        syncPause();
      }, { rootMargin: '80px 0px' });
      io.observe(loader);
    }
    hardCap = setTimeout(removeLoader, 15000);
    syncPause();
  }

  function removeLoader() {
    if (hardCap) { clearTimeout(hardCap); hardCap = null; }
    if (io) { io.disconnect(); io = null; }
    if (sectionEl) { sectionEl.removeAttribute('aria-busy'); sectionEl.classList.remove('nl-paused-section'); }
    if (!loader) { gridEl = null; return; }
    /* Two-step removal. Removing an in-flow row reflows everything below
       it, which scores as layout shift if the reader is just watching. So
       the loader finishes INSTANTLY (invisible, zero running animations,
       aria-busy cleared) and its empty row is dropped from the DOM at the
       first moment that cannot shift anything the reader sees: the next
       real input (shift windows after input are excluded by design), or
       the moment the row leaves the viewport, or a final safety cap. */
    var el = loader;
    loader = null; gridEl = null;
    el.classList.add('nl-done');
    var dropped = false;
    var dropIo = null, capT = null;
    function drop() {
      if (dropped) return;
      dropped = true;
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.removeEventListener(ev, drop, true); });
      if (dropIo) dropIo.disconnect();
      if (capT) clearTimeout(capT);
      if (el.parentNode) { guardFocus(el); el.parentNode.removeChild(el); } /* removed, not hidden */
    }
    var r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= (window.innerHeight || 0)) { drop(); return; } /* off screen: nothing visible can shift */
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, drop, true); });
    if ('IntersectionObserver' in window) {
      dropIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (!en.isIntersecting) drop(); });
      });
      dropIo.observe(el);
    }
    capT = setTimeout(drop, 30000);
  }

  window.NewsLoading = {
    cardPending: function (cell, skel) {
      injectCss();
      pending.add(cell);
      var bones = document.createElement('div');
      bones.className = 'nl-bones';
      bones.setAttribute('aria-hidden', 'true');
      bones.innerHTML =
        '<div class="nlb-head"><span class="nlb-av"></span><span style="flex:1"><span class="nlb-l nlb-h1" style="display:block"></span><span class="nlb-l nlb-h2" style="display:block"></span></span></div>' +
        '<span class="nlb-l nlb-b1"></span><span class="nlb-l nlb-b2"></span><span class="nlb-l nlb-b3"></span>';
      skel.appendChild(bones);
      var rank = typeof cell.__newsRank === 'number' ? cell.__newsRank : pending.size;
      skel.style.setProperty('--nl-d', ((rank % 12) * 0.12).toFixed(2) + 's');
      mountRing(cell);
    },
    cardResolved: function (cell, skel) {
      pending.delete(cell);
      if (skel) {
        var bones = skel.querySelector('.nl-bones');
        if (bones && bones.parentNode) bones.parentNode.removeChild(bones);
      }
      if (!pending.size) removeLoader();
    },
    guardFocus: guardFocus,
  };

  /* ================= CHARTS: one ring per plot area ================= */
  /* CRITICAL RULE: called ONLY from the consumer's first-load skeleton
     path. Silent refreshes never call pending(), so a loader can never
     flash over a chart that already has good data on screen. */

  var chartHosts = new Map(); /* bodyEl -> { ring, io, timer, onScreen, opts } */

  function syncChartPause() {
    chartHosts.forEach(function (h) {
      if (h.ring) h.ring.classList.toggle('nl-paused', document.hidden || !h.onScreen);
    });
  }

  window.ChartLoading = {
    /* opts: { fallback: html for the consumer's existing failure state,
       size: ring px, timeoutMs } */
    pending: function (bodyEl, opts) {
      if (!bodyEl || chartHosts.has(bodyEl)) return;
      injectCss();
      opts = opts || {};
      var h = { ring: null, io: null, timer: null, onScreen: false, opts: opts };
      chartHosts.set(bodyEl, h);
      bodyEl.classList.add('nl-host');
      bodyEl.setAttribute('aria-busy', 'true');
      function mount() {
        if (h.ring || !chartHosts.has(bodyEl)) return;
        h.ring = buildRing(opts.size || 44, '', 'Loading chart data');
        bodyEl.appendChild(h.ring);
        syncChartPause();
      }
      if ('IntersectionObserver' in window) {
        /* the main saving: a panel far down the page never starts a ring */
        h.io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            h.onScreen = en.isIntersecting;
            if (en.isIntersecting) mount();
          });
          syncChartPause();
        }, { rootMargin: '120px 0px' });
        h.io.observe(bodyEl);
      } else {
        h.onScreen = true;
        mount();
      }
      /* bounded wait, the same 12s budget the news embeds use: on timeout
         the panel resolves to the consumer's existing failure state (the
         static fallback with its VIEW LIVE affordance). A later successful
         commit simply mounts the real chart in its place. */
      h.timer = setTimeout(function () {
        if (!chartHosts.has(bodyEl)) return;
        window.ChartLoading.resolved(bodyEl);
        if (opts.fallback != null) bodyEl.innerHTML = opts.fallback;
      }, opts.timeoutMs || 12000);
    },
    resolved: function (bodyEl) {
      var h = chartHosts.get(bodyEl);
      if (!h) return;
      chartHosts.delete(bodyEl);
      if (h.timer) clearTimeout(h.timer);
      if (h.io) h.io.disconnect();
      if (h.ring && h.ring.parentNode) h.ring.parentNode.removeChild(h.ring); /* removed, not hidden */
      bodyEl.classList.remove('nl-host');
      bodyEl.removeAttribute('aria-busy');
    },
  };
})();
