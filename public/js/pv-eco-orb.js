/* Privacy section 04, panel 03: a small ecosystem particle logo field that
   lives INSIDE the app window rather than driving a whole hero.

   Deliberately a scaled-down cousin of js/eco-globe.js, not a reuse of it:
   that one owns #ecoGlobe, its own .eg- classes, and a scroll-driven flight
   through three acts. This one owns #pvEcoOrb, its own .peo- classes, and
   one act: a slow auto-rotating shell of motes with the Starknet glyph at
   the core and the ecosystem's project avatars scattered on an outer shell.
   Nothing is shared, so the two cannot collide on an id, a class or a
   scroll listener.

   Two structural facts drive the lifecycle, because this canvas is born
   inside a panel that carries `hidden`:
   1. The mount measures 0x0 until pedestal 03 is selected, so sizing is
      never done at construction. A ResizeObserver sizes the renderer the
      first time the box has a real width, and again on every change.
   2. An IntersectionObserver starts and stops the frame loop, so the GPU
      does nothing while the panel is hidden or off screen.

   SVG trap, hit twice on this project and repeated here so it is not hit a
   third time: an <svg> that ships a viewBox and NO width/height measures
   0x0 in Chrome, and TextureLoader hands back a blank map. Fetch the source,
   stamp width/height on the ROOT element, and rasterise into a canvas. The
   fill likewise goes on the <svg> root, never on a <path>: a fill attribute
   injected into a path yields an SVG Chrome silently refuses to decode. */
import * as THREE from 'three';

const MOUNT = document.getElementById('pvEcoOrb');
if (MOUNT) {
  const ACC = new THREE.Color('#c53400'), WARM = new THREE.Color('#e07a4a'), INK = new THREE.Color('#fafafa');
  const small = matchMedia('(max-width: 860px)').matches;
  const COUNT = small ? 4200 : 11000;
  const TILES = small ? 22 : 40;
  const R = 2.5;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  MOUNT.innerHTML = '<div class="peo-stage"></div>' +
    '<div class="peo-chip"><span class="peo-chip-name"></span><span class="peo-chip-role"></span></div>' +
    '<div class="peo-stats"><span>PROJECTS</span><b class="peo-n">0</b></div>';
  const stage = MOUNT.querySelector('.peo-stage');
  const chip = MOUNT.querySelector('.peo-chip');
  const chipName = MOUNT.querySelector('.peo-chip-name');
  const chipRole = MOUNT.querySelector('.peo-chip-role');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  camera.position.set(0, 0, 7.4);
  const shell = new THREE.Group();
  scene.add(shell);

  /* ---- the motes ---- */
  let pointMat = null;
  {
    const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), siz = new Float32Array(COUNT);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const h1 = Math.abs(Math.sin(i * 127.1) * 43758.5453 % 1);
      const h2 = Math.abs(Math.sin(i * 311.7) * 24634.6345 % 1);
      const y = 1 - ((i + h1) / COUNT) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i + h2 * 0.9;
      const rad = R * (0.965 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.06);
      pos[i * 3] = Math.cos(th) * rr * rad;
      pos[i * 3 + 1] = y * rad;
      pos[i * 3 + 2] = Math.sin(th) * rr * rad;
      const t = Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1);
      c.copy(t > 0.62 ? INK : t > 0.3 ? WARM : ACC).multiplyScalar(0.7 + t * 0.6);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      siz[i] = 0.55 + t * 0.95;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    pointMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending, vertexColors: true,
      uniforms: { uPix: { value: 1 }, uH: { value: 340 } },
      vertexShader: `attribute float aSize; varying vec3 vC; varying float vF;
        uniform float uPix; uniform float uH;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);
          float d = -mv.z; vF = smoothstep(2.0, 5.2, d);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(1.0, aSize * uPix * (uH/340.0) * (9.0 / max(d, 0.5))); }`,
      fragmentShader: `varying vec3 vC; varying float vF;
        void main(){ vec2 p = gl_PointCoord - 0.5; float r = dot(p,p);
          if (r > 0.25) discard;
          float a = (1.0 - smoothstep(0.06, 0.25, r)) * mix(0.95, 0.30, vF);
          gl_FragColor = vec4(vC, a); }`
    });
    shell.add(new THREE.Points(g, pointMat));
  }

  /* ---- the Starknet glyph at the core ---- */
  const markCv = document.createElement('canvas');
  markCv.width = markCv.height = 256;
  const markTex = new THREE.CanvasTexture(markCv);
  markTex.colorSpace = THREE.SRGBColorSpace;
  fetch('/assets/img/starknet-glyph.svg').then((r) => r.text()).then((src) => {
    /* width/height stamped on the ROOT, and the file already carries its
       fill on the root too, so nothing is injected into a <path> */
    const sized = src.replace('<svg ', '<svg width="256" height="256" ');
    const img = new Image();
    img.onload = () => {
      const cx = markCv.getContext('2d');
      cx.clearRect(0, 0, 256, 256);
      cx.drawImage(img, 0, 0, 256, 256);
      markTex.needsUpdate = true;
      draw();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  }).catch(() => {});
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthWrite: false, depthTest: false }));
  mark.scale.setScalar(1.55); mark.renderOrder = 6;
  scene.add(mark);

  /* ---- the project avatars, on an outer shell ---- */
  /* Each tile is a canvas: initials first so the sprite is never blank, then
     the avatar drawn over it if it loads. A failed image simply leaves the
     initials, which is why no onerror handler is needed. */
  const tiles = [];
  function tileTex(acc) {
    const S = 128, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const x = cv.getContext('2d');
    const paintBase = () => {
      x.clearRect(0, 0, S, S);
      x.fillStyle = '#141414'; x.beginPath(); x.arc(64, 64, 60, 0, 6.2832); x.fill();
      x.fillStyle = '#c53400';
      x.font = '500 42px "IBM Plex Mono", monospace';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText((acc.handle || acc.name || '?').replace(/^[@_]+/, '').slice(0, 2).toUpperCase(), 64, 66);
    };
    paintBase();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (acc.avatar) {
      const img = new Image();
      img.onload = () => {
        paintBase();
        x.save(); x.beginPath(); x.arc(64, 64, 60, 0, 6.2832); x.clip();
        x.drawImage(img, 0, 0, S, S); x.restore();
        x.strokeStyle = 'rgba(250,250,250,.22)'; x.lineWidth = 2;
        x.beginPath(); x.arc(64, 64, 59, 0, 6.2832); x.stroke();
        tex.needsUpdate = true; draw();
      };
      img.src = acc.avatar;
    }
    return tex;
  }

  fetch('/data/ecosystem.json').then((r) => r.json()).then((data) => {
    const all = ['official', 'defi', 'consumer', 'nft', 'appchains', 'tooling']
      .flatMap((k) => data[k] || []);
    MOUNT.querySelector('.peo-n').textContent = all.length;
    /* an even stride through the list rather than the first N, so the
       sample is not all one category */
    const step = Math.max(1, Math.floor(all.length / TILES));
    const pick = [];
    for (let i = 0; i < all.length && pick.length < TILES; i += step) pick.push(all[i]);
    pick.forEach((acc, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tileTex(acc), transparent: true, depthWrite: false
      }));
      const y = 1 - ((i + 0.5) / pick.length) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      const rad = R * 1.16;
      sp.position.set(Math.cos(th) * rr * rad, y * rad, Math.sin(th) * rr * rad);
      sp.scale.setScalar(0.46);
      sp.userData = acc;
      shell.add(sp); tiles.push(sp);
    });
    draw();
    if (!reduced) cycleChip();
  }).catch(() => {});

  /* the chip names one project at a time: the sprites are far too small to
     read at this size, so the field needs a caption to mean anything */
  let chipTimer = null;
  function cycleChip() {
    let i = 0;
    const tick = () => {
      if (!tiles.length) return;
      const acc = tiles[i % tiles.length].userData || {};
      chipName.textContent = acc.name || '';
      chipRole.textContent = acc.description || '';
      chip.classList.add('on');
      i++;
      chipTimer = setTimeout(tick, 2600);
    };
    tick();
  }

  /* ---- sizing: never at construction, always from a measured box ---- */
  let w = 0, h = 0;
  function size() {
    const r = stage.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;      // still hidden
    if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return true;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* keep the whole shell in frame at any aspect: pull the camera back when
       the box is wider than it is tall, which it always is here */
    camera.position.z = 7.4 * Math.max(1, 1.05 / camera.aspect);
    camera.updateProjectionMatrix();
    if (pointMat) {
      pointMat.uniforms.uPix.value = renderer.getPixelRatio();
      pointMat.uniforms.uH.value = h;
    }
    return true;
  }
  new ResizeObserver(() => { if (size()) draw(); }).observe(stage);

  /* ---- the loop ---- */
  let raf = 0, running = false, t0 = performance.now();
  function draw() {
    if (!size()) return;
    renderer.render(scene, camera);
  }
  function frame(t) {
    if (!running) return;
    shell.rotation.y = (t - t0) * 0.00009;
    shell.rotation.x = Math.sin((t - t0) * 0.00004) * 0.16;
    tiles.forEach((s) => { s.quaternion.copy(camera.quaternion); });
    draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    if (reduced) { running = false; draw(); return; }
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  new IntersectionObserver((es) => {
    es.forEach((e) => { e.isIntersecting ? start() : stop(); });
  }, { threshold: 0 }).observe(stage);

  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', () => { stop(); if (chipTimer) clearTimeout(chipTimer); });
}
