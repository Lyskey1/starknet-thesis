/* Convergence scene, landing page. Raw WebGL2 fragment shader on one
   full-screen triangle: three pillar ring systems (BTCFi orange, Quantum
   blue, Privacy emerald) contract inward and merge into a violet core,
   which then emits, with the Starknet mark arriving at the centre.
   No library. Replaces the previous Three.js scene (assets/js/three.min.js
   is no longer fetched anywhere).

   Ring travel is SIGNED: negative through the narrative so rings contract
   inward (convergence), positive only for the formed core so it emits.
   The reference component only emits, which is the opposite motion to the
   argument this scene makes.

   Untouched by design: the 620vh scene, the sticky stage, the scroll
   progress model, the five beat windows and their copy, the mobile-native
   path below 861px (this file is never fetched there), and the render-loop
   handoff with the hero flow field (complementary IntersectionObserver
   margins, so the two never share a frame).

   The shader body is authored as GLSL 100, which both WebGL2 and WebGL1
   contexts compile: WebGL2 is requested first, WebGL1 is the free
   compatibility fallback. With neither, the stage stays a static #05060a
   backdrop and the beats and mark still run from scroll, the same silent
   degradation as the hero flow field. */
(function () {
  'use strict';
  if (!window.matchMedia('(min-width:861px)').matches) return;

  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('conv-gl');
  var sceneEl = document.getElementById('conv-scene');
  if (!canvas || !sceneEl) return;

  var smooth = function (a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  var bump = function (p, a, b) { var e = Math.min(0.05, (b - a) * 0.3); return smooth(a, a + e, p) * (1 - smooth(b - e, b, p)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------- overlays: beats, wordmark, hint, centre mark ---------------- */
  var beats = [0, 1, 2, 3, 4].map(function (i) { return document.getElementById('conv-b' + i); });
  var mark = document.getElementById('conv-mark');
  var shint = document.getElementById('conv-shint');
  var beatWin = [[0.10, 0.27], [0.28, 0.45], [0.46, 0.61], [0.63, 0.80], [0.88, 1.001]];

  /* ---------------- scroll progress (unchanged model) ---------------- */
  var P_ = 0;
  function readProgress() {
    if (REDUCE) { P_ = 1; return; }
    var r = sceneEl.getBoundingClientRect();
    var denom = r.height - window.innerHeight;
    P_ = denom > 0 ? Math.max(0, Math.min(1, -r.top / denom)) : 0;
  }
  window.addEventListener('scroll', readProgress, { passive: true });

  /* ---------------- pillar system model (single source for GL + beats) ----------------
     Shader space: p spans -0.5..0.5 across the SHORTER edge, y up. */
  var BASE = [
    { x: -0.28, y: 0.11 },  /* BTCFi, left  */
    { x: 0.27, y: 0.14 },   /* Quantum, right */
    { x: 0.02, y: -0.21 },  /* Privacy, low centre */
  ];
  /* beat index -> system index (beat 0 privacy, 1 quantum, 2 bitcoin) */
  var BEAT_SYS = [2, 1, 0];
  var centers = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  var emph = [0, 0, 0];

  function model(p) {
    var merge = smooth(0.62, 0.83, p);      /* centres travel to the middle */
    var collapse = smooth(0.70, 0.86, p);   /* radius collapse */
    var form = smooth(0.84, 0.99, p);       /* violet core forms and emits */
    var markIn = smooth(0.90, 0.985, p);    /* the core opens for the mark */
    for (var i = 0; i < 3; i++) {
      var e = bump(p, beatWin[BEAT_SYS.indexOf(i)][0], beatWin[BEAT_SYS.indexOf(i)][1]);
      emph[i] = e;
      /* emphasized system leans toward centre stage, then the merge spiral */
      var bx = lerp(BASE[i].x, 0, e * 0.22);
      var by = lerp(BASE[i].y, 0.02, e * 0.22);
      var ang = Math.atan2(by, bx) + merge * 2.6;
      var rad = Math.hypot(bx, by) * (1 - collapse);
      centers[i].x = Math.cos(ang) * rad;
      centers[i].y = Math.sin(ang) * rad;
    }
    return { merge: merge, collapse: collapse, form: form, markIn: markIn };
  }

  /* ---------------- WebGL ---------------- */
  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uC0; uniform vec2 uC1; uniform vec2 uC2;',
    'uniform vec3 uEmph;',
    'uniform float uMerge; uniform float uForm; uniform float uMarkIn;',
    /* existing CSS accents only: #F7931A, #3DA9FC, #1FCB94, #A78BFA, #8B5CF6 */
    'const vec3 ORANGE = vec3(0.969, 0.576, 0.102);',
    'const vec3 BLUE   = vec3(0.239, 0.663, 0.988);',
    'const vec3 EMER   = vec3(0.122, 0.796, 0.580);',
    'const vec3 VIOLET = vec3(0.655, 0.545, 0.980);',
    'const vec3 VIOLET2= vec3(0.545, 0.361, 0.965);',
    'float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    /* one pillar ring system, reference model: travel over a cycle, angular
       cutaway via pow(cut*a, 3.0)*r, glow via exp(-attenuation*d), fade in
       and out across the cycle. dir is SIGNED: negative contracts. */
    'vec3 ringSystem(vec2 p, vec2 c, vec3 col, float t, float dir, float emph, float scale){',
    '  vec2 q = p - c;',
    '  float r = length(q);',
    '  float a = atan(q.y, q.x);',
    '  vec3 acc = vec3(0.0);',
    '  for (int k = 0; k < 6; k++){',
    '    float fk = float(k) / 6.0;',
    '    float s = fract(fk + t * dir);',
    '    float rr = (0.045 + s * 0.335) * scale;',
    '    float cut = pow(max(0.0, 0.55 * sin(a * 3.0 + fk * 6.2831 + t * 0.9)), 3.0) * rr;',
    '    float d = abs(r - rr) + cut;',
    '    float fade = sin(3.14159 * s);',
    '    acc += col * exp(-95.0 * d) * fade * (0.55 + 0.5 * emph);',
    '    acc += col * exp(-16.0 * d) * fade * 0.085;',
    '  }',
    '  acc += col * exp(-r * 11.0) * (0.16 + 0.3 * emph);',
    '  return acc;',
    '}',
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);',
    '  vec3 col = vec3(0.008, 0.010, 0.016);',
    /* sparse static stars */
    '  vec2 sp = floor(gl_FragCoord.xy / 2.0);',
    '  float st = step(0.9987, h21(sp));',
    '  col += vec3(0.55, 0.58, 0.7) * st * (0.25 + 0.75 * h21(sp + 7.0)) * 0.4;',
    '  float narr = 1.0 - uForm;',
    '  if (narr > 0.001){',
    '    float scale = mix(1.0, 0.5, uMerge);',
    '    col += ringSystem(p, uC0, mix(ORANGE, VIOLET, uMerge), uTime * 0.100, -1.0, uEmph.x, scale) * narr;',
    '    col += ringSystem(p, uC1, mix(BLUE,   VIOLET, uMerge), uTime * 0.112, -1.0, uEmph.y, scale) * narr;',
    '    col += ringSystem(p, uC2, mix(EMER,   VIOLET, uMerge), uTime * 0.106, -1.0, uEmph.z, scale) * narr;',
    '  }',
    '  if (uForm > 0.001){',
    /* the formed core EMITS: positive travel, the one place dir flips */
    '    vec3 core = ringSystem(p, vec2(0.0), mix(VIOLET, VIOLET2, 0.35), uTime * 0.12, 1.0, 0.55, 0.95) * uForm;',
    '    float r = length(p);',
    /* the white-hot centre recedes into an annular halo as the mark
       arrives, so the centre stays legible instead of blowing out */
    '    float hot  = exp(-r * 15.0) * (1.0 - uMarkIn * 0.86);',
    '    float halo = exp(-abs(r - 0.155) * 26.0) * uMarkIn;',
    '    core += (vec3(0.93, 0.90, 1.0) * hot * 1.7 + VIOLET * halo * 1.05) * uForm;',
    '    col += core;',
    '  }',
    /* filmic tone map, gamma, one-step dither: additive rings clip to flat
       white without the tone map; wide dark gradients band without dither */
    '  col = 1.0 - exp(-col * 1.4);',
    '  col = pow(col, vec3(1.0 / 2.2));',
    '  col += (h21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');
  var VERT = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }';

  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }) ||
           canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false });
  var glOk = false, uni = {};
  if (gl) {
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
      var loc = gl.getAttribLocation(prog, 'aP');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uTime', 'uC0', 'uC1', 'uC2', 'uEmph', 'uMerge', 'uForm', 'uMarkIn'].forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
      glOk = true;
    } catch (e) { glOk = false; }
  }

  /* fill-rate bound: the pixel ratio is the single largest cost lever */
  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var W = Math.round(w * DPR), H = Math.round(h * DPR);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      if (glOk) gl.viewport(0, 0, W, H);
    }
  }
  window.addEventListener('resize', resize);

  /* ---------------- per-frame update ---------------- */
  function update(p, time) {
    var m = model(p);
    for (var i = 0; i < 5; i++) {
      var o = bump(p, beatWin[i][0], beatWin[i][1]);
      beats[i].style.opacity = o.toFixed(3);
      beats[i].style.transform = 'translateX(-50%) translateY(' + ((1 - o) * 16).toFixed(1) + 'px)';
    }
    if (mark) mark.style.opacity = smooth(0.88, 0.985, p).toFixed(3);
    if (shint) shint.style.opacity = (1 - smooth(0.03, 0.12, p)).toFixed(3);
    if (glOk) {
      gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      gl.uniform1f(uni.uTime, time);
      gl.uniform2f(uni.uC0, centers[0].x, centers[0].y);
      gl.uniform2f(uni.uC1, centers[1].x, centers[1].y);
      gl.uniform2f(uni.uC2, centers[2].x, centers[2].y);
      gl.uniform3f(uni.uEmph, emph[0], emph[1], emph[2]);
      gl.uniform1f(uni.uMerge, m.merge);
      gl.uniform1f(uni.uForm, m.form);
      gl.uniform1f(uni.uMarkIn, m.markIn);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  /* ---------------- loop: same handoff discipline as before ---------------- */
  var accMs = 0, lastNow = 0, rafId = 0, looping = false, inView = false;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    accMs += Math.min(now - lastNow, 50); lastNow = now;
    resize(); readProgress();
    update(P_, accMs * 0.001);
  }
  function startLoop() { if (looping) return; looping = true; lastNow = performance.now(); rafId = requestAnimationFrame(frame); }
  function stopLoop() { if (!looping) return; looping = false; cancelAnimationFrame(rafId); }
  function sync() { (inView && !document.hidden) ? startLoop() : stopLoop(); }
  document.addEventListener('visibilitychange', sync);

  readProgress(); resize();
  if (REDUCE) { update(1, 0); }
  else if (!glOk) {
    /* no WebGL at all: static #05060a backdrop, beats and mark still run
       from scroll (no animation frame loop at all) */
    update(P_, 0);
    window.addEventListener('scroll', function () { readProgress(); update(P_, 0); }, { passive: true });
  } else {
    /* One static render so the pre-engagement peek below the hero stays
       populated, then per-frame work only while the scene top sits in the
       top quarter of the viewport or the stage is engaged. The hero flow
       field pauses at that same boundary (its complementary rootMargin),
       so the two loops never share frames. Animation time accumulates only
       while looping, so nothing jumps on resume. */
    update(P_, 0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[en.length - 1].isIntersecting;
        sync();
      }, { rootMargin: '0px 0px -75% 0px' }).observe(sceneEl);
    } else { inView = true; sync(); }
  }
})();
