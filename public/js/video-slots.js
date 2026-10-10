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
// ============================================================
// thSlotApply(card, o): the one place a slot's video, placeholder, bar
// gate, length hint, poster and title are set. Used by thVideoSlots
// (fixed slots) and thVideoPlaylist (a list), so both devices follow
// the same rules. o = { live, title, dur, poster }.
// ============================================================
function thSlotApply(c, o) {
  var video = c.querySelector('.qv-player'), ph = c.querySelector('.qv-ph');
  c.querySelector('.qv-title').textContent = o.title || '';
  if (o.live) { video.src = o.live; video.hidden = false; ph.hidden = true; }
  else {
    video.removeAttribute('src'); try { video.load(); } catch (e) {} video.hidden = true;
    /* AN EMPTY SLOT RENDERS NOTHING (2026-09-09). "No video set" used to
       show to every reader, and because the placeholder shipped visible in
       the markup it also showed with JS disabled and flashed before this
       engine ran. It is an EDITOR affordance now: revealed only when the
       admin gate is on, hidden for everyone else. */
    ph.hidden = !window.ADMIN_GATE;
  }
  /* gates the custom control bar: no source, no chrome (see the vctl CSS) */
  c.classList.toggle('has-video', !!o.live);
  if (o.dur) video.dataset.dur = String(o.dur);
  else video.removeAttribute('data-dur');
  if (o.poster) video.setAttribute('poster', o.poster);
  else video.removeAttribute('poster');
}

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
    var st = state[i] || {};
    var live = blobs[i] || (st.src || '');   // prefer session preview, else saved path/URL
    /* the length hint and the poster travel with the seeded file and
       nothing else: a slot pointing at a custom URL or a local preview
       has no known length, and printing the seed's would be printing a
       wrong number; the poster is that film's own frame */
    var sd = seeds[i];
    var isSeed = !!(sd && live === sd.src);
    thSlotApply(cards[i], {
      live: live,
      title: (st.title != null && st.title !== '') ? st.title : defaults[i],
      dur: isSeed ? sd.dur : 0,
      poster: isSeed ? posters[i] : ''
    });
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

// ============================================================
// thVideoPlaylist(cfg): the same device driven by a LIST instead of
// fixed slots (2026-10-10, the L1 block's "Eli on video"). It builds
// one chapter per entry and hands the rest to the shared parts:
// initQw (js/selector-panel.js) for the chapter pills and stepping,
// thVideoChrome (js/video-chrome.js) for the bar, thSlotApply above
// for each slot. Markup it expects inside cfg.root:
//   .qw-rail (pills) and .qw-shell > .qw-panel (chapters).
//   root      the .qw root
//   key       localStorage key for the editor's local draft
//   seeds     ARRAY of { src, title, poster, dur }: the committed list,
//             what readers see. dur is floored seconds, as everywhere.
//   editHost  where EDIT VIDEOS goes (admin gate only)
//   noun      'video' or 'film'
//   onRender  called with the rendered count after each render
// EDIT VIDEOS adds and removes entries (source, title, poster) as a
// LOCAL DRAFT in this browser, a preview: readers see only seeds.
// ============================================================
function thVideoPlaylist(cfg) {
  var root = cfg.root;
  if (!root) return null;
  var rail = root.querySelector('.qw-rail'), panel = root.querySelector('.qw-panel');
  var seeds = cfg.seeds || [];
  var R2 = 'https://pub-3274162cfa1d48728621d5ec2d0906ad.r2.dev/';
  var session = null;   // the saved draft plus this tab's local-file previews
  var chromeObj = null;

  function clone(e){ return { src: e.src || '', title: e.title || '', poster: e.poster || '' }; }
  function draft(){ try { var a = JSON.parse(localStorage.getItem(cfg.key) || 'null'); return Array.isArray(a) ? a : null; } catch (e) { return null; } }
  function items(){ return session || (draft() || seeds).map(clone); }
  function seedFor(src){ for (var i = 0; i < seeds.length; i++) if (seeds[i].src && seeds[i].src === src) return seeds[i]; return null; }
  function two(n){ return (n < 10 ? '0' : '') + n; }
  function mmss(t){ var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function el(tag, cls, attrs){ var e = document.createElement(tag); if (cls) e.className = cls; for (var k in attrs || {}) e.setAttribute(k, attrs[k]); return e; }

  function render(){
    var list = items();
    /* the admin with nothing listed still sees one empty frame and "No
       video set", which is what an empty slot shows in the fixed device */
    var shown = list.length ? list : (window.ADMIN_GATE ? [{ src: '', title: '', poster: '' }] : []);
    rail.innerHTML = ''; panel.innerHTML = '';
    var pills = [], cards = [];
    shown.forEach(function(it, i){
      var on = i === 0;
      var pill = el('button', 'qw-ped', { type: 'button', role: 'tab', 'data-ch': i, 'aria-selected': on ? 'true' : 'false',
        'aria-controls': panel.id, tabindex: on ? '0' : '-1' });
      if (it.title) pill.setAttribute('aria-label', two(i + 1) + ', ' + it.title);
      var lab = el('span', 'qw-label'); lab.textContent = two(i + 1); pill.appendChild(lab);
      rail.appendChild(pill); pills.push(pill);

      var card = el('article', 'qw-ch th-pm-vcard' + (on ? ' is-on' : ''), { 'data-ch': i, 'data-qv': i });
      var frame = el('div', 'frame');
      var ph = el('div', 'qv-ph'); ph.hidden = true;
      ph.innerHTML = '<i class="ti ti-movie" aria-hidden="true"></i><span>No video set</span>';
      var v = el('video', 'qv-player', { tabindex: '0', preload: 'none', playsinline: '' }); v.hidden = true;
      frame.appendChild(ph); frame.appendChild(v); card.appendChild(frame);
      var meta = el('div', 'meta');
      var strip = el('div', 'qv-strip'); var num = el('span', 'qv-num'); strip.appendChild(num); meta.appendChild(strip);
      meta.appendChild(el('h4', 'qv-title'));
      card.appendChild(meta);
      panel.appendChild(card); cards.push(card);

      var live = it.blob || it.src;
      var sd = seedFor(it.src);
      var isSrc = !!(live && live === it.src);
      var dur = (sd && isSrc && sd.dur) ? sd.dur : 0;
      num.textContent = two(i + 1) + (dur ? ' · ' + mmss(dur) : '');
      thSlotApply(card, { live: live, title: it.title, dur: dur, poster: isSrc ? it.poster : '' });
      v.addEventListener('play', function(){
        if (v.__umamiPlayed) return; v.__umamiPlayed = true;
        if (window.umami) umami.track('video-play', { title: (it.title || '').trim() });
      });
    });
    /* one entry, no pills: a single pill selects nothing */
    rail.hidden = shown.length < 2;
    if (shown.length) {
      chromeObj = thVideoChrome({ root: root, slots: '.th-pm-vcard', indexKey: 'qv',
        steps: pills, fullscreen: panel, noun: cfg.noun || 'video' });
      /* leaving a chapter pauses its film, the main device's hush rule.
         On the pick itself, not after it: thMorph swaps chapters only
         after its fade, so a check on the next tick still finds the old
         chapter selected. Pills, arrow keys and the bar's prev and next
         all arrive here. */
      if (shown.length > 1 && window.initQw) initQw(root, function(k){
        root.querySelectorAll('.qw-ch').forEach(function(c){
          if (+c.dataset.ch === k) return;
          var v = c.querySelector('.qv-player');
          if (v && !v.paused) { try { v.pause(); } catch (e) {} }
        });
      });
    }
    if (cfg.onRender) cfg.onRender(list.length);
  }

  // ---------- the list editor (admin gate only) ----------
  if (window.ADMIN_GATE && cfg.editHost) {
    cfg.editHost.insertAdjacentHTML('beforeend', '<div class="th-pm-vid-admin"><button type="button" class="news-edit-btn" aria-expanded="false"><i class="ti ti-pencil" aria-hidden="true"></i> <span>Edit videos</span></button></div>');
    var editBtn = cfg.editHost.lastElementChild.querySelector('button');
    var ed = el('div', 'qv-editor qv-pl-editor'); ed.hidden = true;
    root.appendChild(ed);
    var editing = false;
    function row(it){
      var r = el('div', 'qv-pl-row');
      r.innerHTML =
        '<div class="qv-fld"><label>Video source (path or URL)</label><input type="text" class="qv-src" placeholder="' + R2 + 'eli-l1-N.mp4 or a local path"></div>' +
        '<div class="qv-fld"><label>Title</label><input type="text" class="qv-ttl" placeholder="Video title"></div>' +
        '<div class="qv-fld"><label>Poster (path or URL, optional)</label><input type="text" class="qv-pst" placeholder="assets/posters/..."></div>' +
        '<div class="qv-fld qv-file"><label>Pick a local file (preview only)</label><input type="file" accept="video/*" class="qv-pick"></div>' +
        '<div class="qv-actions"><button type="button" class="qv-btn qv-rm">Remove</button></div>';
      r.querySelector('.qv-src').value = it.src || '';
      r.querySelector('.qv-ttl').value = it.title || '';
      r.querySelector('.qv-pst').value = it.poster || '';
      r.__blob = it.blob || null;
      r.querySelector('.qv-pick').addEventListener('change', function(e){
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        if (r.__blob) { try { URL.revokeObjectURL(r.__blob); } catch (e2) {} }
        r.__blob = URL.createObjectURL(f);   // local preview ONLY, not persisted
      });
      r.querySelector('.qv-rm').addEventListener('click', function(){ r.remove(); });
      return r;
    }
    function fill(){
      ed.innerHTML = '<div class="qv-pl-rows"></div>' +
        '<div class="qv-note">Local preview only, in this browser. Readers see the list committed in the page (the seeds).</div>' +
        '<div class="qv-actions"><button type="button" class="qv-btn qv-add">Add video</button><button type="button" class="qv-btn primary qv-save">Save</button><button type="button" class="qv-btn qv-reset">Reset to seeds</button></div>';
      var rows = ed.querySelector('.qv-pl-rows');
      items().forEach(function(it){ rows.appendChild(row(it)); });
      ed.querySelector('.qv-add').addEventListener('click', function(){ rows.appendChild(row({})); });
      ed.querySelector('.qv-save').addEventListener('click', function(){
        var list = [].slice.call(rows.querySelectorAll('.qv-pl-row')).map(function(r){
          return { src: r.querySelector('.qv-src').value.trim(), title: r.querySelector('.qv-ttl').value.trim(),
                   poster: r.querySelector('.qv-pst').value.trim(), blob: r.__blob };
        }).filter(function(e){ return e.src || e.blob; });
        try { localStorage.setItem(cfg.key, JSON.stringify(list.map(clone))); } catch (e) {}
        session = list;
        render();
      });
      ed.querySelector('.qv-reset').addEventListener('click', function(){
        try { localStorage.removeItem(cfg.key); } catch (e) {}
        session = null;
        render(); fill();
      });
    }
    editBtn.addEventListener('click', function(){
      editing = !editing;
      editBtn.classList.toggle('active', editing);
      editBtn.setAttribute('aria-expanded', editing ? 'true' : 'false');
      editBtn.querySelector('span').textContent = editing ? 'Done editing' : 'Edit videos';
      if (editing) fill();
      ed.hidden = !editing;
    });
  }

  return { render: render, count: function(){ return items().length; }, chrome: function(){ return chromeObj; } };
}
