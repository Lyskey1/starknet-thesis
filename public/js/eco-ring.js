/* Meet the gang: FOUR WebGL card rings standing on real water, one stage per
   gang, stacked in the pill order, so every visitor who scrolls sees all 69
   voices (2026-09-05 direction change: the single gang-switching ring and its
   pill logic are gone; the pills are anchors now).

   Each stage is the same ring component as before: a true planar reflection
   (mirrored camera into a render target) sampled with ripple distortion,
   drag to spin with inertia, hover swells a card, the pointer stirs the
   surface, DOM-projected labels, click-through to X. Every stage owns its
   own state: dragging one never moves another.

   PERFORMANCE CONTRACT (non-negotiable, per the pass spec):
   - a stage's GL and DOM mount only when the stage is within one viewport
     of entering (IntersectionObserver, rootMargin 100%);
   - its loop and reflection updates stop the moment it leaves that margin;
   - the WebGL context is DESTROYED on leave (forceContextLoss + dispose +
     canvas removed), not kept: with a 100% margin at most three stages can
     ever be inside the window, so at no point do four contexts or four
     loops exist. Textures are decoded once into a module-level cache and
     re-upload per context on re-entry.
   The ring geometry math, palette and interactions are byte-equivalent to
   the single-ring version. */
import * as THREE from 'three';

const HOST = document.getElementById('ecoRing');
if (HOST) {
  const GANGS = [
    { id: 'starkware', name: 'StarkWare', label: 'StarkWare gang' },
    { id: 'snf', name: 'Starknet Foundation', label: 'Starknet Foundation gang' },
    { id: 'builders', name: 'Builders', label: 'Builders gang' },
    { id: 'shitposter', name: 'Shitposter', label: 'Shitposter gang' }
  ];
  /* the ring: card size in world units, and the gap between neighbours. The
     radius is solved from the member count so that gap never changes.
     2026-09-05 fit pass: cards about 22% smaller so header, ring and the
     focused caption share one viewport under the two bars. */
  const CARD_W = 1.68, CARD_H = 2.38, CARD_GAP = 0.30, CARD_LIFT = 0.05, CARD_CURVE = 1;
  const LIT_FROM = 2.1, LIT_TO = 3.1;
  const FOV = 56, CAM_H = 1.22, CAM_INSET = 0.70;
  /* FIXED CARD, FIXED ARC, FIXED FRONT (2026-09-05): the card is one
     constant size on every ring; the radius comes from the count at a
     constant arc per card, R(n) = n * (cardW + gap) / 2PI, so neighbors sit
     at identical spacing on all four rings; and the camera keeps ONE
     distance to the front card (the StarkWare ring's own, n = 18), so the
     front card renders at the same on-screen size everywhere and a larger
     ring simply recedes further into depth behind it. The reflection is a
     mirror of this same camera, so it follows by construction. */
  const RADIUS = n => (n * (CARD_W + CARD_GAP)) / (2 * Math.PI);
  const D_REF = (1 + CAM_INSET) * RADIUS(18);
  const AUTO_SPIN = 0.035, DRAG_SPEED = 0.0085, DAMP = 0.9, SNAP = 0.10;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  /* mobile keeps 50fps while dragging by rendering the reflection at a
     lower scale (see resize()); desktop keeps the full 0.6 */
  const SMALL = matchMedia('(max-width: 700px)').matches;
  const REFLECT_SCALE = SMALL ? 0.35 : 0.6;

  /* ---------- shared texture cache (decoded once, uploads per context) ---------- */
  const loader = new THREE.TextureLoader();
  const texCache = new Map();
  function texFor(acc, mat) {
    const cands = [];
    if (acc.avatar && !acc.avatar.startsWith('data:')) cands.push('/' + acc.avatar.replace(/^\//, ''));
    if (acc.avatar && acc.avatar.startsWith('data:')) cands.push(acc.avatar);
    if (acc.handle) cands.push('/assets/avatars/' + acc.handle + '.jpg', '/assets/avatars/' + acc.handle + '.webp', '/assets/avatars/' + acc.handle + '.png');
    const key = cands[0] || acc.handle;
    let entry = texCache.get(key);
    if (!entry) {
      const tex = new THREE.Texture();
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      entry = { tex, aspect: 1, waiters: [] };
      texCache.set(key, entry);
      (function tryNext(i) {
        if (i >= cands.length) return;
        loader.load(cands[i], t => {
          entry.tex.image = t.image; entry.tex.needsUpdate = true;
          entry.aspect = t.image.width / t.image.height;
          entry.waiters.forEach(m => { m.uniforms.uImgAspect.value = entry.aspect; });
          entry.waiters.length = 0;
        }, undefined, () => tryNext(i + 1));
      })(0);
    }
    if (entry.tex.image) mat.uniforms.uImgAspect.value = entry.aspect;
    else entry.waiters.push(mat);
    return entry.tex;
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

  function cardMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        map: { value: null }, uAspect: { value: CARD_W / CARD_H }, uImgAspect: { value: 1 },
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

  const TRAIL_N = 12;
  const pad = n => (n < 10 ? '0' : '') + n;

  /* =============================== one stage =============================== */
  function RingStage(section, list) {
    const stage = section.querySelector('.es-stage');
    const labelsEl = section.querySelector('.es-labels');
    const hintEl = section.querySelector('.es-hint');
    const countEl = section.querySelector('.es-count');
    const nameEl = section.querySelector('.es-name');
    const roleEl = section.querySelector('.es-role');
    const dotsEl = section.querySelector('.es-dots');

    /* state that survives a leave/re-enter teardown */
    let spin = Math.PI, spinVel = 0, front = 0;
    let mounted = false, running = false, raf = 0;
    let renderer = null, scene, camera, carousel, water, wu, reflectRT, reflectCam, textureMatrix;
    let cards = [], labels = [], ringRadius = 6;
    let dragging = false, lastX = 0, moved = 0;
    let hovered = null, trailAt = 0, trail;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const _v = new THREE.Vector3();
    const _rN = new THREE.Vector3(), _rW = new THREE.Vector3(), _cW = new THREE.Vector3(), _rot = new THREE.Matrix4();
    const _la = new THREE.Vector3(), _vw = new THREE.Vector3(), _tg = new THREE.Vector3(), _q = new THREE.Vector4(), _cl = new THREE.Vector4(), _pl = new THREE.Plane();

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
      if (!renderer) return;
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const dpr = renderer.getPixelRatio();
      reflectRT.setSize(Math.max(2, Math.floor(w * dpr * REFLECT_SCALE)), Math.max(2, Math.floor(h * dpr * REFLECT_SCALE)));
      /* the front card's on-screen width, for the label clamp: constant
         camera-to-front distance makes this one number per viewport */
      const focal = (h / 2) / Math.tan((FOV * Math.PI / 180) / 2);
      stage.style.setProperty('--es-cardw', (CARD_W * focal / D_REF).toFixed(1) + 'px');
    }

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

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);
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

      camera.position.set(0, CAM_H, D_REF - ringRadius);
      camera.lookAt(0, CARD_LIFT + CARD_H * 0.34, -ringRadius * 0.5);
      wu.uCamPos.value.copy(camera.position);

      /* which card faces the lens, and the hover swell */
      const cv = renderer.domElement;
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
        const n = cards.length || 1;
        let d = Math.abs(i - best); d = Math.min(d, n - d);
        const lit = 1 - Math.min(1, Math.max(0, (d - LIT_FROM) / (LIT_TO - LIT_FROM)));
        c.mat.uniforms.uFade.value = lit;
        c.group.visible = lit > 0.003;
      });
      if (best !== front) { front = best; dock(); }

      /* DOM labels ride their cards; the guard keeps the band inside the
         stage (the gang header row sits above the canvas, in flow) */
      const rect = cv.getBoundingClientRect();
      const guard = 14;
      labels.forEach((l, i) => {
        l.card.getWorldPosition(_v); _v.y -= CARD_H * 0.34;
        const p = _v.clone().project(camera);
        const near = p.z < 1 && Math.abs(p.x) < 0.62;
        const n2 = cards.length || 1;
        let dd = Math.abs(i - front); dd = Math.min(dd, n2 - dd);
        const litHere = 1 - Math.min(1, Math.max(0, (dd - LIT_FROM) / (LIT_TO - LIT_FROM)));
        const falloff = Math.max(0, 1 - Math.abs(p.x) / 0.62);
        const y = (-p.y * 0.5 + 0.5) * rect.height;
        const clear = y - l.el.offsetHeight > guard;
        l.el.style.opacity = (near && clear) ? String(i === front ? 1 : Math.max(0.95 * litHere, falloff * 0.55)) : '0';
        l.el.style.transform = 'translate(-50%,-100%) translate(' + ((p.x * 0.5 + 0.5) * rect.width) + 'px,' + y + 'px)';
        l.el.classList.toggle('is-front', i === front);
      });

      updateReflection();
      renderer.render(scene, camera);
    }

    function onDown(e) {
      dragging = true; lastX = e.clientX; moved = 0; spinVel = 0;
      stage.classList.add('dragging'); renderer.domElement.setPointerCapture(e.pointerId); hintEl.classList.remove('on');
    }
    function onMove(e) {
      const cv = renderer.domElement;
      const r = cv.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      hintEl.style.transform = 'translate3d(' + (e.clientX - r.left + 16) + 'px,' + (e.clientY - r.top - 12) + 'px,0)';
      if (!dragging && fine) hintEl.classList.add('on');
      if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); spin += dx * DRAG_SPEED; spinVel = dx * DRAG_SPEED; }
      ray.setFromCamera(ndc, camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (hit && performance.now() - trailAt > 90) {
        trailAt = performance.now();
        trail.push(trail.shift().set(hit.x, hit.z, wu.uTime.value));
      }
    }
    function onUp() {
      if (!dragging) return;
      dragging = false; stage.classList.remove('dragging');
      /* under ~6px of travel this was a click, not a drag: open the person's
         X profile in a new tab (the roadmap fan's threshold) */
      if (moved <= 6 && hovered) {
        const acc = hovered.userData.acc;
        if (acc && acc.url) window.open(acc.url, '_blank', 'noopener');
      }
    }
    function onLeavePtr() { hintEl.classList.remove('on'); hovered = null; }

    function build() {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      stage.insertBefore(renderer.domElement, stage.firstChild);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
      carousel = new THREE.Group(); scene.add(carousel);

      /* cards */
      cards = []; labels = []; labelsEl.innerHTML = '';
      const n = Math.max(list.length, 3);
      ringRadius = RADIUS(n);
      const cardY = CARD_LIFT + CARD_H / 2;
      list.forEach((acc, i) => {
        const a = (i / n) * Math.PI * 2;
        const g = new THREE.Group();
        g.position.set(Math.sin(a) * ringRadius, cardY, Math.cos(a) * ringRadius);
        g.rotation.y = a + Math.PI;
        const mat = cardMaterial();
        mat.uniforms.map.value = texFor(acc, mat);
        const mesh = new THREE.Mesh(curvedCardGeo(CARD_W, CARD_H, ringRadius), mat);
        mesh.userData = { i, acc, swell: 0 };
        g.add(mesh); carousel.add(g); cards.push({ group: g, mesh, mat, acc, angle: a });

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
      /* card i sits at angle i/n * 2pi and the lens faces angle pi, so the
         preserved spin (pi on first mount) keeps the same card front across
         a leave/re-enter; index 0 fronts on first sight of every stage */
      dock();

      /* water */
      trail = Array.from({ length: TRAIL_N }, () => new THREE.Vector3(0, 0, -1000));
      reflectRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      reflectCam = new THREE.PerspectiveCamera();
      textureMatrix = new THREE.Matrix4();
      wu = {
        tReflect: { value: reflectRT.texture }, uTexMatrix: { value: textureMatrix }, uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uDeep: { value: new THREE.Vector3(0.035, 0.030, 0.030) },
        uTint: { value: new THREE.Vector3(0.10, 0.035, 0.012) },   // strk20 orange, deep
        uReflBright: { value: 0.62 }, uRipScale: { value: 0.7 }, uRipDistort: { value: 0.09 },
        uGlint: { value: 0.05 }, uFresnel: { value: 2.1 }, uTrail: { value: trail }
      };
      water = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.ShaderMaterial({
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

      const cv = renderer.domElement;
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onUp);
      cv.addEventListener('pointerleave', onLeavePtr);

      resize();
      mounted = true;
    }

    function teardown() {
      running = false; cancelAnimationFrame(raf);
      if (!mounted) return;
      dragging = false; hovered = null;
      labels.forEach(l => l.el.remove()); labels = [];
      carousel.children.slice().forEach(c => { carousel.remove(c); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); });
      water.geometry.dispose(); water.material.dispose();
      reflectRT.dispose();
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      renderer.domElement.remove();
      renderer = null; scene = null; cards = [];
      mounted = false;
    }

    return {
      section,
      get running() { return running; },
      enter() {
        if (!mounted) build();
        if (reduced) {
          /* settled render: one frame, no loop */
          carousel.rotation.y = spin;
          camera.position.set(0, CAM_H, D_REF - ringRadius);
          camera.lookAt(0, CARD_LIFT + CARD_H * 0.34, -ringRadius * 0.5);
          wu.uCamPos.value.copy(camera.position);
          updateReflection(); renderer.render(scene, camera);
          return;
        }
        if (!running) { running = true; raf = requestAnimationFrame(frame); }
      },
      leave() { teardown(); },
      step(d) { spin += d; },
      resize() { if (mounted) resize(); }
    };
  }

  /* =============================== the stages =============================== */
  const tabsHost = document.querySelector('.eco-subnav .eco-gang-tabs');

  HOST.innerHTML =
    '<div class="es-top es-intro"><p class="es-kicker">The voices</p>' +
      '<h2>Meet the gang</h2>' +
      '<p class="es-lede">The people building, shaping and shitposting Starknet. Drag the ring.</p></div>' +
    GANGS.map(g =>
      '<section class="es-gang" id="gang-' + g.id + '" data-gang="' + g.id + '">' +
        '<div class="es-gbar"><span class="es-gname">' + g.label + '</span><span class="es-gcount"></span></div>' +
        '<div class="es-screen">' +
          '<div class="es-stage"><div class="es-labels"></div>' +
            '<div class="es-hint">Drag to explore</div></div>' +
          '<div class="es-ui es-ui-stage">' +
            '<div class="es-dock"><div class="es-count">[ <b>01</b> / 01 ]</div><div class="es-name"></div>' +
              '<div class="es-role"></div><div class="es-dots"></div></div>' +
          '</div>' +
        '</div>' +
      '</section>').join('');

  fetch('/data/ecosystem.json').then(r => r.json()).then(data => {
    const stages = [];
    GANGS.forEach(g => {
      const list = data[g.id] || [];
      const section = HOST.querySelector('#gang-' + g.id);
      section.querySelector('.es-gcount').textContent = String(list.length);
      const st = RingStage(section, list);
      stages.push(st);

      /* keyboard steering, per stage: one card step through the stage's
         own closed-over spin */
      const stEl = section.querySelector('.es-stage');
      stEl.setAttribute('tabindex', '0');
      stEl.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const step = (Math.PI * 2) / Math.max(list.length, 1);
        st.step(e.key === 'ArrowLeft' ? step : -step);
      });
    });

    /* mount/run only within one viewport of entering; destroy on leave */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        const st = stages.find(s => s.section === e.target);
        if (!st) return;
        if (e.isIntersecting) st.enter(); else st.leave();
      }), { rootMargin: '100% 0px 100% 0px', threshold: 0 });
      stages.forEach(st => io.observe(st.section));
    } else {
      stages.forEach(st => st.enter());
    }
    addEventListener('resize', () => stages.forEach(st => st.resize()));

    /* the pills are ANCHORS now: no gang-switch logic anywhere. Click lands
       the stage under the two bars (nav + measured sub-bar); the spy below
       owns the active state. */
    if (tabsHost) {
      GANGS.forEach(g => {
        const b = document.createElement('button');
        b.type = 'button'; b.classList.add('dg-glass');
        b.setAttribute('data-gang', g.id);
        b.textContent = g.label + ' (' + (data[g.id] || []).length + ')';
        b.addEventListener('click', () => {
          const sec = HOST.querySelector('#gang-' + g.id);
          const bar = document.querySelector('.eco-subnav');
          const y = sec.getBoundingClientRect().top + scrollY - 64 - (bar ? bar.offsetHeight : 88);
          window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
        });
        tabsHost.appendChild(b);
      });
      /* scroll spy: the stage that dominates the reading band (nav + measured
         bar + 24, the projects spy's own band) holds its pill active */
      if ('IntersectionObserver' in window) {
        const bar = document.querySelector('.eco-subnav');
        const top = 64 + (bar ? bar.offsetHeight : 88) + 24;
        const inView = [];
        const spy = new IntersectionObserver(entries => {
          entries.forEach(e => {
            const i = inView.indexOf(e.target);
            if (e.isIntersecting && i === -1) inView.push(e.target);
            if (!e.isIntersecting && i !== -1) inView.splice(i, 1);
          });
          let bestId = null, bestTop = Infinity;
          inView.forEach(el => {
            const t = el.getBoundingClientRect().top;
            if (t < bestTop) { bestTop = t; bestId = el.getAttribute('data-gang'); }
          });
          tabsHost.querySelectorAll('button').forEach(x => {
            const on = bestId !== null && x.getAttribute('data-gang') === bestId;
            x.classList.toggle('on', on); x.classList.toggle('active', on);
          });
        }, { rootMargin: '-' + top + 'px 0px -55% 0px', threshold: 0 });
        stages.forEach(st => spy.observe(st.section));
      }
    }

    /* the four committed search-index anchors (#starkware, #snf, #builders,
       #shitposter: zero-height spans parked before this block in the static
       markup, because these stages only exist after JS) relocate onto their
       own stages, so a palette landing or a hash arrival reaches the right
       gang, not just the top of the block. Their scroll-margin rides along. */
    GANGS.forEach(g => {
      const a = document.getElementById(g.id);
      if (a && a.classList.contains('eco-anchor')) {
        const sec = HOST.querySelector('#gang-' + g.id);
        if (sec) sec.parentNode.insertBefore(a, sec);
      }
    });

    /* perf probes reach the stages here (never used by the page itself) */
    window.__ecoStages = stages;
  }).catch(err => { console.error('[eco-ring]', err); HOST.style.display = 'none'; });
}
