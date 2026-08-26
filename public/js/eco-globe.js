/* Ecosystem globe: the Starknet mark at the core, every project orbiting it as
   a sprite on a sphere, coloured by category. Drag to spin, hover for the
   chip, click to open the account. three.js from unpkg via the page's import
   map. strk20 palette only. */
import * as THREE from 'three';

const MOUNT = document.getElementById('ecoGlobe');
if (MOUNT) {
  const ACC = '#c53400', ACC_D = '#a02a00', WARM = '#e07a4a', INK = '#fafafa';
  const CATS = [
    { id: 'official', label: 'Official', color: '#fafafa' },
    { id: 'defi', label: 'DeFi', color: ACC },
    { id: 'consumer', label: 'Consumer & gaming', color: WARM },
    { id: 'nft', label: 'NFT & memecoins', color: '#f0b8a0' },
    { id: 'appchains', label: 'L2 & L3 appchains', color: ACC_D },
    { id: 'tooling', label: 'Tooling', color: '#9a9a9a' }
  ];
  const R = 2.5, AUTOSPIN = 0.0016, DAMP = 0.94, DRAG = 0.0055;

  MOUNT.innerHTML =
    '<div class="es-head"><p class="es-kicker">The projects</p><p class="es-sub">Drag to spin &middot; click a project to open it</p></div>' +
    '<div class="es-globe"><span class="es-globe-count"></span><span class="es-globe-note">One chain, every surface</span>' +
    '<div class="es-fade"></div><div class="es-chip"><span class="es-chip-name"></span><span class="es-chip-role"></span></div></div>' +
    '<div class="es-legend"></div>';

  const box = MOUNT.querySelector('.es-globe');
  const legendEl = MOUNT.querySelector('.es-legend');
  const chip = MOUNT.querySelector('.es-chip');
  const chipName = MOUNT.querySelector('.es-chip-name');
  const chipRole = MOUNT.querySelector('.es-chip-role');
  const countEl = MOUNT.querySelector('.es-globe-count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 0, 8.9);   // far enough that the sphere plus its sprites clear the frame
  const world = new THREE.Group(); scene.add(world);

  /* the wire cage: latitude rings plus a dust of points, all in the accent */
  const cage = new THREE.Group(); world.add(cage);
  for (let i = 1; i <= 6; i++) {
    const lat = (i / 7) * Math.PI - Math.PI / 2;
    const r = Math.cos(lat) * R, y = Math.sin(lat) * R;
    const pts = [];
    for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)); }
    cage.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0.13 })));
  }
  for (let i = 0; i < 8; i++) {
    const pts = [], phi = (i / 8) * Math.PI;
    for (let a = 0; a <= 48; a++) {
      const t = (a / 48) * Math.PI - Math.PI / 2;
      pts.push(new THREE.Vector3(Math.cos(t) * Math.cos(phi) * R, Math.sin(t) * R, Math.cos(t) * Math.sin(phi) * R));
    }
    cage.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0.07 })));
  }
  { /* a dust shell so the sphere reads solid from any angle */
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = Math.PI * (3 - Math.sqrt(5)) * i;
      pos[i * 3] = Math.cos(th) * rr * R * 1.005; pos[i * 3 + 1] = y * R * 1.005; pos[i * 3 + 2] = Math.sin(th) * rr * R * 1.005;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    cage.add(new THREE.Points(g, new THREE.PointsMaterial({ color: ACC, size: 0.018, transparent: true, opacity: 0.5 })));
  }

  /* the core: the Starknet mark, always facing the lens */
  const coreTex = new THREE.TextureLoader().load('/assets/img/starknet-mark.svg');
  coreTex.colorSpace = THREE.SRGBColorSpace;
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, transparent: true, depthWrite: false }));
  core.scale.setScalar(1.35); scene.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 24),
    new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.10 }));
  scene.add(halo);

  /* one canvas texture per project: round avatar in a ring of its category */
  const texCache = new Map();
  function tileTexture(acc, color) {
    const key = (acc.handle || acc.name) + '|' + color;
    if (texCache.has(key)) return texCache.get(key);
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#141414'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, 6.2832); x.fill();
    x.fillStyle = color; x.font = '500 44px "IBM Plex Mono", monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText((acc.handle || '?').replace(/^[@_]+/, '').slice(0, 2).toUpperCase(), S / 2, S / 2 + 2);
    x.strokeStyle = color; x.lineWidth = 5; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, 6.2832); x.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, tex);
    const cands = [];
    if (acc.avatar) cands.push(acc.avatar);
    if (acc.handle) cands.push('assets/avatars/' + acc.handle + '.webp', 'assets/avatars/' + acc.handle + '.jpg');
    (function tryNext(i) {
      if (i >= cands.length) return;
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () {
        x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 6, 0, 6.2832); x.clip();
        x.drawImage(img, 0, 0, S, S); x.restore();
        x.strokeStyle = color; x.lineWidth = 5; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, 6.2832); x.stroke();
        tex.needsUpdate = true;
      };
      img.onerror = function () { tryNext(i + 1); };
      img.src = cands[i];
    })(0);
    return tex;
  }

  /* nodes */
  const nodes = [];
  function layout(data) {
    const flat = [];
    CATS.forEach(cat => (data[cat.id] || []).forEach(acc => flat.push({ acc, cat })));
    const N = flat.length;
    countEl.innerHTML = '<b>' + N + '</b> projects &middot; ' + CATS.length + ' surfaces';
    flat.forEach((item, i) => {
      const y = 1 - (i / (N - 1 || 1)) * 1.86 - 0.07;
      const rr = Math.sqrt(Math.max(0.001, 1 - y * y));
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      const p = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(R);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tileTexture(item.acc, item.cat.color), transparent: true, depthWrite: false
      }));
      spr.position.copy(p); spr.scale.setScalar(0.42);
      spr.userData = { acc: item.acc, cat: item.cat, base: p.clone(), lift: 0 };
      world.add(spr); nodes.push(spr);
    });
    CATS.forEach(cat => {
      const b = document.createElement('button');
      b.type = 'button'; b.style.color = cat.color;
      b.innerHTML = '<i></i>' + cat.label + ' <span>' + (data[cat.id] || []).length + '</span>';
      b.addEventListener('click', () => {
        const on = b.classList.toggle('on');
        legendEl.querySelectorAll('button').forEach(o => { if (o !== b) o.classList.remove('on'); });
        filter = on ? cat.id : null;
      });
      legendEl.appendChild(b);
    });
  }

  /* interaction */
  let filter = null, spin = 0, tilt = 0.12, vel = 0, dragging = false, lastX = 0, lastY = 0, moved = 0, hovered = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const cv = renderer.domElement;
  const at = { x: 0, y: 0 };

  cv.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; moved = 0; vel = 0; cv.classList.add('dragging'); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    at.x = e.clientX - r.left; at.y = e.clientY - r.top;
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      spin += dx * DRAG; vel = dx * DRAG;
      tilt = Math.max(-0.6, Math.min(0.6, tilt + dy * DRAG * 0.6));
    }
  });
  function release(e) {
    if (!dragging) return; dragging = false; cv.classList.remove('dragging');
    if (moved <= 6 && hovered && hovered.userData.acc.url) window.open(hovered.userData.acc.url, '_blank', 'noopener');
  }
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('pointerleave', () => { hovered = null; chip.classList.remove('on'); });

  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function tick() {
    if (!dragging) { spin += AUTOSPIN + vel; vel *= DAMP; if (Math.abs(vel) < 1e-5) vel = 0; }
    world.rotation.y = spin; world.rotation.x = tilt;
    halo.scale.setScalar(1 + Math.sin(performance.now() * 0.0012) * 0.04);

    if (fine && !dragging) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(nodes, false)[0];
      hovered = hit ? hit.object : null;
    }
    nodes.forEach(n => {
      const d = n.userData;
      const dim = filter && d.cat.id !== filter;
      const want = n === hovered ? 1 : 0;
      d.lift += (want - d.lift) * 0.18;
      n.scale.setScalar((0.42 + d.lift * 0.2) * (dim ? 0.72 : 1));
      n.material.opacity = dim ? 0.22 : 0.55 + 0.45 * d.lift;
      n.position.copy(d.base).multiplyScalar(1 + d.lift * 0.12);
    });

    if (hovered) {
      const d = hovered.userData;
      chipName.textContent = d.acc.name || '';
      chipRole.textContent = d.acc.description || d.cat.label;
      chip.style.transform = 'translate3d(' + (at.x + 16) + 'px,' + (at.y - 14) + 'px,0) scale(1)';
      chip.classList.add('on'); cv.style.cursor = 'pointer';
    } else { chip.classList.remove('on'); cv.style.cursor = dragging ? 'grabbing' : 'grab'; }

    core.material.opacity = 1;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  fetch('/data/ecosystem.json').then(r => r.json()).then(data => {
    layout(data); resize();
    if (reduced) { world.rotation.y = 0.4; renderer.render(scene, camera); }
    else requestAnimationFrame(tick);
  }).catch(err => { console.error('[eco-globe]', err); MOUNT.style.display = 'none'; });
}
