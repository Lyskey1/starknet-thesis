/* Shared mobile navigation (all 7 public pages).
   Builds the burger button and the full-screen overlay from the nav's OWN
   links and CTA (cloneNode keeps hrefs, .active state and every
   data-umami-* attribute), so per-page markup stays single-source.
   Burger + overlay only display below the CSS breakpoint (styles.css);
   desktop is untouched. Body scroll locks while open; closes via X,
   Escape, or tapping any link. */
(function () {
  'use strict';
  var nav = document.querySelector('nav');
  if (!nav || document.querySelector('.nav-overlay')) return;
  var links = nav.querySelector('.nav-links');
  var cta = nav.querySelector('.nav-cta');

  /* burger (44x44 tap target; shown by CSS on mobile only) */
  var burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'nav-burger';
  burger.setAttribute('aria-label', 'Menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'mobileNav');
  burger.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(burger);

  /* overlay */
  var ov = document.createElement('div');
  ov.className = 'nav-overlay';
  ov.id = 'mobileNav';
  ov.hidden = true;

  var top = document.createElement('div');
  top.className = 'nav-ov-top';
  var close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-ov-close';
  close.setAttribute('aria-label', 'Close menu');
  close.innerHTML = '×';
  top.appendChild(close);
  ov.appendChild(top);

  var list = document.createElement('nav');
  list.className = 'nav-ov-links';
  list.setAttribute('aria-label', 'Site');
  if (links) {
    [].forEach.call(links.querySelectorAll('a'), function (a) {
      list.appendChild(a.cloneNode(true)); /* keeps umami attrs + .active */
    });
  }
  ov.appendChild(list);

  if (cta) {
    var wrap = document.createElement('div');
    wrap.className = 'nav-ov-cta';
    wrap.appendChild(cta.cloneNode(true)); /* keeps cta-subscribe / cta-read-thesis */
    ov.appendChild(wrap);
  }
  document.body.appendChild(ov);

  function setOpen(open) {
    ov.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('nav-locked', open);
    if (open) close.focus();
  }
  burger.addEventListener('click', function () { setOpen(ov.hidden); });
  close.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !ov.hidden) setOpen(false);
  });
  ov.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) setOpen(false);
  });
})();
