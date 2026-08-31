/* BTCFi ecosystem hero: a scroll-driven flight through a particle sphere.
   Modelled on js/eco-globe.js, with its own mount id (#btcGlobe) and its own
   class prefix (bg-) so the two pages can never collide.

   Act 1: a dense shell of motes with the Bitcoin mark at its core.
   Act 2: the lens flies into the shell; the motes stream past and thin out.
   Act 3: inside, a starfield with every wallet, bridge and DeFi protocol
   scattered through it as a logo sprite.

   The protocol list is NOT duplicated here. It is read out of the mount's
   own no-JS fallback list (the <a> elements the page ships), which stays the
   single source of truth for names, categories, in-page anchors and logo
   files. Clicking a sprite jumps to that protocol's entry further down the
   page, exactly as the old orbital hub's nodes did.

   strk20 palette only: ground #0d0d0d, accent #c53400, warm #e07a4a,
   ink #fafafa. */
import * as THREE from 'three';

const MOUNT = document.getElementById('btcGlobe');
if (MOUNT) {
  const ACC = new THREE.Color('#c53400'), WARM = new THREE.Color('#e07a4a'), INK = new THREE.Color('#fafafa');
  const COUNT = matchMedia('(max-width: 860px)').matches ? 14000 : 34000;
  const R = 2.95;          // sphere radius; the camera distance sets how big it reads
  const SHELL_Y = -0.55;   // near-centred, just clear of the copy
  const MARK_Y = -1.7;     // the mark sits inside the shell, BELOW the centred copy
  const CAM_Z_START = 16.4, CAM_Z_TRAVEL = 18.0;   // the flight: off the shell, then deep inside it
  const CAM_Z_END = CAM_Z_START - CAM_Z_TRAVEL;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- read the fallback list before the mount is wiped ---- */
  const items = [].slice.call(MOUNT.querySelectorAll('.bgf-item')).map((a) => {
    const img = a.querySelector('img');
    return {
      name: a.getAttribute('data-name') || '',
      cat: a.getAttribute('data-cat') || '',
      href: a.getAttribute('href') || '',
      logo: img ? img.src : '',              // .src resolves the relative path for us
      initials: (a.getAttribute('data-name') || '?').slice(0, 2)
    };
  });
  /* The flight repaints this section's heading over the particle field, so
     the page's own <h3> has to go. It SHIPS VISIBLE and is hidden here,
     rather than shipping hidden and being handed back: hiding it in the
     markup would leave a no-JS reader, a reduced-motion reader or a machine
     with no WebGL looking at a section with no visible title at all, because
     the code meant to hand it back never runs on those paths. */
  const HEAD = document.getElementById('a-complete-defi-stack-built-for');

  /* prefers-reduced-motion: the flight IS the device, and a single static
     frame of it either hides the logos (a frame at the start) or hides the
     Bitcoin mark and leaves the sprites unclickable, since hit testing lives
     in the render loop. So reduced motion keeps the labelled link list
     exactly as the page ships it: all protocols visible, keyboard reachable,
     nothing moving, and no WebGL context created at all. */
  /* the head script reserved the track's height; every bail-out below has
     to give it back so the link list is what fills the section */
  const unreserve = () => document.documentElement.classList.remove('bg-flight');

  if (!items.length || reduced) unreserve();
  if (items.length && !reduced) {

  const cats = [];
  items.forEach((it) => { if (it.cat && cats.indexOf(it.cat) === -1) cats.push(it.cat); });

  /* the context is taken BEFORE the mount is wiped: a machine with no WebGL
     must keep the link list, not be left with an empty section */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { console.error('[btcfi-globe] no WebGL context, keeping the list', e); renderer = null; unreserve(); }
  if (renderer) {

  if (HEAD) HEAD.classList.add('bg-sr');   // the flight repaints these words
  MOUNT.innerHTML =
    '<div class="bg-track"><div class="bg-stick">' +
      '<div class="bg-copy" aria-hidden="true">' +
        '<h2>A complete DeFi stack</h2>' +
        '<p>Built for Bitcoin.</p>' +
      '</div>' +
      '<div class="bg-stats" aria-hidden="true">' +
        '<div><span>Protocols</span><b>' + items.length + '</b></div>' +
        '<div><span>Categories</span><b>' + cats.length + '</b></div>' +
      '</div>' +
      '<div class="bg-hint" aria-hidden="true">Scroll to explore</div>' +
      '<div class="bg-chip"><span class="bg-chip-name"></span><span class="bg-chip-role"></span></div>' +
    '</div></div>';

  const stick = MOUNT.querySelector('.bg-stick');
  const copy = MOUNT.querySelector('.bg-copy');
  const statsEl = MOUNT.querySelector('.bg-stats'), hintEl = MOUNT.querySelector('.bg-hint');
  const chip = MOUNT.querySelector('.bg-chip');
  const chipName = MOUNT.querySelector('.bg-chip-name'), chipRole = MOUNT.querySelector('.bg-chip-role');

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);   // transparent: the page's own ground shows through
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

  /* ---- the Bitcoin mark at the core ---- */
  /* bitcoin-logo.svg ships with a viewBox and NO width/height, so an <img>
     of it measures 0x0 in Chrome and TextureLoader hands back a blank map.
     Fetch the source, stamp an explicit size on the root element, and
     rasterise it into a canvas texture instead. Do NOT swap this back to
     THREE.TextureLoader: the mark simply will not paint. */
  const markCv = document.createElement('canvas');
  markCv.width = markCv.height = 512;
  const markTex = new THREE.CanvasTexture(markCv);
  markTex.colorSpace = THREE.SRGBColorSpace;
  fetch('/assets/img/bitcoin-logo.svg').then((r) => r.text()).then((src) => {
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

  /* ---- the protocols, scattered through the far field ---- */
  const tiles = [], texCache = new Map();
  function tile(it) {
    if (texCache.has(it.name)) return texCache.get(it.name);
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#141414'; x.beginPath(); x.arc(64, 64, 60, 0, 6.2832); x.fill();
    x.fillStyle = '#c53400'; x.font = '500 42px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(it.initials.toUpperCase(), 64, 66);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; texCache.set(it.name, tex);
    if (it.logo) {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => {
        x.clearRect(0, 0, S, S);
        x.save(); x.beginPath(); x.arc(64, 64, 60, 0, 6.2832); x.clip();
        x.fillStyle = '#141414'; x.fillRect(0, 0, S, S);
        x.drawImage(img, 0, 0, S, S);
        x.restore(); tex.needsUpdate = true;
      };
      img.src = it.logo;
    }
    return tex;
  }

  const Z_NEAR_TILE = -9.5, Z_DEPTH = 2.4;   // the slab the sprites hang in

  function scatter(list) {
    /* A solar system, not a grid: the copy sits at the centre and every
       protocol rides one of a few concentric orbits around it, so the field
       reads as circling the text rather than sprinkled over it.

       THE RADII ARE MEASURED, NOT FIXED. The sprites sit at z = -9.5 with the
       lens landed at z = -1.6, so the visible half-height there is
       d * tan(fov/2). The innermost orbit clears the copy's real footprint
       (read off getBoundingClientRect, so it tracks the actual type at any
       width) and the outermost stays inside the frustum, which is what keeps
       all of them on screen on a 390px phone as well as a 1440px desktop. */
    const dist = CAM_Z_END - Z_NEAR_TILE;
    const halfH = dist * Math.tan((camera.fov * Math.PI / 180) / 2);
    const halfW = halfH * (camera.aspect || 1);

    const N = list.length;
    const size = Math.min(0.5, Math.max(0.26, halfH * 0.13));

    // the copy's real footprint in world units, so orbit one always clears it
    const cr = copy.getBoundingClientRect(), sr = stick.getBoundingClientRect();
    const copyHalfW = (cr.width / (sr.width || 1)) * halfW;
    const copyHalfH = (cr.height / (sr.height || 1)) * halfH;

    const rInner = Math.max(copyHalfW, copyHalfH) * 0.62 + size * 1.5;
    const rOuter = Math.max(rInner + size * 2.2, Math.min(halfW, halfH * 1.35) - size * 0.9);

    // more orbits when there is room, so the rings never crowd each other
    const rings = Math.max(2, Math.min(4, Math.round((rOuter - rInner) / (size * 1.9)) + 1));
    // outer orbits are longer, so they carry proportionally more of the set
    const weights = [];
    for (let k = 0; k < rings; k++) weights.push(rInner + (rOuter - rInner) * (rings === 1 ? 0 : k / (rings - 1)));
    const total = weights.reduce((t, r) => t + r, 0);
    const counts = weights.map((r) => Math.max(1, Math.round(N * r / total)));
    let drift0 = counts.reduce((t, c) => t + c, 0) - N;
    for (let k = rings - 1; k >= 0 && drift0 !== 0; k--) {
      const step = drift0 > 0 ? -1 : 1;
      if (counts[k] + step >= 1) { counts[k] += step; drift0 += step > 0 ? -1 : 1; }
    }

    let idx = 0;
    for (let k = 0; k < rings; k++) {
      const r = weights[k], n = counts[k];
      // ellipse, not a circle: a wide viewport should not leave the sides empty
      const rx = r * (halfW > halfH ? Math.min(1.55, halfW / halfH) : 1);
      const ry = r;
      const phase = k * 0.618;                    // offset each orbit so spokes never line up
      const dir = k % 2 === 0 ? 1 : -1;           // alternate orbits counter-rotate
      for (let m = 0; m < n && idx < N; m++, idx++) {
        const it = list[idx];
        const j1 = Math.abs(Math.sin((idx + 1) * 12.9898) * 43758.5453 % 1);
        const j3 = Math.abs(Math.sin((idx + 1) * 39.425) * 6789.1 % 1);
        const ang = phase + (m / n) * Math.PI * 2 + (j1 - 0.5) * (Math.PI * 2 / n) * 0.25;
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tile(it), transparent: true, opacity: 0, depthWrite: false }));
        spr.position.set(Math.cos(ang) * rx, Math.sin(ang) * ry, Z_NEAR_TILE - j3 * Z_DEPTH);
        spr.scale.setScalar(size + j3 * size * 0.16);
        spr.userData = {
          it, base: spr.position.clone(), seed: j1, hover: 0, size: spr.scale.x,
          orbit: { rx, ry, ang, speed: dir * (0.035 + k * 0.012) }
        };
        scene.add(spr); tiles.push(spr);
      }
    }
  }

  /* ---- scroll ---- */
  let p = 0, target = 0;
  function readScroll() {
    const r = MOUNT.querySelector('.bg-track').getBoundingClientRect();
    const span = r.height - window.innerHeight;
    target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---- pointer ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); const at = { x: 0, y: 0 };
  let hovered = null; const drift = { x: 0, y: 0 };
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = renderer.domElement;
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    at.x = e.clientX - r.left; at.y = e.clientY - r.top;
  });
  /* an in-page jump, not a new tab: these anchors point at the protocol's own
     entry further down this page, which is what the orbital hub's nodes did */
  cv.addEventListener('click', () => {
    if (hovered && hovered.userData.it.href) location.hash = hovered.userData.it.href.replace(/^#/, '');
  });
  cv.addEventListener('pointerleave', () => { hovered = null; chip.classList.remove('on'); });

  function resize() {
    const w = stick.clientWidth, h = stick.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    shell.userData.mat.uniforms.uPix.value = renderer.getPixelRatio();
    shell.userData.mat.uniforms.uH.value = h;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', readScroll, { passive: true });

  let lastNow = 0;
  function frame(now) {
    p += (target - p) * 0.12;
    const t = now * 0.001;
    // clamped so a backgrounded tab does not jump the orbits on return
    const dt = lastNow ? Math.min(0.05, (now - lastNow) * 0.001) : 0;
    lastNow = now;
    turnOrbits(dt);

    /* the flight: the lens starts off the shell and ends deep inside it */
    const dive = smooth(0.04, 0.72, p);
    camera.position.set(drift.x * 0.35, drift.y * 0.22, CAM_Z_START - dive * CAM_Z_TRAVEL);
    camera.lookAt(0, 0, camera.position.z - 10);   // a point AHEAD of the lens: a fixed one ends up behind it once the flight lands
    shell.rotation.y = t * 0.035 + p * 0.6;
    shell.rotation.x = drift.y * 0.12;

    /* the shell hands over to the starfield */
    shell.userData.mat.uniforms.uFade.value = 1 - smooth(0.5, 0.68, p);
    stars.material.opacity = smooth(0.5, 0.74, p) * 0.7;
    stars.rotation.y = t * 0.006;

    /* the mark holds the core, then goes as the lens passes through it */
    const markGone = smooth(0.26, 0.42, p);
    mark.material.opacity = 1 - markGone;
    mark.visible = markGone < 0.999;
    mark.position.set(0, MARK_Y, 0);
    mark.scale.setScalar(0.95);

    /* the protocols arrive once you are inside */
    const arrive = smooth(0.6, 0.84, p);
    if (fine && arrive > 0.4) { ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(tiles, false)[0]; hovered = hit ? hit.object : null; }
    else hovered = null;

  /* the orbits turn: each sprite advances along its own ellipse and its base
     is rewritten, so the pointer drift and hover lift below keep reading the
     moving position rather than a stale one */
  function turnOrbits(dt) {
    for (let i = 0; i < tiles.length; i++) {
      const o = tiles[i].userData.orbit;
      if (!o) continue;
      o.ang += o.speed * dt;
      tiles[i].userData.base.x = Math.cos(o.ang) * o.rx;
      tiles[i].userData.base.y = Math.sin(o.ang) * o.ry;
    }
  }

    tiles.forEach((s) => {
      const d = s.userData;
      d.hover += ((s === hovered ? 1 : 0) - d.hover) * 0.16;
      s.material.opacity = arrive * (0.72 + 0.28 * d.hover);
      s.visible = arrive > 0.002;
      s.scale.setScalar(d.size * (1 + d.hover * 0.55));
      s.position.set(d.base.x + Math.sin(t * 0.3 + d.seed * 6.28) * 0.07,
                     d.base.y + Math.cos(t * 0.26 + d.seed * 6.28) * 0.06,
                     d.base.z);
    });

    /* the copy holds the centre for the whole flight */
    statsEl.style.opacity = String(1 - smooth(0.12, 0.34, p));
    hintEl.style.opacity = String(1 - smooth(0.02, 0.16, p));

    if (hovered) {
      chipName.textContent = hovered.userData.it.name || '';
      chipRole.textContent = hovered.userData.it.cat || '';
      chip.style.transform = 'translate3d(' + (at.x + 16) + 'px,' + (at.y - 14) + 'px,0)';
      chip.classList.add('on'); cv.style.cursor = 'pointer';
    } else { chip.classList.remove('on'); cv.style.cursor = 'default'; }

    /* a little lens drift after the cursor */
    drift.x += ((ndc.x || 0) * 0.6 - drift.x) * 0.05;
    drift.y += ((ndc.y || 0) * 0.4 - drift.y) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* resize() FIRST: scatter() sizes the grid off camera.aspect, and the
     constructor's aspect is 1, which lays the field out for a square lens */
  resize();
  scatter(items);
  readScroll();
  copy.style.opacity = '1';
  requestAnimationFrame(frame);

  /* a hook for the verification pass, same shape as the old hub's */
  window.__btcGlobeInfo = () => ({ items: items.length, cats: cats.length, tiles: tiles.length, p });
  window.__btcGlobeOnScreen = () => {
    const v = new THREE.Vector3();
    return tiles.filter((s2) => {
      v.copy(s2.position).project(camera);
      return Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
    }).length;
  };
  }
  }
}
