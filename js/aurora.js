/* Landing hero aurora ribbon. One soft ribbon crossing the full width at
   mid height: bright thin core, wide bloom, hue drifting along its length.
   Raw WebGL2 fragment shader on one full-screen triangle, no library
   (WebGL1 compiles the same GLSL 100 source as a free fallback). Replaces
   the canvas 2D particle flow field (js/landing-field.js, removed).

   Inherited couplings, unchanged from the field it replaces:
   - canvas.style.opacity runs 1 -> 0 across hero scroll, reaching 0 the
     moment the hero's bottom edge meets the viewport top, where the
     convergence stage sticks; the scroll listener keeps applying it even
     while the loop is paused.
   - IntersectionObserver rootMargin '-25% 0px 0px 0px' stops this loop at
     the exact line where the convergence loop starts ('0px 0px -75% 0px'),
     so the two never share a frame. document.hidden pauses.
   - prefers-reduced-motion and viewports below 861px get ONE settled
     static frame and no loop, ever.
   - Without WebGL: the hero's CSS-owned treatment (base, radial glow,
     bottom fade) renders unchanged, exactly as it always did when the
     field was absent.

   Legibility: the ribbon passes behind the headline, so a soft local
   dimming (LEGIBILITY_DIM over the copy block) keeps every hero text
   element above 4.5:1 without flattening the ribbon's core with a full
   scrim. Measured, see the commit. */
(function () {
  'use strict';

  /* ---------------- tuning constants, the one place to edit ---------------- */
  /* Color decision: violet core with a restrained magenta lean ONLY at the
     far left and right extremes, where no copy sits and the hero fades.
     MAGENTA_WEIGHT 0.0 = violet-only ribbon; shipped 0.35; toward the
     reference raise to ~0.7. */
  var MAGENTA_WEIGHT = 0.35;
  var C_VIOLET = [167 / 255, 139 / 255, 250 / 255];  /* #A78BFA, the site accent */
  var C_INDIGO = [109 / 255, 79 / 255, 208 / 255];   /* #6D4FD0, existing deep violet-indigo */
  var C_MAGENTA = [214 / 255, 92 / 255, 190 / 255];  /* the lean, reachable only via MAGENTA_WEIGHT */

  var BAND_HEIGHT = 0.46;    /* ribbon centreline, fraction of hero height from top */
  var SPREAD = 0.15;         /* bloom half-width, fraction of hero height */
  var CORE_WIDTH = 0.016;    /* bright spine half-width, same units */
  var BRIGHTNESS = 1.05;     /* overall ribbon energy into the tone map */
  var SPEED = 0.045;         /* undulation drift, cycles per second-ish */
  var SCALE = 1.55;          /* noise frequency along the width */
  var DISPLACE = 0.10;       /* vertical undulation amplitude, fraction of height */
  var OCTAVES = 2;           /* noise octaves: two, per the cost budget */
  var RENDER_SCALE = 0.6;    /* fraction of devicePixelRatio; low-frequency ribbon hides upscaling */
  var DPR_CAP = 2;
  var LEGIBILITY_DIM = 0.52; /* local dimming strength behind the hero copy block */

  var canvas = document.getElementById('lh-field');
  if (!canvas) return;
  var hero = canvas.parentElement;
  var MOBILE = window.matchMedia('(max-width:860px)');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function isStatic() { return REDUCE || MOBILE.matches; }

  var GLATTRS = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' };
  var gl = canvas.getContext('webgl2', GLATTRS) || canvas.getContext('webgl', GLATTRS);
  if (!gl) return; /* CSS-owned hero renders unchanged */

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uAspect;',   /* hero w/h, for portrait composition */
    'uniform vec4 uText;',      /* copy block: cx, cy, halfW, halfH in uv units */
    'uniform vec3 uCV; uniform vec3 uCI; uniform vec3 uCM;',
    'uniform float uMag;',
    'uniform float uBand; uniform float uSpread; uniform float uCore;',
    'uniform float uBright; uniform float uScale; uniform float uDisp; uniform float uDim;',
    'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),',
    '             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    /* two octaves only: the ribbon is low frequency and each octave costs
       eight hashes per pixel per frame */
    'float fbm2(vec2 p){ return vnoise(p) * 0.68 + vnoise(p * 2.13 + 17.7) * 0.32; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',           /* 0..1, y up */
    '  float x = uv.x;',
    /* Perlin-driven vertical displacement along the horizontal axis */
    '  float w1 = fbm2(vec2(x * uScale, uTime * 0.9));',
    '  float w2 = fbm2(vec2(x * uScale * 0.53 + 31.0, uTime * 0.6));',
    '  float center = (1.0 - uBand) + (w1 - 0.5) * uDisp + (w2 - 0.5) * uDisp * 0.6;',
    '  float d = abs(uv.y - center);',
    /* a defined spine and a wide bloom, separated: the core is a narrow
       gaussian, the bloom a broad exponential at low weight */
    '  float core = exp(-(d * d) / (uCore * uCore * 2.0));',
    '  float bloom = exp(-d / uSpread);',
    '  float ribbon = core * 1.0 + bloom * 0.30;',
    /* brightness breathes gently along the length */
    '  ribbon *= 0.82 + 0.36 * fbm2(vec2(x * uScale * 1.7 + 7.0, uTime * 0.5));',
    /* bounded lerp across named palette values, never a cosine gradient:
       indigo -> violet through the middle; the magenta lean exists only
       toward the extremes, weighted by uMag */
    '  float mid = 1.0 - abs(x - 0.5) * 2.0;',       /* 1 centre, 0 edges */
    '  vec3 hue = mix(uCI, uCV, smoothstep(0.15, 0.75, mid));',
    '  float edge = smoothstep(0.55, 1.0, abs(x - 0.5) * 2.0);',
    '  hue = mix(hue, uCM, edge * uMag);',
    '  vec3 col = hue * ribbon * uBright;',
    /* local dimming confined behind the copy block: keeps the headline at
       4.5:1 without a hero-wide scrim that would flatten the core */
    '  if (uDim > 0.001){',
    '    vec2 dq = abs(uv - uText.xy) - uText.zw;',
    '    float dbox = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0);',
    '    col *= 1.0 - uDim * (1.0 - smoothstep(0.0, 0.18, dbox));',
    '  }',
    /* filmic tone map, gamma, one-step dither, then the hero base color so
       unlit pixels equal the CSS background to the byte */
    '  col = 1.0 - exp(-col * 1.25);',
    '  col = pow(col, vec3(1.0 / 2.2));',
    '  col += (h21(gl_FragCoord.xy + fract(uTime) * 43.0) - 0.5) / 255.0;',
    '  col += vec3(8.0, 8.0, 10.0) / 255.0;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');
  var VERT = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }';

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
    var loc = gl.getAttribLocation(prog, 'aP');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uAspect', 'uText', 'uCV', 'uCI', 'uCM', 'uMag', 'uBand', 'uSpread', 'uCore', 'uBright', 'uScale', 'uDisp', 'uDim']
      .forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
    gl.uniform3f(uni.uCV, C_VIOLET[0], C_VIOLET[1], C_VIOLET[2]);
    gl.uniform3f(uni.uCI, C_INDIGO[0], C_INDIGO[1], C_INDIGO[2]);
    gl.uniform3f(uni.uCM, C_MAGENTA[0], C_MAGENTA[1], C_MAGENTA[2]);
    gl.uniform1f(uni.uMag, MAGENTA_WEIGHT);
    gl.uniform1f(uni.uSpread, SPREAD);
    gl.uniform1f(uni.uCore, CORE_WIDTH);
    gl.uniform1f(uni.uBright, BRIGHTNESS);
    gl.uniform1f(uni.uScale, SCALE);
    gl.uniform1f(uni.uDim, LEGIBILITY_DIM);
  } catch (e) { return; }

  var W = 0, H = 0, heroTop = 0;
  var lastScrollY = window.scrollY || 0;
  var lastOpacity = '';

  function applyOpacity() {
    var o = (heroTop + H - lastScrollY) / H;
    o = o < 0 ? 0 : o > 1 ? 1 : o;
    var v = o.toFixed(3);
    if (v !== lastOpacity) { lastOpacity = v; canvas.style.opacity = v; }
    return o;
  }

  function draw(t) {
    gl.uniform1f(uni.uTime, t * SPEED * 10.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    heroTop = r.top + (window.scrollY || 0);
    /* render below native resolution: the low frequency ribbon hides the
       upscale, and fill rate is the whole cost of this shader class */
    var scale = Math.min(window.devicePixelRatio || 1, DPR_CAP) * RENDER_SCALE;
    canvas.width = Math.max(2, Math.round(W * scale));
    canvas.height = Math.max(2, Math.round(H * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uni.uRes, canvas.width, canvas.height);
    var portrait = W < H;
    gl.uniform1f(uni.uAspect, W / H);
    /* portrait: the band sits a little lower with a wider spread, so the
       horizontal ribbon composes behind a tall headline */
    gl.uniform1f(uni.uBand, portrait ? BAND_HEIGHT + 0.06 : BAND_HEIGHT);
    gl.uniform1f(uni.uDisp, portrait ? DISPLACE * 0.8 : DISPLACE);
    /* the copy block, in uv (y up), for the local dimming */
    var wrap = hero.querySelector('.lh-wrap');
    if (wrap) {
      var wr = wrap.getBoundingClientRect();
      var cx = (wr.left + wr.width / 2 - r.left) / W;
      var cy = 1 - (wr.top + wr.height / 2 - r.top) / H;
      gl.uniform4f(uni.uText, cx, cy, (wr.width / 2) / W * 0.86, (wr.height / 2) / H * 0.92);
    }
    applyOpacity();
    if (isStatic()) draw(12.0); /* one settled frame, fixed phase */
  }

  var raf = 0, running = false, heroVisible = true, t0 = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (applyOpacity() <= 0) return; /* invisible: keep the frame free */
    draw((now - t0) / 1000);
  }
  function sync() {
    var want = heroVisible && !document.hidden && !isStatic();
    if (want && !running) { running = true; raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); }
  }

  var resizeT = 0;
  function queueResize() { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); }
  window.addEventListener('resize', queueResize);
  if ('ResizeObserver' in window) new ResizeObserver(queueResize).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { queueResize(); });

  window.addEventListener('scroll', function () {
    lastScrollY = window.scrollY || 0;
    if (!running) applyOpacity();
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[entries.length - 1].isIntersecting;
      sync();
    }, { rootMargin: '-25% 0px 0px 0px' }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  if (MOBILE.addEventListener) MOBILE.addEventListener('change', function () { queueResize(); sync(); });

  resize();
  if (isStatic()) draw(12.0); else sync();
})();
