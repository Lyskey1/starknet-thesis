"use client";

import { useEffect, useRef } from "react";

import type { HeroMark } from "../../../../public/js/hero-mark-engine.js";

/**
 * The live particle object of a pillar's detail panel, on the shared mark
 * engine (public/js/hero-mark-engine.js). Two kinds:
 *
 *   silhouette  the privacy figure: the landing's former second-act bust
 *               (src/views/home/scene/galaxy/galaxy-shaders.ts, humanPoint),
 *               three volumetric ellipsoids, head, neck and shoulders, each
 *               claiming a share of the points proportional to its volume,
 *               sampled on the CPU with the engine's hash noise.
 *   coin        the BTCFi mark: btcfi's hero centrepiece (public/js/
 *               btcfi-hero-mark.js), a bright particle annulus with three
 *               baked sweeps around the Bitcoin symbol rasterised from
 *               assets/img/bitcoin-logo.svg, the two documented traps
 *               honored (size stamped on the root, fill on <svg>, the orange
 *               disc dropped).
 *
 * Only the pillar whose panel is shown carries a live system: the object
 * mounts on its `problems:select` event and disposes when another pillar
 * takes the panel, so there is never more than one particle loop in the
 * section. The engine gates on visibility and reduced motion as everywhere.
 */
export type PillarKind = "silhouette" | "coin";

export const PillarObject = ({ kind, index }: { kind: PillarKind; index: number }) => {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const rail = el.closest(".qw");
    if (!rail) return;
    let mark: HeroMark | null = null;
    let building = false;
    let wanted = false;
    let alive = true;

    const dispose = () => {
      if (mark) { mark.dispose(); mark = null; }
    };

    /* the panel swap shows the article ~150ms after the pick (thMorph fades
       the old content out first), so wait for the stage to have a width */
    const laidOut = () =>
      new Promise<void>((resolve) => {
        const t0 = performance.now();
        const poll = () => {
          if (!alive || el.clientWidth > 0 || performance.now() - t0 > 2000) return resolve();
          requestAnimationFrame(poll);
        };
        poll();
      });

    const build = async () => {
      if (mark || building) return;
      building = true;
      try {
        const engine = await import("../../../../public/js/hero-mark-engine.js");
        await laidOut();
        if (!alive || !wanted) return;
        mark = kind === "silhouette" ? buildSilhouette(el, engine) : await buildCoin(el, engine);
        if (!alive || !wanted) dispose();
      } catch (e) {
        console.error("[problems] the object failed to build", e);
      } finally {
        building = false;
      }
    };

    const onSelect = (ev: Event) => {
      const i = (ev as CustomEvent<{ index: number }>).detail?.index;
      wanted = i === index;
      if (wanted) build(); else dispose();
    };
    rail.addEventListener("problems:select", onSelect);
    return () => {
      alive = false;
      rail.removeEventListener("problems:select", onSelect);
      dispose();
    };
  }, [kind, index]);

  return <div ref={mount} className="lp-stage" data-kind={kind} aria-hidden="true" />;
};

type Engine = typeof import("../../../../public/js/hero-mark-engine.js");

/* A point in the interior of an ellipsoid from three hashes in [0,1): the
   bust's own sampler (galaxy-shaders.ts ellipsoidPoint), depth 0.15 to 1 so
   the fill is volumetric rather than a hollow shell. */
const ellipsoid = (
  out: Float32Array, i: number,
  cx: number, cy: number, cz: number, rx: number, ry: number, rz: number,
  ra: number, rb: number, rc: number,
) => {
  const theta = ra * 6.2831853;
  const phi = Math.acos(rb * 2 - 1);
  const depth = 0.15 + rc * 0.85;
  out[i * 3] = cx + Math.sin(phi) * Math.cos(theta) * rx * depth;
  out[i * 3 + 1] = cy + Math.cos(phi) * ry * depth;
  out[i * 3 + 2] = cz + Math.sin(phi) * Math.sin(theta) * rz * depth;
};

function buildSilhouette(el: HTMLElement, { createMark, vertexShader, rnd }: Engine): HeroMark | null {
  const SPEED = 0.34;
  const mark = createMark({ mount: el, host: el.closest(".qw-shell") as HTMLElement, tag: "problems-silhouette", speed: SPEED });
  if (!mark) return null;
  const { world, points, makeMaterial, smallMQ } = mark;
  const N = smallMQ.matches ? 12000 : 30000;
  /* the bust spans y -0.32 to 0.82 in its own frame; recentered on 0 */
  const Y_OFF = -0.25;
  const SPAN = 1.25;
  const R_FIT = 0.62;
  const VERT = vertexShader();
  world.add(
    points(
      N,
      (i, pos, siz, pha, alp, tin) => {
        const pick = rnd(i, 12.989), ra = rnd(i, 78.233), rb = rnd(i, 45.164), rc = rnd(i, 93.989);
        if (pick < 0.18) ellipsoid(pos, i, 0, 0.62, 0, 0.17, 0.2, 0.18, ra, rb, rc);
        else if (pick < 0.195) ellipsoid(pos, i, 0, 0.4, 0, 0.075, 0.09, 0.07, ra, rb, rc);
        else ellipsoid(pos, i, 0, 0.02, 0, 0.36, 0.34, 0.22, ra, rb, rc);
        pos[i * 3 + 1] += Y_OFF;
        siz[i] = 0.55 + rnd(i, 12.9898) * 0.6;
        pha[i] = rnd(i, 78.233);
        alp[i] = 0.22 + rnd(i, 91.3) * 0.4;
        tin[i] = 0.85 + rnd(i, 5.331) * 0.4;
      },
      makeMaterial(VERT, {}, 0.18, SPAN),
    ),
  );
  mark.run({
    fit({ camera, aspect, small, HALF_FOV }) {
      const byH = R_FIT / ((small ? 0.6 : 0.82) * HALF_FOV);
      const byW = 0.4 / ((small ? 0.7 : 0.8) * HALF_FOV * aspect);
      camera.position.z = Math.max(byH, byW);
      return 1;
    },
    target: () => 1,
    draw(w, t) {
      /* a slow breath and a gentle yaw: the figure never spins */
      w.rotation.y = Math.sin(t * 0.3) * 0.28;
      w.scale.setScalar(1 + Math.sin(t * 0.55) * 0.006);
    },
  });
  return mark;
}

async function buildCoin(el: HTMLElement, { createMark, vertexShader, rnd }: Engine): Promise<HeroMark | null> {
  const SPEED = 0.34;
  const R_RING = 2.14, R_FIT = 2.34, GLYPH_H = 2.56;
  const mark = createMark({ mount: el, host: el.closest(".qw-shell") as HTMLElement, tag: "problems-coin", speed: SPEED });
  if (!mark) return null;
  const { world, points, makeMaterial, smallMQ, THREE } = mark;
  const ringGrp = new THREE.Group(), markGrp = new THREE.Group();
  world.add(ringGrp); world.add(markGrp);
  const VERT = vertexShader();
  const small = smallMQ.matches;
  const RING_N = small ? 6400 : 17500, HALO_N = small ? 1800 : 5200;
  ringGrp.add(
    points(
      RING_N + HALO_N,
      (i, pos, siz, pha, alp, tin) => {
        const halo = i >= RING_N;
        const a = rnd(i, 127.1) * Math.PI * 2;
        let r: number, z: number, base: number, aa: number, tt: number;
        if (!halo) {
          r = R_RING + (rnd(i, 311.7) + rnd(i, 74.7) - 1) * 0.19;
          z = (rnd(i, 39.42) - 0.5) * 0.34;
          base = 1.15 + rnd(i, 12.9898) * 0.95;
          aa = 0.4 + rnd(i, 91.3) * 0.5;
          tt = 0.8 + rnd(i, 5.331) * 0.45;
        } else {
          r = R_FIT + Math.pow(rnd(i, 311.7), 0.6) * 1.2;
          z = (rnd(i, 39.42) - 0.5) * 0.9;
          base = 0.8 + rnd(i, 12.9898) * 0.75;
          aa = 0.1 + rnd(i, 91.3) * 0.2;
          tt = 0.7 + rnd(i, 5.331) * 0.4;
        }
        const sweep = 0.62 + 0.68 * Math.pow(0.5 + 0.5 * Math.sin(a * 3 + 0.7), 1.5);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = z;
        siz[i] = base * (halo ? 1 : sweep);
        pha[i] = rnd(i, 78.233);
        alp[i] = aa * (halo ? 1 : 0.55 + 0.6 * sweep);
        tin[i] = tt;
      },
      makeMaterial(VERT, {}, 0.6, R_RING * 2),
    ),
  );

  /* the mark, rasterised from the official symbol per the documented recipe */
  const MARK_N = small ? 11000 : 31000;
  try {
    const src = await (await fetch("/assets/img/bitcoin-logo.svg")).text();
    const sized = src
      .replace("<svg ", '<svg width="512" height="512" fill="#fafafa" ')
      .replace(/<path[^>]*fill="#f7931a"[^>]*\/>/i, "");
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("the rasterised mark would not decode"));
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized);
    });
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const cx = cv.getContext("2d", { willReadFrequently: true })!;
    cx.drawImage(img, 0, 0, S, S);
    const data = cx.getImageData(0, 0, S, S).data;
    const hits: number[] = [];
    let x0 = S, y0 = S, x1 = 0, y1 = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] > 110) {
        hits.push(x, y);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const total = hits.length / 2;
    if (total) {
      const bw = x1 - x0 || 1, bh = y1 - y0 || 1;
      const scale = GLYPH_H / bh;
      const mx = x0 + bw / 2, my = y0 + bh / 2;
      const N = Math.min(MARK_N, total);
      const step = total / N;
      markGrp.add(
        points(
          N,
          (i, pos, siz, pha, alp, tin) => {
            const k = Math.floor(i * step) * 2;
            const jx = (rnd(i, 127.1) - 0.5) * 1.7, jy = (rnd(i, 311.7) - 0.5) * 1.7;
            pos[i * 3] = (hits[k] + jx - mx) * scale;
            pos[i * 3 + 1] = (my - (hits[k + 1] + jy)) * scale;
            pos[i * 3 + 2] = (rnd(i, 39.42) - 0.5) * 0.16;
            siz[i] = 1.05 + rnd(i, 12.9898) * 0.85;
            pha[i] = rnd(i, 78.233);
            alp[i] = 0.58 + rnd(i, 91.3) * 0.45;
            tin[i] = 0.85 + rnd(i, 5.331) * 0.4;
          },
          makeMaterial(VERT, {}, 1, GLYPH_H),
        ),
      );
    }
  } catch (e) {
    console.error("[problems-coin] the mark failed to load", e);
  }

  mark.run({
    fit({ camera, aspect, small: sm, HALF_FOV }) {
      const byH = R_FIT / ((sm ? 0.4 : 0.8) * HALF_FOV);
      const byW = R_FIT / ((sm ? 0.8 : 0.91) * HALF_FOV * aspect);
      camera.position.z = Math.max(byH, byW);
      return sm ? 1 : 0.89;
    },
    target: (sm) => (sm ? 0.62 : 1),
    /* btcfi's own loop: the ring sweeps and tilts, the mark sways, the whole breathes */
    draw(w, t) {
      ringGrp.rotation.z = t * 0.055;
      ringGrp.rotation.x = -0.1 + Math.sin(t * 0.21) * 0.07;
      markGrp.rotation.y = Math.sin(t * 0.17) * 0.1;
      markGrp.rotation.x = Math.sin(t * 0.13) * 0.05;
      w.scale.setScalar(1 + Math.sin(t * 0.34) * 0.012);
    },
  });
  mark.fit();
  if (mark.reduced) mark.draw(0);
  return mark;
}
