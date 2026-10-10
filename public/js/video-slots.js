// ============================================================
// Video slots: the source, title, poster and editor engine behind
// quantum's film device, extracted 2026-10-10 so a second device on
// the same page (the Oct 8 L1 block's "Eli on video" slot) runs the
// SAME code instead of a copy of it. js/video-chrome.js still owns
// the control bar; this owns what each slot plays.
//
// Each device passes its own names, following the thVideoChrome
// precedent, so the two never share state:
//   root          the element that owns the slots
//   key           its localStorage key (quantumVideos_v1, ...)
//   seeds         { index: { src, dur, title } }, the committed films.
//                 This is the device's data entry: what readers see.
//   placeholders  per-slot file names for the editor's src hint
//   editHost      where the EDIT VIDEOS control is inserted
//   chrome        a function returning the device's thVideoChrome
//                 object, read late because it is created elsewhere
//
// Local MP4 model: the editor sets a project-relative path or https
// URL, or picks a local file for session-only preview. It persists
// only the src STRING + title (never the blob) under the device's
// key. EDIT VIDEOS is a local editor, not a publish: what readers
// see is the seeds the page commits.
// ============================================================
function thVideoSlots(cfg) {
  var grid = cfg.root;
  if (!grid) return null;
  var KEY = cfg.key;
  var R2 = 'https://pub-3274162cfa1d48728621d5ec2d0906ad.r2.dev/';
  var cards = [].slice.call(grid.querySelectorAll('.th-pm-vcard'));
  if (!cards.length) return null;
  var seeds = cfg.seeds || {};
  var phs = cfg.placeholders || [];
  var editBtn = null, editLabel = null;

  // Video editor UI exists ONLY when the admin gate is on
  if (window.ADMIN_GATE) {
    var qvEd = function(ph){ return '<div class="qv-editor" hidden>' +
      '<div class="qv-fld"><label>Video source (path or URL)</label><input type="text" class="qv-src" placeholder="' + R2 + ph + ' or a local path"></div>' +
      '<div class="qv-fld"><label>Title</label><input type="text" class="qv-ttl" placeholder="Video title"></div>' +
      '<div class="qv-fld qv-file"><label>Pick a local file (preview only)</label><input type="file" accept="video/*" class="qv-pick"><div class="qv-note">Local preview only. To publish, add the file to the project and set its path above.</div></div>' +
      '<div class="qv-actions"><button type="button" class="qv-btn primary qv-save">Save</button><button type="button" class="qv-btn qv-clear">Clear</button></div>' +
    '</div>'; };
    var host = cfg.editHost || grid;
    host.insertAdjacentHTML('beforeend', '<div class="th-pm-vid-admin"><button type="button" class="news-edit-btn" aria-expanded="false"><i class="ti ti-pencil" aria-hidden="true"></i> <span>Edit videos</span></button></div>');
    editBtn = host.lastElementChild.querySelector('button');
    editLabel = editBtn.querySelector('span');
    cards.forEach(function(c, i){ c.insertAdjacentHTML('beforeend', qvEd(phs[i] || '')); });
  }
  var defaults = cards.map(function(c){ return (c.querySelector('.qv-title').textContent || '').trim(); });
  /* the poster each slot ships with, and it exists because preload is
     none: with nothing decoded the browser paints an empty black box.
     It travels with the seeded film only (see applyCard). */
  var posters = cards.map(function(c){ return c.querySelector('.qv-player').getAttribute('poster') || ''; });
  var blobs = {}; // session-only object URLs per index, never persisted

  function load(){ try{ var raw = localStorage.getItem(KEY); var a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
  var state = load(); // [{ src, title }]

  // one-time prefill per slot; only when the slot has never been saved or cleared
  var seeded = false;
  Object.keys(seeds).forEach(function(k){ if(state[k] == null){ state[k] = seeds[k]; seeded = true; } });
  if(seeded) save();

  function chrome(){ return cfg.chrome ? cfg.chrome() : null; }

  function applyCard(i){
    var c = cards[i], st = state[i] || {};
    var video = c.querySelector('.qv-player'), ph = c.querySelector('.qv-ph');
    c.querySelector('.qv-title').textContent = (st.title != null && st.title !== '') ? st.title : defaults[i];
    var live = blobs[i] || (st.src || '');   // prefer session preview, else saved path/URL
    if(live){ video.src = live; video.hidden = false; ph.hidden = true; }
    else {
      video.removeAttribute('src'); try{ video.load(); }catch(e){} video.hidden = true;
      /* AN EMPTY SLOT RENDERS NOTHING (2026-09-09). "No video set" used to
         show to every reader, and because the placeholder shipped visible in
         the markup it also showed with JS disabled and flashed before this
         engine ran. It is an EDITOR affordance now: revealed only when the
         admin gate has put a .qv-editor in the card, hidden for everyone
         else. */
      ph.hidden = !c.querySelector('.qv-editor');
    }
    /* gates the custom control bar: no source, no chrome (see the vctl CSS) */
    c.classList.toggle('has-video', !!live);
    /* the length hint travels with the seeded file and nothing else: a
       slot pointing at a custom URL or a local preview has no known
       length, and printing the seed's would be printing a wrong number */
    var sd = seeds[i];
    var isSeed = !!(sd && live === sd.src);
    if (isSeed && sd.dur) video.dataset.dur = String(sd.dur);
    else video.removeAttribute('data-dur');
    /* the poster is this film's own frame, so it travels with this film
       only: a slot pointing at a custom URL or a local preview shows no
       poster rather than the previous film's picture */
    if (isSeed && posters[i]) video.setAttribute('poster', posters[i]);
    else video.removeAttribute('poster');
    var ch = chrome(); if (ch) ch.refresh();
  }
  function applyAll(){ cards.forEach(function(_,i){ applyCard(i); }); }

  // analytics: one video-play event per video per pageview
  cards.forEach(function(c){
    var v = c.querySelector('.qv-player');
    v.addEventListener('play', function(){
      if (v.__umamiPlayed) return; v.__umamiPlayed = true;
      if (window.umami) umami.track('video-play', { title: (c.querySelector('.qv-title').textContent || '').trim() });
    });
  });
  applyAll();

  // edit toggle
  var editing = false;
  if (editBtn) editBtn.addEventListener('click', function(){
    editing = !editing;
    editBtn.classList.toggle('active', editing);
    editBtn.setAttribute('aria-expanded', editing ? 'true' : 'false');
    editLabel.textContent = editing ? 'Done editing' : 'Edit videos';
    cards.forEach(function(c,i){
      c.querySelector('.qv-editor').hidden = !editing;
      if(editing){
        var st = state[i] || {};
        c.querySelector('.qv-src').value = st.src || '';
        c.querySelector('.qv-ttl').value = (st.title != null && st.title !== '') ? st.title : defaults[i];
      }
    });
  });

  // per-card actions (editor controls exist only when the admin gate is on)
  cards.forEach(function(c,i){
    var video = c.querySelector('.qv-player'), ph = c.querySelector('.qv-ph');
    if (!c.querySelector('.qv-editor')) return;
    c.querySelector('.qv-pick').addEventListener('change', function(e){
      var f = e.target.files && e.target.files[0];
      if(!f) return;
      if(blobs[i]){ try{ URL.revokeObjectURL(blobs[i]); }catch(e2){} }
      blobs[i] = URL.createObjectURL(f);     // local preview ONLY, not persisted
      video.src = blobs[i]; video.hidden = false; ph.hidden = true;
      /* the bar is gated on .has-video; a preview into an empty slot
         needs it too, or the reader gets a film with no controls */
      c.classList.add('has-video');
      var ch = chrome(); if (ch) ch.refresh();
    });
    c.querySelector('.qv-save').addEventListener('click', function(){
      state[i] = { src: c.querySelector('.qv-src').value.trim(), title: c.querySelector('.qv-ttl').value.trim() };
      save();
      applyCard(i);
    });
    c.querySelector('.qv-clear').addEventListener('click', function(){
      state[i] = { src:'', title:'' };
      save();
      if(blobs[i]){ try{ URL.revokeObjectURL(blobs[i]); }catch(e3){} delete blobs[i]; }
      c.querySelector('.qv-src').value = ''; c.querySelector('.qv-ttl').value = defaults[i];
      applyCard(i);
    });
  });

  return { cards: cards, apply: applyAll };
}
