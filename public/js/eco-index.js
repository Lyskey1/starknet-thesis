/* The index: every ecosystem account as grouped cards, matching the square
   BTCFi directory treatment while keeping the same modal detail handoff. */
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
    { id: 'tooling', label: 'Tooling' },
    { id: 'starkware', label: 'StarkWare' },
    { id: 'snf', label: 'Foundation' },
    { id: 'builders', label: 'Builders' },
    { id: 'shitposter', label: 'Culture' }
  ];
  var CAT_BY_ID = CATS.reduce(function (m, c) { m[c.id] = c; return m; }, {});

  live.innerHTML =
    '<div class="ix-head"><p class="es-kicker">The projects</p>' +
      '<h2 class="ix-title">All projects, builders and protocols</h2>' +
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
  var initials = function (acc) { return (acc.handle || acc.name || '?').replace(/^[@_]+/, '').slice(0, 2).toUpperCase(); };
  var sortKey = function (acc) { return (acc.name || acc.handle || '').replace(/^@/, '').toUpperCase(); };
  var cleanName = function (acc) { return (acc.name || acc.handle || '').replace(/^@/, ''); };
  var prettyUrl = function (u) {
    try {
      var url = new URL(u);
      return (url.hostname + url.pathname).replace(/^www\./, '').replace(/\/$/, '');
    } catch (e) { return u || ''; }
  };
  var avatarSrc = function (acc) {
    if (acc.avatar) return acc.avatar.startsWith('data:') ? acc.avatar : '/' + acc.avatar.replace(/^\//, '');
    if (acc.handle) return '/assets/avatars/' + acc.handle.replace(/^@/, '') + '.jpg';
    return '';
  };
  var titleForFilter = function () {
    if (filter === 'all') return 'All projects, builders and protocols';
    var cat = CAT_BY_ID[filter];
    return cat ? cat.label + ' accounts' : 'Ecosystem accounts';
  };
  var card = function (r) {
    var acc = r.acc, src = avatarSrc(acc), label = (CAT_BY_ID[r.cat] || {}).label || r.cat;
    return '<button type="button" class="ix-card" data-uid="' + esc(r.uid) + '">' +
      '<span class="ix-card-top">' +
        '<span class="ix-card-logo">' +
          (src ? '<img alt="" src="' + esc(src) + '" onerror="this.style.display=&quot;none&quot;">' : '') +
          '<span class="ix-card-mono">' + esc(initials(acc)) + '</span>' +
        '</span>' +
        '<span class="ix-kind">' + esc(label) + '</span>' +
      '</span>' +
      '<span class="ix-card-name">' + esc(cleanName(acc)) + '<i class="ti ti-brand-x ix-card-ext" aria-hidden="true"></i></span>' +
      '<span class="ix-card-desc">' + esc(acc.description || 'Starknet ecosystem account') + '</span>' +
      '<span class="ix-card-link"><span>' + esc(prettyUrl(acc.url)) + '</span><i class="ti ti-copy" aria-hidden="true"></i></span>' +
    '</button>';
  };

  function render() {
    live.querySelector('.ix-title').textContent = titleForFilter();
    var rows = all.filter(function (a) { return filter === 'all' || a.cat === filter; })
                  .sort(function (a, b) { return sortKey(a.acc) < sortKey(b.acc) ? -1 : 1; });
    var groups = (filter === 'all' ? CATS.filter(function (c) { return c.id !== 'all'; }) : [CAT_BY_ID[filter]])
      .filter(Boolean).map(function (cat) {
        var items = rows.filter(function (r) { return r.cat === cat.id; });
        return { cat: cat, items: items };
      }).filter(function (g) { return g.items.length; });

    gridEl.innerHTML = groups.map(function (g) {
      return '<section class="ix-panel" data-cat="' + esc(g.cat.id) + '">' +
        '<p class="ix-group">' + esc(g.cat.label) + ' <b>' + g.items.length + '</b></p>' +
        '<div class="ix-card-grid">' + g.items.map(card).join('') + '</div>' +
      '</section>';
    }).join('');
    requestAnimationFrame(function () { mount.style.minHeight = live.offsetHeight + 'px'; });
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
    var btn = e.target.closest ? e.target.closest('.ix-card') : null;
    if (!btn) return;
    var rec = all.filter(function (r) { return r.uid === btn.getAttribute('data-uid'); })[0];
    if (rec) open(rec);
  });
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ix-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  fetch('/data/ecosystem.json').then(function (r) { return r.json(); }).then(function (data) {
    Object.keys(data).forEach(function (id) {
      if (!CAT_BY_ID[id]) {
        CATS.push({ id: id, label: id.replace(/[-_]/g, ' ') });
        CAT_BY_ID[id] = CATS[CATS.length - 1];
      }
    });
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
