/* QUANTUM hero centrepiece: main's funnel wireframe, rebuilt in dust.

   THIS IS THE SAME ENGINE as js/strk-hero-mark.js / js/btcfi-hero-mark.js /
   js/digest-hero-mark.js (the static-page ports of the landing hero's WebGL
   orb): the same THREE.Points pipeline, the same additive point material and
   fragment disc, the same world-y gradient computed in the vertex shader
   (accent at the bottom through warm to chalk at the top, pinned to the
   frame however the object moves), the same SPEED-scaled clock, drift sines,
   density/size discipline (uSz trim, uPix cap, uH scaling), IO visibility
   gating, document.hidden pause and reduced-motion single frame.

   WHAT CHANGED IS ONLY THE GEOMETRY SOURCE. The other marks sample a raster
   glyph mask; this one is PARAMETRIC: main's quantum hero funnel (stacked
   horizontal ellipses narrowing downward into a single bright point; see
   main's .qh-chandelier svg) sampled straight from its equations:
     - 9 rings, top ring diameter 2*R_TOP, bottom ring 0.133x the top
       (the brief's 0.12-of-column against the 0.9-of-column top ring),
       radius profile r(s) = R_TOP * 0.133^s, rings on the top 82% of the
       height, apex at the bottom; height = 1.6x the top ring width.
     - 10 meridians of FLOWING dust: each particle carries (theta, s0) and
       the VERTEX SHADER moves it down the funnel surface, s = fract(s0 +
       t/T_FALL), converging to r=0 at the apex and respawning at the top:
       a slow collapse, ~40s per full cycle in real time.
     - the whole funnel turns about its vertical axis at the same angular
       speed as the strk mark's outer ring (0.055 rad per SPEED-scaled
       second); nodes are translated by the group transform, never rotated.
     - the APEX is one bright particle cluster pulsing at the halo cadence
       the other devices use (5.2s), the most saturated point by gradient.
   THE OUTER RING ORBIT IS DROPPED on purpose: the annulus reads as a rival
   to the funnel's own top ring and flattens the taper. Reported.

   Mount is #qhStage, the hero's right-column box (the strk stage geometry).
   The renderer stays alpha/transparent over js/eco-backdrop.js.
   strk20 palette only: accent #c53400, warm #e07a4a, chalk #fafafa. */
import * as THREE from 'three';

const MOUNT = document.getElementById('qhStage');
if (MOUNT) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallMQ = matchMedia('(max-width: 980px)');

  /* the funnel the fit is measured against: full height 2*R_FIT, top ring
     width = height / 1.6 (main's proportions) */
  const FUN_H = 4.0;                 // world height of the funnel
  const R_FIT = FUN_H / 2;           // fit semantics: half-height, like a radius
  const R_TOP = FUN_H / 1.6 / 2;     // top ring radius (width = H / 1.6)
  const TAPER = 0.133;               // bottom ring / top ring (0.12 / 0.9)
  const RING_BAND = 0.82;            // rings live on the top 82% of the height
  const N_RINGS = 9, N_MER = 10;
  const TOP_Y = FUN_H / 2;

  /* the single slowdown lever: one clock, everything scaled off it */
  const SPEED = 0.34;
  /* flow: ~40 real seconds per full top-to-apex cycle, in clock units */
  const FLOW_R = 1 / (40 * SPEED);
  /* apex pulse at the halo cadence used elsewhere (5.2s real) */
  const PULSE_W = (2 * Math.PI) / (5.2 * SPEED);

  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { console.error('[quantum-hero-mark] no WebGL context, the hero renders without the centrepiece', e); }

  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    MOUNT.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 90);
    const HALF_FOV = Math.tan((40 / 2) * Math.PI / 180);

    const world = new THREE.Group();
    scene.add(world);

    /* deterministic hash noise, the twins' idiom: no Math.random */
    const rnd = (i, s) => Math.abs(Math.sin((i + 1) * s) * 43758.5453 % 1);

    /* the funnel profile, shared by the CPU sampler and the shader */
    const profR = (s) => R_TOP * Math.pow(TAPER, s) * Math.min(1, (1 - s) / 0.12);

    const VERT = `
      attribute float aSize; attribute float aPhase; attribute float aAlpha; attribute float aTint;
      attribute float aMode; attribute float aTheta; attribute float aS;
      varying vec3 vC; varying float vA;
      uniform float uPix, uH, uFade, uTime, uDrift, uSpan, uSz;
      uniform float uRTop, uTopY, uFunH, uFlowR, uPulseW;
      uniform vec3 uAcc, uWarm, uChalk;
      void main(){
        vec3 p = position;
        float fadeFlow = 1.0;
        if (aMode > 0.5 && aMode < 1.5) {
          /* the collapse: this particle rides its meridian down the funnel */
          float s = fract(aS + uTime * uFlowR);
          float r = uRTop * pow(0.133, s) * clamp((1.0 - s) / 0.12, 0.0, 1.0);
          p = vec3(r * cos(aTheta), uTopY - s * uFunH, r * sin(aTheta));
          fadeFlow = smoothstep(0.0, 0.05, s);
        }
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
        float pulse = aMode > 1.5 ? (0.85 + 0.35 * sin(uTime * uPulseW)) : 1.0;
        gl_PointSize = max(1.0, aSize * pulse * uSz * uPix * (uH / 900.0) * (10.0 / max(d, 0.5)));
        vA = aAlpha * uFade * fadeFlow * (aMode > 1.5 ? (0.8 + 0.2 * sin(uTime * uPulseW)) : 1.0);
      }`;

    const FRAG = `
      varying vec3 vC; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = (1.0 - smoothstep(0.08, 0.5, d)) * vA;
        if (a < 0.008) discard;
        gl_FragColor = vec4(vC, a);
      }`;

    const mats = [];
    function makeMaterial(drift, span) {
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.AdditiveBlending,
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: {
          uPix: { value: 1 }, uH: { value: 900 }, uFade: { value: 0 }, uSz: { value: 1 },
          uTime: { value: 0 }, uDrift: { value: drift }, uSpan: { value: span },
          uRTop: { value: R_TOP }, uTopY: { value: TOP_Y }, uFunH: { value: FUN_H },
          uFlowR: { value: FLOW_R }, uPulseW: { value: PULSE_W },
          uAcc: { value: new THREE.Color('#c53400') },
          uWarm: { value: new THREE.Color('#e07a4a') },
          uChalk: { value: new THREE.Color('#fafafa') }
        }
      });
      mats.push(m);
      return m;
    }

    function points(N, fill, mat) {
      const pos = new Float32Array(N * 3);
      const siz = new Float32Array(N), pha = new Float32Array(N);
      const alp = new Float32Array(N), tin = new Float32Array(N);
      const mod_ = new Float32Array(N), th = new Float32Array(N), ss = new Float32Array(N);
      for (let i = 0; i < N; i++) fill(i, pos, siz, pha, alp, tin, mod_, th, ss);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
      g.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
      g.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
      g.setAttribute('aTint', new THREE.BufferAttribute(tin, 1));
      g.setAttribute('aMode', new THREE.BufferAttribute(mod_, 1));
      g.setAttribute('aTheta', new THREE.BufferAttribute(th, 1));
      g.setAttribute('aS', new THREE.BufferAttribute(ss, 1));
      /* the flow cloud recomputes its position from (theta, s) per frame in
         the shader, so its bounding sphere is set by hand: culling must
         never clip a particle mid-collapse */
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), FUN_H);
      return new THREE.Points(g, mat);
    }

    /* density at the strk discipline, desktop / sub-980 */
    const small = smallMQ.matches;
    const RINGS_N = small ? 9000 : 26000;
    const FLOW_N = small ? 5000 : 14000;
    const APEX_N = 48;

    /* ---- the 9 rings: static dust on the ellipse stack; the group's own
       Y-rotation is the spin, exactly as the strk ring turns in its plane */
    {
      const N = RINGS_N;
      world.add(points(N, function (i, pos, siz, pha, alp, tin, mod_, th, ss) {
        /* rings weighted by circumference so density reads even */
        const w = rnd(i, 91.7);
        const ring = Math.floor(Math.pow(w, 1.35) * N_RINGS);
        const sRing = ring / (N_RINGS - 1) * RING_BAND;
        const r0 = R_TOP * Math.pow(TAPER, sRing);
        const a = rnd(i, 127.1) * Math.PI * 2;
        /* gaussian-ish thickness, the strk annulus idiom */
        const rr = r0 * (1 + (rnd(i, 311.7) + rnd(i, 74.7) - 1) * 0.05);
        const y = TOP_Y - sRing * FUN_H + (rnd(i, 39.42) - 0.5) * 0.05;
        pos[i * 3] = Math.cos(a) * rr;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(a) * rr;
        siz[i] = 0.95 + rnd(i, 12.9898) * 0.85;
        pha[i] = rnd(i, 78.233);
        alp[i] = 0.32 + rnd(i, 91.3) * 0.42;
        tin[i] = 0.85 + rnd(i, 5.331) * 0.4;
        mod_[i] = 0; th[i] = 0; ss[i] = 0;
      }, makeMaterial(0.6, FUN_H)));
    }

    /* ---- the meridian flow: dust riding 10 curves down to the apex ---- */
    {
      const N = FLOW_N;
      world.add(points(N, function (i, pos, siz, pha, alp, tin, mod_, th, ss) {
        const mer = i % N_MER;
        const theta = mer / N_MER * Math.PI * 2 + (rnd(i, 45.164) - 0.5) * 0.22;
        mod_[i] = 1; th[i] = theta; ss[i] = rnd(i, 17.23);
        pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0; /* shader-driven */
        siz[i] = 0.8 + rnd(i, 12.9898) * 0.7;
        pha[i] = rnd(i, 78.233);
        alp[i] = 0.30 + rnd(i, 91.3) * 0.38;
        tin[i] = 0.9 + rnd(i, 5.331) * 0.4;
      }, makeMaterial(0.5, FUN_H)));
    }

    /* ---- the apex: one bright particle (a tight pulsing cluster) ---- */
    {
      world.add(points(APEX_N, function (i, pos, siz, pha, alp, tin, mod_, th, ss) {
        const a = rnd(i, 127.1) * Math.PI * 2, r = Math.pow(rnd(i, 311.7), 1.6) * 0.06;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = TOP_Y - FUN_H + (rnd(i, 39.42) - 0.5) * 0.05;
        pos[i * 3 + 2] = Math.sin(a) * r;
        siz[i] = i === 0 ? 4.6 : 1.3 + rnd(i, 12.9898) * 1.1;
        pha[i] = rnd(i, 78.233);
        alp[i] = i === 0 ? 1 : 0.5 + rnd(i, 91.3) * 0.4;
        tin[i] = 1.35;
        mod_[i] = 2; th[i] = 0; ss[i] = 0;
      }, makeMaterial(0.25, FUN_H)));
    }

    /* the verification hook the report reads, the twins' idiom */
    window.__qh = { particles: RINGS_N + FLOW_N + APEX_N, rings: RINGS_N, flow: FLOW_N, apex: APEX_N, world, SPEED };

    /* ================= fit, loop, gating ================= */
    function fit() {
      const w = MOUNT.clientWidth || 1, h = MOUNT.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const sm = smallMQ.matches;
      /* the mark size rule: the funnel's full height spans 80% of the mount
         (the nav-to-strip column); byW guards the top ring against the
         stage box on a narrow desktop, 0.91 like the twins */
      const byH = R_FIT / ((sm ? 0.40 : 0.80) * HALF_FOV);
      const byW = R_TOP / ((sm ? 0.40 : 0.455) * HALF_FOV * camera.aspect);
      camera.position.z = Math.max(byH, byW);
      world.position.x = 0;
      camera.updateProjectionMatrix();
      const pix = Math.min(devicePixelRatio || 1, 2);
      const trim = sm ? 1 : 0.89;
      mats.forEach((m) => { m.uniforms.uH.value = h; m.uniforms.uPix.value = pix; m.uniforms.uSz.value = trim; });
    }

    const target = () => (smallMQ.matches ? 0.62 : 1);
    let t0 = performance.now(), raf = 0, running = false, visible = false, lit = 0;

    function draw(t) {
      const want = target();
      lit += (want - lit) * 0.03;
      mats.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uFade.value = reduced ? want : lit;
      });
      /* the whole funnel turns about its vertical axis at the strk outer
         ring's angular speed; a gentle breath, the twins' cadence */
      world.rotation.y = t * 0.055;
      world.scale.setScalar(1 + Math.sin(t * 0.34) * 0.012);
      renderer.render(scene, camera);
    }

    function tick(now) { draw(((now - t0) / 1000) * SPEED); raf = requestAnimationFrame(tick); }
    function start() { if (running || reduced) return; running = true; raf = requestAnimationFrame(tick); }
    function stop() { if (!running) return; running = false; cancelAnimationFrame(raf); }
    function update() { if (visible && !document.hidden) start(); else stop(); }

    fit();
    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { fit(); if (reduced) draw(0); }, 120);
    });
    document.addEventListener('visibilitychange', update);

    const host = MOUNT.closest('.hero') || MOUNT;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; update(); }, { threshold: 0 }).observe(host);
    } else { visible = true; update(); }

    if (reduced) draw(0);
  }
}
