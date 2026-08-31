/* SOLARIS: the quantum hero's particle sun.

   Replaces the hairline chandelier drawing that used to sit in the hero's
   right margin. A points-sphere of ~120k particles breathes on 3D simplex
   noise, is hollowed out by a fresnel edge fade so only its rim burns, and
   flares white-hot where the pointer touches it. Behind it, a four-octave
   fBm aurora is masked to the far corners of the container only, so the
   middle of the frame stays transparent and js/eco-backdrop.js still shows
   through. Everything is composited through EffectComposer with one
   UnrealBloomPass.

   Discipline, matching the rest of the site:
   - the container is measured with a ResizeObserver, never the window, so
     the canvas is correct inside the hero at any width
   - IntersectionObserver and document.hidden pause the loop
   - prefers-reduced-motion renders ONE settled frame and never starts a loop
   - no WebGL context means the hero simply renders without the visual

   THE COMPOSER RENDER TARGET IS UnsignedByteType ON PURPOSE. EffectComposer
   defaults its buffers to HalfFloatType, and RGBA16F composer buffers render
   BLACK on Chrome with Apple GPUs. Do not remove the explicit target.

   THE jsm IMPORTS ARE ABSOLUTE URLS ON PURPOSE. The page's importmap maps the
   exact specifier "three" only; a bare "three/examples/..." specifier would
   fail to resolve and kill this whole module silently. Keep the pinned
   version in these three URLs in step with the importmap. */

import * as THREE from 'three';
import { EffectComposer } from 'https://unpkg.com/three@0.185.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.185.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.185.0/examples/jsm/postprocessing/UnrealBloomPass.js';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

/* Ashima 3D simplex noise, shared by both vertex uses. */
const SNOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
    + i.y+vec4(0.0,i1.y,i2.y,1.0))
    + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const PARTICLE_VERT = `
uniform float uTime;
uniform float uIntro;
uniform float uParticleSize;
uniform float uDeform;
uniform vec3  uCursor;
uniform float uCursorStrength;
uniform float uCursorRadius;
uniform float uCursorFlare;
uniform float uCursorHeat;
varying float vHeat;
varying float vAlpha;
varying float vGrad;
${SNOISE}
void main(){
  vec3 pos = position;

  /* breathing: two octaves of simplex, pushed along the surface normal */
  float noiseVal = snoise(position * 0.5 + uTime * 0.8)
                 + 0.5 * snoise(position * 1.5 - uTime * 1.2);
  pos += normal * (noiseVal * uDeform);

  /* pointer flare: a soft falloff around the cursor point, flickering */
  float flareFall = pow(1.0 - smoothstep(0.0, uCursorRadius, distance(pos, uCursor)), 1.5);
  float flicker = 0.65 + 0.35 * snoise(position * 3.0 + uTime * 5.0);
  float flare = flareFall * flicker * uCursorStrength;
  pos += normal * (flare * uCursorFlare);
  vHeat = clamp(flare * uCursorHeat, 0.0, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  /* fresnel rim: the centre of the sphere is hollow, the edges glow */
  vec3 worldNormal = normalize(normalMatrix * normal);
  vec3 viewDir = normalize(-mvPosition.xyz);
  float rim = 1.0 - abs(dot(viewDir, worldNormal));
  float edgeFade = smoothstep(0.4, 0.9, rim);

  /* intro: the sphere starts solid and hollows out as it settles */
  vAlpha = mix(1.0, edgeFade, uIntro) * smoothstep(0.0, 0.2, uIntro);
  vGrad = clamp(position.y / 4.2 * 0.5 + 0.5, 0.0, 1.0);

  gl_PointSize = max(uParticleSize * (10.0 / -mvPosition.z) * (1.0 + vHeat * 1.6), 1.5);
  gl_Position = projectionMatrix * mvPosition;
}`;

const PARTICLE_FRAG = `
uniform vec3 uColorTop;
uniform vec3 uColorBottom;
varying float vHeat;
varying float vAlpha;
varying float vGrad;
void main(){
  vec2 c = gl_PointCoord - vec2(0.5);
  float len = length(c);
  if (len > 0.5) discard;
  float a = smoothstep(0.5, 0.1, len) * vAlpha;
  if (a <= 0.002) discard;
  vec3 col = mix(uColorBottom, uColorTop, vGrad);
  col = mix(col, vec3(1.0, 0.94, 0.86), vHeat);
  gl_FragColor = vec4(col, a);
}`;

const BG_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BG_FRAG = `
uniform float uTime;
uniform vec2  uRes;
uniform vec3  uColorA;
uniform vec3  uColorB;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++){ v += amp * vnoise(p); p *= 2.03; amp *= 0.5; }
  return v;
}
void main(){
  /* aspect corrected, centred */
  vec2 p = vUv - vec2(0.5);
  p.x *= max(uRes.x, 1.0) / max(uRes.y, 1.0);

  /* the aurora is masked to the FAR CORNERS only, and the sine on the angle
     makes that edge breathe. The middle of the frame stays fully
     transparent so the page's own fixed backdrop reads through it. */
  float ang = atan(p.y, p.x);
  float edge = length(p) + 0.06 * sin(ang * 3.0 + uTime * 0.6);
  float mask = smoothstep(0.7, 1.15, edge);

  float n1 = fbm(p * 2.4 + vec2(uTime * 0.25, -uTime * 0.18));
  float n2 = fbm(p * 4.1 - vec2(uTime * 0.12, uTime * 0.20));

  /* the mask multiplies the COLOUR as well as the alpha: bloom threshold is
     0, so any lit pixel anywhere feeds the glow, and an unmasked colour term
     would push the aurora back inward through the bloom. */
  vec3 col = vec3(0.012, 0.012, 0.02);
  col += uColorA * pow(n1, 1.6) * 0.55;
  col += uColorB * pow(n2, 2.2) * 0.30;
  col *= mask;

  float a = clamp(mask * (0.10 + n1 * 0.55), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;

function boot(container) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hasWebGL()) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  let w = Math.max(container.clientWidth, 1);
  let h = Math.max(container.clientHeight, 1);
  renderer.setSize(w, h, false);

  /* main scene */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);

  /* background scene: one full-frame quad */
  const bgScene = new THREE.Scene();
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const bgMat = new THREE.ShaderMaterial({
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(w, h) },
      uColorA: { value: new THREE.Color(0xc53400) },
      uColorB: { value: new THREE.Color(0xe07a4a) }
    }
  });
  const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bgQuad.frustumCulled = false;
  bgScene.add(bgQuad);

  /* the sun */
  const sunGeo = new THREE.SphereGeometry(4.2, 200, 600);
  const sunMat = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uColorTop: { value: new THREE.Color(0xc53400) },
      uColorBottom: { value: new THREE.Color(0x7a2400) },
      uCursor: { value: new THREE.Vector3(0, 0, 4.2) },
      uCursorStrength: { value: 0 },
      uCursorRadius: { value: 1.2 },
      uCursorFlare: { value: 0.1 },
      uCursorHeat: { value: 0.7 },
      uParticleSize: { value: 0.8 },
      uDeform: { value: 0.5 }
    }
  });
  const sun = new THREE.Points(sunGeo, sunMat);
  sun.frustumCulled = false;
  sun.position.y = 5.5;
  scene.add(sun);

  /* invisible pick target for the pointer flare. It is deliberately NOT in
     the scene: it only ever has to answer the raycaster. */
  const pick = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 48, 48),
    new THREE.MeshBasicMaterial()
  );
  pick.position.y = 5.5;
  pick.updateMatrixWorld();

  /* post */
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(w, h);

  const bgPass = new RenderPass(bgScene, bgCamera);
  composer.addPass(bgPass);

  const mainPass = new RenderPass(scene, camera);
  mainPass.clear = false;
  mainPass.clearDepth = true;
  composer.addPass(mainPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 2.33, 1.16, 0);
  composer.addPass(bloom);

  /* pointer flare */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const targetCursor = new THREE.Vector3(0, 0, 4.2);
  let targetStrength = 0;
  let pointerActive = false;

  function onPointerMove(e) {
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    pointerActive = true;
  }
  function onPointerLeave() { pointerActive = false; }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('blur', onPointerLeave);

  function updateCursor() {
    if (!pointerActive) { targetStrength = 0; return; }
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(pick, false);
    if (hits.length) {
      targetStrength = 1;
      targetCursor.copy(hits[0].point);
      targetCursor.y -= 5.5; // into the sphere's local space
    } else {
      targetStrength = 0;
    }
    const u = sunMat.uniforms;
    u.uCursorStrength.value += (targetStrength - u.uCursorStrength.value) * 0.09;
    u.uCursor.value.lerp(targetCursor, 0.18);
  }

  /* sizing: the CONTAINER, never the window */
  let lastPr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    const nw = Math.max(container.clientWidth, 1);
    const nh = Math.max(container.clientHeight, 1);
    /* the device pixel ratio is part of the check: dragging the window to a
       display with a different DPR changes nothing about clientWidth, and a
       size-only guard would leave the canvas at the old backing resolution */
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    if (nw === w && nh === h && pr === lastPr) return;
    w = nw; h = nh; lastPr = pr;
    renderer.setPixelRatio(pr);
    composer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
    bloom.setSize(w, h);
    bgMat.uniforms.uRes.value.set(w, h);
    applyScale();
    if (reduced) draw();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  window.addEventListener('resize', resize);

  function applyScale() {
    const vwScale = Math.min(Math.max(w / 1440, 0.4), 1.5);
    bloom.strength = 2.33 * vwScale;
    sunMat.uniforms.uParticleSize.value = 0.8 * vwScale;
  }
  applyScale();

  /* the loop */
  let time = 0;
  const started = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function placeCamera(introEased) {
    const introZoom = (1 - introEased) * -3.0;
    camera.position.set(0, 2.8, 4.6 + introZoom);
    camera.lookAt(0, 2.8, 4.6 - 100);
  }

  function draw() {
    renderer.clear(true, true, true);
    composer.render();
  }

  if (reduced) {
    /* one settled frame, no loop */
    sunMat.uniforms.uIntro.value = 1;
    sunMat.uniforms.uTime.value = 0;
    bgMat.uniforms.uTime.value = 0;
    placeCamera(1);
    draw();
    return;
  }

  let raf = 0, onScreen = true;

  function frame() {
    raf = requestAnimationFrame(frame);
    time += 0.005 * 1.41;
    const introEased = easeOutCubic(Math.min((performance.now() - started) / 2400, 1));
    sunMat.uniforms.uTime.value = time;
    sunMat.uniforms.uIntro.value = introEased;
    bgMat.uniforms.uTime.value = time;
    updateCursor();
    placeCamera(introEased);
    draw();
  }

  function sync() {
    const want = onScreen && !document.hidden;
    if (want && !raf) raf = requestAnimationFrame(frame);
    else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; sync(); },
      { threshold: 0 }).observe(container);
  }
  sync();
}

const container = document.getElementById('qhSolaris');
if (container) boot(container);
