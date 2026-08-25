/* Decode field: a grid of mono cells. Each cell has a target character from
   the site's phrases. At rest most cells show drifting noise glyphs (dim);
   clicking resolves cells into their targets in a wave from the pointer,
   and they slowly fall back to noise. ~20 fps, paused offscreen. */
(function () {
  var sec = document.querySelector('.df-sec');
  if (!sec) return;
  var canvas = sec.querySelector('canvas'), label = sec.querySelector('.df-label');
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PH = ['REAL ONCHAIN PRIVACY FOR ANY TOKEN AND ANY USE CASE', 'POWERED BY ZK', 'THE QUANTUM ERA WILL BREAK TODAY\'S CRYPTOGRAPHY',
    'BUILT ON POST-QUANTUM PROOFS', 'HASH-BASED PROOFS', 'PROGRAMMABLE ACCOUNTS', 'TURNING IDLE BTC INTO PRODUCTIVE, PROGRAMMABLE CAPITAL',
    'THREE FORCES, ONE CHAIN, ONE TICKER', 'STRK IS THE TICKER ON THE WHOLE THESIS', 'STARKNET THESIS', 'PRIVACY', 'QUANTUM', 'BTCFI'];
  var GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+/.:';
  var FS = 12, LH = 18, CW = 8.2;
  var W = 0, H = 0, cols = 0, rows = 0, target = [], blank = [], hit = [], noise = [], frame = 0;
  var waves = [];   /* {x, y, t0} */

  function build() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = sec.clientWidth; H = sec.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / CW) + 1; rows = Math.ceil(H / LH) + 1;
    target = []; blank = []; hit = []; noise = [];
    for (var r = 0; r < rows; r++) {
      var s = '', i = r * 5 + 3;
      while (s.length < cols + 40) s += PH[i++ % PH.length] + '  ·  ';
      s = s.slice((r * 13) % 30);
      var tr = [], br = [], hr = [], nr = [];
      for (var c = 0; c < cols; c++) {
        tr.push(s[c]); hr.push(-1e9);
        br.push(Math.random() < 0.62 ? 1 : 0);          /* sparse at rest */
        nr.push(GLY[Math.floor(Math.random() * GLY.length)]);
      }
      target.push(tr); blank.push(br); hit.push(hr); noise.push(nr);
    }
    draw(performance.now());
  }

  var SPEED = 700, HOLD = 3200, FADE = 3600;
  function draw(now) {
    frame++;
    ctx.clearRect(0, 0, W, H);
    ctx.font = '500 ' + FS + 'px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'top';
    /* advance waves */
    for (var w = waves.length - 1; w >= 0; w--) if (now - waves[w].t0 > 4000) waves.splice(w, 1);
    for (var r = 0; r < rows; r++) {
      var y = r * LH + 4;
      for (var c = 0; c < cols; c++) {
        var t = target[r][c];
        var x = c * CW;
        /* wave hits */
        for (var k = 0; k < waves.length; k++) {
          var wv = waves[k], age = now - wv.t0, front = age * SPEED / 1000;
          var d = Math.hypot(x - wv.x, y - wv.y);
          if (d < front && d > front - SPEED / 20 * 3 && hit[r][c] < wv.t0) hit[r][c] = now;
        }
        var since = now - hit[r][c];
        var res = since < HOLD ? 1 : since < HOLD + FADE ? 1 - (since - HOLD) / FADE : 0;
        if (t === ' ' || t === undefined) continue;
        if (res > 0 && (res >= 0.999 || Math.random() < res)) {
          var a = (0.3 + 0.32 * Math.min(1, since / 180)) * (0.4 + 0.6 * res);
          ctx.fillStyle = 'rgba(251,251,251,' + a + ')';
          ctx.fillText(t, x, y);
        } else {
          if (!blank[r][c]) {
            /* occasionally re-roll the noise so it drifts */
            if (((frame + r * 7 + c * 3) % 9) === 0 && Math.random() < 0.3) noise[r][c] = GLY[Math.floor(Math.random() * GLY.length)];
            ctx.fillStyle = 'rgba(205,205,232,.16)';
            ctx.fillText(noise[r][c], x, y);
          } else if (Math.random() < 0.004) {
            blank[r][c] = 0; noise[r][c] = GLY[Math.floor(Math.random() * GLY.length)];
          } else if (!blank[r][c] && Math.random() < 0.002) blank[r][c] = 1;
        }
      }
    }
  }

  var timer = null;
  function start() { if (!timer && !reduced) timer = setInterval(function () { draw(performance.now()); }, 50); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }).observe(sec);
  else start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  sec.addEventListener('pointermove', function (e) {
    var rc = sec.getBoundingClientRect();
    if (label) label.style.transform = 'translate(' + (e.clientX - rc.left + 18) + 'px,' + (e.clientY - rc.top + 14) + 'px)';
  });
  sec.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('a')) return;
    var rc = sec.getBoundingClientRect();
    waves.push({ x: e.clientX - rc.left, y: e.clientY - rc.top, t0: performance.now() });
    if (label) label.textContent = 'DECODING';
    setTimeout(function () { if (label) label.textContent = 'CLICK'; }, 900);
  });
  window.addEventListener('resize', build);
  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(performance.now()); });
})();
