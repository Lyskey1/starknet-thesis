/* Gang ring: a draggable 3D card ring for the ecosystem page's "voices".
   Cards sit on a real cylinder (rotateY + translateZ), so the arc reads as
   concave while every card genuinely faces the axis. Drag to throw, friction
   decays the spin, the nearest card snaps to the front. DOM transforms only,
   no WebGL. strk20 palette lives in css/eco-stage.css. */
(function () {
  'use strict';
  var mount = document.getElementById('ecoRing');
  if (!mount) return;

  var GANGS = [
    { id: 'starkware', label: 'StarkWare gang' },
    { id: 'snf', label: 'Starknet Foundation' },
    { id: 'builders', label: 'Builders' },
    { id: 'shitposter', label: 'Shitposters' }
  ];
  var RATIO = 1.36, ARC_DEPTH = 0.7;
  /* Gap between neighbouring card CENTRES, as a share of a card's width. The
     radius is then solved from the member count so this gap is identical for
     every gang — a fixed radius with a 360/count step packed 23 cards tight
     and spread 11 of them apart. */
  var GAP_RATIO = 1.34, RADIUS_MIN = 2.2, RADIUS_MAX = 6.5;
  var DRAG = 0.16, DAMP = 0.94, REST = 0.05, SNAP = 0.14;
  /* How many cards stay lit either side of the front one. A FIXED angular
     fade (58deg to 92deg) showed ten cards for an 18-strong gang and six for
     an 11-strong one, because the step between cards is 360/count: the same
     angle spans fewer cards when there are fewer of them. Counting cards
     instead fills the frame identically for every gang. */
  var FADE_FROM_CARDS = 3.5, FADE_TO_CARDS = 4.7;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  mount.innerHTML =
    '<div class="es-screen">' +
      '<div class="es-top"><p class="es-kicker">The voices</p>' +
        '<h2>Meet the gang</h2>' +
        '<p class="es-lede">The people building, shaping and shitposting Starknet. Drag the ring.</p>' +
        '<div class="es-ring-tabs" role="tablist"></div></div>' +
      '<div class="es-stage"><div class="es-frame"></div><div class="es-ring"></div>' +
        '<div class="es-hint">Drag to explore</div></div>' +
      '<div class="es-dock"><div class="es-count">[ <b>01</b> / 01 ]</div><div class="es-name"></div>' +
        '<div class="es-role"></div><div class="es-dots"></div></div>' +
    '</div>';

  var tabsEl = mount.querySelector('.es-ring-tabs');
  var dotsEl = mount.querySelector('.es-dots');
  var stage = mount.querySelector('.es-stage');
  var ringEl = mount.querySelector('.es-ring');
  var frameEl = mount.querySelector('.es-frame');
  var hintEl = mount.querySelector('.es-hint');
  var countEl = mount.querySelector('.es-count');
  var nameEl = mount.querySelector('.es-name');
  var roleEl = mount.querySelector('.es-role');

  var members = [], cards = [], step = 0, radius = 0, cardW = 0, cardH = 0;
  var rot = 0, vel = 0, dragging = false, lastX = 0, downX = 0, moved = 0, front = 0, gang = GANGS[0].id;
  var raf = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function candidates(acc) {
    var out = [];
    if (acc.avatar) out.push(acc.avatar);
    if (acc.handle) { out.push('assets/avatars/' + acc.handle + '.webp'); out.push('assets/avatars/' + acc.handle + '.jpg'); }
    return out;
  }
  function initials(acc) {
    var h = (acc.handle || acc.name || '?').replace(/^[@_]+/, '');
    return h.slice(0, 2).toUpperCase();
  }

  function measure() {
    var w = window.innerWidth;
    var share = w < 640 ? 0.52 : w < 1024 ? 0.3 : 0.17;
    cardW = Math.max(150, Math.min(w * share, stage.clientHeight * 0.46));
    cardH = cardW * RATIO;
    var n = Math.max(cards.length, 3);
    /* chord = 2·r·sin(π/n): solve r for the gap we want between centres */
    var mult = (GAP_RATIO / 2) / Math.sin(Math.PI / n);
    radius = cardW * Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, mult));
    stage.style.perspective = Math.max(900, w * 1.15) + 'px';
    var push = radius * (1 - ARC_DEPTH);
    ringEl.style.transform = 'translateZ(' + push + 'px) rotateY(' + rot + 'deg)';
    frameEl.style.width = (cardW + 34) + 'px';
    frameEl.style.height = (cardH + 34) + 'px';
    cards.forEach(function (c, i) {
      c.el.style.width = cardW + 'px';
      c.el.style.height = cardH + 'px';
      c.el.style.marginLeft = (-cardW / 2) + 'px';
      c.el.style.marginTop = (-cardH / 2) + 'px';
      c.base = i * step;
    });
    place();
  }

  function build(list) {
    members = list; cards = []; ringEl.innerHTML = '';
    step = 360 / Math.max(list.length, 1);
    list.forEach(function (acc, i) {
      var el = document.createElement('div');
      el.className = 'es-card';
      el.setAttribute('data-i', String(i));
      var cands = candidates(acc);
      var mono = '<div class="es-mono">' + initials(acc) + '</div>';
      var pic = cands.length ? '<img alt="" data-try="0" src="' + cands[0] + '">' : '';
      el.innerHTML = mono + pic + '<div class="es-scrim"></div>' +
        '<div class="es-mirror">' + pic + '</div>' +
        '<span class="es-card-label">' + (acc.name || '') + '</span>';
      [].forEach.call(el.querySelectorAll('img'), function (img) {
        img.addEventListener('error', function () {
          var next = parseInt(img.getAttribute('data-try') || '0', 10) + 1;
          if (next < cands.length) { img.setAttribute('data-try', String(next)); img.src = cands[next]; }
          else img.remove();
        });
      });
      ringEl.appendChild(el);
      cards.push({ el: el, base: i * step, acc: acc });
    });
    rot = 0; vel = 0; front = 0;
    measure(); dock();
  }

  function wrap(a) { a = a % 360; if (a > 180) a -= 360; if (a < -180) a += 360; return a; }

  function place() {
    var push = radius * (1 - ARC_DEPTH);
    ringEl.style.transform = 'translateZ(' + push + 'px) rotateY(' + rot + 'deg)';
    var best = 0, bestAway = 999;
    cards.forEach(function (c, i) {
      var away = Math.abs(wrap(c.base + rot));
      if (away < bestAway) { bestAway = away; best = i; }
      var from = step * FADE_FROM_CARDS, to = step * FADE_TO_CARDS;
      var fade = 1 - Math.min(1, Math.max(0, (away - from) / Math.max(to - from, 0.001)));
      c.el.style.transform = 'rotateY(' + c.base + 'deg) translateZ(' + (-radius) + 'px)';
      c.el.style.opacity = fade.toFixed(3);
      c.el.classList.toggle('is-front', away < step * 0.5);
      c.el.style.visibility = fade <= 0.001 ? 'hidden' : 'visible';
    });
    if (best !== front) { front = best; dock(); }
  }

  function dock() {
    var acc = (cards[front] || {}).acc; if (!acc) return;
    countEl.innerHTML = '[ <b>' + pad(front + 1) + '</b> / ' + pad(cards.length) + ' ]';
    if (dotsEl.children.length !== cards.length) {
      dotsEl.innerHTML = ''; cards.forEach(function () { dotsEl.appendChild(document.createElement('i')); });
    }
    [].forEach.call(dotsEl.children, function (d, i) { d.classList.toggle('on', i === front); });
    nameEl.innerHTML = '<a href="' + (acc.url || '#') + '" target="_blank" rel="noopener">' + (acc.name || '') + '</a>';
    roleEl.textContent = acc.description || '';
  }

  function frame() {
    if (!dragging) {
      if (Math.abs(vel) > REST) { rot += vel; vel *= DAMP; }
      else {
        vel = 0;
        var away = wrap((cards[front] ? cards[front].base : 0) + rot);
        if (Math.abs(away) < 0.01) rot -= away; else rot -= away * SNAP;
      }
    }
    place();
    raf = requestAnimationFrame(frame);
  }

  /* input */
  stage.addEventListener('pointerdown', function (e) {
    dragging = true; lastX = downX = e.clientX; moved = 0; vel = 0;
    stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId);
    hintEl.classList.remove('on');
  });
  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    hintEl.style.transform = 'translate3d(' + (e.clientX - r.left + 16) + 'px,' + (e.clientY - r.top - 12) + 'px,0)';
    if (!dragging) { if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) hintEl.classList.add('on'); return; }
    var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    rot += dx * DRAG; vel = dx * DRAG;
  });
  function up(e) {
    if (!dragging) return;
    dragging = false; stage.classList.remove('dragging');
    if (moved <= 6 && e && e.clientX !== undefined) {
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var card = el && el.closest ? el.closest('.es-card') : null;
      if (card) { var i = parseInt(card.getAttribute('data-i'), 10); rot = -cards[i].base; vel = 0; }
    }
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', function () { hintEl.classList.remove('on'); });
  stage.setAttribute('tabindex', '0');
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { rot += step; e.preventDefault(); }
    if (e.key === 'ArrowRight') { rot -= step; e.preventDefault(); }
  });

  window.addEventListener('resize', measure);

  /* data */
  fetch('/data/ecosystem.json').then(function (r) { return r.json(); }).then(function (data) {
    GANGS.forEach(function (g, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = g.label + ' (' + (data[g.id] || []).length + ')';
      if (i === 0) b.className = 'on';
      b.addEventListener('click', function () {
        tabsEl.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); gang = g.id; build(data[g.id] || []);
      });
      tabsEl.appendChild(b);
    });
    build(data[gang] || []);
    if (!reduced) raf = requestAnimationFrame(frame); else place();
  }).catch(function (err) { console.error('[eco-ring]', err); mount.style.display = 'none'; });
})();
