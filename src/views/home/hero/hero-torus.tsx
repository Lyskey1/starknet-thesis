"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { INTRO_DOLLY } from "@/lib/scene/constants";
import { getIntro, startIntro } from "@/lib/scene/intro";
import { getParams } from "../scene/adaptive";
import { Orb } from "../scene/orb/orb";

/**
 * The hero object: the vesper landing's ORIGINAL particle torus, the orb
 * (src/views/home/scene/orb, restored verbatim from the commit before it was
 * deleted: `git checkout 9b50b9c^ -- src/views/home/scene/orb ...`), mounted
 * in the object slot of the shared three-zone hero (the .qh-stage, quantum's
 * right-column stage).
 *
 * Only the mount is new. The orb file, its shaders, its oil pointer, the
 * adaptive tiers, the colour store and the scene clock it reads are the
 * originals; the clock never advances here (there are no scroll tracks), so
 * the orb holds its hero pose, assembling on the intro spring exactly as the
 * old page did and spinning with its tilt wobble.
 *
 * Fit: the camera distance is set from the stage's own box so the torus spans
 * about 80% of the stage height and never more than 91% of its width; the
 * stage sits right of the editorial column and clips, so no particle can
 * reach the h1 at any width. The intro dolly (INTRO_DOLLY) is the original's.
 *
 * Gating: the loop runs only while the hero is on screen and the document is
 * visible (IntersectionObserver + visibilitychange flip the frameloop); under
 * prefers-reduced-motion the intro spring is skipped by the app's
 * ReducedMotion switch and one settled frame is drawn on demand.
 */
const FOV = 50;
const HALF_FOV = Math.tan((FOV / 2) * Math.PI / 180);
/** The torus as fitted: radius 1 plus the displacement swell and the sprite bleed. */
const R_FIT = 1.25;

const Rig = ({ reduced }: { reduced: boolean }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const fitZ = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const small = size.width < 640;
    const byH = R_FIT / ((small ? 0.6 : 0.8) * HALF_FOV);
    const byW = R_FIT / ((small ? 0.9 : 0.91) * HALF_FOV * aspect);
    return Math.max(byH, byW);
  }, [size.width, size.height]);

  useEffect(() => {
    camera.fov = FOV;
    camera.near = 0.1;
    camera.far = 400;
    camera.updateProjectionMatrix();
    startIntro();
    if (reduced) invalidate();
  }, [camera, reduced, invalidate]);

  useFrame(() => {
    const intro = getIntro();
    const eased = 1 - Math.pow(1 - intro, 2);
    camera.position.set(0, 0, fitZ + (1 - eased) * INTRO_DOLLY);
    camera.lookAt(0, 0, 0);
  });
  return null;
};

export const HeroTorus = () => {
  const mount = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = mount.current;
    if (!el) return;
    const host = el.closest(".hero") || el;
    const io = new IntersectionObserver((es) => setVisible(es[0].isIntersecting), { threshold: 0 });
    io.observe(host);
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const params = useMemo(() => (mounted ? getParams(window.innerWidth) : null), [mounted]);
  const frameloop = reduced ? "demand" : visible && !hidden ? "always" : "never";

  return (
    <div ref={mount} className="qh-stage" id="qhStage" aria-hidden="true">
      {mounted && params && (
        <Canvas
          eventSource={document.body}
          eventPrefix="client"
          frameloop={frameloop}
          dpr={params.dpr}
          camera={{ fov: FOV, near: 0.1, far: 400, position: [0, 0, params.orbCameraZ + INTRO_DOLLY] }}
          gl={{
            powerPreference: "high-performance",
            alpha: true,
            antialias: false,
            toneMappingExposure: 1,
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <Rig reduced={reduced} />
          <Orb />
        </Canvas>
      )}
    </div>
  );
};
