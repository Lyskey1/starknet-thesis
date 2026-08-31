/* BTCFi hero centrepiece: a glowing particle Bitcoin mark inside a particle
   ring, chalk at the top fading to the page accent at the bottom.

   This is the static-page twin of the landing hero's WebGL orb
   (src/views/home/hero/hero.tsx sits over src/views/home/scene): one object
   filling the middle of the frame, with the copy placed around its edges.

   Mount is #bfhStage, an absolutely positioned box inside .hero. The renderer
   is alpha with a fully transparent clear colour, because the page-wide flame
   shader (js/eco-backdrop.js) is a FIXED canvas at z-index 0 and everything
   above it has to read through it. No opaque fill, no isolation, anywhere.

   HOW THE MARK BECOMES PARTICLES
   assets/img/bitcoin-logo.svg ships with a viewBox and NO width/height, so an
   <img> of it measures 0x0 in Chrome and anything built from it comes back
   blank. The source is fetched, an explicit width/height is stamped on the
   ROOT element, and it is rasterised into a 2D canvas. The fill attribute goes
   on <svg>, NEVER on <path>: injecting a fill into the path tag produces an
   SVG Chrome silently refuses to decode. The orange disc (the one path filled
   #f7931a) is dropped so only the symbol remains. Both traps are documented in
   js/btcfi-globe.js and have bitten twice; do not improvise a variant.

   The raster is then read back with getImageData and every pixel above an
   alpha threshold becomes a candidate particle, subsampled down to the target
   count. Because the fetch is async the geometry is built INSIDE the callback:
   no empty buffer is created up front and filled later.

   THE GRADIENT IS COMPUTED IN THE SHADER, NOT BAKED. The ring turns, so a
   colour baked per particle at build time would carry the accent round to the
   top within a few seconds. The vertex shader reads the particle's WORLD y and
   mixes accent, warm and chalk from it, which pins the gradient to the frame
   however the object is rotating.

   strk20 palette only: accent #c53400, warm #e07a4a, chalk #fafafa. */
import * as THREE from 'three';

const MOUNT = document.getElementById('bfhStage');
if (MOUNT) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallMQ = matchMedia('(max-width: 980px)');

  /* the ring the fit is measured against: the outer dust halo is allowed to
     bleed past the frame edge, the bright annulus never is */
  const R_RING = 2.14;        // mid radius of the bright annulus
  const R_FIT = 2.34;         // its outer edge
  const GLYPH_H = 2.56;       // mark height in world units, comfortably inside the ring

  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { console.error('[btcfi-hero-mark] no WebGL context, the hero renders without the centrepiece', e); }

  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    MOUNT.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 90);
    const HALF_FOV = Math.tan((40 / 2) * Math.PI / 180);

    /* one group per moving part: the ring sweeps, the mark only breathes */
    const world = new THREE.Group();
    const ringGrp = new THREE.Group();
    const markGrp = new THREE.Group();
    world.add(ringGrp); world.add(markGrp); scene.add(world);

    /* deterministic hash noise, the idiom js/btcfi-globe.js uses: no
       Math.random, so a reload never reshuffles the field */
    const rnd = (i, s) => Math.abs(Math.sin((i + 1) * s) * 43758.5453 % 1);

    const VERT = `
      attribute float aSize; attribute float aPhase; attribute float aAlpha; attribute float aTint;
      varying vec3 vC; varying float vA;
      uniform float uPix, uH, uFade, uTime, uDrift, uSpan;
      uniform vec3 uAcc, uWarm, uChalk;
      void main(){
        vec3 p = position;
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
        gl_PointSize = max(1.0, aSize * uPix * (uH / 900.0) * (10.0 / max(d, 0.5)));
        vA = aAlpha * uFade;
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
          uPix: { value: 1 }, uH: { value: 900 }, uFade: { value: 0 },
          uTime: { value: 0 }, uDrift: { value: drift }, uSpan: { value: span },
          uAcc: { value: new THREE.Color('#c53400') },
          uWarm: { value: new THREE.Color('#e07a4a') },
          uChalk: { value: new THREE.Color('#fafafa') }
        }
      });
      mats.push(m);
      return m;
    }

    function points(pos, siz, pha, alp, tin, mat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
      g.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
      g.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
      g.setAttribute('aTint', new THREE.BufferAttribute(tin, 1));
      return new THREE.Points(g, mat);
    }

    /* ================= the ring =================
       A bright thin annulus plus a sparse dust halo outside it. The annulus
       carries three brighter arcs baked into the point sizes, which is what
       makes rotation about Z legible at all: a ring of uniform density
       turning in its own plane reads as a still image. */
    const small = smallMQ.matches;
    const RING_N = small ? 6400 : 17000;
    const HALO_N = small ? 1800 : 5000;

    {
      const N = RING_N + HALO_N;
      const pos = new Float32Array(N * 3);
      const siz = new Float32Array(N), pha = new Float32Array(N);
      const alp = new Float32Array(N), tin = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const halo = i >= RING_N;
        const a = rnd(i, 127.1) * Math.PI * 2;
        let r, z, base, aa, tt;
        if (!halo) {
          // gaussian-ish thickness: two uniforms summed, centred on R_RING
          r = R_RING + (rnd(i, 311.7) + rnd(i, 74.7) - 1) * 0.19;
          z = (rnd(i, 39.42) - 0.5) * 0.34;
          base = 1.15 + rnd(i, 12.9898) * 0.95;
          aa = 0.40 + rnd(i, 91.3) * 0.50;
          tt = 0.80 + rnd(i, 5.331) * 0.45;
        } else {
          r = R_FIT + Math.pow(rnd(i, 311.7), 0.6) * 1.20;
          z = (rnd(i, 39.42) - 0.5) * 0.9;
          base = 0.80 + rnd(i, 12.9898) * 0.75;
          aa = 0.10 + rnd(i, 91.3) * 0.20;
          tt = 0.7 + rnd(i, 5.331) * 0.4;
        }
        const sweep = 0.62 + 0.68 * Math.pow(0.5 + 0.5 * Math.sin(a * 3 + 0.7), 1.5);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = z;
        siz[i] = base * (halo ? 1 : sweep);
        pha[i] = rnd(i, 78.233);
        alp[i] = aa * (halo ? 1 : (0.55 + 0.6 * sweep));
        tin[i] = tt;
      }
      ringGrp.add(points(pos, siz, pha, alp, tin, makeMaterial(0.6, R_RING * 2)));
    }

    /* ================= the mark ================= */
    const MARK_N = small ? 11000 : 30000;
    fetch('/assets/img/bitcoin-logo.svg')
      .then((r) => r.text())
      .then((src) => {
        /* fill on the ROOT, disc dropped. See the header note. */
        const sized = src
          .replace('<svg ', '<svg width="512" height="512" fill="#fafafa" ')
          .replace(/<path[^>]*fill="#f7931a"[^>]*\/>/i, '');
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('the rasterised mark would not decode'));
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
        });
      })
      .then((img) => {
        const S = 512;
        const cv = document.createElement('canvas');
        cv.width = cv.height = S;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.clearRect(0, 0, S, S);
        cx.drawImage(img, 0, 0, S, S);
        const data = cx.getImageData(0, 0, S, S).data;

        /* every lit pixel is a candidate, and the mask's OWN bounding box sets
           the scale, so dropping the disc does not leave the symbol floating
           small and off centre inside the 512 box */
        const hits = [];
        let x0 = S, y0 = S, x1 = 0, y1 = 0;
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            if (data[(y * S + x) * 4 + 3] > 110) {
              hits.push(x, y);
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        const total = hits.length / 2;
        if (!total) { console.error('[btcfi-hero-mark] the mark rasterised blank'); return; }

        const bw = (x1 - x0) || 1, bh = (y1 - y0) || 1;
        const scale = GLYPH_H / bh;               // fit by height, proportions kept
        const mx = x0 + bw / 2, my = y0 + bh / 2;

        const N = Math.min(MARK_N, total);
        const step = total / N;
        const pos = new Float32Array(N * 3);
        const siz = new Float32Array(N), pha = new Float32Array(N);
        const alp = new Float32Array(N), tin = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const k = Math.floor(i * step) * 2;
          const jx = (rnd(i, 127.1) - 0.5) * 1.7, jy = (rnd(i, 311.7) - 0.5) * 1.7;
          pos[i * 3] = (hits[k] + jx - mx) * scale;
          pos[i * 3 + 1] = (my - (hits[k + 1] + jy)) * scale;
          pos[i * 3 + 2] = (rnd(i, 39.42) - 0.5) * 0.16;
          siz[i] = 1.05 + rnd(i, 12.9898) * 0.85;
          pha[i] = rnd(i, 78.233);
          alp[i] = 0.58 + rnd(i, 91.3) * 0.45;
          tin[i] = 0.85 + rnd(i, 5.331) * 0.4;
        }
        markGrp.add(points(pos, siz, pha, alp, tin, makeMaterial(1, GLYPH_H)));
        fit();
        if (reduced) draw(0);
      })
      .catch((e) => console.error('[btcfi-hero-mark] the mark failed to load', e));

    /* ================= fit, loop, gating ================= */
    /* The camera is moved rather than the group scaled: distance is what the
       point-size formula reads, so the dots shrink with the composition
       instead of clumping into a solid blob on a phone. */
    function fit() {
      const w = MOUNT.clientWidth || 1, h = MOUNT.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const sm = smallMQ.matches;
      const byH = R_FIT / ((sm ? 0.40 : 0.64) * HALF_FOV);
      const byW = R_FIT / ((sm ? 0.80 : 0.50) * HALF_FOV * camera.aspect);
      camera.position.z = Math.max(byH, byW);
      camera.updateProjectionMatrix();
      const pix = Math.min(devicePixelRatio || 1, 2);
      mats.forEach((m) => { m.uniforms.uH.value = h; m.uniforms.uPix.value = pix; });
    }

    const target = () => (smallMQ.matches ? 0.62 : 1);
    let t0 = performance.now(), raf = 0, running = false, visible = false, lit = 0;

    function draw(t) {
      const want = target();
      lit += (want - lit) * 0.05;
      mats.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uFade.value = reduced ? want : lit;
      });
      ringGrp.rotation.z = t * 0.055;
      ringGrp.rotation.x = -0.10 + Math.sin(t * 0.21) * 0.07;
      markGrp.rotation.y = Math.sin(t * 0.17) * 0.10;
      markGrp.rotation.x = Math.sin(t * 0.13) * 0.05;
      world.scale.setScalar(1 + Math.sin(t * 0.34) * 0.012);
      renderer.render(scene, camera);
    }

    function tick(now) { draw((now - t0) / 1000); raf = requestAnimationFrame(tick); }
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
