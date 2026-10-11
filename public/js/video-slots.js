// ============================================================
// Video slots: the source, title, poster and editor engine behind
// quantum's film device, extracted 2026-10-10 so a second device on
// the same page (the Oct 8 L1 block's "Hear it from Eli Ben-Sasson" grid) runs the
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
//
// PUBLISH MODE (2026-10-11, the L1 grid only): a device that passes
//   publish       { set: 'quantumL1', file: '/data/videos.json' }
//   seeds         an ARRAY of { src, poster, title, dur }, the inline
//                 copy the build writes from that file
//   onPublished   called after the published set changes in place
// reads data/videos.json as the published version, the way the news
// panels read data/news.json, and gets a PUBLISH button. Entry n plays
// in slot n. localStorage then holds only an UNSAVED LOCAL DRAFT, the
// whole set, applied only while the admin gate is on and flagged with
// news's "Unsaved local draft" pill until it is published or reset.
// Nothing is prefilled into storage, so a reader's storage can never
// stand in for the published set.
// ============================================================
// thSlotApply(card, o): the one place a slot's video, placeholder, bar
// gate, length hint, poster and title are set, for every device that
// runs on thVideoSlots. o = { live, title, dur, poster }.
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
  var pub = cfg.publish || null;
  var published = pub ? toSlots(seeds) : null; // publish mode: the published set, keyed by slot
  var pubBar = null;

  // Video editor UI exists ONLY when the admin gate is on
  if (window.ADMIN_GATE) {
    var qvEd = function(ph){ return '<div class="qv-editor" hidden>' +
      '<div class="qv-fld"><label>Video source (' + (pub ? 'R2 URL' : 'path or URL') + ')</label><input type="text" class="qv-src" placeholder="' + R2 + ph + (pub ? '' : ' or a local path') + '"></div>' +
      '<div class="qv-fld"><label>Title</label><input type="text" class="qv-ttl" placeholder="Video title"' + (pub ? ' maxlength="120"' : '') + '></div>' +
      (pub ?
        '<div class="qv-fld"><label>Poster (R2 URL, optional)</label><input type="text" class="qv-poster" placeholder="' + R2 + ph.replace(/\.mp4$/, '.jpg') + '"></div>' +
        '<div class="qv-fld qv-dur-fld"><label>Length (seconds)</label><input type="text" class="qv-dur" inputmode="numeric" placeholder="Read from the file"><div class="qv-note qv-dur-note" aria-live="polite">Read from the file when you paste its URL. You can type over it.</div></div>'
      : '') +
      '<div class="qv-fld qv-file"><label>Pick a local file (preview only)</label><input type="file" accept="video/*" class="qv-pick"><div class="qv-note">' + (pub ? 'Local preview only. To publish, upload the file to R2 and paste its URL above.' : 'Local preview only. To publish, add the file to the project and set its path above.') + '</div></div>' +
      '<div class="qv-actions"><button type="button" class="qv-btn primary qv-save">Save</button><button type="button" class="qv-btn qv-clear">Clear</button></div>' +
    '</div>'; };
    var host = cfg.editHost || grid;
    host.insertAdjacentHTML('beforeend', '<div class="th-pm-vid-admin"><button type="button" class="news-edit-btn" aria-expanded="false"><i class="ti ti-pencil" aria-hidden="true"></i> <span>Edit videos</span></button>' +
      (pub ?
        '<span class="ne-draft-pill qv-draft-pill" hidden><i class="ti ti-alert-triangle" aria-hidden="true"></i> Unsaved local draft</span>' +
        '<button type="button" class="news-edit-btn qv-publish" hidden><i class="ti ti-cloud-upload" aria-hidden="true"></i> <span>Publish</span></button>' +
        '<button type="button" class="news-edit-btn qv-reset" hidden><i class="ti ti-refresh" aria-hidden="true"></i> <span>Reset to published</span></button>' +
        '<span class="qv-pub-status" role="status" hidden></span>'
      : '') + '</div>');
    pubBar = host.lastElementChild;
    editBtn = pubBar.querySelector('button');
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
  var state;
  if (pub) {
    /* publish mode: the draft is the whole set, read only for the
       editor; without the gate, or without a draft, the published set */
    var draft = null;
    if (window.ADMIN_GATE) { try { if (localStorage.getItem(KEY) != null) draft = load(); } catch (e) {} }
    state = draft || published.slice();
  } else {
    state = load(); // [{ src, title }]

    // one-time prefill per slot; only when the slot has never been saved or cleared
    var seeded = false;
    Object.keys(seeds).forEach(function(k){ if(state[k] == null){ state[k] = seeds[k]; seeded = true; } });
    if(seeded) save();
  }

  function chrome(){ return cfg.chrome ? cfg.chrome() : null; }

  function applyCard(i){
    var st = state[i] || {};
    var live = blobs[i] || (st.src || '');   // prefer session preview, else saved path/URL
    /* the length hint and the poster travel with the seeded file and
       nothing else: a slot pointing at a custom URL or a local preview
       has no known length, and printing the seed's would be printing a
       wrong number; the poster is that film's own frame */
    var sd = pub ? st : seeds[i];
    var isSeed = !!(sd && sd.src && live === sd.src);
    thSlotApply(cards[i], {
      live: live,
      title: (st.title != null && st.title !== '') ? st.title : defaults[i],
      /* publish mode: an entry carries its own length and frame */
      dur: isSeed ? (pub ? (parseInt(sd.dur, 10) || 0) : sd.dur) : 0,
      poster: isSeed ? (pub ? (sd.poster || '') : posters[i]) : ''
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
    if (pub) {
      pubBar.querySelector('.qv-publish').hidden = !editing;
      pubBar.querySelector('.qv-reset').hidden = !editing;
    }
    cards.forEach(function(c,i){
      c.querySelector('.qv-editor').hidden = !editing;
      if(editing) fillEditor(c, i);
    });
  });
  function fillEditor(c, i){
    var st = state[i] || {};
    c.querySelector('.qv-src').value = st.src || '';
    c.querySelector('.qv-ttl').value = (st.title != null && st.title !== '') ? st.title : defaults[i];
    if (pub) {
      c.querySelector('.qv-poster').value = st.poster || '';
      c.querySelector('.qv-dur').value = st.dur ? String(st.dur) : '';
    }
  }
  /* what a card's fields hold, in the shape its mode stores */
  function readEditor(c){
    var o = { src: c.querySelector('.qv-src').value.trim(), title: c.querySelector('.qv-ttl').value.trim() };
    if (pub) {
      o.poster = c.querySelector('.qv-poster').value.trim();
      var d = c.querySelector('.qv-dur').value.trim();
      o.dur = /^\d+$/.test(d) ? parseInt(d, 10) : (d ? d : 0);
    }
    return o;
  }

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
      state[i] = readEditor(c);
      save();
      applyCard(i);
      syncDraft();
    });
    c.querySelector('.qv-clear').addEventListener('click', function(){
      state[i] = pub ? {} : { src:'', title:'' };
      save();
      if(blobs[i]){ try{ URL.revokeObjectURL(blobs[i]); }catch(e3){} delete blobs[i]; }
      c.querySelector('.qv-src').value = ''; c.querySelector('.qv-ttl').value = defaults[i];
      if (pub) { c.querySelector('.qv-poster').value = ''; c.querySelector('.qv-dur').value = ''; }
      applyCard(i);
      syncDraft();
    });
    if (pub) watchLength(c);
  });

  // ---------- publish mode ----------
  /* the inline or fetched set, entry n into slot n */
  function toSlots(list){
    var out = [];
    if (Array.isArray(list)) list.forEach(function(e, n){ if (e && e.src) out[n] = { src: e.src, poster: e.poster || '', title: e.title || '', dur: e.dur || 0 }; });
    else Object.keys(list || {}).forEach(function(k){ out[+k] = list[k]; });
    return out;
  }
  /* the set as the file stores it: filled slots in slot order */
  function toEntries(slots){
    var out = [];
    for (var n = 0; n < cards.length; n++) {
      var e = slots[n];
      if (!e || !e.src) continue;
      var o = { src: e.src };
      if (e.poster) o.poster = e.poster;
      o.title = e.title || '';
      o.dur = e.dur;
      out.push(o);
    }
    return out;
  }
  function hasDraft(){ try { return localStorage.getItem(KEY) != null; } catch (e) { return false; } }
  function syncDraft(){
    if (!pub || !pubBar) return;
    var pill = pubBar.querySelector('.qv-draft-pill');
    if (pill) pill.hidden = !hasDraft();
  }
  function setPublished(list){
    published = toSlots(list);
    if (!(window.ADMIN_GATE && hasDraft())) state = published.slice();
    applyAll();
    if (editing) cards.forEach(function(c, i){ fillEditor(c, i); });
    syncDraft();
    if (cfg.onPublished) cfg.onPublished();
  }

  /* THE LENGTH IS READ FROM THE FILE (2026-10-11): pasting a URL loads
     only that file's metadata (preload=metadata, a few KB from the head
     of the MP4) in a detached element, admin only, and writes the length
     FLOORED, the rule the seeds follow (the bar formats with
     Math.floor). The field stays editable: a value typed after the read
     is what gets saved. */
  function watchLength(c){
    var srcIn = c.querySelector('.qv-src'), durIn = c.querySelector('.qv-dur'), note = c.querySelector('.qv-dur-note');
    var last = '', timer = 0, probe = null;
    function stop(){ if (probe) { probe.onloadedmetadata = probe.onerror = null; probe.removeAttribute('src'); try { probe.load(); } catch (e) {} probe = null; } }
    function read(){
      var url = srcIn.value.trim();
      if (url === last) return;
      last = url; stop();
      if (!/^https:\/\//.test(url)) { if (url) note.textContent = 'Paste an https URL to read its length.'; return; }
      note.textContent = 'Reading the length from the file...';
      var v = probe = document.createElement('video');
      v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = function(){
        if (probe !== v) return;
        var d = Math.floor(v.duration);
        if (isFinite(d) && d > 0) {
          durIn.value = String(d);
          note.textContent = 'Read from the file: ' + Math.floor(d / 60) + ':' + ('0' + d % 60).slice(-2) + ' (' + d + ' s). You can type over it.';
        } else note.textContent = 'The file did not report a length. Enter it in seconds.';
        stop();
      };
      v.onerror = function(){ if (probe !== v) return; note.textContent = 'Could not read this file. Check the URL, or enter the length in seconds.'; stop(); };
      v.src = url;
    }
    srcIn.addEventListener('input', function(){ clearTimeout(timer); timer = setTimeout(read, 500); });
    srcIn.addEventListener('change', function(){ clearTimeout(timer); read(); });
    /* opening the editor fills the field from storage: that is not a paste */
    editBtn.addEventListener('click', function(){ last = srcIn.value.trim(); });
  }

  if (pub && pubBar) {
    var status = pubBar.querySelector('.qv-pub-status');
    var say = function(t){ status.textContent = t; status.hidden = !t; };
    pubBar.querySelector('.qv-reset').addEventListener('click', function(){
      if (!window.confirm('Discard the unsaved local draft in this browser and go back to the published videos?')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = published.slice();
      cards.forEach(function(c, i){
        if (blobs[i]) { try { URL.revokeObjectURL(blobs[i]); } catch (e2) {} delete blobs[i]; }
        fillEditor(c, i);
      });
      applyAll(); syncDraft(); say('');
      if (cfg.onPublished) cfg.onPublished();
    });
    /* the same passphrase flow as the news panels: the key is asked once
       and kept under news's own store, dropped again on a 401 */
    var PUBLISH_KEY_STORE = 'news_publish_key';
    pubBar.querySelector('.qv-publish').addEventListener('click', function(){
      var btn = this;
      /* Publish takes what the open fields say, so a card edited and not
         saved is not silently left out */
      cards.forEach(function(c, i){ state[i] = readEditor(c); });
      save(); applyAll(); syncDraft();
      var entries = toEntries(state);
      var bad = [];
      for (var n = 0; n < cards.length; n++) {
        var e = state[n];
        if (!e || !e.src) continue;
        var slot = 'Slot ' + ('0' + (n + 1)).slice(-2) + ': ';
        if (!e.title) bad.push(slot + 'title is missing');
        if (!(typeof e.dur === 'number' && e.dur > 0)) bad.push(slot + 'length must be a whole number of seconds');
      }
      if (bad.length) { window.alert('Not published:\n' + bad.join('\n')); return; }
      if (!entries.length && !window.confirm('Publish with no videos? This removes every film from this block for all readers.')) return;
      var key = '';
      try { key = localStorage.getItem(PUBLISH_KEY_STORE) || ''; } catch (e) {}
      if (!key) {
        key = window.prompt('Publish key:') || '';
        if (!key) return;
        try { localStorage.setItem(PUBLISH_KEY_STORE, key); } catch (e) {}
      }
      var payload = { videos: {} };
      payload.videos[pub.set] = entries;
      var orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="ti ti-cloud-upload" aria-hidden="true"></i> <span>Publishing...</span>';
      say('');
      fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Publish-Key': key },
        body: JSON.stringify(payload)
      })
        .then(function(r){ return r.json().then(function(d){ return { status: r.status, d: d }; }, function(){ return { status: r.status, d: null }; }); })
        .then(function(res){
          if (res.status === 200 && res.d && res.d.ok) {
            try { localStorage.removeItem(KEY); } catch (e) {}
            var sha = String(res.d.commit || '').slice(0, 7);
            setPublished(entries); // the grid keeps showing exactly what was published
            say('Published ' + sha + '. The site is rebuilding; this is usually live in one to two minutes.');
            if (window.umami) umami.track('videos-publish', { set: pub.set, count: entries.length });
            window.alert('Published (commit ' + sha + '). The site is rebuilding; the change is usually live in one to two minutes.');
          } else {
            var msg = (res.d && res.d.error) || ('HTTP ' + res.status);
            if (res.status === 401) {
              try { localStorage.removeItem(PUBLISH_KEY_STORE); } catch (e) {}
              window.alert('Publish failed: ' + msg + '\nNothing was published; your local draft is intact. You will be asked for the key again on the next attempt.');
            } else {
              window.alert('Publish failed: ' + msg + '\nNothing was published; your local draft is intact.');
            }
          }
        })
        .catch(function(){ window.alert('Publish failed: network error.\nNothing was published; your local draft is intact.'); })
        .then(function(){ btn.disabled = false; btn.innerHTML = orig; });
    });
  }

  if (pub) {
    syncDraft();
    /* the published file wins over the inline copy, which is the last
       build's; identical (the normal case) changes nothing, and a failed
       fetch keeps the inline copy, so there is never an empty flash */
    fetch(pub.file + '?_=' + Date.now())
      .then(function(r){ if (!r.ok) throw new Error(pub.file + ' ' + r.status); return r.json(); })
      .then(function(all){
        var list = all && all[pub.set];
        if (!Array.isArray(list)) return;
        if (JSON.stringify(toEntries(toSlots(list))) === JSON.stringify(toEntries(published))) return;
        setPublished(list);
      })
      .catch(function(){});
  }

  return { cards: cards, apply: applyAll };
}
