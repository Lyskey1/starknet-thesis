/* Aurora curtain, shared by the six non-landing heroes (the landing hero
   carries its own aurora ribbon, js/aurora.js, and never loads this file).
   One raw WebGL2 fragment shader on a full-screen triangle, no library.

   Each page drops an empty <div class="hero-curtain" aria-hidden="true">
   at the top of its .hero; this script fills it with a canvas and reads
   the page accent from --accent-rgb on <body>, so one file serves every
   page in that page's own hue. The three color stops are derived from the
   single accent (darkened, as-is, lifted toward white): one accent family
   per page, never three unrelated hues.

   Shape: the curtain hangs from the hero's top edge and its lower boundary
   UNDULATES; contrast under the copy is bought with faintness and a long
   soft falloff, never with a hard clip (a clipped curtain reads as a flat
   colored bar). One simplex noise evaluation per pixel drives both the
   undulating edge and the internal texture.

   Discipline, matching the rest of the site:
   - IntersectionObserver pauses the loop when the hero leaves the viewport;
     document.hidden pauses it too. The curtain is the only rAF loop on the
     pages that use it.
   - prefers-reduced-motion renders ONE settled frame and never starts the
     loop. Below 861px the curtain is also a single settled frame: mobile
     heroes are short, so the copy sits close to the curtain, and a static
     frame carries the same atmosphere at zero per-frame cost.
   - No WebGL2: the canvas is never attached, the hero's own CSS glow stays
     (the .hero-curtain-on class is only added once a context exists), and
     the page renders exactly as before this file existed.
   - DPR capped at 2, rendered at RENDER_SCALE of native: the curtain is
     soft by design, so the upscale is invisible. */
(function () {
  'use strict';

  /* ---------------- tuning constants ---------------- */
  var RENDER_SCALE = 0.8;   /* fraction of (dpr-capped) native resolution */
  var DPR_CAP = 2;
  var GAIN = 0.28;          /* overall energy: atmosphere, not a shape.
                               Per-page override: data-gain on .hero-curtain
                               (quantum runs dimmer: its blue accent eyebrow
                               sits right under the curtain and blue-on-blue
                               is the tightest contrast case on the site) */
  var EDGE = 0.60;          /* mean lower boundary, fraction of curtain height */
  var AMP = 0.22;           /* undulation amplitude of that boundary */
  var FREQ_X = 2.6;         /* noise cells across the width */
  var FREQ_Y = 1.25;        /* noise cells down the curtain */
  var SPEED = 0.05;         /* temporal drift */
  var STATIC_T = 7.0;       /* fixed phase for settled frames */

  var wrap = document.querySelector('.hero .hero-curtain');
  if (!wrap) return;
  var hero = wrap.closest('.hero');
  var gain = parseFloat(wrap.getAttribute('data-gain')) || GAIN;
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.matchMedia('(max-width:860px)');
  function isStatic() { return REDUCE || MOBILE.matches; }

  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return; /* no WebGL2: hero renders exactly as before */

  /* page accent -> three stops in the same family */
  var rgb = (getComputedStyle(document.body).getPropertyValue('--accent-rgb') || '167,139,250')
    .split(',').map(function (v) { return parseFloat(v) / 255; });
  if (rgb.length !== 3 || rgb.some(isNaN)) rgb = [167 / 255, 139 / 255, 250 / 255];
  var MID = rgb;
  var DARK = rgb.map(function (v) { return v * 0.42; });
  var LIGHT = rgb.map(function (v) { return v + (1 - v) * 0.35; });

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT;',
    'uniform vec3 uCd; uniform vec3 uCm; uniform vec3 uCl;',
    'uniform float uGain; uniform float uEdge; uniform float uAmp;',
    'uniform float uFx; uniform float uFy;',
    'out vec4 frag;',
    /* 2D simplex noise (Ashima/McEwan), one evaluation per pixel */
    'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    'float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float d = 1.0 - uv.y;',                 /* 0 at the top edge, 1 at the curtain bottom */
    '  float n = snoise(vec2(uv.x * uFx + uT * 0.4, d * uFy - uT));',
    /* undulating soft lower boundary: the edge position rides the noise,
       and the falloff below it is LONG (down to 12% of the edge height),
       so contrast comes from faintness, never from a clip */
    '  float edge = uEdge + uAmp * n;',
    '  float I = smoothstep(edge, edge * 0.12, d);',
    '  I *= 1.0 - d * d;',                     /* global fade to zero at the bottom */
    '  I *= 0.62 + 0.38 * (0.5 + 0.5 * n);',   /* internal texture from the same eval */
    /* the hero is narrower than the viewport: dissolve toward the canvas
       sides so the clip never shows as a hard vertical edge */
    '  I *= smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x);',
    '  I *= uGain;',
    /* three stops, one family: dark -> accent -> lifted, indexed by energy */
    '  vec3 hue = mix(uCd, uCm, clamp(I * 2.4, 0.0, 1.0));',
    '  hue = mix(hue, uCl, smoothstep(0.5, 0.95, I));',
    /* filmic tone map, gamma, one-step dither, site-consistent */
    '  vec3 col = 1.0 - exp(-hue * I * 1.4);',
    '  col = pow(col, vec3(1.0 / 2.2));',
    '  col += (h21(gl_FragCoord.xy + fract(uT) * 37.0) - 0.5) / 255.0;',
    '  frag = vec4(col, clamp(I * 2.2, 0.0, 0.62));',
    '}',
  ].join('\n');
  var VERT = '#version 300 es\nlayout(location=0) in vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }';

  var uni = {};
  try {
    var prog = gl.createProgram();
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VERT); gl.compileShader(vs);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, FRAG); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uT', 'uCd', 'uCm', 'uCl', 'uGain', 'uEdge', 'uAmp', 'uFx', 'uFy']
      .forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
    gl.uniform3f(uni.uCd, DARK[0], DARK[1], DARK[2]);
    gl.uniform3f(uni.uCm, MID[0], MID[1], MID[2]);
    gl.uniform3f(uni.uCl, LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform1f(uni.uGain, gain);
    gl.uniform1f(uni.uEdge, EDGE);
    gl.uniform1f(uni.uAmp, AMP);
    gl.uniform1f(uni.uFx, FREQ_X);
    gl.uniform1f(uni.uFy, FREQ_Y);
  } catch (e) { return; } /* compile/link failure: hero unchanged */

  wrap.appendChild(canvas);
  hero.classList.add('hero-curtain-on'); /* retires the CSS top glow the curtain replaces */

  function draw(t) {
    gl.uniform1f(uni.uT, t * SPEED);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    var s = Math.min(window.devicePixelRatio || 1, DPR_CAP) * RENDER_SCALE;
    var W = Math.max(2, Math.round(w * s)), H = Math.max(2, Math.round(h * s));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
      gl.uniform2f(uni.uRes, W, H);
    }
    if (isStatic()) draw(STATIC_T);
  }

  var raf = 0, running = false, inView = true, t0 = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    draw((now - t0) / 1000);
  }
  function sync() {
    var want = inView && !document.hidden && !isStatic();
    if (want && !running) { running = true; raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); }
  }

  var rT = 0;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(resize, 150); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      inView = en[en.length - 1].isIntersecting;
      sync();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  if (MOBILE.addEventListener) MOBILE.addEventListener('change', function () { resize(); sync(); });

  resize();
  if (isStatic()) draw(STATIC_T); else sync();
})();
