/* The index: every project as one row, grouped alphabetically across four
   columns, after Dragonfly's. Hover fills a row with the accent and shows the
   move glyph; clicking one opens a centred detail panel with the logo, the
   name, what it does, its category and a link out. strk20 colours. */
(function () {
  'use strict';
  var mount = document.getElementById('ecoIndex');
  if (!mount) return;
  /* The mount ships with a static pre-render of the whole directory (see the
     STATIC-ECO markers in ecosystem.html, written by scripts/build-ecosystem.js)
     so the page is readable, and crawlable, without JS. Enhance it: build the
     interactive index into an own container appended beside it, and clip the
     static block via data-enhanced once the data is in. Never remove it and
     never display:none it: the text stays in the DOM. */
  var staticEl = mount.querySelector('.ixs');
  var live = document.createElement('div');
  live.className = 'ix-live';
  mount.appendChild(live);

  var CATS = [
    { id: 'all', label: 'All' },
    { id: 'official', label: 'Official' },
    { id: 'defi', label: 'DeFi' },
    { id: 'consumer', label: 'Consumer' },
    { id: 'nft', label: 'NFT' },
    { id: 'appchains', label: 'Appchains' },
    { id: 'tooling', label: 'Tooling' }
  ];
  var COLS = 4;

  live.innerHTML =
    '<div class="ix-head"><p class="es-kicker">The projects</p>' +
      '<h2>Index</h2>' +
      '<div class="ix-tabs" role="tablist"></div></div>' +
    '<div class="ix-grid"></div>' +
    '<div class="ix-modal" hidden><div class="ix-sheet" role="dialog" aria-modal="true" aria-label="Project detail">' +
      '<div class="ix-sheet-bar"><span>Detail</span><i class="ix-move" aria-hidden="true"></i><button type="button" class="ix-close">Close</button></div>' +
      '<div class="ix-sheet-art"><span class="ix-plus tl">+</span><span class="ix-plus tr">+</span>' +
        '<img alt="" class="ix-logo"><span class="ix-mono"></span>' +
        '<span class="ix-plus bl">+</span><span class="ix-plus br">+</span></div>' +
      '<div class="ix-sheet-rows">' +
        '<div class="ix-row-kv"><span>Account</span><b class="ix-name"></b></div>' +
        '<p class="ix-desc"></p>' +
        '<div class="ix-row-kv"><span>Category</span><b class="ix-cat"></b></div>' +
      '</div>' +
      '<a class="ix-visit" target="_blank" rel="noopener">View account</a>' +
      '<div class="ix-noise" aria-hidden="true"></div>' +
    '</div></div>';

  var tabsEl = live.querySelector('.ix-tabs');
  var gridEl = live.querySelector('.ix-grid');
  var modal = live.querySelector('.ix-modal');
  var sheet = live.querySelector('.ix-sheet');
  var filter = 'all', all = [];

  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var initials = function (acc) { return (acc.handle || '?').replace(/^[@_]+/, '').slice(0, 2).toUpperCase(); };
  var sortKey = function (acc) { return (acc.name || acc.handle || '').replace(/^@/, '').toUpperCase(); };

  function render() {
    var rows = all.filter(function (a) { return filter === 'all' || a.cat === filter; })
                  .sort(function (a, b) { return sortKey(a.acc) < sortKey(b.acc) ? -1 : 1; });
    /* split into four columns of roughly equal length, breaking on a letter */
    var per = Math.ceil(rows.length / COLS);
    var cols = [], i = 0;
    for (var c = 0; c < COLS; c++) {
      var take = rows.slice(i, i + per); i += per;
      cols.push(take);
    }
    gridEl.innerHTML = cols.map(function (col) {
      var out = '', letter = '';
      col.forEach(function (r) {
        var L = sortKey(r.acc).charAt(0);
        if (L !== letter) { letter = L; out += '<div class="ix-letter">' + esc(L) + '</div>'; }
        out += '<button type="button" class="ix-row" data-uid="' + esc(r.uid) + '">' +
          '<span>' + esc((r.acc.name || '').replace(/^@/, '')) + '</span>' +
          '<i class="ix-move" aria-hidden="true"></i></button>';
      });
      return '<div class="ix-col">' + out + '</div>';
    }).join('');
  }

  function open(rec) {
    sheet.querySelector('.ix-name').textContent = rec.acc.name || '';
    sheet.querySelector('.ix-desc').textContent = rec.acc.description || '';
    sheet.querySelector('.ix-cat').textContent = (CATS.filter(function (c) { return c.id === rec.cat; })[0] || {}).label || '';
    var a = sheet.querySelector('.ix-visit'); a.href = rec.acc.url || '#';
    var img = sheet.querySelector('.ix-logo'), mono = sheet.querySelector('.ix-mono');
    mono.textContent = initials(rec.acc);
    var cands = [];
    if (rec.acc.avatar) cands.push(rec.acc.avatar.startsWith('data:') ? rec.acc.avatar : '/' + rec.acc.avatar.replace(/^\//, ''));
    if (rec.acc.handle) cands.push('/assets/avatars/' + rec.acc.handle + '.jpg', '/assets/avatars/' + rec.acc.handle + '.webp', '/assets/avatars/' + rec.acc.handle + '.png');
    img.style.display = 'none'; img.setAttribute('data-try', '0');
    if (cands.length) { img.onload = function () { img.style.display = 'block'; }; img.onerror = function () {
      var n = parseInt(img.getAttribute('data-try') || '0', 10) + 1;
      if (n < cands.length) { img.setAttribute('data-try', String(n)); img.src = cands[n]; } else img.style.display = 'none';
    }; img.src = cands[0]; }
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    sheet.querySelector('.ix-close').focus();
  }
  function close() { modal.hidden = true; document.documentElement.style.overflow = ''; }

  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.ix-row') : null;
    if (!btn) return;
    var rec = all.filter(function (r) { return r.uid === btn.getAttribute('data-uid'); })[0];
    if (rec) open(rec);
  });
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ix-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  fetch('/data/ecosystem.json').then(function (r) { return r.json(); }).then(function (data) {
    CATS.forEach(function (c, i) {
      if (c.id !== 'all' && !(data[c.id] || []).length) return;
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c.label;
      if (i === 0) b.className = 'on';
      b.addEventListener('click', function () {
        tabsEl.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); filter = c.id; render();
      });
      tabsEl.appendChild(b);
    });
    CATS.forEach(function (c) {
      if (c.id === 'all') return;
      (data[c.id] || []).forEach(function (acc, i) {
        all.push({ uid: c.id + '-' + i, cat: c.id, acc: acc });
      });
    });
    render();
    /* inert, set by JS only, keeps the 126 clipped links out of the tab order and
       the a11y tree without removing a word from the DOM. Never emitted into the
       HTML: without JS those links must stay live. */
    if (staticEl) { staticEl.setAttribute('data-enhanced', '1'); staticEl.setAttribute('inert', ''); }
  }).catch(function (err) {
    console.error('[eco-index]', err);
    live.style.display = 'none';
    /* the head script clipped the static directory on the assumption this
       fetch would succeed. It did not, so give it back rather than leaving
       the reader an empty section. */
    document.documentElement.classList.remove('eco-live');
    if (staticEl) { staticEl.removeAttribute('data-enhanced'); staticEl.removeAttribute('inert'); }
  });
})();
