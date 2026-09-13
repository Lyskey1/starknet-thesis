/* THE PARTICLE MARK ENGINE, shared (2026-09-08).

   Extracted from js/quantum-hero-mark.js, which was itself the twin of
   js/strk-hero-mark.js / js/btcfi-hero-mark.js / js/digest-hero-mark.js:
   the same THREE.Points pipeline, the same additive point material and
   fragment disc, the same world-y gradient computed in the vertex shader
   (accent at the bottom through warm to chalk at the top, pinned to the
   frame however the object moves), the same SPEED-scaled clock, the same
   drift sines, the same density/size discipline (uSz trim, uPix cap, uH
   scaling), the same IntersectionObserver visibility gating,
   document.hidden pause and reduced-motion single settled frame.

   The engine owns everything a mark shares. A mark supplies only its
   GEOMETRY (fill functions over the attribute arrays), its MOTION (an
   optional GLSL hook that may move a particle per frame from its own
   attributes), its FIT (camera distance against the mount) and its DRAW
   (group transforms per frame). Two consumers:
     - js/quantum-hero-mark.js (the funnel on /quantum), the file this was
       cut out of, which must render exactly as before;
     - the landing hero's convergence (src/views/home/hero), bundled by
       Next from this same file, so the two heroes cannot drift apart.

   The bare 'three' specifier resolves through the page's importmap on the
   static pages and through node_modules in the Next bundle.

   strk20 palette only: accent #c53400, warm #e07a4a, chalk #fafafa. */
import * as THREE from 'three';

export { THREE };

export const PALETTE = { acc: '#c53400', warm: '#e07a4a', chalk: '#fafafa' };

/* deterministic hash noise, the twins' idiom: no Math.random, so a reload
   never reshuffles a field */
export const rnd = (i, s) => Math.abs(Math.sin((i + 1) * s) * 43758.5453 % 1);

export const FRAG = `
      varying vec3 vC; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = (1.0 - smoothstep(0.08, 0.5, d)) * vA;
        if (a < 0.008) discard;
        gl_FragColor = vec4(vC, a);
      }`;

/* The shared vertex program. `move` is the mark's own GLSL, run before the
   drift sines with `p` (the particle position), `fadeFlow`, `pulse` and
   `alphaPulse` in scope: it may reassign any of them. A mark with static
   geometry passes nothing and gets the twins' program verbatim. */
export function vertexShader({ attributes = '', uniforms = '', move = '' } = {}) {
  return `
      attribute float aSize; attribute float aPhase; attribute float aAlpha; attribute float aTint;
      ${attributes}
      varying vec3 vC; varying float vA;
      uniform float uPix, uH, uFade, uTime, uDrift, uSpan, uSz;
      ${uniforms}
      uniform vec3 uAcc, uWarm, uChalk;
      void main(){
        vec3 p = position;
        float fadeFlow = 1.0;
        float pulse = 1.0;
        float alphaPulse = 1.0;
        ${move}
        p.z += sin(uTime * 0.75 + aPhase * 6.2831) * 0.055 * uDrift;
        p.x += sin(uTime * 0.51 + aPhase * 12.566) * 0.014 * uDrift;
        p.y += cos(uTime * 0.63 + aPhase * 9.4248) * 0.014 * uDrift;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        float t = clamp(wp.y / uSpan + 0.5, 0.0, 1.0);
        vec3 base = t > 0.52 ? mix(uWarm, uChalk, (t - 0.52) / 0.48)
                             : mix(uAcc,  uWarm,  t / 0.52);
        vC = base * aTint;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, aSize * pulse * uSz * uPix * (uH / 900.0) * (10.0 / max(d, 0.5)));
        vA = aAlpha * uFade * fadeFlow * alphaPulse;
      }`;
}

/* createMark({ mount, host, tag, speed, fov, far })
     mount  the box the canvas is appended to (absolute, clipped by CSS)
     host   the element whose visibility gates the loop (default: the
            mount's closest .hero, else the mount itself)
     tag    the console prefix
     speed  the single slowdown lever: one clock, everything scaled off it
   Returns null when WebGL is unavailable (the hero renders without the
   centrepiece and the copy is unaffected). Otherwise:
     { THREE, renderer, scene, camera, world, mats, HALF_FOV, reduced,
       smallMQ, makeMaterial, points, run, dispose } */
export function createMark({ mount, host, tag = 'hero-mark', speed = 0.34, fov = 40, far = 90 }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallMQ = matchMedia('(max-width: 980px)');

  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { console.error('[' + tag + '] no WebGL context, the hero renders without the centrepiece', e); }
  if (!renderer) return null;

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, far);
  const HALF_FOV = Math.tan((fov / 2) * Math.PI / 180);

  const world = new THREE.Group();
  scene.add(world);

  const mats = [];
  /* makeMaterial(vert, extraUniforms, drift, span): the additive point
     material; the mark's own uniforms ride beside the shared set */
  function makeMaterial(vert, extraUniforms, drift, span) {
    const uniforms = {
      uPix: { value: 1 }, uH: { value: 900 }, uFade: { value: 0 }, uSz: { value: 1 },
      uTime: { value: 0 }, uDrift: { value: drift }, uSpan: { value: span },
      uAcc: { value: new THREE.Color(PALETTE.acc) },
      uWarm: { value: new THREE.Color(PALETTE.warm) },
      uChalk: { value: new THREE.Color(PALETTE.chalk) }
    };
    for (const k in extraUniforms) uniforms[k] = { value: extraUniforms[k] };
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: vert, fragmentShader: FRAG,
      uniforms
    });
    mats.push(m);
    return m;
  }

  /* points(N, fill, mat, extraAttrs, boundingRadius)
       fill(i, pos, siz, pha, alp, tin, x) writes particle i; `x` holds one
       Float32Array per name in extraAttrs. A boundingRadius pins the
       bounding sphere by hand for geometry the shader moves per frame, so
       culling never clips a particle mid-motion. */
  function points(N, fill, mat, extraAttrs = [], boundingRadius) {
    const pos = new Float32Array(N * 3);
    const siz = new Float32Array(N), pha = new Float32Array(N);
    const alp = new Float32Array(N), tin = new Float32Array(N);
    const x = {};
    extraAttrs.forEach((name) => { x[name] = new Float32Array(N); });
    for (let i = 0; i < N; i++) fill(i, pos, siz, pha, alp, tin, x);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(tin, 1));
    extraAttrs.forEach((name) => { g.setAttribute(name, new THREE.BufferAttribute(x[name], 1)); });
    if (boundingRadius) g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), boundingRadius);
    return new THREE.Points(g, mat);
  }

  /* ================= fit, loop, gating =================
     run({ fit, target, draw })
       fit({ camera, aspect, small, HALF_FOV, w, h }) sets the camera
            distance for the mount and returns the density trim (uSz)
       target(small) the settled fade level
       draw(world, t) the per-frame group transforms */
  let raf = 0, running = false, visible = false, lit = 0, io = null, rt;
  const state = { t0: performance.now() };
  let userFit = null, userTarget = () => 1, userDraw = null;

  function fit() {
    const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const sm = smallMQ.matches;
    const trim = userFit ? userFit({ camera, aspect: camera.aspect, small: sm, HALF_FOV, w, h }) : 1;
    camera.updateProjectionMatrix();
    const pix = Math.min(devicePixelRatio || 1, 2);
    mats.forEach((m) => { m.uniforms.uH.value = h; m.uniforms.uPix.value = pix; m.uniforms.uSz.value = trim; });
  }

  function draw(t) {
    const want = userTarget(smallMQ.matches);
    lit += (want - lit) * 0.03;
    mats.forEach((m) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uFade.value = reduced ? want : lit;
    });
    if (userDraw) userDraw(world, t);
    renderer.render(scene, camera);
  }

  function tick(now) { draw(((now - state.t0) / 1000) * speed); raf = requestAnimationFrame(tick); }
  function start() { if (running || reduced) return; running = true; raf = requestAnimationFrame(tick); }
  function stop() { if (!running) return; running = false; cancelAnimationFrame(raf); }
  /* a mount that was laid out at zero (inside a hidden panel) is measured
     again the moment it comes on screen; for a mount that never moved the
     re-fit computes the same values it already holds */
  function update() { if (visible && !document.hidden) { fit(); start(); if (reduced) draw(0); } else stop(); }
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(() => { fit(); if (reduced) draw(0); }, 120);
  }

  function run(hooks) {
    userFit = hooks.fit || null;
    userTarget = hooks.target || (() => 1);
    userDraw = hooks.draw || null;
    fit();
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', update);
    const gate = host || mount.closest('.hero') || mount;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; update(); }, { threshold: 0 });
      io.observe(gate);
    } else { visible = true; update(); }
    if (reduced) draw(0);
  }

  function dispose() {
    stop();
    clearTimeout(rt);
    removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', update);
    if (io) io.disconnect();
    world.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    mats.forEach((m) => m.dispose());
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { THREE, renderer, scene, camera, world, mats, HALF_FOV, reduced, smallMQ, makeMaterial, points, run, fit, draw, dispose };
}
