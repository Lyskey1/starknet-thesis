/* Landing hero: concentric rings of the site's own phrases on a canvas.
   Sparse letters at rest with a slow outward ripple; click and hold to fill
   the rings in (CLICK & HOLD -> KEEP HOLDING -> RELEASE); release sends a
   ripple outward as the letters thin back out. Reduced motion: one static
   frame at full density. */
(function () {
  var field = document.querySelector('.rh-field');
  if (!field) return;
  var canvas = field.querySelector('canvas');
  var label = field.querySelector('.rh-label');
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PHRASES = [
    'STARKNET THESIS', 'REAL ONCHAIN PRIVACY', 'POST-QUANTUM PROOFS BY DESIGN',
    'BITCOIN TURNED INTO PRODUCTIVE CAPITAL', 'THREE FORCES CONVERGING ON A SINGLE CHAIN',
    'STRK IS THE TICKER ON THE WHOLE THESIS', 'PRIVACY', 'QUANTUM', 'BTCFI', 'STRK',
    'HASH-BASED PROOFS', 'PROGRAMMABLE ACCOUNTS', 'ONE CHAIN IS BRINGING AN ANSWER TO ALL OF IT'
  ];
  var FLARE = '#fbfbfb', LILAC = '#cdcde8';
  var FONT_PX = 11.5, ADV = 8.2, RING_GAP = 34, DOT_GAP = 7;

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, rings = [];
  var hold = 0, holding = false, holdStart = 0, releaseAt = -1e9, t0 = performance.now();
  var mouse = { x: 0, y: 0 };

  function hash(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

  function build() {
    var rect = field.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W * 0.5; cy = H * 0.5;
    var maxR = Math.hypot(W, H) * 0.5 + RING_GAP;
    rings = [];
    var i = 0;
    for (var r = 42; r < maxR; r += RING_GAP, i++) {
      var phrase = PHRASES[i % PHRASES.length] + '   ';
      var count = Math.max(8, Math.floor((2 * Math.PI * r) / ADV));
      var chars = [];
      for (var k = 0; k < count; k++) {
        chars.push({ ch: phrase[k % phrase.length], th: hash(i * 7919 + k * 31), a: (k / count) * Math.PI * 2 });
      }
      rings.push({ r: r, chars: chars, dir: i % 2 ? -1 : 1, speed: 0.012 + 0.02 * hash(i + 3), phase: hash(i) * 6.28 });
    }
  }

  var WAKE_V = 380, WAKE_T = 3.2;               /* px per second, seconds alive */
  function wake(r, t) {
    /* release wake: a decaying train of crests travelling outward. Returns
       {d: density contribution, s: radial shove in px} */
    var since = t - releaseAt;
    if (since < 0 || since > WAKE_T) return { d: 0, s: 0 };
    var front = since * WAKE_V;
    var behind = front - r;                        /* >0 once the front has passed this ring */
    if (behind < -60) return { d: 0, s: 0 };
    var env = Math.exp(-Math.max(0, behind) / 260) * (1 - since / WAKE_T);
    var osc = Math.cos(behind / 26);               /* crest, trough, crest ... rambling through */
    var lead = behind < 0 ? 1 + behind / 60 : 1;   /* soft leading edge */
    return { d: env * lead * (0.55 + 0.45 * osc), s: env * lead * osc * 14 };
  }
  function density(r, t) {
    /* base sparsity + slow outward ripple + hold fill + release wake */
    var wave = 0.5 + 0.5 * Math.sin(r * 0.045 - t * 1.6);
    var base = 0.14 + 0.22 * wave * wave;
    return Math.min(1, base + hold * (1 - base) + wake(r, t).d * 0.95);
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    if (holding) hold = Math.min(1, (now - holdStart) / 1400);
    else hold = Math.max(0, hold - 0.012);        /* slow drain: the wake does the thinning */
    if (reduced) { hold = 1; t = 0; }

    ctx.clearRect(0, 0, W, H);
    ctx.font = '500 ' + FONT_PX + 'px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      var rot = ring.phase + t * ring.speed * ring.dir;
      var dens = density(ring.r, t);
      var wk = wake(ring.r, t);
      var wobble = Math.sin(ring.r * 0.045 - t * 1.6) * 2.2 * (1 - hold) + wk.s;
      var r = ring.r + wobble;

      /* dotted guide ring between text rings */
      if (i > 0) {
        var rd = r - RING_GAP / 2;
        ctx.fillStyle = 'rgba(205,205,232,' + (0.16 + 0.22 * dens) + ')';
        var n = Math.floor((2 * Math.PI * rd) / DOT_GAP);
        for (var d = 0; d < n; d++) {
          var ad = (d / n) * Math.PI * 2 - rot * 0.5;
          var dx = cx + Math.cos(ad) * rd, dy = cy + Math.sin(ad) * rd;
          if (dx < -4 || dy < -4 || dx > W + 4 || dy > H + 4) continue;
          ctx.fillRect(dx, dy, 1, 1);
        }
      }

      ctx.fillStyle = FLARE;
      var chars = ring.chars;
      for (var k = 0; k < chars.length; k++) {
        var c = chars[k];
        if (c.ch === ' ' || c.th > dens) continue;
        var a = c.a + rot + wk.s * 0.0025 * Math.sin(k);   /* slight angular jostle in the wake */
        var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
        ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, (dens - c.th) * 6);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.fillText(c.ch, 0, 0); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (!reduced) requestAnimationFrame(draw);
  }

  function setLabel(txt) { if (label) label.textContent = txt; }
  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    holding = true; holdStart = performance.now(); field.classList.add('is-holding');
    setLabel('KEEP HOLDING'); move(e);
    field.setPointerCapture && e.pointerId !== undefined && field.setPointerCapture(e.pointerId);
  }
  function onUp() {
    if (!holding) return;
    holding = false; field.classList.remove('is-holding');
    releaseAt = (performance.now() - t0) / 1000;
    setLabel('CLICK & HOLD');
  }
  function move(e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    var rect = field.getBoundingClientRect();
    if (label) label.style.transform = 'translate(' + (e.clientX - rect.left + 18) + 'px,' + (e.clientY - rect.top + 14) + 'px)';
  }
  setInterval(function () { if (holding && hold >= 1) setLabel('RELEASE'); }, 120);

  field.addEventListener('pointermove', move);
  field.addEventListener('pointerdown', onDown);
  field.addEventListener('pointerup', onUp);
  field.addEventListener('pointercancel', onUp);
  field.addEventListener('pointerleave', function () { if (!holding) setLabel('CLICK & HOLD'); });
  window.addEventListener('blur', onUp);
  setLabel('CLICK & HOLD');

  var ro = window.ResizeObserver ? new ResizeObserver(function () { build(); if (reduced) draw(performance.now()); }) : null;
  if (ro) ro.observe(field); else window.addEventListener('resize', build);
  build();
  if (document.fonts && document.fonts.load) document.fonts.load('500 12px "IBM Plex Mono"').then(function () { if (reduced) draw(performance.now()); });
  requestAnimationFrame(draw);

  /* typed stats in the copy panel */
  var stats = document.querySelectorAll('.rh-stats span');
  var si = 0;
  function typeNext() {
    if (si >= stats.length) return;
    var el = stats[si], txt = el.getAttribute('data-text') || '', n = 0;
    el.classList.add('rh-cursor');
    if (reduced) { el.textContent = txt; el.classList.remove('rh-cursor'); si++; typeNext(); return; }
    var iv = setInterval(function () {
      el.textContent = txt.slice(0, ++n);
      if (n >= txt.length) { clearInterval(iv); el.classList.remove('rh-cursor'); si++; setTimeout(typeNext, 120); }
    }, 28);
  }
  setTimeout(typeNext, 400);
})();
