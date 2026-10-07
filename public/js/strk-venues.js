/* Live STRK venue comparison, the second device in section 05 of /strk.
   Reads the same-origin proxy /api/strk-quotes (api/strk-quotes.js), which
   trims CompareSTRK by avnu's public quotes feed.

   Lifecycle: nothing is fetched until the device enters the viewport. While
   it is intersecting AND the tab is visible it polls every 10 s and ticks the
   "updated Xs ago" text every second; either condition failing stops both.
   The status dot only pulses while running (the .sv-on class), and the pulse
   itself is gated on prefers-reduced-motion in the page CSS.

   Rendering is in place: one <tr> per venue, keyed by source, whose cells
   only get new text when the text changes, and which are moved (not rebuilt)
   when the order changes, so a poll never flashes the table.

   Ordering: connected full-fill on-market venues by price ascending (the
   only rows that get a rank), then partial fills, then off-market venues,
   then venues that are not connected, dimmed. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sv]');
  if (!root) return;

  var POLL_MS = 10000;
  var TIMEOUT_MS = 8000;
  var tbody = root.querySelector('[data-sv-rows]');
  var descEl = root.querySelector('[data-sv-desc]');
  var ageEl = root.querySelector('[data-sv-age]');
  var mktEl = root.querySelector('[data-sv-mkt]');
  var chips = Array.prototype.slice.call(root.querySelectorAll('[data-sv-size]'));

  var size = 100;
  var data = null;       // last payload rendered
  var failing = false;   // last request failed or the proxy served a stale copy
  var seq = 0;           // request counter, so a late reply for an old size is dropped
  var lastFetch = 0;
  var inView = false, running = false, pollT = 0, tickT = 0;
  var rows = {};         // source -> { tr, cells }

  // ---------- formatting ----------
  function usd(n) { return '$' + n.toLocaleString('en-US'); }
  function ago(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    return s < 60 ? s + 's ago' : Math.floor(s / 60) + 'm ago';
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ---------- ordering ----------
  function group(v) {
    if (!v.isConnected || !isNum(v.price) || v.price <= 0) return 3;
    if (v.isOffMarket) return 2;
    if (v.isPartialFill) return 1;
    return 0;
  }
  function ordered(venues) {
    return venues.map(function (v) { return { v: v, g: group(v) }; })
      .sort(function (a, b) {
        if (a.g !== b.g) return a.g - b.g;
        if (a.g === 3) return 0;
        return a.v.price - b.v.price;
      });
  }

  // ---------- rows ----------
  var COLS = ['rank', 'venue', 'price', 'vs', 'spread', 'fee'];
  function makeRow() {
    var tr = document.createElement('tr');
    var cells = {};
    COLS.forEach(function (c) {
      var td = document.createElement('td');
      td.className = 'sv-' + c;
      tr.appendChild(td);
      cells[c] = td;
    });
    // the venue cell is a fixed little structure; only its texts change
    var tag = document.createElement('span'); tag.className = 'sv-tag';
    var name = document.createElement('span'); name.className = 'sv-name';
    var flag = document.createElement('span'); flag.className = 'sv-flag';
    var meta = document.createElement('span'); meta.className = 'sv-meta';
    cells.venue.appendChild(tag); cells.venue.appendChild(name);
    cells.venue.appendChild(flag); cells.venue.appendChild(meta);
    cells.tag = tag; cells.name = name; cells.flag = flag; cells.meta = meta;
    return { tr: tr, cells: cells };
  }
  function put(el, text) { if (el.textContent !== text) el.textContent = text; }
  function cls(el, name, on) { if (el.classList.contains(name) !== on) el.classList.toggle(name, on); }

  function metaFor(v, g) {
    if (g !== 3 && v.isPartialFill) return 'Partial fill, ' + (isNum(v.fillPercent) ? Math.round(v.fillPercent) : 0) + '%';
    if (v.type === 'CEX') return v.quote ? v.quote + ' orderbook' : 'Orderbook';
    var parts = [];
    if (v.chain) parts.push(v.chain);
    if (v.route) parts.push('routed via ' + v.route);
    return parts.join(', ');
  }

  function clearMessage() {
    var m = tbody.querySelector('.sv-msg');
    if (m) m.remove();
  }
  function message(text) {
    Object.keys(rows).forEach(function (k) { rows[k].tr.remove(); });
    rows = {};
    var tr = tbody.querySelector('.sv-msg');
    if (!tr) {
      tr = document.createElement('tr'); tr.className = 'sv-msg';
      var td = document.createElement('td'); td.colSpan = 6;
      tr.appendChild(td); tbody.appendChild(tr);
    }
    put(tr.firstChild, text);
  }

  function render(d) {
    clearMessage();
    cls(root, 'sv-wait', false);
    var list = ordered(d.venues || []);
    var best = list.length && list[0].g === 0 ? list[0].v.price : null;
    var seen = {}, rank = 0;

    list.forEach(function (o, i) {
      var v = o.v, g = o.g;
      seen[v.source] = true;
      var r = rows[v.source] || (rows[v.source] = makeRow());
      var c = r.cells;
      if (g === 0) rank++;

      cls(r.tr, 'sv-best', g === 0 && rank === 1);
      cls(r.tr, 'sv-off', g === 3);
      put(c.rank, g === 0 ? String(rank) : '');
      put(c.tag, v.type === 'CEX' ? 'CEX' : 'DEX');
      put(c.name, v.source);
      put(c.flag, g !== 3 && v.isStale ? 'Stale' : '');
      put(c.meta, metaFor(v, g));

      if (g === 3) {
        put(c.price, 'Unavailable');
        put(c.vs, ''); put(c.spread, ''); put(c.fee, '');
      } else {
        put(c.price, '$' + v.price.toFixed(6));
        var vs = '';
        if (g === 2) vs = 'Off-market';
        else if (g === 0 && rank === 1) vs = 'Best';
        else if (best) vs = '+' + ((v.price / best - 1) * 100).toFixed(2) + '%';
        put(c.vs, vs);
        cls(c.vs, 'sv-is-best', vs === 'Best');
        put(c.spread, isNum(v.venueSpreadBps) ? Math.round(v.venueSpreadBps) + ' bps' : '');
        put(c.fee, isNum(v.feePercent) ? v.feePercent.toFixed(2) + '%' : '');
      }
      // move only when out of place
      if (tbody.children[i] !== r.tr) tbody.insertBefore(r.tr, tbody.children[i] || null);
    });
    Object.keys(rows).forEach(function (k) {
      if (!seen[k]) { rows[k].tr.remove(); delete rows[k]; }
    });

    // description, counted from the venues that actually returned a price
    var cex = 0, dex = 0;
    list.forEach(function (o) { if (o.g !== 3) { if (o.v.type === 'CEX') cex++; else if (o.v.type === 'DEX') dex++; } });
    var across = [];
    if (cex) across.push(plural(cex, 'exchange', 'exchanges'));
    if (dex) across.push(plural(dex, 'DEX aggregator', 'DEX aggregators'));
    var sz = isNum(d.tradeSizeUsd) ? d.tradeSizeUsd : size;
    put(descEl, 'All-in price per STRK for a ' + usd(sz) + ' market buy, ' +
      (d.includeFees ? 'fees and gas included' : 'before fees') +
      (across.length ? ', across ' + across.join(' and ') : '') + '.');
    put(mktEl, isNum(d.marketPrice) ? 'Market price $' + d.marketPrice.toFixed(4) : '');
  }

  function status() {
    if (!data) {
      put(ageEl, failing ? 'Reconnecting' : 'Connecting');
      cls(root, 'sv-live', false);
      return;
    }
    var live = !failing && data.isLive;
    cls(root, 'sv-live', live);
    put(ageEl, failing ? 'Last update ' + ago(data.ts) + ', reconnecting'
      : (data.isLive ? 'Live, updated ' : 'Updated ') + ago(data.ts));
  }

  // ---------- network ----------
  function fetchNow() {
    var my = ++seq, want = size;
    lastFetch = Date.now();
    var ctl = 'AbortController' in window ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : 0;
    fetch('/api/strk-quotes?size=' + want, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (my !== seq) return;
        if (!d || !Array.isArray(d.venues) || !isNum(d.ts)) throw new Error('shape');
        data = d;
        failing = d.stale === true;
        render(d);
        root.removeAttribute('aria-busy');
        status();
      })
      .catch(function () {
        if (my !== seq) return;
        failing = true;
        if (!data) { message('Live comparison unavailable right now'); cls(root, 'sv-wait', false); }
        root.removeAttribute('aria-busy');
        status();
      })
      .then(function () { clearTimeout(t); });
  }

  // ---------- run gate: in view AND tab visible ----------
  function schedule() {
    clearTimeout(pollT);
    pollT = setTimeout(function () { fetchNow(); schedule(); }, POLL_MS);
  }
  function sync() {
    var want = inView && document.visibilityState === 'visible';
    if (want === running) return;
    running = want;
    cls(root, 'sv-on', want);
    if (want) {
      var since = Date.now() - lastFetch;
      if (since >= POLL_MS) { fetchNow(); since = 0; }
      clearTimeout(pollT);
      pollT = setTimeout(function () { fetchNow(); schedule(); }, POLL_MS - since);
      status();
      tickT = setInterval(status, 1000);
    } else {
      clearTimeout(pollT); clearInterval(tickT);
    }
  }

  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      var n = Number(b.getAttribute('data-sv-size'));
      if (n === size) return;
      size = n;
      chips.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      root.setAttribute('aria-busy', 'true');
      fetchNow();
      if (running) schedule();
    });
  });

  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es[es.length - 1].isIntersecting;
      sync();
    }).observe(root);
  } else {
    inView = true; sync();
  }
})();
