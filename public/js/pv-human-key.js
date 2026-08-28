/* Luma-keys the metal-human clip. The mp4 has an opaque black background, so
   wherever it is composited it reads as a black box unless it is screened
   against something equally black. This replaces each keyed <video> with a
   transparent WebGL canvas: the clip is sampled as a texture, tinted to the
   accent the way the old grayscale + color-blend CSS did, and given alpha
   from its own luminance, so the figure sits directly on whatever is behind
   it. object-fit: cover and object-position are reproduced from the host's
   --focus custom property (or the data-focus attribute). */
import * as THREE from 'three';

const ACC = new THREE.Color('#c53400');
const FRAG = `
  uniform sampler2D uTex; uniform vec2 uRes, uVid, uFocus; uniform vec3 uAcc;
  varying vec2 vUv;
  void main(){
    float s = max(uRes.x / uVid.x, uRes.y / uVid.y);
    vec2 vis = uRes / s;
    vec2 off = (uVid - vis) * uFocus;
    vec2 uv = (off + vec2(vUv.x, 1.0 - vUv.y) * vis) / uVid;
    uv.y = 1.0 - uv.y;
    vec3 c = texture2D(uTex, uv).rgb;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    l = clamp((l - 0.5) * 1.3 + 0.5, 0.0, 1.0) * 1.02;
    vec3 col = uAcc * l * 1.35 + vec3(1.0, 0.66, 0.45) * pow(l, 2.2) * 1.15;
    float a = smoothstep(0.03, 0.30, l);
    gl_FragColor = vec4(col * a, a);
  }`;

function parseFocus(str) {
  const m = (str || '').trim().match(/([\d.]+)%\s+([\d.]+)%/);
  return m ? [parseFloat(m[1]) / 100, parseFloat(m[2]) / 100] : [0.5, 0.5];
}

function key(video) {
  const host = video.parentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'pv-key';
  host.appendChild(canvas);
  video.classList.add('pv-key-src');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uTex: { value: tex }, uRes: { value: new THREE.Vector2(1, 1) }, uVid: { value: new THREE.Vector2(16, 9) },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uAcc: { value: new THREE.Vector3(ACC.r, ACC.g, ACC.b) }
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: FRAG
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    mat.uniforms.uRes.value.set(w, h);
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const focusEl = host.closest('[data-focus], .lg-visual, .pv-figure') || host;
  function frame() {
    if (!document.hidden) {
      if (video.videoWidth) mat.uniforms.uVid.value.set(video.videoWidth, video.videoHeight);
      const f = parseFocus(getComputedStyle(focusEl).getPropertyValue('--focus') || focusEl.dataset.focus || getComputedStyle(video).objectPosition);
      mat.uniforms.uFocus.value.set(f[0], f[1]);
      renderer.render(scene, cam);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

document.querySelectorAll('.pv-figure video, .lg-figure video').forEach(key);
