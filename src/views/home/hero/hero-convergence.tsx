"use client";

import { useEffect, useRef } from "react";

/**
 * The hero object: a particle CONVERGENCE on the shared mark engine
 * (public/js/hero-mark-engine.js, the file js/quantum-hero-mark.js runs on).
 *
 * Three particle rings stacked in depth drift down together and tighten into
 * one dense core at the foot of the stage, then loop; a bright core cluster
 * pulses where they land. Monochrome, the engine's own gradient (chalk at the
 * top through warm to the accent at the bottom, pinned to the frame), no
 * per-pillar hue. The loop is ~8 real seconds: the engine's clock runs at
 * SPEED, so the cycle length in clock units is 8 * SPEED.
 *
 * The engine owns the gating: IntersectionObserver on the hero, pause on
 * document.hidden, one settled frame under prefers-reduced-motion, nothing
 * mounted without WebGL. Sized by the mark size rule the twins use: the
 * object's full height spans 80% of the stage, byW guards the ring against a
 * narrow stage so it can never reach the editorial column.
 */
export const HeroConvergence = () => {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let disposed = false;
    let dispose: (() => void) | null = null;

    import("../../../../public/js/hero-mark-engine.js").then(({ createMark, vertexShader, rnd }) => {
      if (disposed) return;
      const SPEED = 0.34;
      const R0 = 1.15; // the front ring's radius at the top of the fall
      const DROP = 3.4; // world height of the fall
      const TOP_Y = DROP / 2;
      const CORE_R = 0.18; // the tightened core's radius
      const TILT = 0.45; // the camera looks down onto the rings, so they read as ellipses in depth
      const R_FIT = (DROP * Math.cos(TILT) + 2 * R0 * Math.sin(TILT)) / 2 + 0.15; // half of the tilted object's height
      const CYCLE = 8 * SPEED; // ~8 real seconds per loop, in clock units
      const PULSE_W = (2 * Math.PI) / (5.2 * SPEED);

      const mark = createMark({ mount: el, host: el.closest<HTMLElement>(".hero"), tag: "landing-convergence", speed: SPEED });
      if (!mark) return;
      dispose = () => mark.dispose();
      const { world, points, makeMaterial, smallMQ } = mark;

      const VERT = vertexShader({
        attributes: "attribute float aMode; attribute float aTheta; attribute float aRing;",
        uniforms: "uniform float uR0, uTopY, uDrop, uCoreR, uCycle, uPulseW;",
        move: `
        if (aMode < 0.5) {
          /* a ring particle: the three rings fall together, stacked in depth
             (front, middle, back, each a little smaller), and tighten from
             their ring radius to the one core as the depth closes */
          float s = fract(uTime / uCycle);
          float k = smoothstep(0.0, 1.0, s);
          float r = mix(uR0 * (1.0 - aRing * 0.14), uCoreR, k * k);
          p = vec3(r * cos(aTheta), uTopY - s * uDrop, r * sin(aTheta) + (1.0 - aRing) * 0.45 * (1.0 - k));
          fadeFlow = smoothstep(0.0, 0.07, s) * (1.0 - smoothstep(0.93, 1.0, s));
        } else {
          pulse = 0.85 + 0.35 * sin(uTime * uPulseW);
          alphaPulse = 0.8 + 0.2 * sin(uTime * uPulseW);
        }`,
      });
      const U = { uR0: R0, uTopY: TOP_Y, uDrop: DROP, uCoreR: CORE_R, uCycle: CYCLE, uPulseW: PULSE_W };
      const ATTRS = ["aMode", "aTheta", "aRing"];
      /* the gradient span: shorter than the fall, so the upper rings read chalk
         and only the landing zone carries the accent */
      const SPAN = DROP * 0.72;

      const small = smallMQ.matches;
      const RING_N = small ? 9000 : 24000;
      const CORE_N = small ? 300 : 700;

      /* the three rings: dust on three circles with a gaussian-ish thickness,
         the ring index selecting depth and beat; positions are shader-driven */
      world.add(
        points(
          RING_N,
          (i, pos, siz, pha, alp, tin, x) => {
            const ring = i % 3;
            x.aMode[i] = 0;
            x.aRing[i] = ring;
            x.aTheta[i] = rnd(i, 127.1) * Math.PI * 2 + (rnd(i, 311.7) + rnd(i, 74.7) - 1) * 0.035;
            pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
            siz[i] = 0.9 + rnd(i, 12.9898) * 0.85;
            pha[i] = rnd(i, 78.233);
            alp[i] = 0.3 + rnd(i, 91.3) * 0.42;
            tin[i] = 0.85 + rnd(i, 5.331) * 0.4;
          },
          makeMaterial(VERT, U, 0.6, SPAN),
          ATTRS,
          DROP,
        ),
      );

      /* the core: a dense pulsing cluster where the rings land */
      world.add(
        points(
          CORE_N,
          (i, pos, siz, pha, alp, tin, x) => {
            const a = rnd(i, 127.1) * Math.PI * 2;
            const r = Math.pow(rnd(i, 311.7), 1.4) * CORE_R * 1.1;
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = TOP_Y - DROP + (rnd(i, 39.42) - 0.5) * 0.08;
            pos[i * 3 + 2] = Math.sin(a) * r;
            siz[i] = i === 0 ? 4.4 : 1.1 + rnd(i, 12.9898) * 1.1;
            pha[i] = rnd(i, 78.233);
            alp[i] = i === 0 ? 1 : 0.45 + rnd(i, 91.3) * 0.45;
            tin[i] = 1.3;
            x.aMode[i] = 1; x.aTheta[i] = 0; x.aRing[i] = 0;
          },
          makeMaterial(VERT, U, 0.25, SPAN),
          ATTRS,
          DROP,
        ),
      );

      (window as typeof window & { __lc?: unknown }).__lc = { particles: RING_N + CORE_N, rings: 3, cycleSeconds: CYCLE / SPEED };

      world.rotation.x = TILT;
      mark.run({
        /* the mark size rule: the object's full height spans 80% of the stage;
           byW guards the ring against a narrow stage so it never reaches the
           editorial column (0.91 of the stage width, like the twins) */
        fit({ camera, aspect, small: sm, HALF_FOV }) {
          const byH = R_FIT / ((sm ? 0.4 : 0.74) * HALF_FOV);
          const byW = (R0 + 0.3) / ((sm ? 0.8 : 0.91) * HALF_FOV * aspect);
          camera.position.z = Math.max(byH, byW);
          return sm ? 1 : 0.89;
        },
        target: (sm) => (sm ? 0.62 : 1),
        draw(w, t) {
          w.rotation.y = t * 0.055;
        },
      });
    }).catch((e) => console.error("[landing-convergence] the engine failed to load", e));

    return () => {
      disposed = true;
      if (dispose) dispose();
    };
  }, []);

  return <div ref={mount} className="qh-stage" id="qhStage" aria-hidden="true" />;
};
