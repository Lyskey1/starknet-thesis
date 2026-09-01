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
        /* not a heading: the page's real h1 carries this wording, pre-rendered
           into #ecoIndex by scripts/build-ecosystem.js. .eg-h is styled exactly
           like .eg-copy h2 (css/eco-stage.css), so nothing moves. */
        '<p class="eg-h">The people building &amp; shaping Starknet</p>' +
        '<p>Every project, every voice, on one chain.</p>' +
      '</div>' +
      '<div class="eg-copy eg-copy-b"><h2>Powered by Starknet</h2>' +
        '<p>Every project shipping on the network, in one place.</p></div>' +
      '<div class="eg-stats"><div><span>Projects</span><b class="eg-n-p">0</b></div>' +
        '<div><span>Voices</span><b class="eg-n-v">0</b></div></div>' +
      '<div class="eg-hint">Scroll to explore</div>' +
      '<div class="eg-chip"><span class="eg-chip-name"></span><span class="eg-chip-role"></span></div>' +
    '</div></div>';

  const stick = MOUNT.querySelector('.eg-stick');
  const copyA = MOUNT.querySelector('.eg-copy-a'), copyB = MOUNT.querySelector('.eg-copy-b');
  const statsEl = MOUNT.querySelector('.eg-stats'), hintEl = MOUNT.querySelector('.eg-hint');
  const chip = MOUNT.querySelector('.eg-chip');
  const chipName = MOUNT.querySelector('.eg-chip-name'), chipRole = MOUNT.querySelector('.eg-chip-role');

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
    /* Three concentric rings turned by the golden angle: an ordered field
       reads as a system where the random scatter read as clutter. The middle
       band is left clear so the copy is never covered. */
    /* A jittered grid, not rings: rings banded the field into arcs with holes
       between them. Each cell gets one project nudged off its centre, which
       gives an even spread that still reads as scattered. The middle cells are
       pushed aside so the copy is never covered. */
    const N = list.length;
    const cols = Math.ceil(Math.sqrt(N * 1.7));
    const rows = Math.ceil(N / cols);
    const SPAN_X = 13.5, SPAN_Y = 8.2;
    list.forEach((acc, i) => {
      const cx = i % cols, cy = Math.floor(i / cols);
      const j1 = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453 % 1);
      const j2 = Math.abs(Math.sin((i + 1) * 78.233) * 12345.678 % 1);
      const j3 = Math.abs(Math.sin((i + 1) * 39.425) * 6789.1 % 1);
      let x = ((cx + 0.5) / cols - 0.5) * SPAN_X + (j1 - 0.5) * (SPAN_X / cols) * 0.85;
      let yy = ((cy + 0.5) / rows - 0.5) * SPAN_Y + (j2 - 0.5) * (SPAN_Y / rows) * 0.85;
      if (Math.abs(x) < 3.6 && Math.abs(yy) < 1.5) x += x < 0 ? -2.6 : 2.6;   // clear the copy
      const seed = j1;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tile(acc), transparent: true, opacity: 0, depthWrite: false }));
      spr.position.set(x, yy, -9.5 - j3 * 2.4);
      spr.scale.setScalar(0.52 + j3 * 0.10);   // the reference's size: readable marks
      spr.userData = { acc, base: spr.position.clone(), seed, hover: 0, size: spr.scale.x };
      scene.add(spr); tiles.push(spr);
    });
  }

  /* ---- scroll ---- */
  let p = 0, target = 0;
  function readScroll() {
    const r = MOUNT.querySelector('.eg-track').getBoundingClientRect();
    const span = r.height - window.innerHeight;
    target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---- pointer ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); const at = { x: 0, y: 0 };
  let hovered = null, drift = { x: 0, y: 0 };
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = renderer.domElement;
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    at.x = e.clientX - r.left; at.y = e.clientY - r.top;
  });
  cv.addEventListener('click', () => { if (hovered && hovered.userData.acc.url) window.open(hovered.userData.acc.url, '_blank', 'noopener'); });
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
    if (fine && arrive > 0.4) { ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(tiles, false)[0]; hovered = hit ? hit.object : null; }
    else hovered = null;
    tiles.forEach((s, i) => {
      const d = s.userData;
      d.hover += ((s === hovered ? 1 : 0) - d.hover) * 0.16;
      s.material.opacity = arrive * (0.72 + 0.28 * d.hover);
      s.visible = arrive > 0.002;
      s.scale.setScalar(d.size * (1 + d.hover * 0.55));
      s.position.set(d.base.x + Math.sin(t * 0.3 + d.seed * 6.28) * 0.07,
                     d.base.y + Math.cos(t * 0.26 + d.seed * 6.28) * 0.06,
                     d.base.z);
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

    if (hovered) {
      chipName.textContent = hovered.userData.acc.name || '';
      chipRole.textContent = hovered.userData.acc.description || '';
      chip.style.transform = 'translate3d(' + (at.x + 16) + 'px,' + (at.y - 14) + 'px,0)';
      chip.classList.add('on'); cv.style.cursor = 'pointer';
    } else { chip.classList.remove('on'); cv.style.cursor = 'default'; }

    /* a little lens drift after the cursor, gone once the copy has landed */
    drift.x += ((ndc.x || 0) * 0.6 - drift.x) * 0.05;
    drift.y += ((ndc.y || 0) * 0.4 - drift.y) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  fetch('/data/ecosystem.json').then(r => r.json()).then(data => {
    const projects = ['official', 'defi', 'consumer', 'nft', 'appchains', 'tooling'].flatMap(k => data[k] || []);
    const voices = ['starkware', 'snf', 'builders', 'shitposter'].flatMap(k => data[k] || []);
    MOUNT.querySelector('.eg-n-p').textContent = projects.length;
    MOUNT.querySelector('.eg-n-v').textContent = voices.length;
    scatter(projects);   // the voices have their own act (the ring); this field is the projects
    resize(); readScroll();
    if (reduced) { p = target; renderer.render(scene, camera); }
    else requestAnimationFrame(frame);
  }).catch(err => { console.error('[eco-globe]', err); MOUNT.style.display = 'none'; });
}
