// ============================================================
// Custom media control bar (vctl-), extracted from privacy's
// section 02 player so quantum's films reuse one implementation
// instead of carrying a second copy of it.
//
// The native control bar is replaced so the player speaks the
// page's language: accent fill, hairline rail, mono tabular
// timecodes, inline SVG icons at the site's stroke weight, two
// rows over a bottom scrim so they stay legible on any frame.
//
// THE PAGE OWNS THE CSS, THIS OWNS THE BEHAVIOUR. Every class
// name here is shared (.vctl-*), but the colours come from
// whatever the page's own rules resolve them to: privacy maps
// --em to var(--accent) and gets emerald, quantum maps it to the
// same and gets blue. There is no colour anywhere in this file,
// which is the point: page accent in, matching chrome out.
//
// The page passes its own DOM names, following the thStickyRail
// precedent, so neither page's markup contract moves:
//   root        the element that owns the players
//   slots       selector for the per-video slot inside root
//   indexKey    dataset key on a slot holding its 0-based index
//   steps       the elements previous/next click to change video
//   fullscreen  the element that goes fullscreen
//   noun        'video' or 'film', for the transport's labels
//
// FULLSCREEN TAKES A PARENT, NEVER A SLOT'S OWN FRAME. Privacy
// documented that trap on 2026-08-13 after shipping it: prev and
// next swap which slot is displayed, and an element that has just
// been display:none leaves an empty screen showing the page
// behind. Passing it in keeps the choice with the page that knows
// which parent survives a switch.
//
// NOTHING LOADS UNTIL THE READER ASKS, and that is enforced here
// rather than trusted to the markup. Both pages shipped
// preload="metadata", which sounds cheap and is not: measured
// cold on 2026-08-21 against the R2 bucket, Chrome pulled the
// whole of every file before anyone pressed anything, 50.9MB on
// quantum and 90.6MB on privacy. The files are not faststart, so
// there is no cheap prefix to fetch: asking for metadata asks for
// the file. So preload is forced to 'none' and the total timecode
// comes from data-dur, a measured length in seconds the page
// supplies, until real metadata arrives and replaces it. A scrub
// counts as asking: dragging the rail before playback starts
// triggers the load and the seek is applied when it lands.
// ============================================================
function thVideoChrome(cfg) {
  var root = cfg.root;
  if (!root) return null;
  var slots = [].slice.call(root.querySelectorAll(cfg.slots));
  var steps = cfg.steps ? [].slice.call(cfg.steps) : [];
  var fsTarget = cfg.fullscreen || root;
  var noun = cfg.noun || 'video';
  if (!slots.length || !steps.length) return null;

  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  var IDLE_MS = 2500, STEP = 5;
  var I = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 5.5v13L9 12l9.5-6.5z" fill="currentColor" stroke="none"/><path d="M5.8 5.2v13.6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 5.5v13L15 12 5.5 5.5z" fill="currentColor" stroke="none"/><path d="M18.2 5.2v13.6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 4.9v14.2L19.4 12 7.5 4.9z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.6" y="5" width="3.6" height="14" rx="1"/><rect x="13.8" y="5" width="3.6" height="14" rx="1"/></svg>',
    vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9.2h3.2L12 5.4v13.2L7.7 14.8H4.5z"/><path d="M15.6 9.4a3.7 3.7 0 0 1 0 5.2"/><path d="M18.1 6.9a7.2 7.2 0 0 1 0 10.2"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9.2h3.2L12 5.4v13.2L7.7 14.8H4.5z"/><path d="m16.2 9.8 4.4 4.4M20.6 9.8l-4.4 4.4"/></svg>',
    fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/></svg>',
    fsx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5"/></svg>'
  };
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function spoken(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ' minute' + (m === 1 ? '' : 's') + ' ' + sec + ' second' + (sec === 1 ? '' : 's');
  }

  var entries = [];

  slots.forEach(function (slot) {
    var index = +slot.dataset[cfg.indexKey];
    var frame = slot.querySelector('.frame');
    var v = slot.querySelector('.qv-player');
    if (!frame || !v) return;

    /* forced here, not trusted to the markup: see the note above on
       what preload="metadata" actually costs against this bucket */
    v.preload = 'none';

    var bar = document.createElement('div');
    bar.className = 'vctl';
    bar.innerHTML =
      '<div class="vctl-prog">' +
        '<span class="vctl-t is-cur">0:00</span>' +
        '<div class="vctl-track" role="slider" tabindex="0" aria-label="Seek" ' +
             'aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0 minutes 0 seconds">' +
          '<span class="vctl-rail"></span><span class="vctl-fill"></span><span class="vctl-handle"></span>' +
        '</div>' +
        '<span class="vctl-t is-dur">0:00</span>' +
      '</div>' +
      '<div class="vctl-btns">' +
        '<button type="button" class="vctl-b is-prev" aria-label="Previous ' + noun + '">' + I.prev + '</button>' +
        '<button type="button" class="vctl-b vctl-play is-play" aria-label="Play">' + I.play + '</button>' +
        '<button type="button" class="vctl-b is-next" aria-label="Next ' + noun + '">' + I.next + '</button>' +
        '<button type="button" class="vctl-b is-mute" aria-label="Mute">' + I.vol + '</button>' +
        '<span class="vctl-right">' +
          '<button type="button" class="vctl-b is-fs" aria-label="Enter fullscreen">' + I.fs + '</button>' +
        '</span>' +
      '</div>';
    frame.appendChild(bar);

    var cur = bar.querySelector('.is-cur'), dur = bar.querySelector('.is-dur');
    var track = bar.querySelector('.vctl-track'), fill = bar.querySelector('.vctl-fill');
    var handle = bar.querySelector('.vctl-handle');
    var bPlay = bar.querySelector('.is-play'), bPrev = bar.querySelector('.is-prev');
    var bNext = bar.querySelector('.is-next'), bMute = bar.querySelector('.is-mute');
    var bFs = bar.querySelector('.is-fs');

    /* prev and next clamp: at either end the button is disabled rather
       than wrapping, so the set reads as ordered */
    bPrev.disabled = index === 0;
    bNext.disabled = index === steps.length - 1;

    /* the length the bar is allowed to claim: what the media reports
       once it is loaded, otherwise the page's measured hint, otherwise
       nothing. The hint is display and announcement only; a real seek
       still waits for real media, which is what pending covers. */
    function length() {
      if (isFinite(v.duration) && v.duration > 0) return v.duration;
      var hint = parseFloat(v.dataset.dur || '');
      return isFinite(hint) && hint > 0 ? hint : 0;
    }

    function paint() {
      var d = length();
      var pct = d ? (v.currentTime / d) * 100 : 0;
      fill.style.width = pct + '%';
      handle.style.left = pct + '%';
      cur.textContent = fmt(v.currentTime);
      dur.textContent = fmt(d);
      track.setAttribute('aria-valuemax', String(Math.floor(d)));
      track.setAttribute('aria-valuenow', String(Math.floor(v.currentTime)));
      track.setAttribute('aria-valuetext', spoken(v.currentTime) + ' of ' + spoken(d));
    }
    function syncPlay() {
      var playing = !v.paused && !v.ended;
      bPlay.innerHTML = playing ? I.pause : I.play;
      bPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      if (!playing) show(); else idle();
    }
    function syncMute() {
      bMute.innerHTML = v.muted ? I.mute : I.vol;
      bMute.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute');
    }

    /* auto-hide only while playing; any pointer or focus activity inside
       the frame brings the bar back for another full interval */
    var idleTimer = null;
    function show() { frame.classList.remove('is-idle'); if (idleTimer) clearTimeout(idleTimer); idleTimer = null; }
    function idle() {
      show();
      if (v.paused || v.ended) return;
      idleTimer = setTimeout(function () { frame.classList.add('is-idle'); }, IDLE_MS);
    }
    frame.addEventListener('pointermove', idle);
    frame.addEventListener('pointerleave', function () { if (!v.paused && !v.ended) frame.classList.add('is-idle'); });
    frame.addEventListener('focusin', show);
    frame.addEventListener('pointerdown', idle);

    /* a seek requested before the media exists: remember the fraction,
       start the load, apply it when the real length is known */
    var pending = null;
    v.addEventListener('loadedmetadata', function () {
      if (pending !== null && isFinite(v.duration)) {
        v.currentTime = pending * v.duration;
        pending = null;
      }
      paint();
    });
    v.addEventListener('timeupdate', paint);
    v.addEventListener('durationchange', paint);
    v.addEventListener('play', syncPlay);
    v.addEventListener('pause', syncPlay);
    v.addEventListener('ended', syncPlay);
    v.addEventListener('volumechange', syncMute);

    function toggle() { if (v.paused || v.ended) { v.play(); } else { v.pause(); } }
    bPlay.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    /* Space and Enter reach the player itself, which is focusable */
    v.addEventListener('keydown', function (ev) {
      if (ev.key === ' ' || ev.key === 'Spacebar' || ev.key === 'Enter') { ev.preventDefault(); toggle(); }
    });
    bMute.addEventListener('click', function () { v.muted = !v.muted; });
    /* stepping delegates to whatever the page already uses to change
       video, so one selection state serves both the page's own selector
       and this transport and they cannot drift apart */
    bPrev.addEventListener('click', function () { if (index > 0) steps[index - 1].click(); });
    bNext.addEventListener('click', function () { if (index < steps.length - 1) steps[index + 1].click(); });

    bFs.addEventListener('click', function () {
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else { (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen).call(fsTarget); }
    });
    /* every slot runs this on every fullscreenchange, so the bar the
       reader lands on after a switch never claims "Enter fullscreen"
       from inside one */
    function syncFs() {
      var on = fsEl() === fsTarget;
      bFs.innerHTML = on ? I.fsx : I.fs;
      bFs.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
    }
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);

    /* seek: click the rail, drag the handle, or use the keys */
    function seekTo(clientX) {
      var r = track.getBoundingClientRect();
      var d = length();
      if (!d || !r.width) return;
      var pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      if (isFinite(v.duration) && v.duration > 0) {
        v.currentTime = pct * d;
        paint();
      } else {
        pending = pct;            // the reader has asked, so now we load
        v.load();
      }
    }
    track.addEventListener('pointerdown', function (ev) {
      if (ev.button != null && ev.button !== 0) return;
      track.classList.add('is-drag');
      track.setPointerCapture && track.setPointerCapture(ev.pointerId);
      seekTo(ev.clientX);
      ev.preventDefault();
    });
    track.addEventListener('pointermove', function (ev) {
      if (track.classList.contains('is-drag')) seekTo(ev.clientX);
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      track.addEventListener(t, function () { track.classList.remove('is-drag'); });
    });
    track.addEventListener('keydown', function (ev) {
      var d = length();
      if (!d) return;
      var k = ev.key, t = null;
      if (k === 'ArrowRight' || k === 'ArrowUp') t = Math.min(d, v.currentTime + STEP);
      else if (k === 'ArrowLeft' || k === 'ArrowDown') t = Math.max(0, v.currentTime - STEP);
      else if (k === 'Home') t = 0;
      else if (k === 'End') t = d;
      if (t === null) return;
      ev.preventDefault();
      if (isFinite(v.duration) && v.duration > 0) { v.currentTime = t; }
      else { pending = d ? t / d : 0; v.load(); }
      paint();
      idle();
    });

    paint(); syncPlay(); syncMute(); syncFs();
    entries.push({ slot: slot, video: v, bar: bar, index: index, paint: paint });
  });

  return {
    slots: entries,
    /* the page calls this after it changes a slot's source, so the total
       timecode reflects the new media's hint instead of the old one's.
       Repainting is enough: paint() already reads the length through the
       same fallback, so there is no second copy of that rule here. */
    refresh: function () { entries.forEach(function (e) { e.paint(); }); }
  };
}
