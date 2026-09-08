/* QUANTUM hero centrepiece: main's funnel wireframe, rebuilt in dust.

   THIS IS THE SAME ENGINE as js/strk-hero-mark.js / js/btcfi-hero-mark.js /
   js/digest-hero-mark.js (the static-page ports of the landing hero's WebGL
   orb): the same THREE.Points pipeline, the same additive point material and
   fragment disc, the same world-y gradient computed in the vertex shader
   (accent at the bottom through warm to chalk at the top, pinned to the
   frame however the object moves), the same SPEED-scaled clock, drift sines,
   density/size discipline (uSz trim, uPix cap, uH scaling), IO visibility
   gating, document.hidden pause and reduced-motion single frame.

   WHAT CHANGED IS ONLY THE GEOMETRY SOURCE. The other marks sample a raster
   glyph mask; this one is PARAMETRIC: main's quantum hero funnel (stacked
   horizontal ellipses narrowing downward into a single bright point; see
   main's .qh-chandelier svg) sampled straight from its equations:
     - 9 rings, top ring diameter 2*R_TOP, bottom ring 0.133x the top
       (the brief's 0.12-of-column against the 0.9-of-column top ring),
       radius profile r(s) = R_TOP * 0.133^s, rings on the top 82% of the
       height, apex at the bottom; height = 1.6x the top ring width.
     - 10 meridians of FLOWING dust: each particle carries (theta, s0) and
       the VERTEX SHADER moves it down the funnel surface, s = fract(s0 +
       t/T_FALL), converging to r=0 at the apex and respawning at the top:
       a slow collapse, ~40s per full cycle in real time.
     - the whole funnel turns about its vertical axis at the same angular
       speed as the strk mark's outer ring (0.055 rad per SPEED-scaled
       second); nodes are translated by the group transform, never rotated.
     - the APEX is one bright particle cluster pulsing at the halo cadence
       the other devices use (5.2s), the most saturated point by gradient.
   THE OUTER RING ORBIT IS DROPPED on purpose: the annulus reads as a rival
   to the funnel's own top ring and flattens the taper. Reported.

   Mount is #qhStage, the hero's right-column box (the strk stage geometry).
   The renderer stays alpha/transparent over js/eco-backdrop.js.
   strk20 palette only: accent #c53400, warm #e07a4a, chalk #fafafa.

   2026-09-08: THE ENGINE MOVED TO js/hero-mark-engine.js (renderer,
   material, point builder, fit/loop/gating, the shared vertex program).
   This file keeps only what is the funnel's own: its constants, its
   per-frame motion (the GLSL move hook), its three fills, its fit and its
   draw. The landing hero's convergence runs on the same engine file. */
import { createMark, vertexShader, rnd } from './hero-mark-engine.js';

/* mountQuantumFunnel(mount): the funnel on any stage box; returns the engine
   mark (dispose() included) or null without WebGL. The page self-runs it on
   #qhStage unless a host (the landing) sets window.QH_MARK_MANUAL first. */
export function mountQuantumFunnel(MOUNT) {
  /* the funnel the fit is measured against: full height 2*R_FIT, top ring
     width = height / 1.6 (main's proportions) */
  const FUN_H = 4.0;                 // world height of the funnel
  const R_FIT = FUN_H / 2;           // fit semantics: half-height, like a radius
  const R_TOP = FUN_H / 1.6 / 2;     // top ring radius (width = H / 1.6)
  const TAPER = 0.133;               // bottom ring / top ring (0.12 / 0.9)
  const RING_BAND = 0.82;            // rings live on the top 82% of the height
  const N_RINGS = 9, N_MER = 10;
  const TOP_Y = FUN_H / 2;

  /* the single slowdown lever: one clock, everything scaled off it */
  const SPEED = 0.34;
  /* flow: ~40 real seconds per full top-to-apex cycle, in clock units */
  const FLOW_R = 1 / (40 * SPEED);
  /* apex pulse at the halo cadence used elsewhere (5.2s real) */
  const PULSE_W = (2 * Math.PI) / (5.2 * SPEED);

  const mark = createMark({ mount: MOUNT, tag: 'quantum-hero-mark', speed: SPEED });
  if (!mark) return null;
  {
    const { world, points, makeMaterial, smallMQ } = mark;

    /* the funnel's own motion: the collapse rides each meridian down the
       surface; the apex cluster pulses */
    const VERT = vertexShader({
      attributes: 'attribute float aMode; attribute float aTheta; attribute float aS;',
      uniforms: 'uniform float uRTop, uTopY, uFunH, uFlowR, uPulseW;',
      move: `
        if (aMode > 0.5 && aMode < 1.5) {
          /* the collapse: this particle rides its meridian down the funnel */
          float s = fract(aS + uTime * uFlowR);
          float r = uRTop * pow(0.133, s) * clamp((1.0 - s) / 0.12, 0.0, 1.0);
          p = vec3(r * cos(aTheta), uTopY - s * uFunH, r * sin(aTheta));
          fadeFlow = smoothstep(0.0, 0.05, s);
        }
        pulse = aMode > 1.5 ? (0.85 + 0.35 * sin(uTime * uPulseW)) : 1.0;
        alphaPulse = aMode > 1.5 ? (0.8 + 0.2 * sin(uTime * uPulseW)) : 1.0;`
    });
    const FUNNEL_U = { uRTop: R_TOP, uTopY: TOP_Y, uFunH: FUN_H, uFlowR: FLOW_R, uPulseW: PULSE_W };
    const ATTRS = ['aMode', 'aTheta', 'aS'];
    const mat = (drift) => makeMaterial(VERT, FUNNEL_U, drift, FUN_H);

    /* density at the strk discipline, desktop / sub-980 */
    const small = smallMQ.matches;
    const RINGS_N = small ? 9000 : 26000;
    const FLOW_N = small ? 5000 : 14000;
    const APEX_N = 48;

    /* ---- the 9 rings: static dust on the ellipse stack; the group's own
       Y-rotation is the spin, exactly as the strk ring turns in its plane */
    world.add(points(RINGS_N, function (i, pos, siz, pha, alp, tin, x) {
      /* rings weighted by circumference so density reads even */
      const w = rnd(i, 91.7);
      const ring = Math.floor(Math.pow(w, 1.35) * N_RINGS);
      const sRing = ring / (N_RINGS - 1) * RING_BAND;
      const r0 = R_TOP * Math.pow(TAPER, sRing);
      const a = rnd(i, 127.1) * Math.PI * 2;
      /* gaussian-ish thickness, the strk annulus idiom */
      const rr = r0 * (1 + (rnd(i, 311.7) + rnd(i, 74.7) - 1) * 0.05);
      const y = TOP_Y - sRing * FUN_H + (rnd(i, 39.42) - 0.5) * 0.05;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * rr;
      siz[i] = 0.95 + rnd(i, 12.9898) * 0.85;
      pha[i] = rnd(i, 78.233);
      alp[i] = 0.32 + rnd(i, 91.3) * 0.42;
      tin[i] = 0.85 + rnd(i, 5.331) * 0.4;
      x.aMode[i] = 0; x.aTheta[i] = 0; x.aS[i] = 0;
    }, mat(0.6), ATTRS, FUN_H));

    /* ---- the meridian flow: dust riding 10 curves down to the apex ---- */
    world.add(points(FLOW_N, function (i, pos, siz, pha, alp, tin, x) {
      const mer = i % N_MER;
      const theta = mer / N_MER * Math.PI * 2 + (rnd(i, 45.164) - 0.5) * 0.22;
      x.aMode[i] = 1; x.aTheta[i] = theta; x.aS[i] = rnd(i, 17.23);
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0; /* shader-driven */
      siz[i] = 0.8 + rnd(i, 12.9898) * 0.7;
      pha[i] = rnd(i, 78.233);
      alp[i] = 0.30 + rnd(i, 91.3) * 0.38;
      tin[i] = 0.9 + rnd(i, 5.331) * 0.4;
    }, mat(0.5), ATTRS, FUN_H));

    /* ---- the apex: one bright particle (a tight pulsing cluster) ---- */
    world.add(points(APEX_N, function (i, pos, siz, pha, alp, tin, x) {
      const a = rnd(i, 127.1) * Math.PI * 2, r = Math.pow(rnd(i, 311.7), 1.6) * 0.06;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = TOP_Y - FUN_H + (rnd(i, 39.42) - 0.5) * 0.05;
      pos[i * 3 + 2] = Math.sin(a) * r;
      siz[i] = i === 0 ? 4.6 : 1.3 + rnd(i, 12.9898) * 1.1;
      pha[i] = rnd(i, 78.233);
      alp[i] = i === 0 ? 1 : 0.5 + rnd(i, 91.3) * 0.4;
      tin[i] = 1.35;
      x.aMode[i] = 2; x.aTheta[i] = 0; x.aS[i] = 0;
    }, mat(0.25), ATTRS, FUN_H));

    /* the verification hook the report reads, the twins' idiom */
    window.__qh = { particles: RINGS_N + FLOW_N + APEX_N, rings: RINGS_N, flow: FLOW_N, apex: APEX_N, world, SPEED };

    mark.run({
      /* the mark size rule: the funnel's full height spans 80% of the mount
         (the nav-to-strip column); byW guards the top ring against the
         stage box on a narrow desktop, 0.91 like the twins */
      fit({ camera, aspect, small: sm, HALF_FOV }) {
        const byH = R_FIT / ((sm ? 0.40 : 0.80) * HALF_FOV);
        const byW = R_TOP / ((sm ? 0.40 : 0.455) * HALF_FOV * aspect);
        camera.position.z = Math.max(byH, byW);
        world.position.x = 0;
        return sm ? 1 : 0.89;
      },
      target: (sm) => (sm ? 0.62 : 1),
      /* the whole funnel turns about its vertical axis at the strk outer
         ring's angular speed; a gentle breath, the twins' cadence */
      draw(w, t) {
        w.rotation.y = t * 0.055;
        w.scale.setScalar(1 + Math.sin(t * 0.34) * 0.012);
      }
    });
  }
  return mark;
}

if (!window.QH_MARK_MANUAL) {
  const stage = document.getElementById('qhStage');
  if (stage) mountQuantumFunnel(stage);
}
