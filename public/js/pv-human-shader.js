/* A local instance of the site's ambient flame wash (js/eco-backdrop.js),
   scoped to .pv-human instead of the whole page. The fixed page-wide canvas
   sits several stacking contexts back from the metal-human video's
   mix-blend-mode:screen, so blending against it directly reads flat; this
   canvas paints in the same local layer as the video, so the blend has
   something to actually screen against. Wash only, no motes -- this is a
   background behind a figure, not the page's own backdrop. */
import * as THREE from 'three';

const host = document.querySelector('.pv-human');
if (host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pv-human-shader';
  host.insertBefore(canvas, host.firstChild);

  const linear = (hex) => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r, c.g, c.b); };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x0d0d0d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.z = 6;

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
          flame *= mix(0.4, 1.0, md);
          vec3 bg = uBg * (1.0 - 0.4 * length(uv));
          gl_FragColor = vec4(bg + flame * uFlameAmt, 1.0);
        }`
    })
  );
  wash.frustumCulled = false;
  scene.add(wash);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  function frame() {
    if (!document.hidden) {
      wash.material.uniforms.iTime.value = (performance.now() - start) * 0.001;
      renderer.render(scene, camera);
    }
    if (!reduced) requestAnimationFrame(frame);
  }
  renderer.render(scene, camera);
  if (!reduced) requestAnimationFrame(frame);
}
