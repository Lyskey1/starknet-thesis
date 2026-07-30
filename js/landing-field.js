/* Landing hero flow field. Violet particles drifting on a slow layered
   field, drawn on a canvas behind the hero copy. The hero's own radial
   glow and 240px bottom fade sit above this canvas, so legibility and the
   seam into the convergence scene stay CSS-owned. Vanilla canvas 2D, no
   dependencies, loaded deferred so it never touches the critical path.
   Palette is locked to the landing accent family: hue 232 to 290,
   saturation near 78, lightness near 64. */
(function () {
  'use strict';

  var canvas = document.getElementById('lh-field');
  if (!canvas || !canvas.getContext) return;
  var hero = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var MOBILE = window.matchMedia('(max-width:860px)');

  var W = 0, H = 0;
  var parts = [];
  var raf = 0;
  var last = 0;

  function targetCount() {
    var n = (W * H) / 4300;
    if (MOBILE.matches) n /= 2.4;
    return Math.max(40, Math.min(360, Math.round(n)));
  }

  function spawn(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.sp = 12 + Math.random() * 14;   /* px per second: weather, not spectacle */
    p.life = 6 + Math.random() * 9;   /* seconds until reseed elsewhere */
    return p;
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    /* setTransform, never ctx.scale: scale compounds on every resize and
       the field drifts off-canvas after a few viewport changes */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    var n = targetCount();
    while (parts.length < n) parts.push(spawn({}));
    parts.length = n;
  }

  /* Field direction at a point. t is seconds; the coefficients are slow on
     purpose so the motion reads as weather. */
  function angleAt(x, y, t) {
    return 2.1 * Math.sin(x * 0.0014 + t * 0.11)
         + 2.1 * Math.cos(y * 0.0012 - t * 0.13)
         + 0.9 * Math.sin((x + y) * 0.0007 + t * 0.07);
  }

  function step(dt, t) {
    /* Trail fill: the hero base #08080A at low alpha, so streaks dissolve
       into the exact background the CSS fade expects. */
    ctx.fillStyle = 'rgba(8,8,10,0.075)';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { spawn(p); continue; }
      var a = angleAt(p.x, p.y, t);
      var nx = p.x + Math.cos(a) * p.sp * dt;
      var ny = p.y + Math.sin(a) * p.sp * dt;
      if (nx < -8 || nx > W + 8 || ny < -8 || ny > H + 8) { spawn(p); continue; }
      /* Small direction-driven hue shift inside the violet band. */
      var hue = 261 + 28 * Math.sin(a * 0.7);
      ctx.strokeStyle = 'hsla(' + hue.toFixed(1) + ',78%,64%,0.30)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt, now / 1000);
  }

  var resizeT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 150);
  });

  resize();
  last = performance.now();
  raf = requestAnimationFrame(frame);
})();
