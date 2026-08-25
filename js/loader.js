/* Page loader: sweeps a progress bar across the viewport while the page loads.
   Full animation on the first page view of a session; later pages skip it
   so in-site navigation stays snappy. Add ?loader=1 to force it. */
(function () {
  var force = /[?&]loader=1/.test(location.search);
  var seen = false;
  try { seen = sessionStorage.getItem('ld-seen') === '1'; } catch (e) {}
  if (seen && !force) return;
  try { sessionStorage.setItem('ld-seen', '1'); } catch (e) {}

  var html = document.documentElement;
  html.classList.add('ld-active');

  var root = document.createElement('div');
  root.id = 'page-loader';
  root.setAttribute('role', 'progressbar');
  root.setAttribute('aria-valuemin', '0');
  root.setAttribute('aria-valuemax', '100');
  root.setAttribute('aria-label', 'Loading');
  root.innerHTML =
    '<div class="ld-track">' +
      '<div class="ld-bar"></div>' +
      '<div class="ld-marker"><div class="ld-leader"></div><div class="ld-square"></div><div class="ld-pct">0%</div></div>' +
    '</div>';
  html.appendChild(root);  /* runs from <head>, before <body> exists */

  var bar = root.querySelector('.ld-bar');
  var marker = root.querySelector('.ld-marker');
  var pct = root.querySelector('.ld-pct');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MIN_MS = reduced ? 300 : 1500;   /* minimum time on screen */
  var start = 0;  /* set on first frame: rAF only ticks after first paint */
  /* "ready" = DOM parsed + webfonts ready (or window load, or a hard cap).
     Not window.load alone: hero videos / WebGL can hold that for seconds. */
  var loaded = false;
  var domReady = document.readyState !== 'loading';
  var fontsReady = !document.fonts;
  function check() { if (domReady && fontsReady) loaded = true; }
  document.addEventListener('DOMContentLoaded', function () { domReady = true; check(); });
  if (document.fonts) document.fonts.ready.then(function () { fontsReady = true; check(); });
  window.addEventListener('load', function () { loaded = true; });
  setTimeout(function () { loaded = true; }, 4000);
  check();

  var progress = 0;   /* 0..1 displayed */
  var raf;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function frame() {
    var now = performance.now();   /* not the rAF arg: its first value can be stale */
    if (!start) start = now;
    var t = (now - start) / MIN_MS;
    /* climb to ~92% over MIN_MS; finish only once window load has fired */
    var target = loaded && t >= 1 ? 1 : Math.min(0.92, easeOut(Math.min(t, 1)) * 0.92);
    var step = (target - progress) * (target === 1 ? 0.22 : 0.16);
    progress += Math.min(step, reduced ? 1 : 0.035);   /* never more than 3.5%/frame */
    if (target === 1 && progress > 0.995) progress = 1;

    var W = root.clientWidth;
    var head = progress * W;
    var trail = Math.min(head, Math.max(60, W * 0.32) * Math.sin(Math.PI * Math.min(progress, 1)) + 24);
    bar.style.left = (head - trail) + 'px';
    bar.style.width = trail + 'px';
    marker.style.left = head + 'px';
    marker.classList.toggle('ld-flip', head > W - 90);
    var p = Math.round(progress * 100);
    pct.textContent = p + '%';
    root.setAttribute('aria-valuenow', p);

    if (progress >= 1) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    cancelAnimationFrame(raf);
    setTimeout(function () {
      root.classList.add('ld-done');
      html.classList.remove('ld-active');
      setTimeout(function () { root.remove(); }, 600);
    }, 180);
  }

  raf = requestAnimationFrame(frame);
})();
