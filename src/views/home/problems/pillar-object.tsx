"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { HeroMark } from "../../../../public/js/hero-mark-engine.js";

/**
 * The live object of a pillar's detail panel (2026-09-08). Three kinds, two
 * of them the thesis pages' own hero objects, imported from their files:
 *
 *   human   the privacy hero object: the metal-human clip, luma-keyed and
 *           tinted to the accent by public/js/pv-human-key.js (the module
 *           privacy.html loads), sitting on whatever is behind it. The
 *           markup is privacy's (.pv-human > .pv-figure > video); the key
 *           canvas is created on select and disposed on deselect. Under
 *           prefers-reduced-motion the page's rule hides the clip and the
 *           key, and the poster stands in as the still.
 *   funnel  the quantum hero object: the particle funnel from
 *           public/js/quantum-hero-mark.js (the module quantum.html loads),
 *           mounted on this stage through its exported mount.
 *   coin    the BTCFi mark on the shared engine: btcfi's particle annulus
 *           around the rasterised Bitcoin symbol (the documented recipe).
 *
 * Only the pillar whose panel is shown carries a live system: the object
 * mounts on its `problems:select` event and disposes when another pillar
 * takes the panel. The engines gate on visibility and reduced motion.
 */
export type PillarKind = "human" | "funnel" | "coin";

export const PillarObject = ({ kind, index, children }: { kind: PillarKind; index: number; children?: ReactNode }) => {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const rail = el.closest(".qw");
    if (!rail) return;
    let dispose: (() => void) | null = null;
    let building = false;
    let wanted = false;
    let alive = true;

    const tearDown = () => {
      if (dispose) { dispose(); dispose = null; }
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
      if (dispose || building) return;
      building = true;
      try {
        await laidOut();
        if (!alive || !wanted) return;
        if (kind === "funnel") {
          (window as typeof window & { QH_MARK_MANUAL?: boolean }).QH_MARK_MANUAL = true;
          const { mountQuantumFunnel } = await import("../../../../public/js/quantum-hero-mark.js");
          if (!alive || !wanted) return;
          const mark = mountQuantumFunnel(el);
          dispose = mark ? () => mark.dispose() : null;
        } else if (kind === "human") {
          (window as typeof window & { PV_KEY_MANUAL?: boolean }).PV_KEY_MANUAL = true;
          const video = el.querySelector("video");
          if (!video) return;
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // the poster stands in
          const { keyVideo } = await import("../../../../public/js/pv-human-key.js");
          if (!alive || !wanted) return;
          const keyed = keyVideo(video);
          video.play().catch(() => {});
          dispose = () => { keyed.dispose(); video.pause(); };
        } else {
          const engine = await import("../../../../public/js/hero-mark-engine.js");
          if (!alive || !wanted) return;
          const mark = await buildCoin(el, engine);
          dispose = mark ? () => mark.dispose() : null;
        }
        if (!alive || !wanted) tearDown();
      } catch (e) {
        console.error("[problems] the object failed to build", e);
      } finally {
        building = false;
      }
    };

    const onSelect = (ev: Event) => {
      const i = (ev as CustomEvent<{ index: number }>).detail?.index;
      wanted = i === index;
      if (wanted) build(); else tearDown();
    };
    rail.addEventListener("problems:select", onSelect);
    return () => {
      alive = false;
      rail.removeEventListener("problems:select", onSelect);
      tearDown();
    };
  }, [kind, index]);

  return (
    <div ref={mount} className="lp-stage" data-kind={kind} aria-hidden="true">
      {children}
    </div>
  );
};

type Engine = typeof import("../../../../public/js/hero-mark-engine.js");

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
