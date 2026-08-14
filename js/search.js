/* Site search for starknetthesis.io — vanilla JS, no dependency, no
   third-party service (the publish passphrase lives in localStorage, so no
   external script may ever run here).

   Three parts, one file:
   1. The matching engine (pure functions, also loadable in node for tests).
   2. Deep-link landing: reveal collapsed/filtered targets before scrolling,
      highlight on arrival, cold-load support via a #s: hash.
   3. The palette UI: injected lazily; the index (data/search-index.json) is
      fetched ONLY when the palette first opens, never on page load.

   The index is built by scripts/build-search-index.js on every deploy. */
(function () {
  'use strict';

  /* ================= 1. MATCHING ENGINE ================= */

  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function squash(s) { return fold(s).replace(/[^a-z0-9]+/g, ''); }
  function tokenize(q) {
    return fold(q).split(/[^a-z0-9.$]+/).map(t => t.replace(/[$,]/g, '')).filter(Boolean);
  }

  /* single-substitution/insertion/deletion distance <= 1, prefix-tolerant */
  function ed1(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (la > lb) i++;
      else if (lb > la) j++;
      else { i++; j++; }
    }
    return edits + (la - i) + (lb - j) <= 1;
  }

  function prepEntry(e, i) {
    const hayT = fold(e.title);
    const hayB = fold((e.body || '') + ' ' + (e.alias || '') + ' ' + pageLabel(e.page));
    return {
      i, e, hayT, hayB,
      sqT: squash(e.title),
      sqB: squash((e.body || '') + ' ' + (e.alias || '')),
      words: (hayT + ' ' + hayB).split(/[^a-z0-9]+/).filter(w => w.length >= 4),
    };
  }

  function stems(t) {
    const out = [t];
    /* light suffix stemming so "converging" meets "converged" */
    if (t.length >= 6) {
      if (t.endsWith('ing')) out.push(t.slice(0, -3));
      if (t.endsWith('ed') || t.endsWith('es')) out.push(t.slice(0, -2));
      if (t.endsWith('s')) out.push(t.slice(0, -1));
    }
    return out;
  }
  function termHits(p, t) {
    const tq = t.replace(/\./g, '');
    /* squashed matching (punctuation tolerance) only for terms of 4+ chars:
       shorter squashes false-match across word boundaries */
    let inT = false, inB = false;
    for (const v of stems(t)) {
      inT = inT || p.hayT.includes(v) || (tq.length >= 4 && p.sqT.includes(v.replace(/\./g, '')));
      inB = inB || p.hayB.includes(v) || (tq.length >= 4 && p.sqB.includes(v.replace(/\./g, '')));
      if (inT && inB) break;
    }
    return { inT, inB, any: inT || inB };
  }

  function scoreEntry(p, terms, phrase, phraseSq, fuzzy) {
    let allT = true, allAny = true, hits = 0;
    for (const t of terms) {
      let h = termHits(p, t);
      if (!h.any && fuzzy && t.length >= 5) {
        /* typo tolerance: only reached when the strict pass found nothing */
        const ok = p.words.some(w => ed1(t, w) || (w.length > t.length && ed1(t, w.slice(0, t.length))));
        if (ok) h = { inT: false, inB: true, any: true };
      }
      if (!h.any) { allAny = false; break; }
      if (!h.inT) allT = false;
      hits++;
    }
    if (!allAny) return null;
    let tier;
    if (terms.length > 1 && (p.hayT.includes(phrase) || p.sqT.includes(phraseSq))) tier = 0;
    else if (terms.length > 1 && (p.hayB.includes(phrase) || p.sqB.includes(phraseSq))) tier = 1;
    else if (allT) tier = terms.length > 1 ? 2 : 0;
    else tier = 3;
    return { tier, hits, tLen: p.e.title.length };
  }

  function search(index, query, limit) {
    const terms = tokenize(query);
    if (!terms.length) return { total: 0, groups: [] };
    const phrase = fold(query).trim();
    const phraseSq = squash(query);
    let scored = [];
    for (const p of index) {
      const s = scoreEntry(p, terms, phrase, phraseSq, false);
      if (s) scored.push({ p, s });
    }
    if (!scored.length) {
      for (const p of index) {
        const s = scoreEntry(p, terms, phrase, phraseSq, true);
        if (s) scored.push({ p, s });
      }
    }
    scored.sort((a, b) => a.s.tier - b.s.tier || kindRank(a.p.e) - kindRank(b.p.e) || a.s.tLen - b.s.tLen);
    const total = scored.length;
    scored = scored.slice(0, limit || 20);
    /* group by page, preserving rank order of each page's best hit */
    const groups = [], byPage = {};
    for (const { p } of scored) {
      if (!byPage[p.e.page]) { byPage[p.e.page] = { page: p.e.page, label: pageLabel(p.e.page), items: [] }; groups.push(byPage[p.e.page]); }
      byPage[p.e.page].items.push(p.e);
    }
    return { total, groups, terms };
  }

  const KIND_RANK = { page: 0, metric: 1, 'table row': 1, card: 2, account: 2, 'ecosystem item': 2, 'chart label': 2, news: 3, digest: 3, section: 3 };
  function kindRank(e) { return KIND_RANK[e.kind] != null ? KIND_RANK[e.kind] : 3; }

  const PAGE_META = {
    index: { label: 'Home', path: '/', accent: '#A78BFA' },
    privacy: { label: 'Privacy', path: '/privacy', accent: '#1FCB94' },
    quantum: { label: 'Quantum', path: '/quantum', accent: '#3DA9FC' },
    btcfi: { label: 'BTCFi', path: '/btcfi', accent: '#F7931A' },
    strk: { label: 'STRK', path: '/strk', accent: '#7C3AED' },
    ecosystem: { label: 'Ecosystem', path: '/ecosystem', accent: '#EC7B6B' },
    digest: { label: 'Digest', path: '/digest', accent: '#F2978A' },
  };
  function pageLabel(pg) { return (PAGE_META[pg] || {}).label || pg; }

  /* highlight matched terms in a snippet; separator-tolerant per term */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(text, terms) {
    let out = esc(text);
    const done = new Set();
    for (const t of terms || []) {
      if (t.length < 2 || done.has(t)) continue;
      done.add(t);
      const pat = t.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-–—_.,/]?');
      try { out = out.replace(new RegExp('(' + pat + ')', 'ig'), '<mark>$1</mark>'); } catch (e) { /* skip */ }
    }
    return out;
  }
  function snippet(e, terms) {
    const body = e.body || '';
    const hay = fold(body);
    let at = -1;
    for (const t of terms || []) { const i = hay.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
    if (at < 0) return body.slice(0, 120);
    const from = Math.max(0, at - 40);
    return (from > 0 ? '…' : '') + body.slice(from, from + 130);
  }

  /* node test hook */
  if (typeof module !== 'undefined' && typeof window === 'undefined') {
    module.exports = { fold, squash, tokenize, prepEntry, search, ed1, highlight, snippet };
    return;
  }

  /* ================= 2. DEEP-LINK LANDING ================= */

  const PAGE = (document.body.className.match(/page-(\w+)/) || [])[1] ||
    (location.pathname.replace(/\/|\.html$/g, '') || 'index').replace('index', 'index');
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* anchors land under the fixed nav unless offset */
  const baseCss = document.createElement('style');
  baseCss.textContent = '[id]{scroll-margin-top:110px}@media(max-width:860px){[id]{scroll-margin-top:86px}}' +
    '.search-landed{box-shadow:0 0 0 2px rgba(var(--accent-rgb,124,58,237),.65), 0 0 34px rgba(var(--accent-rgb,124,58,237),.35)!important;' + (REDUCE ? '' : 'transition:box-shadow 1.2s ease .9s;') + '}';
  document.head.appendChild(baseCss);

  function landedFlash(el) {
    el.classList.add('search-landed');
    if (REDUCE) { setTimeout(() => el.classList.remove('search-landed'), 2200); return; }
    setTimeout(() => { el.style.boxShadow = ''; el.classList.remove('search-landed'); }, 2100);
  }

  function q(sel) { return document.querySelector(sel); }
  function clickIf(el) { if (el) { el.click(); return true; } return false; }

  /* open whatever hides the target, page by page, using the page's OWN
     toggles so state stays consistent */
  function reveal(target, entry) {
    let did = false;
    /* strk: numbers accordions */
    const nacc = target.closest && target.closest('.nacc-item');
    if (nacc && !nacc.classList.contains('open')) did = clickIf(nacc.querySelector('.nacc-head')) || did;
    /* strk: where-to-get accordions */
    const buy = target.closest && target.closest('.buy-cat');
    if (buy && !buy.classList.contains('open')) did = clickIf(buy.querySelector('.buy-head')) || did;
    /* strk: utilities selector */
    const util = target.closest && target.closest('.util-panel');
    if (util && !util.classList.contains('show')) did = clickIf(q('.util-tab[data-k="' + util.getAttribute('data-k') + '"]')) || did;
    /* quantum: roadmap expandable rows */
    if (target.classList && target.classList.contains('th-mainrow') && !target.classList.contains('th-open')) did = clickIf(target) || did;
    /* news sections: expand the collapsed block */
    const newsSec = target.closest && target.closest('#newsSection');
    if (newsSec && !newsSec.classList.contains('open')) did = clickIf(q('#newsToggle')) || did;
    /* privacy: tap-open cards */
    if (target.classList && (target.classList.contains('wp-card') || target.classList.contains('sp-card'))) {
      target.classList.add(target.classList.contains('wp-card') ? 'tap-open' : 'on'); did = true;
    }
    /* privacy: section 04 shows one movement panel at a time. The index does
       not record which panel a hit lives in; the DOM does, so walk up to the
       panel and click the tab it names through aria-labelledby. */
    const pmv = target.closest && target.closest('.pmv-panel');
    if (pmv && pmv.hidden) did = clickIf(document.getElementById(pmv.getAttribute('aria-labelledby'))) || did;
    /* privacy: the proving-properties panel shows one property at a time */
    const pci = target.closest && target.closest('.pcore-item');
    if (pci && !pci.classList.contains('is-on')) did = clickIf(document.querySelectorAll('#pcore .pcore-node')[+pci.dataset.p]) || did;
    /* privacy: wall pedestals panel shows one wall at a time */
    const pw = target.closest && target.closest('.pw-wall');
    if (pw && !pw.classList.contains('is-on')) did = clickIf(document.querySelectorAll('#wall-pedestals .pw-ped')[+pw.dataset.wall]) || did;
    /* privacy: section 05's sealed stack. A hit lands on the detail item, so
       the card that owns it is the one whose aria-controls names it: click
       that and the stack unseals onto the right stage. */
    const sd = target.closest && target.closest('.sd-item');
    if (sd && sd.hasAttribute('hidden')) {
      did = clickIf(document.querySelector('.seal-card[aria-controls="' + sd.id + '"]')) || did;
    }
    /* privacy: bills panel shows one bill at a time */
    const bill = target.closest && target.closest('.bstk-bill');
    if (bill && !bill.classList.contains('is-on')) did = clickIf(document.querySelectorAll('#bills .bstk-tab')[+bill.dataset.bill]) || did;
    /* generic reveal-on-scroll blocks become visible once scrolled to */
    return did;
  }

  /* item-level location for data-backed entries rendered at runtime */
  function locateItem(entry) {
    if (entry.kind === 'account') {
      const cards = document.querySelectorAll('.eco-accounts .eco-card, .eco-accounts a');
      const want = fold(entry.title.replace(/^@/, ''));
      for (const c of cards) if (fold(c.textContent).includes(want)) return c;
    }
    if (entry.kind === 'news') {
      const want = fold(entry.title).slice(0, 40);
      for (const c of document.querySelectorAll('.news-cell')) if (fold(c.textContent).includes(want)) return c;
    }
    if (entry.kind === 'digest') {
      const want = fold(entry.title);
      for (const c of document.querySelectorAll('.recap-card')) if (fold(c.textContent).includes(want)) return c;
    }
    if (entry.kind === 'card' && entry.anchor === 'tlDetail' && entry.title) {
      const name = fold(entry.title.replace(/\s*\(\d+\)\s*$/, ''));
      for (const col of document.querySelectorAll('.tl-col')) if (fold(col.textContent).includes(name)) { col.click(); break; }
    }
    return null;
  }

  function landOn(entry, attempt) {
    attempt = attempt || 0;
    const anchorEl = document.getElementById(entry.anchor);
    /* ecosystem: switch the filter to the target category first */
    if (entry.cat) {
      const pill = q('.eco-pill[data-cat="' + entry.cat + '"]');
      if (pill && !pill.classList.contains('active')) pill.click();
    }
    let target = locateItem(entry) || anchorEl;
    if (!target) {
      if (attempt < 12) { setTimeout(() => landOn(entry, attempt + 1), 250); return; }
      return;
    }
    if (locateItem(entry) === null && anchorEl && attempt < 8 &&
      (entry.kind === 'account' || entry.kind === 'news' || entry.kind === 'digest')) {
      /* runtime item not rendered yet: open its container, retry for the item */
      reveal(anchorEl, entry);
      setTimeout(() => landOn(entry, attempt + 9), 400);
      return;
    }
    reveal(target, entry);
    setTimeout(() => {
      target.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' });
      landedFlash(target);
      /* some toggles attach their handlers lazily (deferred engines): give
         the page a beat after scrolling, then reveal again — idempotent,
         reveal() only acts on still-closed state */
      setTimeout(() => reveal(target, entry), 700);
      setTimeout(() => reveal(target, entry), 1600);
    }, 120);
  }

  function hrefFor(entry) {
    const meta = PAGE_META[entry.page] || { path: '/' + entry.page };
    return meta.path + '#s:' + encodeURIComponent(entry.anchor) +
      ':' + encodeURIComponent(entry.kind) + ':' + encodeURIComponent(entry.title.slice(0, 60)) +
      (entry.cat ? ':' + encodeURIComponent(entry.cat) : '');
  }
  function go(entry) {
    if (entry.page === PAGE) { closePalette(); landOn(entry); history.replaceState(null, '', hrefFor(entry)); }
    else location.href = hrefFor(entry);
  }

  /* cold-load deep link: works from a shared URL, not only in-page */
  function handleHash() {
    const m = location.hash.match(/^#s:([^:]+):([^:]*)(?::([^:]*))?(?::([^:]*))?$/);
    if (!m) return;
    const entry = { anchor: decodeURIComponent(m[1]), kind: decodeURIComponent(m[2] || 'section'),
      title: decodeURIComponent(m[3] || ''), cat: m[4] ? decodeURIComponent(m[4]) : undefined, page: PAGE };
    setTimeout(() => landOn(entry), 350);
  }

  /* ================= 3. THE PALETTE ================= */

  let palette = null, input = null, listEl = null, statusEl = null;
  let INDEX = null, indexError = false, results = null, cursor = -1, lastFocus = null;
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const SUGGESTIONS = ['strkBTC', 'quantum roadmap', 'app revenue', 'privacy island', 'BTC staking', 'viewing key'];

  function paletteCss() {
    return '.srch-backdrop{position:fixed;inset:0;z-index:400;background:rgba(5,6,10,.66);display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px}' +
      '.srch{width:min(640px,100%);max-height:70vh;display:flex;flex-direction:column;border:1px solid rgba(245,242,236,.09);border-radius:16px;overflow:hidden;' +
      'background:rgba(13,14,19,.86);-webkit-backdrop-filter:blur(18px) saturate(115%);backdrop-filter:blur(18px) saturate(115%);' +
      'box-shadow:inset -1px -1px 0 rgba(255,255,255,.28),inset 1px 1px 0 rgba(255,255,255,.08),inset 0 1px 0 rgba(255,255,255,.18),0 30px 90px rgba(0,0,0,.7)}' +
      '.srch-in{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(245,242,236,.09)}' +
      '.srch-in svg{flex:none;opacity:.55}' +
      '.srch-in input{flex:1;background:none;border:0;outline:0;color:#F5F2EC;font-family:Inter,system-ui,sans-serif;font-size:15px}' +
      '.srch-in input::placeholder{color:rgba(245,242,236,.35)}' +
      '.srch-esc{font-family:"IBM Plex Mono",monospace;font-size:10px;color:rgba(245,242,236,.4);border:1px solid rgba(245,242,236,.14);border-radius:5px;padding:3px 6px;cursor:pointer;background:none}' +
      '.srch-list{overflow-y:auto;padding:8px}' +
      '.srch-group{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;padding:10px 10px 4px;color:var(--gc,#A78BFA)}' +
      '.srch-item{display:block;width:100%;text-align:left;background:none;border:0;border-radius:10px;padding:9px 10px;cursor:pointer;color:#F5F2EC}' +
      '.srch-item .t{font-family:Inter,system-ui,sans-serif;font-size:13.5px;font-weight:600}' +
      '.srch-item .b{font-family:Inter,system-ui,sans-serif;font-size:12px;color:rgba(245,242,236,.55);margin-top:2px;line-height:1.45}' +
      '.srch-item .k{font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(245,242,236,.35);margin-left:8px}' +
      '.srch-item mark{background:none;color:var(--gc,#A78BFA);font-weight:700}' +
      '.srch-item.on,.srch-item:hover{background:rgba(245,242,236,.06)}' +
      '.srch-item.on{box-shadow:inset 2px 0 0 var(--gc,#A78BFA)}' +
      '.srch-status{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.08em;color:rgba(245,242,236,.4);padding:10px 16px;border-top:1px solid rgba(245,242,236,.07)}' +
      '.srch-empty{padding:26px 18px;text-align:center;color:rgba(245,242,236,.55);font-size:13px;font-family:Inter,system-ui,sans-serif}' +
      '.srch-empty .sug{display:inline-block;margin:6px 4px 0;padding:6px 12px;border:1px solid rgba(245,242,236,.14);border-radius:999px;cursor:pointer;font-size:12px;color:rgba(245,242,236,.7);background:none;font-family:"IBM Plex Mono",monospace}' +
      '.srch-empty .sug:hover{border-color:rgba(245,242,236,.4);color:#F5F2EC}' +
      '@media(max-width:860px){.srch-backdrop{padding:0}.srch{width:100%;max-height:100dvh;height:100dvh;border-radius:0;border:0}}' +
      '@media(max-width:980px){.srch{-webkit-backdrop-filter:none;backdrop-filter:none;background:#0D0E13}}';
  }

  function buildPalette() {
    if (palette) return;
    const st = document.createElement('style');
    st.textContent = paletteCss();
    document.head.appendChild(st);
    palette = document.createElement('div');
    palette.className = 'srch-backdrop';
    palette.innerHTML =
      '<div class="srch" role="dialog" aria-modal="true" aria-label="Site search">' +
      '<div class="srch-in">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5F2EC" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>' +
      '<input type="text" placeholder="Search the whole site…" aria-label="Search query" autocomplete="off" spellcheck="false">' +
      '<button type="button" class="srch-esc" aria-label="Close search">ESC</button></div>' +
      '<div class="srch-list" role="listbox"></div>' +
      '<div class="srch-status" aria-live="polite"></div></div>';
    document.body.appendChild(palette);
    input = palette.querySelector('input');
    listEl = palette.querySelector('.srch-list');
    statusEl = palette.querySelector('.srch-status');
    palette.addEventListener('pointerdown', e => { if (e.target === palette) closePalette(); });
    palette.querySelector('.srch-esc').addEventListener('click', closePalette);
    input.addEventListener('input', () => render(input.value));
    palette.addEventListener('keydown', onPaletteKeys);
    listEl.addEventListener('click', e => {
      const btn = e.target.closest('.srch-item');
      if (btn) go(results.flat[+btn.dataset.i]);
    });
    render('');
  }

  function loadIndex() {
    if (INDEX || indexError) return Promise.resolve();
    try {
      const cached = sessionStorage.getItem('searchIndex_v1');
      if (cached) { INDEX = JSON.parse(cached).entries.map(prepEntry); return Promise.resolve(); }
    } catch (e) { /* ignore */ }
    return fetch('/data/search-index.json').then(r => {
      if (!r.ok) throw new Error('' + r.status);
      return r.json();
    }).then(d => {
      INDEX = d.entries.map(prepEntry);
      try { sessionStorage.setItem('searchIndex_v1', JSON.stringify({ entries: d.entries })); } catch (e) { /* quota */ }
      render(input ? input.value : '');
    }).catch(() => { indexError = true; render(input ? input.value : ''); });
  }

  function render(query) {
    if (!listEl) return;
    cursor = -1;
    if (indexError) {
      listEl.innerHTML = '<div class="srch-empty">The search index could not be loaded. Check your connection and reopen search.</div>';
      statusEl.textContent = '';
      return;
    }
    if (!INDEX) {
      listEl.innerHTML = '<div class="srch-empty">Loading the index…</div>';
      statusEl.textContent = '';
      return;
    }
    if (!query.trim()) {
      listEl.innerHTML = '<div class="srch-empty">Search everything published on this site.<br>' +
        SUGGESTIONS.map(s => '<button type="button" class="sug">' + esc(s) + '</button>').join('') + '</div>';
      listEl.querySelectorAll('.sug').forEach(b => b.addEventListener('click', () => { input.value = b.textContent; render(b.textContent); input.focus(); }));
      statusEl.textContent = INDEX.length + ' entries indexed';
      return;
    }
    const res = search(INDEX, query, 20);
    results = { flat: [] };
    if (!res.total) {
      listEl.innerHTML = '<div class="srch-empty">No matches. Try a shorter term.</div>';
      statusEl.textContent = '0 results';
      return;
    }
    let html = '';
    for (const g of res.groups) {
      const accent = (PAGE_META[g.page] || {}).accent || '#A78BFA';
      html += '<div class="srch-group" style="--gc:' + accent + '">' + esc(g.label) + '</div>';
      for (const e of g.items) {
        const i = results.flat.length;
        results.flat.push(e);
        html += '<button type="button" class="srch-item" style="--gc:' + accent + '" role="option" data-i="' + i + '">' +
          '<span class="t">' + highlight(e.title, res.terms) + '<span class="k">' + esc(e.kind) + '</span></span>' +
          '<div class="b">' + highlight(snippet(e, res.terms), res.terms) + '</div></button>';
      }
    }
    listEl.innerHTML = html;
    statusEl.textContent = res.total + ' result' + (res.total === 1 ? '' : 's') + (res.total > results.flat.length ? ' · showing ' + results.flat.length : '');
  }

  function items() { return [...listEl.querySelectorAll('.srch-item')]; }
  function setCursor(n) {
    const it = items();
    if (!it.length) return;
    cursor = (n + it.length) % it.length;
    it.forEach((el, i) => el.classList.toggle('on', i === cursor));
    it[cursor].scrollIntoView({ block: 'nearest' });
  }
  function onPaletteKeys(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(cursor + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(cursor - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items();
      if (cursor >= 0 && it[cursor]) it[cursor].click();
      else if (it[0]) it[0].click();
    } else if (e.key === 'Tab') {
      /* keep focus cycling inside the dialog */
      const focusables = [input, ...items(), palette.querySelector('.srch-esc')].filter(Boolean);
      const at = focusables.indexOf(document.activeElement);
      e.preventDefault();
      const next = focusables[(at + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length];
      next.focus();
      const idx = items().indexOf(next);
      if (idx >= 0) setCursor(idx);
    }
  }

  let open = false;
  function openPalette() {
    if (open) return;
    open = true;
    lastFocus = document.activeElement;
    buildPalette();
    palette.style.display = 'flex';
    document.documentElement.classList.add('nav-locked');
    loadIndex();
    render(input.value);
    input.focus();
    input.select();
  }
  function closePalette() {
    if (!open) return;
    open = false;
    if (palette) palette.style.display = 'none';
    document.documentElement.classList.remove('nav-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function togglePalette() { open ? closePalette() : openPalette(); }

  /* global shortcuts */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); togglePalette(); }
  });

  /* triggers: the nav button (static markup) + one injected overlay row */
  function wireTriggers() {
    document.querySelectorAll('.nav-search').forEach(btn => {
      btn.addEventListener('click', openPalette);
      const kbd = btn.querySelector('.ns-kbd');
      if (kbd && !IS_MAC) kbd.textContent = 'Ctrl K';
    });
    /* hamburger overlay entry (overlay is built by js/nav.js at load) */
    const tryOverlay = (n) => {
      const links = document.querySelector('.nav-ov-links');
      if (!links) { if (n < 20) setTimeout(() => tryOverlay(n + 1), 200); return; }
      if (links.querySelector('.nav-ov-search')) return;
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'nav-ov-search';
      a.textContent = 'Search';
      a.addEventListener('click', e => {
        e.preventDefault();
        const closeBtn = document.querySelector('.nav-ov-close');
        if (closeBtn) closeBtn.click();
        setTimeout(openPalette, 60);
      });
      links.appendChild(a);
    };
    tryOverlay(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { wireTriggers(); handleHash(); });
  else { wireTriggers(); handleHash(); }
  window.addEventListener('hashchange', handleHash);

  window.SiteSearch = { open: openPalette, close: closePalette, go, search: q2 => INDEX ? search(INDEX, q2, 20) : null, _load: loadIndex };
})();
