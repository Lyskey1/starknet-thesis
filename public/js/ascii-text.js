// Static-page port of React Bits ASCIIText.
// Source model: https://codepen.io/JuanFuentes/pen/eYEeoyE, via reactbits.dev.
import * as THREE from 'three';

const VERT = `
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;
void main() {
  vUv = uv;
  float time = uTime * 5.0;
  vec3 p = position;
  p.x += sin(time + position.y) * 0.5 * uEnableWaves;
  p.y += cos(time + position.z) * 0.15 * uEnableWaves;
  p.z += sin(time + position.x) * uEnableWaves;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = `
varying vec2 vUv;
uniform float mouse;
uniform float uTime;
uniform sampler2D uTexture;
void main() {
  float time = uTime;
  vec2 pos = vUv;
  float r = texture2D(uTexture, pos + cos(time + pos.x) * 0.01).r;
  float g = texture2D(uTexture, pos + tan(time * 0.5 + pos.x - time) * 0.01).g;
  float b = texture2D(uTexture, pos - cos(time * 2.0 + pos.y) * 0.01).b;
  float a = texture2D(uTexture, pos).a;
  gl_FragColor = vec4(r, g, b, a);
}`;

const map = (n, a, b, c, d) => ((n - a) / (b - a)) * (d - c) + c;

class AsciiFilter {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.domElement = document.createElement('div');
    this.pre = document.createElement('pre');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.fontSize = opts.fontSize || 8;
    this.fontFamily = opts.fontFamily || 'IBM Plex Mono, monospace';
    this.charset = opts.charset || ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
    this.invert = opts.invert !== false;
    this.deg = 0;
    this.mouse = { x: 0, y: 0 };
    this.center = { x: 0, y: 0 };

    this.domElement.className = 'ascii-text-container';
    this.domElement.append(this.pre, this.canvas);
    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
  }

  setSize(w, h) {
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
    this.renderer.setSize(this.width, this.height, false);
    this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    const charW = Math.max(1, this.ctx.measureText('A').width);
    this.cols = Math.max(1, Math.floor(this.width / charW));
    this.rows = Math.max(1, Math.floor(this.height / this.fontSize));
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.pre.style.fontFamily = this.fontFamily;
    this.pre.style.fontSize = `${this.fontSize}px`;
    this.pre.style.lineHeight = '1em';
    this.center = { x: this.width / 2, y: this.height / 2 };
    this.mouse = { ...this.center };
  }

  onMouseMove(e) {
    const r = this.domElement.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(this.renderer.domElement, 0, 0, w, h);
    this.asciify(w, h);
    const dx = this.mouse.x - this.center.x;
    const dy = this.mouse.y - this.center.y;
    const deg = Math.atan2(dy, dx) * 180 / Math.PI;
    this.deg += (deg - this.deg) * 0.075;
    this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
  }

  asciify(w, h) {
    const data = this.ctx.getImageData(0, 0, w, h).data;
    let out = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (x + y * w) * 4;
        const a = data[i + 3];
        if (!a) { out += ' '; continue; }
        const gray = (0.3 * data[i] + 0.6 * data[i + 1] + 0.1 * data[i + 2]) / 255;
        let idx = Math.floor((1 - gray) * (this.charset.length - 1));
        if (this.invert) idx = this.charset.length - idx - 1;
        out += this.charset[idx];
      }
      out += '\n';
    }
    this.pre.textContent = out;
  }

  dispose() {
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}

class CanvasText {
  constructor(text, opts = {}) {
    this.text = text;
    this.fontSize = opts.fontSize || 200;
    this.fontFamily = opts.fontFamily || 'IBM Plex Mono';
    this.color = opts.color || '#fdf9f3';
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  resize() {
    this.ctx.font = `600 ${this.fontSize}px ${this.fontFamily}`;
    const m = this.ctx.measureText(this.text);
    this.canvas.width = Math.ceil(m.width) + 28;
    this.canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 28;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = this.color;
    this.ctx.font = `600 ${this.fontSize}px ${this.fontFamily}`;
    const m = this.ctx.measureText(this.text);
    this.ctx.fillText(this.text, 14, 14 + m.actualBoundingBoxAscent);
  }
}

class ASCIIText {
  constructor(el) {
    this.el = el;
    this.text = el.dataset.asciiText || 'Q-DAY';
    this.asciiFontSize = Number(el.dataset.asciiFontSize || 8);
    this.textFontSize = Number(el.dataset.textFontSize || 200);
    this.textColor = el.dataset.textColor || '#fdf9f3';
    this.planeBaseHeight = Number(el.dataset.planeBaseHeight || 8);
    this.enableWaves = el.dataset.enableWaves !== 'false';
    this.mouse = { x: 0, y: 0 };
    this.onMove = this.onMove.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  async init() {
    try {
      await document.fonts.load('600 200px "IBM Plex Mono"');
      await document.fonts.ready;
    } catch (e) {}
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;

    this.camera = new THREE.PerspectiveCamera(45, r.width / r.height, 1, 1000);
    this.camera.position.z = 30;
    this.scene = new THREE.Scene();
    this.textCanvas = new CanvasText(this.text, {
      fontSize: this.textFontSize,
      fontFamily: 'IBM Plex Mono',
      color: this.textColor
    });
    this.textCanvas.resize();
    this.textCanvas.render();
    this.texture = new THREE.CanvasTexture(this.textCanvas.canvas);
    this.texture.minFilter = THREE.NearestFilter;

    const aspect = this.textCanvas.canvas.width / this.textCanvas.canvas.height;
    this.geometry = new THREE.PlaneGeometry(this.planeBaseHeight * aspect, this.planeBaseHeight, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        mouse: { value: 1 },
        uTexture: { value: this.texture },
        uEnableWaves: { value: this.enableWaves ? 1 : 0 }
      }
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch (e) {
      this.renderFallback();
      return;
    }
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.filter = new AsciiFilter(this.renderer, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: this.asciiFontSize,
      invert: true
    });
    this.el.appendChild(this.filter.domElement);
    this.setSize(r.width, r.height);
    this.el.addEventListener('mousemove', this.onMove, { passive: true });
    this.el.addEventListener('touchmove', this.onMove, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  setSize(w, h) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.filter.setSize(this.width, this.height);
    this.center = { x: this.width / 2, y: this.height / 2 };
    if (!this.mouse.x && !this.mouse.y) this.mouse = { ...this.center };
  }

  onMove(evt) {
    const e = evt.touches ? evt.touches[0] : evt;
    const b = this.el.getBoundingClientRect();
    this.mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  onResize() {
    const r = this.el.getBoundingClientRect();
    if (r.width && r.height) this.setSize(r.width, r.height);
  }

  start() {
    if (this.fallback) return;
    if (this.raf) return;
    const frame = () => {
      this.raf = requestAnimationFrame(frame);
      this.render();
    };
    frame();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  render() {
    if (!this.renderer) return;
    const t = Date.now() * 0.001;
    this.textCanvas.render();
    this.texture.needsUpdate = true;
    this.material.uniforms.uTime.value = Math.sin(t);
    this.mesh.rotation.x += (map(this.mouse.y, 0, this.height, 0.5, -0.5) - this.mesh.rotation.x) * 0.05;
    this.mesh.rotation.y += (map(this.mouse.x, 0, this.width, -0.5, 0.5) - this.mesh.rotation.y) * 0.05;
    this.filter.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.el.removeEventListener('mousemove', this.onMove);
    this.el.removeEventListener('touchmove', this.onMove);
    if (this.filter) this.filter.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
  }

  renderFallback() {
    this.fallback = true;
    const wrap = document.createElement('div');
    const pre = document.createElement('pre');
    wrap.className = 'ascii-text-container';
    const letters = this.text.toUpperCase().split('').join('  ');
    pre.textContent = Array.from({ length: 12 }, (_, i) => {
      const pad = ' '.repeat(Math.abs(6 - i));
      return `${pad}${letters}${pad}${letters}`;
    }).join('\n');
    wrap.appendChild(pre);
    this.el.appendChild(wrap);
  }
}

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
if (!reduce.matches) {
  document.querySelectorAll('[data-ascii-text]').forEach((el) => {
    const ascii = new ASCIIText(el);
    let ready = false;
    const mount = () => {
      if (ready) { ascii.start(); return; }
      ready = true;
      ascii.init().then(() => ascii.start());
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.isIntersecting ? mount() : ascii.stop());
      }, { threshold: 0 }).observe(el);
    } else {
      mount();
    }
  });
}
