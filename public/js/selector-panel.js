/* THE OBJECT-SELECTOR ENGINE, shared (2026-09-08): thMorph + initQw, cut
   out of quantum.html so the landing page runs the same code as the
   static pages. Depends on js/selector-rove.js (thRove). Globals, like
   thRove: window.initQw(root, onPick), window.thMorph(box, fadeEl, swap,
   instant).

   thMorph: one panel morph. Outgoing content fades out fully BEFORE the
   box resizes, so no text is ever visible mid-reflow; the box then
   animates to the incoming chapter's measured height while the new
   content (already laid out at final width, so it cannot reflow) fades
   in. 140ms fade, 400ms height at cubic-bezier(.22,.61,.36,1). Reduced
   motion or instant=true snaps directly. A token cancels a morph
   mid-flight if the reader clicks again. With the shell's height pinned
   by CSS the height leg is a no-op and the swap is a pure crossfade.

   initQw(root, onPick): wires the .qw-ped tab buttons of one .qw root to
   its .qw-ch chapters through thRove (click, arrow keys, aria-selected +
   roving tabindex), and surfaces a chapter when the location hash names
   an element inside it. Returns { select(i, instant), shown() } so a host
   can drive it (auto-advance, deep links on the tiles themselves). */
(function(){
  'use strict';
function thMorph(box, fadeEl, swap, instant){
  var token = (box.__thmTok = (box.__thmTok || 0) + 1);
  function clear(){
    box.style.transition = ''; box.style.height = ''; box.style.overflow = '';
    fadeEl.style.transition = ''; fadeEl.style.opacity = '';
  }
  if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clear(); swap(); return;
  }
  var h0 = box.getBoundingClientRect().height;
  fadeEl.style.transition = 'opacity .14s ease';
  fadeEl.style.opacity = '0';
  setTimeout(function(){
    if (box.__thmTok !== token) return;
    box.style.transition = 'none';
    box.style.height = h0 + 'px';
    box.style.overflow = 'hidden';
    swap();
    var h1 = box.scrollHeight + (box.offsetHeight - box.clientHeight);
    requestAnimationFrame(function(){
      if (box.__thmTok !== token) return;
      box.style.transition = 'height .4s cubic-bezier(.22,.61,.36,1)';
      box.style.height = h1 + 'px';
      fadeEl.style.transition = 'opacity .26s ease .1s';
      fadeEl.style.opacity = '1';
      var tm = setTimeout(done, 520);
      function done(){
        clearTimeout(tm);
        box.removeEventListener('transitionend', onEnd);
        if (box.__thmTok !== token) return;
        clear();
      }
      function onEnd(e){ if (e.target === box && e.propertyName === 'height') done(); }
      box.addEventListener('transitionend', onEnd);
    });
  }, 150);
}
function initQw(root, onPick){
  if (!root) return null;
  var peds = [].slice.call(root.querySelectorAll('.qw-ped'));
  var chs = [].slice.call(root.querySelectorAll('.qw-ch'));
  var shell = root.querySelector('.qw-shell');
  var panel = root.querySelector('.qw-panel');
  function shown(){
    var c = root.querySelector('.qw-ch.is-on');
    return c ? +c.dataset.ch : 0;
  }
  function select(i, instant){
    rove.mirror(i);
    thMorph(shell, panel, function(){
      chs.forEach(function(c){ c.classList.toggle('is-on', +c.dataset.ch === i); });
    }, instant);
  }
  var rove = thRove({ root: root, buttons: peds, shown: shown,
    pick: function(k){ select(k); if (onPick) onPick(k); } });
  function surface(){
    var id = (location.hash || '').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el || !root.contains(el)) return;
    var c = el.closest('.qw-ch');
    if (c) select(+c.dataset.ch, true);
  }
  window.addEventListener('hashchange', surface);
  surface();
  return { select: select, shown: shown };
}
  window.thMorph = thMorph;
  window.initQw = initQw;
})();
