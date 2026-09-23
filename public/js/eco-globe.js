/* Ecosystem hero: a scroll-driven flight through a particle sphere.
   Act 1: a dense shell of ~26k motes with the Starknet mark at its core.
   Act 2: the lens flies into the shell; the motes stream past and thin out.
   Act 3: inside, a starfield with every project and voice scattered through
   it under "Powered by Starknet". strk20 palette only. */
import * as THREE from 'three';

const MOUNT = document.getElementById('ecoGlobe');
if (MOUNT) {
  const ACC = new THREE.Color('#c53400'), WARM = new THREE.Color('#e07a4a'), INK = new THREE.Color('#fafafa');
  const COUNT = matchMedia('(max-width: 860px)').matches ? 14000 : 34000;
  const R = 2.95;  // sphere radius; the camera distance sets how big it reads
const SHELL_Y = -0.55;   // near-centred, just clear of the copy
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  MOUNT.innerHTML =
    '<div class="eg-track"><div class="eg-stick">' +
      '<div class="eg-copy eg-copy-a">' +
        /* THE PAGE'S ONLY h1, and it is injected here (2026-09-09). It used
           to be a <p> so that the pre-rendered directory block could hold the
           h1 instead; that put the page's first heading below the fold, and
           with JS on it was the CLIPPED one, so the only h1 was invisible.
           The directory heading is now an h2 reading "The directory"
           (scripts/build-ecosystem.js), which is why this may carry rank 1
           without duplicating a sentence.
           CONSEQUENCE, deliberate: with JS disabled this element never
           exists, so the page has NO h1 at all and the outline starts at the
           directory's h2. Do not demote this back without moving rank 1
           somewhere that ships in the HTML.
           .eg-h keeps the class-based type (.eg-copy .eg-h and
           #ecoGlobe .vch-title in css/eco-stage.css and css/vesper-chrome.css
           both out-rank the bare h1 rule in css/styles.css), so the tag
           change moves no pixels. */
        '<h1 class="eg-h vch-title">The people building &amp; <em>shaping Starknet</em></h1>' +
        '<p class="vch-sub">Every project, every voice, on one chain.</p>' +
      '</div>' +
      '<div class="eg-copy eg-copy-b"><h2>Powered by Starknet</h2>' +
        '<p>Every project shipping on the network, in one place.</p></div>' +
      '<div class="eg-stats"><div><span>Projects</span><b class="eg-n-p">0</b></div>' +
        '<div><span>Voices</span><b class="eg-n-v">0</b></div></div>' +
      '<div class="eg-hint">Scroll to explore</div>' +
      '<div class="eg-chip"><span class="eg-chip-name"></span><span class="eg-chip-handle"></span><span class="eg-chip-role"></span></div>' +
    '</div></div>';

  const stick = MOUNT.querySelector('.eg-stick');
  const copyA = MOUNT.querySelector('.eg-copy-a'), copyB = MOUNT.querySelector('.eg-copy-b');
  const statsEl = MOUNT.querySelector('.eg-stats'), hintEl = MOUNT.querySelector('.eg-hint');
  const chip = MOUNT.querySelector('.eg-chip');
  const chipName = MOUNT.querySelector('.eg-chip-name'), chipHandle = MOUNT.querySelector('.eg-chip-handle'), chipRole = MOUNT.querySelector('.eg-chip-role');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);   // transparent: the page's ambient backdrop shows through
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stick.insertBefore(renderer.domElement, stick.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 90);
  const shell = new THREE.Group(); shell.position.y = SHELL_Y; scene.add(shell);

  /* ---- the shell: motes on a sphere, a touch of radial jitter so it reads
     as a cloud with a surface rather than as a hard ball ---- */
  {
    const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), siz = new Float32Array(COUNT);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const h1 = Math.abs(Math.sin(i * 127.1) * 43758.5453 % 1);
      const h2 = Math.abs(Math.sin(i * 311.7) * 24634.6345 % 1);
      // jitter off the lattice slot: the bare Fibonacci spiral bands visibly here
      const y = 1 - ((i + h1) / COUNT) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i + h2 * 0.9;
      const jitter = 0.97 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.05;
      const rad = R * jitter;
      pos[i * 3] = Math.cos(th) * rr * rad;
      pos[i * 3 + 1] = y * rad;
      pos[i * 3 + 2] = Math.sin(th) * rr * rad;
      const t = Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1);
      c.copy(t > 0.62 ? INK : t > 0.3 ? WARM : ACC).multiplyScalar(0.72 + t * 0.6);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      siz[i] = 0.6 + t * 1.05;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: { uPix: { value: 1 }, uFade: { value: 1 }, uH: { value: 900 } },
      vertexShader: `attribute float aSize; varying vec3 vC; varying float vF;
        uniform float uPix; uniform float uH;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);
          float d = -mv.z; vF = smoothstep(0.5, 3.0, d) * (1.0 - smoothstep(16.0, 26.0, d));
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(1.0, aSize * uPix * (uH/900.0) * (12.0 / max(d, 0.5))); }`,
      fragmentShader: `varying vec3 vC; varying float vF; uniform float uFade;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          float a = (1.0 - smoothstep(0.30, 0.5, d)) * uFade * vF;
          if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`,
      vertexColors: true
    });
    shell.add(new THREE.Points(g, m));
    shell.userData.mat = m;
  }

  /* ---- the deep starfield you end up inside ---- */
  const stars = (() => {
    const N = 2200, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678, cc = Math.sin(i * 39.425) * 6789.1;
      pos[i * 3] = ((a % 1) - 0.5) * 46; pos[i * 3 + 1] = ((b % 1) - 0.5) * 30; pos[i * 3 + 2] = ((cc % 1) - 0.5) * 60 - 14;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xfafafa, size: 0.045, transparent: true, opacity: 0, depthWrite: false });
    const p = new THREE.Points(g, m); scene.add(p); return p;
  })();

  /* ---- the Starknet mark at the core ---- */
  /* the bare glyph, not the full mark: its navy disc read as a blob at this size */
  /* the glyph ships with a viewBox and NO width/height, so an <img> of it
     measures 0x0 in Chrome and TextureLoader hands back a blank map (this is
     why the mark never painted). Fetch the source, stamp an explicit size on
     the root element, and rasterise it into a canvas texture instead. */
  const markCv = document.createElement('canvas');
  markCv.width = markCv.height = 512;
  const markTex = new THREE.CanvasTexture(markCv);
  markTex.colorSpace = THREE.SRGBColorSpace;
  fetch('/assets/img/starknet-glyph.svg').then((r) => r.text()).then((src) => {
    const sized = src.replace('<svg ', '<svg width="512" height="512" ');
    const img = new Image();
    img.onload = () => {
      const cx = markCv.getContext('2d');
      cx.clearRect(0, 0, 512, 512);
      cx.drawImage(img, 0, 0, 512, 512);
      markTex.needsUpdate = true;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  }).catch(() => {});
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthWrite: false, depthTest: false }));
  mark.renderOrder = 5; scene.add(mark);

  /* ---- the projects, scattered through the far field ---- */
  const tiles = [], texCache = new Map();
  function tile(acc) {
    const key = acc.handle || acc.name;
    if (texCache.has(key)) return texCache.get(key);
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    const draw = () => { x.clearRect(0, 0, S, S); x.fillStyle = '#141414'; x.beginPath(); x.arc(64, 64, 60, 0, 6.2832); x.fill();
      x.fillStyle = '#c53400'; x.font = '500 42px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText((acc.handle || '?').replace(/^[@_]+/, '').slice(0, 2).toUpperCase(), 64, 66); };
    draw();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; texCache.set(key, tex);
    const cands = []; if (acc.avatar) cands.push(acc.avatar);
    if (acc.handle) cands.push('assets/avatars/' + acc.handle + '.webp', 'assets/avatars/' + acc.handle + '.jpg');
    (function next(i) { if (i >= cands.length) return;
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => { x.save(); x.beginPath(); x.arc(64, 64, 60, 0, 6.2832); x.clip(); x.drawImage(img, 0, 0, S, S); x.restore(); tex.needsUpdate = true; };
      img.onerror = () => next(i + 1); img.src = cands[i]; })(0);
    return tex;
  }

  function scatter(list) {
    /* One sprite per project, in DIRECTORY ORDER (category order, then array
       order); each entry is { acc, cat }. Sizes and depths are index-hashed
       so a reload draws the same field. Where each sprite goes is
       layoutField()'s job. */
    list.forEach(({ acc, cat }, i) => {
      const j1 = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453 % 1);
      const j3 = Math.abs(Math.sin((i + 1) * 39.425) * 6789.1 % 1);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tile(acc), transparent: true, opacity: 0, depthWrite: false }));
      const size = 0.52 + j3 * 0.10;   // the reference's size: readable marks
      spr.scale.setScalar(size);
      spr.userData = { acc, cat, i, base: new THREE.Vector3(), seed: j1, hover: 0, size, z: NEAR_TILE_Z - j3 * DEPTH_SPREAD, fit: 1, placed: false, px: null };
      spr.visible = false;
      scene.add(spr); tiles.push(spr);
    });
    layoutField();
  }

  /* ---- placement (2026-09-23) ----
     The old jittered grid pushed centre-column tiles sideways to clear the
     copy, straight into cells that were already taken, and the edge clamp
     then stacked them: 42 pairs closer than a tile at 1440x900, 143 at 375,
     eleven tiles sitting on the headline at 375. Replaced with a
     deterministic screen-space packing:
       - one seeded candidate stream (mulberry32, fixed seed), so a given
         canvas size lays out identically on every load;
       - a slot is accepted only when its circle, grown by half the margin,
         clears the canvas edges, the h2 and p rects READ FROM THE DOM at
         layout time, and the strip the fixed site header covers (a tile
         under the header cannot be hovered), and its centre sits at least
         one largest-tile diameter plus the margin from every accepted slot;
       - the margin is derived, not typed: twice the idle wobble amplitude
         (two tiles can wobble toward each other) plus the lens-drift
         parallax between the nearest and farthest depths, times 1.1;
       - slots are filled ROUND-ROBIN across the project categories in
         directory order (2026-09-23): the first account of each category in
         turn, then the second of each, and so on, until the slots run out.
         On desktop every project gets one. Where the whole set cannot fit,
         the tiles step down toward MIN_TILE_PX (never below it) until they
         all fit; if they still do not at the floor, the round-robin fills
         the N slots the packing found and the rest are not drawn. That is
         the mobile subset rule: every category is represented, its head
         accounts first, never whichever tiles happened to find room.
     Every slot is stored in canvas pixels (userData.px) and converted to
     world units at the sprite's own depth, so the projection through the
     settled lens (z = CAM_Z, no drift) lands exactly on the slot. */
  const PROJECT_CATS = ['official', 'defi', 'consumer', 'nft', 'appchains', 'tooling'];   // directory order of the project categories
  const MIN_TILE_PX = 44;                     // floor for a rendered tile diameter (the brief's number)
  const CHIP_INSET_PX = 16;                   // the chip's last-resort clamp inset (the brief's number)
  const WOBBLE = { x: 0.07, y: 0.06 };        // idle wobble amplitude, world units; frame() reads these
  const DRIFT = { x: 0.6 * 0.35, y: 0.4 * 0.22 };   // lens drift extremes, world units; frame() reads these
  const CAM_Z = -1.6, NEAR_TILE_Z = -9.5, DEPTH_SPREAD = 2.4;   // the settled lens and the tile depth band
  const TAN_HALF = Math.tan((46 / 2) * Math.PI / 180);          // camera fov is 46
  const HOVER_GROW = 0.55;
  const PACK_MISS_CAP = 3000, PACK_TRY_CAP = 60000, FIT_STEPS = 6;
  let layoutInfo = null;
  const pxPerUnit = (z, h) => (h / 2) / (TAN_HALF * (CAM_Z - z));
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function circleHitsRect(cx, cy, r, R) {
    const nx = Math.max(R.x, Math.min(cx, R.x + R.w)), ny = Math.max(R.y, Math.min(cy, R.y + R.h));
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
  }
  function headerHeight() {
    const hdr = document.querySelector('header.vc-header');
    if (!hdr) return 0;
    const cs = getComputedStyle(hdr);
    return cs.position === 'fixed' ? hdr.getBoundingClientRect().height : 0;
  }
  function exclusionRects(w) {
    /* the copy's rects relative to the sticky stage; the stage's own rect is
       the origin so this holds at any scroll position */
    const s = stick.getBoundingClientRect(), rects = [];
    [['h2', copyB.querySelector('h2')], ['p', copyB.querySelector('p')]].forEach(([id, el]) => {
      const r = el.getBoundingClientRect();
      rects.push({ id, x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
    });
    const hh = headerHeight();
    if (hh > 0) rects.push({ id: 'header', x: 0, y: 0, w, h: hh });
    return rects;
  }
  function packSlots(w, h, rMax, margin, rects, wantN) {
    const rnd = mulberry32(0x5A17E7), slots = [];
    const need2 = (2 * rMax + margin) * (2 * rMax + margin);
    const rx = rMax + margin / 2;   // the circle plus half the margin: the wobble never reaches an edge or the copy
    let miss = 0, tries = 0;
    while (slots.length < wantN && miss < PACK_MISS_CAP && tries < PACK_TRY_CAP) {
      tries++;
      const x = rx + rnd() * (w - 2 * rx), y = rx + rnd() * (h - 2 * rx);
      let ok = w - 2 * rx > 0 && h - 2 * rx > 0;
      for (let k = 0; ok && k < rects.length; k++) if (circleHitsRect(x, y, rx, rects[k])) ok = false;
      for (let k = 0; ok && k < slots.length; k++) { const dx = slots[k].x - x, dy = slots[k].y - y; if (dx * dx + dy * dy < need2) ok = false; }
      if (ok) { slots.push({ x, y }); miss = 0; } else miss++;
    }
    return slots;
  }

  function layoutField() {
    const N = tiles.length; if (!N) return;
    const w = stick.clientWidth, h = stick.clientHeight; if (!w || !h) return;
    const rects = exclusionRects(w);
    const pxuNear = pxPerUnit(NEAR_TILE_Z, h), pxuFar = pxPerUnit(NEAR_TILE_Z - DEPTH_SPREAD, h);
    const wobblePx = Math.hypot(WOBBLE.x, WOBBLE.y) * pxuNear;                    // the most any one tile moves on screen
    const parallaxPx = Math.hypot(DRIFT.x, DRIFT.y) * (pxuNear - pxuFar);          // how far the lens drift slides near against far
    const margin = (2 * wobblePx + parallaxPx) * 1.1;
    const native = tiles.map((s) => (s.userData.size / 2) * pxPerUnit(s.userData.z, h));   // rendered radius at fit 1
    const rMinNative = Math.min(...native), rMaxNative = Math.max(...native);
    const fitMin = Math.min(1, (MIN_TILE_PX / 2) / rMinNative);   // the smallest scale that keeps every tile at MIN_TILE_PX or more
    let chosen = null;
    for (let k = 0; k <= FIT_STEPS; k++) {
      const fit = 1 - (1 - fitMin) * (k / FIT_STEPS);
      const slots = packSlots(w, h, rMaxNative * fit, margin, rects, N);
      chosen = { fit, slots };
      if (slots.length >= N) break;
    }
    tiles.forEach((spr) => { spr.userData.fit = chosen.fit; spr.userData.placed = false; spr.userData.px = null; spr.visible = false; });
    const byCat = new Map();
    tiles.forEach((spr) => { const k = spr.userData.cat; if (!byCat.has(k)) byCat.set(k, []); byCat.get(k).push(spr); });
    const order = [];
    for (let r = 0; ; r++) {
      let any = false;
      PROJECT_CATS.forEach((k) => { const spr = (byCat.get(k) || [])[r]; if (spr) { order.push(spr); any = true; } });
      if (!any) break;
    }
    order.forEach((spr, i) => {
      const d = spr.userData, sl = chosen.slots[i];
      d.fit = chosen.fit; d.placed = !!sl;
      if (!sl) { d.px = null; spr.visible = false; return; }
      const pxu = pxPerUnit(d.z, h);
      d.base.set((sl.x - w / 2) / pxu, (h / 2 - sl.y) / pxu, d.z);
      spr.position.copy(d.base);
      d.px = { x: sl.x, y: sl.y, r: (d.size * d.fit / 2) * pxu };
    });
    layoutInfo = { w, h, rects, margin, wobblePx, parallaxPx, fit: chosen.fit, fitMin, rMaxPx: rMaxNative * chosen.fit, rMinPx: rMinNative * chosen.fit,
      placed: Math.min(chosen.slots.length, N), total: N, dropped: tiles.filter((s) => !s.userData.placed).map((s) => s.userData.acc.handle),
      order: order.map((s) => s.userData.acc.handle),
      perCategory: PROJECT_CATS.map((k) => ({ cat: k, total: (byCat.get(k) || []).length, placed: (byCat.get(k) || []).filter((s) => s.userData.placed).length })) };
  }

  /* ---- scroll ---- */
  let p = 0, target = 0;
  function readScroll() {
    const r = MOUNT.querySelector('.eg-track').getBoundingClientRect();
    const span = r.height - window.innerHeight;
    target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---- pointer ----
     Mouse: the tile under the cursor is hovered while the cursor is over the
     canvas; a click opens it. Touch (2026-09-23): the first tap on a tile
     selects it and shows its chip, a second tap on the same tile opens it,
     a tap anywhere else clears the selection. The old hover-only media gate
     is gone: touch devices used to get neither chip nor link. */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tapNdc = new THREE.Vector2();
  let hovered = null, selected = null, mouseOver = false, lastPointerType = 'mouse', arriveNow = 0, drift = { x: 0, y: 0 };
  const cv = renderer.domElement;
  const placedTiles = () => tiles.filter((s) => s.userData.placed);
  function pick(clientX, clientY, into) {
    const r = cv.getBoundingClientRect();
    into.x = ((clientX - r.left) / r.width) * 2 - 1;
    into.y = -((clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(into, camera);
    const hit = ray.intersectObjects(placedTiles(), false)[0];
    return hit ? hit.object : null;
  }
  const open = (spr) => { if (spr && spr.userData.acc.url) window.open(spr.userData.acc.url, '_blank', 'noopener'); };
  cv.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType || 'mouse'; });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = cv.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    mouseOver = true;
  });
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; mouseOver = false; hovered = null; chip.classList.remove('on'); });
  cv.addEventListener('click', (e) => {
    if (lastPointerType === 'touch') {
      if (arriveNow < 0.4) return;
      const hit = pick(e.clientX, e.clientY, tapNdc);
      if (hit && hit === selected) open(hit);
      else selected = hit;      // a tap on empty sky clears it
      return;
    }
    open(hovered);
  });
  document.addEventListener('pointerdown', (e) => { if (selected && e.target !== cv) selected = null; }, true);

  function resize() {
    const w = stick.clientWidth, h = stick.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    layoutField();  // the grid spans follow the frustum
    shell.userData.mat.uniforms.uPix.value = renderer.getPixelRatio();
    shell.userData.mat.uniforms.uH.value = h;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', readScroll, { passive: true });

  function frame(now) {
    p += (target - p) * 0.12;
    const t = now * 0.001;

    /* the flight: the lens starts off the shell and ends deep inside it */
    const dive = smooth(0.04, 0.72, p);
    camera.position.set(drift.x * 0.35, drift.y * 0.22, 16.4 - dive * 18.0);
    camera.lookAt(0, 0, camera.position.z - 10);   // a point AHEAD of the lens: a fixed one ends up behind it once the flight lands
    shell.rotation.y = t * 0.035 + p * 0.6;
    shell.rotation.x = drift.y * 0.12;

    /* the shell hands over to the starfield */
    shell.userData.mat.uniforms.uFade.value = 1 - smooth(0.5, 0.68, p);
    stars.material.opacity = smooth(0.5, 0.74, p) * 0.7;
    stars.rotation.y = t * 0.006;

    /* the mark holds the middle, then goes as the lens passes through it */
    const markGone = smooth(0.26, 0.42, p);
    mark.material.opacity = 1 - markGone;
    mark.visible = markGone < 0.999;
    mark.position.set(0, SHELL_Y, 0);
    mark.scale.setScalar(0.82);

    /* the projects arrive once you are inside */
    const arrive = smooth(0.6, 0.84, p);
    arriveNow = arrive;
    if (arrive > 0.4) {
      if (mouseOver) { ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(placedTiles(), false)[0]; hovered = hit ? hit.object : null; }
      else hovered = selected;
    } else hovered = null;
    const test = window.__ecoFieldTest || null;   // proof harness: 'rest' freezes the wobble, 'toward' drives every tile at its nearest neighbour
    tiles.forEach((s) => {
      const d = s.userData;
      d.hover += ((s === hovered ? 1 : 0) - d.hover) * 0.16;
      s.material.opacity = arrive * (0.72 + 0.28 * d.hover);
      s.visible = d.placed && arrive > 0.002;
      s.renderOrder = s === hovered ? 10 : 0;   // the hovered tile draws over its neighbours
      s.scale.setScalar(d.size * d.fit * (1 + d.hover * HOVER_GROW));
      let wx = Math.sin(t * 0.3 + d.seed * 6.28) * WOBBLE.x, wy = Math.cos(t * 0.26 + d.seed * 6.28) * WOBBLE.y;
      if (test === 'rest') { wx = 0; wy = 0; }
      else if (test === 'toward' && d.toward) { wx = WOBBLE.x * d.toward.x; wy = WOBBLE.y * d.toward.y; }
      s.position.set(d.base.x + wx, d.base.y + wy, d.base.z);
    });

    /* copy */
    const outA = smooth(0.12, 0.34, p);
    copyA.style.opacity = String(1 - outA);
    copyA.style.transform = 'translate(-50%,0) translateY(' + (-outA * 40) + 'px)';
    copyA.style.visibility = outA > 0.99 ? 'hidden' : 'visible';
    copyB.style.opacity = String(smooth(0.66, 0.86, p));
    copyB.style.visibility = p > 0.5 ? 'visible' : 'hidden';
    statsEl.style.opacity = String(1 - outA);
    hintEl.style.opacity = String(1 - smooth(0.02, 0.16, p));

    if (hovered) { placeChip(hovered); cv.style.cursor = 'pointer'; }
    else { chipFor = null; chip.classList.remove('on'); cv.style.cursor = 'default'; }

    /* a little lens drift after the cursor, gone once the copy has landed */
    if (test === 'toward') { drift.x = DRIFT.x; drift.y = DRIFT.y; }
    else {
      drift.x += ((ndc.x || 0) * 0.6 - drift.x) * 0.05;
      drift.y += ((ndc.y || 0) * 0.4 - drift.y) * 0.05;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ---- the chip (2026-09-23) ----
     Anchored to the hovered sprite's projected centre, not the cursor: it
     hangs off the tile's lower-right, flips to the left when the tile's
     centre is in the right half of the canvas, flips above when the centre is
     in the bottom third, and as a last resort its box is clamped inside the
     canvas with a CHIP_INSET_PX inset, below the fixed header. Content is
     written only when the hovered tile changes, so the box is measured once
     per tile rather than every frame. Primary line: displayName; secondary:
     the handle, muted; then the description. Without a displayName the
     handle is the only name line. */
  let chipFor = null;
  const projectCentre = (spr, w, h) => { const v = spr.position.clone().project(camera); return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h }; };
  function placeChip(spr) {
    const d = spr.userData, w = stick.clientWidth, h = stick.clientHeight;
    if (chipFor !== spr) {
      const acc = d.acc, handle = '@' + String(acc.handle || '').replace(/^@/, '');
      chipName.textContent = acc.displayName ? acc.displayName : handle;
      chipHandle.textContent = acc.displayName ? handle : '';
      chipRole.textContent = acc.description || '';
      chipFor = spr;
    }
    const c = projectCentre(spr, w, h);
    const r = (spr.scale.x / 2) * pxPerUnit(d.z, h);   // the rendered radius right now, hover growth included
    const cw = chip.offsetWidth, ch = chip.offsetHeight, off = r * 0.7;
    const flipX = c.x > w / 2, flipY = c.y > h * (2 / 3);
    let x = flipX ? c.x - off - cw : c.x + off;
    let y = flipY ? c.y - off - ch : c.y + off;
    const topMin = headerHeight() + CHIP_INSET_PX;
    x = Math.max(CHIP_INSET_PX, Math.min(w - CHIP_INSET_PX - cw, x));
    y = Math.max(topMin, Math.min(h - CHIP_INSET_PX - ch, y));
    chip.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    chip.dataset.flip = (flipX ? 'left' : 'right') + ' ' + (flipY ? 'up' : 'down');
    chip.classList.add('on');
  }

  /* debug hooks, no runtime cost. __ecoFieldReport projects every tile
     through the LIVE camera (wobble, drift and hover growth included) and
     returns its rendered circle in canvas pixels alongside the layout's
     derived margin and exclusion rects; the pairwise and text-clearance
     proofs read this. __ecoFieldTest = 'rest' | 'toward' | null drives the
     wobble for those proofs: 'toward' aims every tile's full amplitude at
     its nearest neighbour and pins the lens drift at its extreme, a worse
     case than any real frame. */
  window.__ecoFieldReport = () => {
    const w = stick.clientWidth, h = stick.clientHeight;
    return { layout: layoutInfo, w, h, tiles: tiles.map((s) => {
      const v = s.position.clone().project(camera), d = s.userData;
      return { handle: d.acc.handle, cat: d.cat, placed: d.placed, x: +v.x.toFixed(3), y: +v.y.toFixed(3),
        cx: (v.x + 1) / 2 * w, cy: (1 - v.y) / 2 * h, r: (s.scale.x / 2) * pxPerUnit(d.z, h),
        onScreen: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z < 1,
        imgLoaded: !!(s.material.map && s.material.map.image && (s.material.map.image.width || s.material.map.image instanceof HTMLCanvasElement)),
        opacity: +s.material.opacity.toFixed(2), visible: s.visible };
    }) };
  };
  window.__ecoFieldAim = () => {   // sets d.toward for the 'toward' test mode from the current slot layout
    const P = placedTiles();
    P.forEach((s) => { const a = s.userData.px; let best = null, bd = Infinity;
      P.forEach((o) => { if (o === s) return; const b = o.userData.px, dd = (b.x - a.x) ** 2 + (b.y - a.y) ** 2; if (dd < bd) { bd = dd; best = b; } });
      s.userData.toward = best ? { x: Math.sign(best.x - a.x) || 1, y: -(Math.sign(best.y - a.y) || 1) } : { x: 1, y: 1 };   // canvas y is down, world y is up
    });
    return P.length;
  };
  window.__ecoFieldHover = (handle) => { const s = tiles.find((t) => t.userData.acc.handle === handle) || null; selected = s; if (!mouseOver) hovered = s; return !!s; };

  fetch('/data/ecosystem.json').then(r => r.json()).then(data => {
    const projects = PROJECT_CATS.flatMap(k => (data[k] || []).map(acc => ({ acc, cat: k })));
    const voices = ['starkware', 'snf', 'builders', 'shitposter'].flatMap(k => data[k] || []);
    MOUNT.querySelector('.eg-n-p').textContent = projects.length;
    MOUNT.querySelector('.eg-n-v').textContent = voices.length;
    scatter(projects);   // the voices have their own act (the ring); this field is the projects
    resize(); readScroll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { resize(); if (reduced) renderer.render(scene, camera); });   // the copy's rects move when the webfont lands
    if (reduced) { p = target; renderer.render(scene, camera); }
    else requestAnimationFrame(frame);
  }).catch(err => { console.error('[eco-globe]', err); MOUNT.style.display = 'none'; });
}
