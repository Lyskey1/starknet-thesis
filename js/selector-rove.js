/* Shared selection state machine: a roving group of tab-buttons over a
   stacked panel, where exactly one item shows at a time.

   Owns only the parts every selector shares: click-to-pick, arrow-key cycling
   with focus follow, and the aria-selected / tabindex mirror that gives the
   group a single tab stop. Everything scene-specific stays with the caller,
   passed in through the pick callback: plane recomposition, panel scrolling,
   pedestal glyph state, swapping a video source.

   thRove({ root, buttons, shown, pick }) -> { mirror(i) }
     root     element the keydown listener binds to (the whole block)
     buttons  array of the selector buttons, in item order
     shown()  returns the index currently displayed, read fresh each time so
              the caller stays the source of truth
     pick(i, fromClick)  called to select index i. fromClick is true for a
              real click and false for arrow keys, so a block that toggles
              back off on a second click only does so for clicks.
     mirror(i)  writes aria-selected and the roving tabindex across buttons.
              Callers call this from their own select(), so the DOM is never
              touched twice for one selection.

   Arrow keys are honored only while focus sits on one of the buttons: panels
   hold their own controls (a range input, a scrolling region, native video
   controls) and those must keep their native key behavior.

   Factored out of privacy.html on 2026-08-13, where sections 01 and 02 had
   grown one inline copy; four blocks now share this one. */
(function(){
  'use strict';
  window.thRove = function(opts){
    opts.buttons.forEach(function(b, k){
      b.addEventListener('click', function(){ opts.pick(k, true); });
    });
    opts.root.addEventListener('keydown', function(ev){
      if (opts.buttons.indexOf(ev.target) === -1) return;
      var step = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? 1 :
                 (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') ? -1 : 0;
      if (!step) return;
      ev.preventDefault();
      var next = (opts.shown() + step + opts.buttons.length) % opts.buttons.length;
      opts.pick(next, false);
      opts.buttons[next].focus();
    });
    return {
      mirror: function(i){
        opts.buttons.forEach(function(b, k){
          b.setAttribute('aria-selected', k === i ? 'true' : 'false');
          b.setAttribute('tabindex', k === i ? '0' : '-1');
        });
      }
    };
  };
})();
