/* The index: every PROJECT account as grouped cards on the BTCFi directory
   treatment. The voices live in the ring below (Meet the gang); their
   categories left this grid with the 2026-09-05 pass, along with the detail
   modal: a card is now a plain link that opens the project's X profile in a
   new tab, and the handle row is a copy button that never triggers the link.
   Order is THE DATA ORDER, never alphabetical: data/ecosystem.json carries
   each category with its pinned accounts first (the owner reorders by drag in
   edit mode and publishes), so this file must not re-sort. */
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

  /* Projects only. The people ids are known here so a future category coming
     out of the editor defaults into the grid unless it is one of the ring's. */
  var PEOPLE_IDS = ['starkware', 'snf', 'builders', 'shitposter'];
  var CATS = [
    { id: 'all', label: 'All' },
    { id: 'official', label: 'Official' },
    { id: 'defi', label: 'DeFi' },
    { id: 'consumer', label: 'Consumer' },
    { id: 'nft', label: 'NFT' },
    { id: 'appchains', label: 'Appchains' },
    { id: 'tooling', label: 'Tooling' }
  ];
  var CAT_BY_ID = CATS.reduce(function (m, c) { m[c.id] = c; return m; }, {});

  live.innerHTML =
    '<div class="ix-head"><p class="es-kicker">The projects</p>' +
      '<h2 class="ix-title">All projects, builders and protocols</h2>' +
      '<div class="ix-tabs" role="tablist"></div></div>' +
    '<div class="ix-grid"></div>';

  /* The tabs render into the sticky sub-nav when the page carries one (the
     bar sticks under the main nav, so the filter works from anywhere);
     otherwise into the head, as before. */
  var subnavTabs = document.querySelector('.eco-subnav .ix-tabs');
  var tabsEl = subnavTabs || live.querySelector('.ix-tabs');
  var gridEl = live.querySelector('.ix-grid');
  var filter = 'all', all = [];

  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var initials = function (acc) { return (acc.handle || acc.name || '?').replace(/^[@_]+/, '').slice(0, 2).toUpperCase(); };
  var cleanName = function (acc) { return (acc.name || acc.handle || '').replace(/^@/, ''); };
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
  /* The card is an anchor: click-through to the X profile, new tab. The
     handle row is a real button inside it; its handler stops the click from
     reaching the link. */
  var card = function (r) {
    var acc = r.acc, src = avatarSrc(acc), label = (CAT_BY_ID[r.cat] || {}).label || r.cat;
    var handle = '@' + String(acc.handle || '').replace(/^@/, '');
    return '<a class="ix-card" href="' + esc(acc.url || '#') + '" target="_blank" rel="noopener" data-uid="' + esc(r.uid) + '">' +
      '<span class="ix-card-top">' +
        '<span class="ix-card-logo">' +
          (src ? '<img alt="" loading="lazy" src="' + esc(src) + '" onerror="this.style.display=&quot;none&quot;">' : '') +
          '<span class="ix-card-mono">' + esc(initials(acc)) + '</span>' +
        '</span>' +
        '<span class="ix-kind">' + esc(label) + '</span>' +
      '</span>' +
      '<span class="ix-card-name">' + esc(cleanName(acc)) + '<i class="ti ti-brand-x ix-card-ext" aria-hidden="true"></i></span>' +
      '<span class="ix-card-desc">' + esc(acc.description || 'Starknet ecosystem account') + '</span>' +
      '<button type="button" class="ix-card-link ix-copy" data-handle="' + esc(handle) + '" aria-label="Copy ' + esc(handle) + '">' +
        '<span>' + esc(handle) + '</span><i class="ti ti-copy" aria-hidden="true"></i>' +
      '</button>' +
    '</a>';
  };

  function render() {
    live.querySelector('.ix-title').textContent = titleForFilter();
    /* data order, untouched: the pinned heads of each category come straight
       from the file */
    var rows = all.filter(function (a) { return filter === 'all' || a.cat === filter; });
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

  /* copy the handle without following the card link */
  gridEl.addEventListener('click', function (e) {
    var copy = e.target.closest ? e.target.closest('.ix-copy') : null;
    if (!copy) return;
    e.preventDefault();
    e.stopPropagation();
    var h = copy.getAttribute('data-handle') || '';
    var done = function () {
      var i = copy.querySelector('i');
      if (!i) return;
      i.className = 'ti ti-check';
      copy.classList.add('copied');
      setTimeout(function () { i.className = 'ti ti-copy'; copy.classList.remove('copied'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(h).then(done, done);
    else done();
  });

  fetch('/data/ecosystem.json').then(function (r) { return r.json(); }).then(function (data) {
    Object.keys(data).forEach(function (id) {
      if (!CAT_BY_ID[id] && PEOPLE_IDS.indexOf(id) === -1) {
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
        /* from the sticky bar the reader may be anywhere: land them at the
           top of the filtered grid, under the sticky offset */
        if (subnavTabs) {
          var top = mount.getBoundingClientRect().top + scrollY;
          if (Math.abs(scrollY - top) > 40) window.scrollTo({ top: Math.max(0, top - 96), behavior: 'smooth' });
        }
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
    /* inert, set by JS only, keeps the clipped links out of the tab order and
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
