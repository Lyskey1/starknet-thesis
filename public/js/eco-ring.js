/* Meet the gang: a WebGL card ring standing on real water.
   A true planar reflection (mirrored camera into a render target) sampled
   with ripple distortion, after the Mirror Hall section. Drag to spin with
   inertia, hover swells a card, the pointer stirs the surface. Labels are DOM
   projected onto each card so the type stays crisp and selectable.
   strk20 palette; the pool fades into the dock below so the two read as one. */
import * as THREE from 'three';

const MOUNT = document.getElementById('ecoRing');
if (MOUNT) {
  const GANGS = [
    { id: 'starkware', label: 'StarkWare gang' },
    { id: 'snf', label: 'Starknet Foundation' },
    { id: 'builders', label: 'Builders' },
    { id: 'shitposter', label: 'Shitposters' }
  ];
  /* the ring: card size in world units, and the gap between neighbours. The
     radius is solved from the member count so that gap never changes. */
  /* 2026-09-05 fit pass: cards about 22% smaller so title, tabs, ring and
     the focused caption share one 1440x900 viewport; the water reflection
     is a true mirror, so it scales with the cards by itself. */
  const CARD_W = 1.68, CARD_H = 2.38, CARD_GAP = 0.30, CARD_LIFT = 0.05, CARD_CURVE = 1;
  /* how many cards either side of the front stay lit: the rest sink into the
     dark rather than crowding the frame */
  const LIT_FROM = 2.1, LIT_TO = 3.1;
  /* the lens stands INSIDE the ring, as the reference's does: the cards face
     the axis, so from within the arc reads concave and fills the frame. */
  const FOV = 56, CAM_H = 1.22, CAM_INSET = 0.70;
  const AUTO_SPIN = 0.035, DRAG_SPEED = 0.0085, DAMP = 0.9, SNAP = 0.10;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  MOUNT.innerHTML =
    '<div class="es-screen">' +
      '<div class="es-stage"><div class="es-labels"></div>' +
        '<div class="es-hint">Drag to explore</div></div>' +
      '<div class="es-ui">' +
        '<div class="es-top"><p class="es-kicker">The voices</p>' +
          '<h2>Meet the gang</h2>' +
          '<p class="es-lede">The people building, shaping and shitposting Starknet. Drag the ring.</p>' +
          '<div class="es-ring-tabs" role="tablist"></div></div>' +
        '<div class="es-dock"><div class="es-count">[ <b>01</b> / 01 ]</div><div class="es-name"></div>' +
          '<div class="es-role"></div><div class="es-dots"></div></div>' +
      '</div>' +
    '</div>';

  const tabsEl = MOUNT.querySelector('.es-ring-tabs');
  const stage = MOUNT.querySelector('.es-stage');
  const labelsEl = MOUNT.querySelector('.es-labels');
  const hintEl = MOUNT.querySelector('.es-hint');
  const countEl = MOUNT.querySelector('.es-count');
  const nameEl = MOUNT.querySelector('.es-name');
  const roleEl = MOUNT.querySelector('.es-role');
  const dotsEl = MOUNT.querySelector('.es-dots');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  const carousel = new THREE.Group(); scene.add(carousel);

  /* ---------- cards ---------- */
  const loader = new THREE.TextureLoader();
  const texCache = new Map();
  function texFor(acc, mat) {
    const cands = [];
    if (acc.avatar && !acc.avatar.startsWith('data:')) cands.push('/' + acc.avatar.replace(/^\//, ''));
    if (acc.avatar && acc.avatar.startsWith('data:')) cands.push(acc.avatar);
    if (acc.handle) cands.push('/assets/avatars/' + acc.handle + '.jpg', '/assets/avatars/' + acc.handle + '.webp', '/assets/avatars/' + acc.handle + '.png');
    const key = cands[0] || acc.handle;
    if (texCache.has(key)) { const t = texCache.get(key); return t; }
    const tex = new THREE.Texture();
    (function tryNext(i) {
      if (i >= cands.length) return;
      loader.load(cands[i], (t) => {
        tex.image = t.image; tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
        if (mat && t.image) mat.uniforms.uImgAspect.value = t.image.width / t.image.height;
      }, undefined, () => tryNext(i + 1));
    })(0);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    texCache.set(key, tex);
    return tex;
  }

  function curvedCardGeo(w, h, R) {
    const g = new THREE.PlaneGeometry(w, h, 24, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), d = x / R;
      pos.setX(i, x + (R * Math.sin(d) - x) * CARD_CURVE);
      pos.setZ(i, R * (1 - Math.cos(d)) * CARD_CURVE);
    }
    pos.needsUpdate = true; return g;
  }

  function cardMaterial(map) {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        map: { value: map }, uAspect: { value: CARD_W / CARD_H }, uImgAspect: { value: 1 },
        uRadius: { value: 0.075 }, uGlow: { value: 0 }, uFade: { value: 1 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        uniform sampler2D map; uniform float uAspect, uImgAspect, uRadius, uGlow, uFade; varying vec2 vUv;
        float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r; }
        void main(){
          vec2 p = (vUv - 0.5); p.x *= uAspect;
          float d = sdRR(p, vec2(0.5*uAspect, 0.5), uRadius);
          float aa = max(fwidth(d), 1e-4);
          float inside = 1.0 - smoothstep(0.0, aa, d);
          if (inside < 0.003) discard;
          vec2 s = uAspect > uImgAspect ? vec2(1.0, uImgAspect/uAspect) : vec2(uAspect/uImgAspect, 1.0);
          vec2 iuv = (vUv - 0.5) * s + 0.5;
          vec3 tex = texture2D(map, iuv).rgb;
          /* the front card is lit a touch warmer, which is what the reflection
             then carries down into the water */
          tex += vec3(0.42, 0.16, 0.05) * uGlow * 0.5;
          gl_FragColor = vec4(tex, inside * uFade);
        }`
    });
  }

  let members = [], cards = [], labels = [], ringRadius = 6, front = 0, gang = GANGS[0].id;
  let spin = 0, spinVel = 0, dragging = false, lastX = 0, moved = 0, pointerId = null;

  function buildRing(list) {
    carousel.children.slice().forEach(c => { carousel.remove(c); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); });
    labels.forEach(l => l.el.remove()); labels = []; cards = []; members = list;
    const n = Math.max(list.length, 3);
    /* chord = 2 R sin(pi/n): solve R so the gap between cards is constant */
    ringRadius = (CARD_W + CARD_GAP) / (2 * Math.sin(Math.PI / n));
    const cardY = CARD_LIFT + CARD_H / 2;
    list.forEach((acc, i) => {
      const a = (i / n) * Math.PI * 2;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * ringRadius, cardY, Math.cos(a) * ringRadius);
      g.rotation.y = a + Math.PI;
      const mat = cardMaterial(null);
      mat.uniforms.map.value = texFor(acc, mat);
      const mesh = new THREE.Mesh(curvedCardGeo(CARD_W, CARD_H, ringRadius), mat);
      mesh.userData = { i, acc, swell: 0 };
      g.add(mesh); carousel.add(g); cards.push({ group: g, mesh, mat, acc, angle: a });

      /* the card's own band: handle AND role, on every card, so the
         information never requires focusing a card. The dock caption below
         stays as the focused card's larger readout. */
      const el = document.createElement('span');
      el.className = 'es-label';
      const nm = document.createElement('b');
      nm.textContent = acc.name || ('@' + (acc.handle || ''));
      el.appendChild(nm);
      if (acc.description) {
        const role = document.createElement('i');
        role.className = 'es-label-role';
        role.textContent = acc.description;
        el.appendChild(role);
      }
      labelsEl.appendChild(el); labels.push({ el, card: g });
    });
    /* card i sits at angle i/n * 2pi and the lens faces angle pi, so
       spin = pi puts INDEX 0 front and centre on load and on every tab
       switch (spin = 0 faced index n/2, which is why the ring used to
       open on card 10 of 18). */
    spin = Math.PI; spinVel = 0; front = 0; dock();
  }

  /* ---------- water ---------- */
  const TRAIL_N = 12;
  const trail = Array.from({ length: TRAIL_N }, () => new THREE.Vector3(0, 0, -1000));
  const reflectRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const reflectCam = new THREE.PerspectiveCamera();
  const textureMatrix = new THREE.Matrix4();
  const wu = {
    tReflect: { value: reflectRT.texture }, uTexMatrix: { value: textureMatrix }, uTime: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
    uDeep: { value: new THREE.Vector3(0.035, 0.030, 0.030) },
    uTint: { value: new THREE.Vector3(0.10, 0.035, 0.012) },   // strk20 orange, deep
    uReflBright: { value: 0.62 }, uRipScale: { value: 0.7 }, uRipDistort: { value: 0.09 },
    uGlint: { value: 0.05 }, uFresnel: { value: 2.1 }, uTrail: { value: trail }
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.ShaderMaterial({
    uniforms: wu,
    vertexShader: `precision highp float; uniform mat4 uTexMatrix; varying vec4 vRefl; varying vec3 vWpos;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWpos = wp.xyz; vRefl = uTexMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      precision highp float;
      #define TRAIL_N ${TRAIL_N}
      uniform sampler2D tReflect; uniform float uTime, uReflBright, uRipScale, uRipDistort, uGlint, uFresnel;
      uniform vec3 uCamPos, uDeep, uTint; uniform vec3 uTrail[TRAIL_N];
      varying vec4 vRefl; varying vec3 vWpos;
      void wave(vec2 p, vec2 d, float k, float w, float a, inout vec2 grad){ grad += a * k * cos(dot(d,p)*k + uTime*w) * d; }
      void main(){
        vec2 p = vWpos.xz; vec2 grad = vec2(0.0); float A = uRipScale;
        wave(p, normalize(vec2( 1.0, 0.35)), 1.7, 1.30, 0.045*A, grad);
        wave(p, normalize(vec2(-0.6, 1.0 )), 2.4, 1.05, 0.034*A, grad);
        wave(p, normalize(vec2( 0.4,-1.0 )), 3.6, 1.70, 0.022*A, grad);
        wave(p, normalize(vec2(-1.0,-0.2 )), 5.1, 2.20, 0.013*A, grad);
        float crest = 0.0;
        for(int i=0;i<TRAIL_N;i++){
          vec3 e = uTrail[i]; float age = uTime - e.z;
          if(age > 0.0 && age < 2.4){
            float d = distance(p, e.xy); float rad = age * 2.1;
            float band = exp(-pow((d - rad) * 3.2, 2.0)); float decay = (1.0 - age / 2.4);
            vec2 dir = d > 1e-4 ? (p - e.xy) / d : vec2(0.0);
            grad += dir * (-sin((d - rad) * 9.0) * 9.0 * band * decay * 0.010 * A);
            crest += cos((d - rad) * 9.0) * band * decay;
          }
        }
        vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
        vec3 V = normalize(uCamPos - vWpos);
        vec2 ruv = vRefl.xy / vRefl.w; ruv += N.xz * uRipDistort;
        vec3 refl = texture2D(tReflect, clamp(ruv, 0.001, 0.999)).rgb * uReflBright;
        float fres = 0.02 + 0.95 * pow(1.0 - clamp(dot(V, N), 0.0, 1.0), uFresnel);
        vec3 deep = mix(uDeep, uTint, 0.25 + 0.25 * N.y);
        vec3 col = mix(deep, refl, fres);
        vec3 gdir = normalize(vec3(0.2, 1.0, -0.3)); vec3 H = normalize(gdir + V);
        col += vec3(0.7, 0.42, 0.28) * pow(clamp(dot(N,H),0.0,1.0), 200.0) * uGlint;
        col += refl * max(crest, 0.0) * 0.09;
        float dist = length(vWpos.xz - uCamPos.xz);
        col = mix(col, uDeep, smoothstep(12.0, 44.0, dist));
        /* fade the far pool out so it meets the page, not a hard edge */
        float a = 1.0 - smoothstep(16.0, 46.0, dist);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true
  }));
  water.rotation.x = -Math.PI / 2; scene.add(water);

  const _rN = new THREE.Vector3(), _rW = new THREE.Vector3(), _cW = new THREE.Vector3(), _rot = new THREE.Matrix4();
  const _la = new THREE.Vector3(), _vw = new THREE.Vector3(), _tg = new THREE.Vector3(), _q = new THREE.Vector4(), _cl = new THREE.Vector4(), _pl = new THREE.Plane();
  function updateReflection() {
    _rW.setFromMatrixPosition(water.matrixWorld); _cW.setFromMatrixPosition(camera.matrixWorld);
    _rot.extractRotation(water.matrixWorld); _rN.set(0, 0, 1).applyMatrix4(_rot);
    _vw.subVectors(_rW, _cW); if (_vw.dot(_rN) > 0) return;
    _vw.reflect(_rN).negate().add(_rW);
    _rot.extractRotation(camera.matrixWorld);
    _la.set(0, 0, -1).applyMatrix4(_rot).add(_cW);
    _tg.subVectors(_rW, _la).reflect(_rN).negate().add(_rW);
    reflectCam.position.copy(_vw); reflectCam.up.set(0, 1, 0).applyMatrix4(_rot).reflect(_rN); reflectCam.lookAt(_tg);
    reflectCam.far = camera.far; reflectCam.updateMatrixWorld(); reflectCam.projectionMatrix.copy(camera.projectionMatrix);
    textureMatrix.set(0.5,0,0,0.5, 0,0.5,0,0.5, 0,0,0.5,0.5, 0,0,0,1);
    textureMatrix.multiply(reflectCam.projectionMatrix); textureMatrix.multiply(reflectCam.matrixWorldInverse); textureMatrix.multiply(water.matrixWorld);
    _pl.setFromNormalAndCoplanarPoint(_rN, _rW).applyMatrix4(reflectCam.matrixWorldInverse);
    _cl.set(_pl.normal.x, _pl.normal.y, _pl.normal.z, _pl.constant);
    const M = reflectCam.projectionMatrix;
    _q.x = (Math.sign(_cl.x) + M.elements[8]) / M.elements[0];
    _q.y = (Math.sign(_cl.y) + M.elements[9]) / M.elements[5];
    _q.z = -1.0; _q.w = (1.0 + M.elements[10]) / M.elements[14];
    _cl.multiplyScalar(2.0 / _cl.dot(_q));
    M.elements[2] = _cl.x; M.elements[6] = _cl.y; M.elements[10] = _cl.z + 1.0; M.elements[14] = _cl.w;
    water.visible = false;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(reflectRT); renderer.clear(); renderer.render(scene, reflectCam); renderer.setRenderTarget(prev);
    water.visible = true;
  }

  /* ---------- interaction ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null, waterHit = new THREE.Vector3(), trailAt = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = renderer.domElement;

  cv.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; moved = 0; spinVel = 0; pointerId = e.pointerId;
    stage.classList.add('dragging'); cv.setPointerCapture(e.pointerId); hintEl.classList.remove('on');
  });
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    hintEl.style.transform = 'translate3d(' + (e.clientX - r.left + 16) + 'px,' + (e.clientY - r.top - 12) + 'px,0)';
    if (!dragging && fine) hintEl.classList.add('on');
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); spin += dx * DRAG_SPEED; spinVel = dx * DRAG_SPEED; }
    /* stir the surface where the pointer meets it */
    ray.setFromCamera(ndc, camera);
    const t = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), waterHit);
    if (t && performance.now() - trailAt > 90) {
      trailAt = performance.now();
      trail.push(trail.shift().set(waterHit.x, waterHit.z, wu.uTime.value));
    }
  });
  function release(e) {
    if (!dragging) return;
    dragging = false; stage.classList.remove('dragging');
    /* under ~6px of travel this was a click, not a drag: open the person's
       X profile in a new tab (the roadmap fan's threshold) */
    if (moved <= 6 && hovered) {
      const acc = hovered.userData.acc;
      if (acc && acc.url) window.open(acc.url, '_blank', 'noopener');
    }
  }
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('pointerleave', () => { hintEl.classList.remove('on'); hovered = null; });
  stage.setAttribute('tabindex', '0');
  stage.addEventListener('keydown', e => {
    const step = (Math.PI * 2) / Math.max(cards.length, 1);
    if (e.key === 'ArrowLeft') { spin += step; e.preventDefault(); }
    if (e.key === 'ArrowRight') { spin -= step; e.preventDefault(); }
  });

  /* ---------- dock ---------- */
  const pad = n => (n < 10 ? '0' : '') + n;
  function dock() {
    const acc = (cards[front] || {}).acc; if (!acc) return;
    countEl.innerHTML = '[ <b>' + pad(front + 1) + '</b> / ' + pad(cards.length) + ' ]';
    nameEl.innerHTML = '<a href="' + (acc.url || '#') + '" target="_blank" rel="noopener">' + (acc.name || '') + '</a>';
    roleEl.textContent = acc.description || '';
    if (dotsEl.children.length !== cards.length) {
      dotsEl.innerHTML = ''; cards.forEach(() => dotsEl.appendChild(document.createElement('i')));
    }
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === front));
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const dpr = renderer.getPixelRatio();
    reflectRT.setSize(Math.max(2, Math.floor(w * dpr * 0.6)), Math.max(2, Math.floor(h * dpr * 0.6)));
  }
  addEventListener('resize', resize);

  const _v = new THREE.Vector3();
  function frame() {
    const t = performance.now() * 0.001;
    wu.uTime.value = t;

    if (!dragging) {
      spin += AUTO_SPIN * 0.016;
      if (Math.abs(spinVel) > 0.0004) { spin += spinVel; spinVel *= DAMP; }
      else {
        spinVel = 0;
        const n = Math.max(cards.length, 1), step = (Math.PI * 2) / n;
        const off = ((spin - Math.PI) % step + step) % step;
        spin -= (off > step / 2 ? off - step : off) * SNAP;
      }
    }
    carousel.rotation.y = spin;

    camera.position.set(0, CAM_H, ringRadius * CAM_INSET);
    camera.lookAt(0, CARD_LIFT + CARD_H * 0.34, -ringRadius * 0.5);
    wu.uCamPos.value.copy(camera.position);

    /* which card faces the lens, and the hover swell */
    if (fine && !dragging) { ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(cards.map(c => c.mesh), false)[0]; hovered = hit ? hit.object : null; }
    cv.style.cursor = dragging ? 'grabbing' : (hovered ? 'pointer' : 'grab');
    let best = 0, bestZ = Infinity;
    cards.forEach((c, i) => {
      c.group.getWorldPosition(_v);
      if (_v.z < bestZ) { bestZ = _v.z; best = i; }
      const want = c.mesh === hovered ? 1 : 0;
      c.mesh.userData.swell += (want - c.mesh.userData.swell) * 0.16;
      const s = 1 + c.mesh.userData.swell * 0.045;
      c.group.scale.setScalar(s);
      c.mat.uniforms.uGlow.value = (i === best ? 0.55 : 0) + c.mesh.userData.swell * 0.4;
      /* slots away from the front, wrapped: only LIT_TO of them stay visible */
      const n = cards.length || 1;
      let d = Math.abs(i - best); d = Math.min(d, n - d);
      const lit = 1 - Math.min(1, Math.max(0, (d - LIT_FROM) / (LIT_TO - LIT_FROM)));
      c.mat.uniforms.uFade.value = lit;
      c.group.visible = lit > 0.003;
    });
    if (best !== front) { front = best; dock(); }

    /* DOM labels ride their cards, but never climb into the tab row above */
    const rect = cv.getBoundingClientRect();
    const tabs = tabsEl.getBoundingClientRect();
    const guard = tabs.bottom - rect.top + 14;
    labels.forEach((l, i) => {
      /* BOTTOM band, not top: anchored above the card's lower edge so the
         handle + role plate can never climb into the gang tab row */
      l.card.getWorldPosition(_v); _v.y -= CARD_H * 0.34;
      const p = _v.clone().project(camera);
      const facing = _v.clone().sub(camera.position).normalize();
      const near = p.z < 1 && Math.abs(p.x) < 0.62;
      /* lit cards keep a floor of 0.95 label opacity so the accent role
         stays over the 4.6:1 line on neighbours; only the cards already
         sinking into the dark fade their bands with them */
      const n2 = cards.length || 1;
      let dd = Math.abs(i - front); dd = Math.min(dd, n2 - dd);
      const litHere = 1 - Math.min(1, Math.max(0, (dd - LIT_FROM) / (LIT_TO - LIT_FROM)));
      const falloff = Math.max(0, 1 - Math.abs(p.x) / 0.62);
      const y = (-p.y * 0.5 + 0.5) * rect.height;
      /* the label anchors by its BOTTOM edge (translate -100%), so the
         two-line handle + role band must clear the tab row by its own
         height, not just its baseline */
      const clear = y - l.el.offsetHeight > guard;
      l.el.style.opacity = (near && clear) ? String(i === front ? 1 : Math.max(0.95 * litHere, falloff * 0.55)) : '0';
      l.el.style.transform = 'translate(-50%,-100%) translate(' + ((p.x * 0.5 + 0.5) * rect.width) + 'px,' + y + 'px)';
      l.el.classList.toggle('is-front', i === front);
    });

    updateReflection();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  fetch('/data/ecosystem.json').then(r => r.json()).then(data => {
    GANGS.forEach((g, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = g.label + ' (' + (data[g.id] || []).length + ')';
      if (i === 0) b.className = 'on';
      b.addEventListener('click', () => {
        tabsEl.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on'); gang = g.id; buildRing(data[g.id] || []); resize();
      });
      tabsEl.appendChild(b);
    });
    buildRing(data[gang] || []);
    resize();
    if (reduced) { carousel.rotation.y = 0; updateReflection(); renderer.render(scene, camera); }
    else requestAnimationFrame(frame);
  }).catch(err => { console.error('[eco-ring]', err); MOUNT.style.display = 'none'; });
}
