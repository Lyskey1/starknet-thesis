/* Landing hero aurora ribbon. One undulating ribbon crossing the full width
   LOW in the frame, below the copy block: bright thin core, soft bloom, hue
   drifting along its length, near-black everywhere else. Raw WebGL2 fragment
   shader on one full-screen triangle, no library (WebGL1 compiles the same
   GLSL 100 source as a free fallback). Replaces the canvas 2D particle flow
   field (js/landing-field.js, removed).

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

   Legibility is solved by PLACEMENT, not by dimming: the band centreline
   sits below the copy block (BAND_HEIGHT), so no hero text ever crosses the
   spine and no local scrim exists to cut the ribbon. Contrast is measured
   against the brightest background pixel under each text element across
   several animation phases; see the commit. */
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

  var BAND_HEIGHT = 0.88;    /* ribbon centreline, fraction of hero height from top.
                                The copy block (lede included) reaches 0.81 at 1440,
                                so the spine lives in the bottom strip and the swells
                                rise toward 0.20-from-bottom only at the flanks where
                                no copy sits (the "lift" envelope in the shader) */
  var SPREAD_UP = 0.022;     /* bloom half-width ABOVE the spine (toward the copy):
                                tight, so the upper edge is defined and the frame
                                above returns to near black (was a symmetric 0.15) */
  var SPREAD_DOWN = 0.10;    /* bloom half-width BELOW the spine, into the empty
                                bottom of the frame: wide and soft, reaching the
                                hero's bottom edge so the handoff into the
                                convergence scene carries light, not black */
  var BLOOM_WEIGHT = 0.16;   /* bloom energy relative to the core's 1.0 (was 0.30) */
  var CORE_WIDTH = 0.012;    /* bright spine half-width, same units (was 0.016) */
  var BRIGHTNESS = 0.92;     /* overall ribbon energy into the tone map (was 0.95) */
  var SPEED = 0.045;         /* undulation drift, cycles per second-ish */
  var SCALE = 2.8;           /* noise frequency along the width (was 1.55): two-plus
                                full swells cross the frame instead of a lone drift,
                                so no time slice reads as a straight line */
  var DISPLACE = 0.06;       /* vertical undulation amplitude, fraction of height,
                                applied to SIGNED noise remapped to roughly -1..1
                                (the old 0.10 rode raw 0..1 noise centred on 0.5,
                                which left the band visually flat) */
  var OCTAVES = 2;           /* noise octaves: two, per the cost budget */
  var RENDER_SCALE = 0.6;    /* fraction of devicePixelRatio; low-frequency ribbon hides upscaling */
  var DPR_CAP = 2;

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
    'uniform vec3 uCV; uniform vec3 uCI; uniform vec3 uCM;',
    'uniform float uMag;',
    'uniform float uBand; uniform float uSprUp; uniform float uSprDn; uniform float uCore; uniform float uBloomW;',
    'uniform float uBright; uniform float uScale; uniform float uDisp; uniform float uLiftHi;',
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
    /* noise-driven vertical displacement along the horizontal axis; the fbm
       concentrates around 0.5, so remap to a signed value at doubled
       contrast or the undulation flattens into a straight band */
    /* the pattern also drifts sideways (x advection), so the swells travel
       across the frame instead of breathing in place */
    '  float s1 = (fbm2(vec2(x * uScale + uTime * 0.22, uTime * 0.9)) - 0.5) * 2.0;',
    '  float s2 = (fbm2(vec2(x * uScale * 0.53 + 31.0 - uTime * 0.15, uTime * 0.6)) - 0.5) * 2.0;',
    /* the fbm crowds small values, which reads as a flat band at quiet
       phases: expand the small excursions (x1.7 near zero, x1.0 at the
       extremes) so the ribbon always visibly rises and falls */
    '  s1 *= 1.7 - 0.7 * abs(s1);',
    '  s2 *= 1.7 - 0.7 * abs(s2);',
    '  float disp = s1 * uDisp + s2 * uDisp * 0.5;',
    /* soft saturation on the excursion (odd, slope 1 at zero, so typical
       undulation passes through unchanged): the RISE is bounded tighter in
       the middle of the frame, where the spine must stay clear of the lede
       above it, and looser at the flanks, which carry the tall swells */
    '  float lift = smoothstep(0.30, 0.46, abs(x - 0.5));',
    '  float m = disp > 0.0 ? uDisp * mix(0.55, uLiftHi, lift) : 0.075;',
    '  float t = disp / m;',
    '  disp = m * t / sqrt(1.0 + t * t);',
    '  float center = (1.0 - uBand) + disp;',
    '  float dy = uv.y - center;',
    '  float d = abs(dy);',
    /* a defined spine and a soft bloom, separated: the core is a narrow
       gaussian; the bloom is a broad exponential at low weight, asymmetric,
       tight above the spine (toward the copy) and wide below it (into the
       empty bottom of the frame) */
    '  float core = exp(-(d * d) / (uCore * uCore * 2.0));',
    '  float bloom = exp(-d / (dy > 0.0 ? uSprUp : uSprDn));',
    '  float ribbon = core + bloom * uBloomW;',
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
    ['uRes', 'uTime', 'uCV', 'uCI', 'uCM', 'uMag', 'uBand', 'uSprUp', 'uSprDn', 'uCore', 'uBloomW', 'uBright', 'uScale', 'uDisp', 'uLiftHi']
      .forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
    gl.uniform3f(uni.uCV, C_VIOLET[0], C_VIOLET[1], C_VIOLET[2]);
    gl.uniform3f(uni.uCI, C_INDIGO[0], C_INDIGO[1], C_INDIGO[2]);
    gl.uniform3f(uni.uCM, C_MAGENTA[0], C_MAGENTA[1], C_MAGENTA[2]);
    gl.uniform1f(uni.uMag, MAGENTA_WEIGHT);
    gl.uniform1f(uni.uSprUp, SPREAD_UP);
    gl.uniform1f(uni.uSprDn, SPREAD_DOWN);
    gl.uniform1f(uni.uCore, CORE_WIDTH);
    gl.uniform1f(uni.uBloomW, BLOOM_WEIGHT);
    gl.uniform1f(uni.uBright, BRIGHTNESS);
    gl.uniform1f(uni.uScale, SCALE);
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
    /* portrait: the copy block runs taller and spans nearly the full width,
       so the band sits slightly lower, undulates less, and loses the tall
       flank swells (the lede's corners reach the flanks there) */
    gl.uniform1f(uni.uBand, portrait ? BAND_HEIGHT + 0.03 : BAND_HEIGHT);
    gl.uniform1f(uni.uDisp, portrait ? DISPLACE * 0.7 : DISPLACE);
    gl.uniform1f(uni.uLiftHi, portrait ? 0.8 : 1.6);
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
