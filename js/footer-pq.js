/* Footer ground: rows of the site's phrases in mono, with letters constantly
   scrambling and settling back. Canvas, ~14 fps, paused when offscreen. */
(function () {
  var foot = document.querySelector('footer.pq-footer');
  var canvas = foot && foot.querySelector('.pf-ghost');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PH = ['THREE FORCES, ONE CHAIN, ONE TICKER', 'REAL ONCHAIN PRIVACY', 'POST-QUANTUM PROOFS BY DESIGN',
    'BITCOIN TURNED INTO PRODUCTIVE CAPITAL', 'STRK IS THE TICKER ON THE WHOLE THESIS', 'STARKNET THESIS',
    'HASH-BASED PROOFS', 'PROGRAMMABLE ACCOUNTS', 'PRIVACY', 'QUANTUM', 'BTCFI', 'STRK', 'ECOSYSTEM', 'DIGEST'];
  var GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
  var FS = 12, LH = 18, CW = 7.2;
  var W = 0, H = 0, rows = [], scr = [];

  function line(seed, cols) {
    var s = '', i = seed;
    while (s.length < cols + 60) { s += PH[i++ % PH.length] + '  ·  '; }
    return s.slice(seed * 7 % 40, seed * 7 % 40 + cols + 20);
  }
  function build() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = foot.clientWidth; H = foot.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = Math.ceil(W / CW), n = Math.ceil(H / LH) + 1;
    rows = []; scr = [];
    for (var r = 0; r < n; r++) { rows.push(line(r * 3 + 1, cols).split('')); scr.push({}); }
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.font = '500 ' + FS + 'px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'top';
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r], y = r * LH + 6, s = scr[r];
      for (var c = 0; c < row.length; c++) {
        var x = c * CW; if (x > W) break;
        var hot = s[c];
        ctx.fillStyle = hot ? 'rgba(250,250,250,.9)' : 'rgba(250,250,250,.28)';
        ctx.fillText(hot ? hot.g : row[c], x, y);
      }
    }
  }
  function tick() {
    /* scramble a few letters, settle the ones whose time is up */
    for (var k = 0; k < 24; k++) {
      var r = Math.floor(Math.random() * rows.length), c = Math.floor(Math.random() * rows[r].length);
      if (rows[r][c] !== ' ') scr[r][c] = { g: GLY[Math.floor(Math.random() * GLY.length)], t: 2 + Math.floor(Math.random() * 6) };
    }
    for (var i = 0; i < scr.length; i++) for (var j in scr[i]) { if (--scr[i][j].t <= 0) delete scr[i][j]; }
    draw();
  }
  var timer = null, seen = false;
  function start() { if (!timer && !reduced) timer = setInterval(tick, 70); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }).observe(foot);
  } else start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  window.addEventListener('resize', build);
  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();
