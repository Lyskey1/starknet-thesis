/* The landing's ambient backdrop, ported to the static pages: the flame
   domain-warp wash plus a drift of motes, on one fixed canvas behind
   everything. No centrepiece — this is only what moves BEHIND the content.
   Same shader as src/views/home/scene/backdrop.tsx, in strk20 colours. */
import * as THREE from 'three';

const host = document.createElement('div');
host.className = 'eco-bd';
host.setAttribute('aria-hidden', 'true');
document.body.insertBefore(host, document.body.firstChild);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x0d0d0d, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
camera.position.z = 6;

const linear = (hex) => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r, c.g, c.b); };

/* the wash: a clip-space quad, so it ignores the camera and always fills */
const wash = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {
      iTime: { value: 0 },
      uBg: { value: linear('#0d0d0d') },
      uFlameA: { value: linear('#c53400') },
      uFlameB: { value: linear('#e07a4a') },
      uFlameAmt: { value: 0.4 }
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float iTime; uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
      varying vec2 vUv;
      vec3 warp3d(vec3 pos, float t){
        float curv = 0.8, a = 1.9, b = 0.7;
        pos *= 2.0;
        pos.x += curv*sin(t + a*pos.y) + t*b; pos.y += curv*cos(t + a*pos.x);
        pos.y += curv*sin(t + a*pos.z) + t*b; pos.z += curv*cos(t + a*pos.y);
        pos.z += curv*sin(t + a*pos.x) + t*b; pos.x += curv*cos(t + a*pos.z);
        return 0.5 + 0.5*cos(pos.xyz + vec3(1, 2, 4));
      }
      void main(){
        vec2 uv = 2.0 * vUv - 1.0;
        vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime * 1.5), vec3(1.5));
        vec3 flame = 1.5 * uFlameA * w.x;
        flame *= w.y;
        flame += uFlameB * w.z;
        flame *= mix(0.45, 1.0, smoothstep(0.0, 1.0, abs(uv.y)));
        float md = smoothstep(-1.0, 1.0, -uv.y * uv.x);
        flame *= mix(0.4, 1.0, md);   // softened: the squared mask left most of the frame black
        vec3 bg = uBg * (1.0 - 0.4 * length(uv));
        gl_FragColor = vec4(bg + flame * uFlameAmt, 1.0);
      }`
  })
);
wash.renderOrder = -1; wash.frustumCulled = false; scene.add(wash);

/* the motes: one draw call, all the motion in the vertex shader */
const COUNT = matchMedia('(max-width: 860px)').matches ? 90 : 220;
const motes = (() => {
  const pos = new Float32Array(COUNT * 3), size = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678, c = Math.sin(i * 39.425) * 6789.1;
    pos[i * 3] = ((a % 1) - 0.5) * 2; pos[i * 3 + 1] = ((b % 1) - 0.5) * 2; pos[i * 3 + 2] = ((c % 1) - 0.5) * 2;
    size[i] = 16 * (0.4 + Math.abs(a % 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
      uSpread: { value: 3.4 }, uFadeNear: { value: 2.4 }, uFadeFar: { value: 4.6 },
      uColor: { value: linear('#ffb08a') }, uAlpha: { value: 0.5 }
    },
    vertexShader: `
      attribute float size; uniform float uTime; uniform vec2 uRes;
      uniform float uSpread, uFadeNear, uFadeFar; varying float vA;
      vec3 warp(vec3 p, float t){
        float c = 0.9, a = 1.9, b = 0.02, s = 0.05;
        p *= 2.0;
        p.x += c*sin(s*t + a*p.y) + t*b; p.y += c*cos(s*t + a*p.x);
        p.y += c*sin(s*t + a*p.z) + t*b; p.z += c*cos(s*t + a*p.y);
        p.z += c*sin(s*t + a*p.x) + t*b; p.x += c*cos(s*t + a*p.z);
        return cos(p + vec3(1, 2, 4));
      }
      void main(){
        vec3 v = position * uSpread + warp(position, uTime) * (uSpread * 0.28);
        vec4 mv = modelViewMatrix * vec4(v, 1.0);
        float r = length(v);
        vA = (1.0 - smoothstep(uFadeNear, uFadeFar, r)) * smoothstep(0.0, 0.3, -mv.z);
        gl_PointSize = max(1.0, size * uRes.y / 900.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uAlpha; varying float vA;
      void main(){
        vec2 p = gl_PointCoord - 0.5; float l = length(p);
        if (l > 0.5) discard;
        float tex = smoothstep(0.5, 0.0, l);
        gl_FragColor = vec4(uColor * tex, tex * vA * uAlpha);
      }`
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
})();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  motes.material.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}
addEventListener('resize', resize);
resize();

const start = performance.now();
function frame() {
  if (!document.hidden) {
    const t = (performance.now() - start) * 0.001;
    wash.material.uniforms.iTime.value = t;
    motes.material.uniforms.uTime.value = t * 8;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
renderer.render(scene, camera);
if (!reduced) requestAnimationFrame(frame);
