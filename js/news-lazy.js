/* Shared progressive loader for the News sections (privacy / quantum / btcfi).
   Pattern: facade-first cards (instant, zero iframes), batched reveal
   (12 at a time + LOAD MORE), lazy embed hydration via IntersectionObserver
   (rootMargin 600px), one widgets.js load on first expand — never on page
   load. A failed embed keeps the static card with its outbound link.
   Each page's news engine calls:
     var lazy = window.NewsLazy({ grid, batch: 12, parseTweetId });
     lazy.setItems(cells, cards, pos)  // after (re)rendering facades
     lazy.start()                      // on first expand
   Component styles are injected once so all three pages stay in sync. */
(function(){
  'use strict';

  var STYLES = [
    '.news-cell{min-height:320px}', /* ≈ embed height: no layout shift on hydrate */
    '.news-cell .news-skel{position:relative;min-height:220px;border-radius:12px;overflow:hidden;background:rgba(245,242,236,.04)}',
    '.news-cell .news-skel::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(245,242,236,.07) 50%,transparent 70%);animation:newsShimmer 1.4s infinite}',
    '@keyframes newsShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}',
    '.news-more-wrap{display:flex;justify-content:center;margin:20px 0 4px}',
    '.news-more-wrap[hidden]{display:none}',
    '.news-more-btn{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,242,236,.6);background:none;border:1px solid rgba(245,242,236,.18);border-radius:999px;padding:10px 24px;cursor:pointer;transition:border-color .2s,color .2s}',
    '.news-more-btn:hover{border-color:var(--accent,#A78BFA);color:var(--accent,#A78BFA)}',
    '@media(prefers-reduced-motion:reduce){.news-cell .news-skel::after{animation:none}}'
  ].join('\n');
  function injectStyles(){
    if (document.getElementById('newsLazyStyles')) return;
    var st = document.createElement('style');
    st.id = 'newsLazyStyles';
    st.textContent = STYLES;
    document.head.appendChild(st);
  }

  /* one widgets.js for the whole page, loaded on demand only */
  function ensureWidgets(){
    if (window.__newsWidgetsPromise) return window.__newsWidgetsPromise;
    window.__newsWidgetsPromise = new Promise(function(resolve, reject){
      if (window.twttr && window.twttr.widgets) { resolve(window.twttr); return; }
      var s = document.createElement('script');
      s.src = 'https://platform.twitter.com/widgets.js';
      s.async = true; s.charset = 'utf-8';
      s.onload = function(){
        if (window.twttr && window.twttr.widgets) {
          if (window.twttr.ready) window.twttr.ready(function(t){ resolve(t); }); else resolve(window.twttr);
        } else { reject(new Error('twttr unavailable')); }
      };
      s.onerror = function(){ reject(new Error('widgets.js failed to load')); };
      document.head.appendChild(s);
    });
    return window.__newsWidgetsPromise;
  }

  window.NewsLazy = function(cfg){
    injectStyles();
    var BATCH = cfg.batch || 12;
    var grid = cfg.grid;
    var cells = [], cards = [];
    var started = false;
    var visible = 0;
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        hydrate(en.target);
      });
    }, { rootMargin: '600px 0px' }) : null;

    var moreWrap = document.createElement('div');
    moreWrap.className = 'news-more-wrap';
    moreWrap.hidden = true;
    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'news-more-btn';
    moreBtn.textContent = 'Load more';
    moreBtn.setAttribute('data-umami-event', 'news-load-more');
    moreBtn.setAttribute('data-umami-event-page', ((location.pathname || '').split('/').pop() || 'index').replace('.html', '') || 'index');
    moreWrap.appendChild(moreBtn);
    grid.parentNode.insertBefore(moreWrap, grid.nextSibling);
    moreBtn.addEventListener('click', function(){
      visible += BATCH;
      applyVisibility();
    });

    /* hydrate one card into a real embed; on failure the facade stays */
    function hydrate(cell){
      var c = cell.__newsCard;
      if (!c || cell.__hydrated) return;
      if (cell.querySelector('iframe,.twitter-tweet')) { cell.__hydrated = true; return; } // already embedded (e.g. by the editor)
      cell.__hydrated = true;
      var id = cfg.parseTweetId(c.url);
      if (!id) return; // non-tweet entry: the static card IS the final state
      var facade = cell.querySelector(':scope > .tweet-card');
      var skel = document.createElement('div');
      skel.className = 'news-embed news-skel';
      cell.appendChild(skel);
      if (facade) facade.style.display = 'none';
      ensureWidgets().then(function(twttr){
        return twttr.widgets.createTweet(id, skel, { theme: 'dark', dnt: true, conversation: 'none', align: 'center' });
      }).then(function(node){
        if (!node) throw new Error('embed unavailable');
        skel.classList.remove('news-skel');
        if (facade && facade.parentNode) facade.parentNode.removeChild(facade);
      }).catch(function(){
        if (skel.parentNode) skel.parentNode.removeChild(skel);
        if (facade) facade.style.display = ''; // keep the linked static card
      });
    }

    function applyVisibility(){
      var total = cells.length, shown = 0;
      cells.forEach(function(cell){
        if (!cell) return;
        var show = !started || cell.__newsRank < visible;
        cell.style.display = show ? '' : 'none';
        if (started && show) {
          shown++;
          if (!cell.__hydrated) { if (io) io.observe(cell); else hydrate(cell); }
        }
      });
      var remaining = total - Math.min(visible, total);
      moreWrap.hidden = !started || remaining <= 0;
      if (remaining > 0) moreBtn.textContent = 'Load more (' + remaining + ')';
    }

    return {
      ensureWidgets: ensureWidgets,
      /* call after every (re)render of facade cells */
      setItems: function(newCells, newCards, pos){
        if (io) cells.forEach(function(c){ if (c) io.unobserve(c); });
        cells = newCells.slice();
        cards = newCards.slice();
        cells.forEach(function(cell, i){ if (cell) cell.__newsRank = pos[i]; });
        if (started) applyVisibility();
      },
      /* call on first expand */
      start: function(){
        if (started) return;
        started = true;
        visible = BATCH;
        applyVisibility();
      }
    };
  };
})();
