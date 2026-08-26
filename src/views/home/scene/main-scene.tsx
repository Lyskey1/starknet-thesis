"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";

import {
  GALAXY_CONFIG,
  INTRO_DOLLY,
  ORB_PARALLAX,
} from "@/lib/scene/constants";
import { getIntro } from "@/lib/scene/intro";
import { galaxyPresence, sceneTimeline } from "@/lib/scene/timeline";
import { getParams } from "./adaptive";
import { Atmosphere } from "./atmosphere";
import { Backdrop } from "./backdrop";
import { Brain } from "./brain/brain";
import { Galaxy } from "./galaxy/galaxy";
import { HeroLine } from "./hero-line";
import { Orb } from "./orb/orb";
import { Postprocessing } from "./postprocessing";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Owns the shared camera.
 *
 * Both source scenes shipped their own camera: the orb sits close (`z ≈ 3.8`),
 * the galaxy far out (`z = 48`, diving to 18). Rather than rescale one form to
 * meet the other, the camera travels between them, driven by `galaxyPresence`.
 * That keeps each form at its authored scale, and — because presence returns to
 * 0 as the galaxy disperses — the camera pulls back to the orb exactly as the
 * orb returns for the final section.
 *
 * The galaxy's "dive" is what makes its arrival immersive: the camera falls
 * toward the core while the disc tips toward edge-on, so the second scene
 * envelops the viewer rather than merely fading up.
 */
const CameraRig = () => {
  const camera = useThree((state) => state.camera);
  const { orbCameraZ, pointerReaction } = useMemo(
    () => getParams(window.innerWidth),
    [],
  );

  useFrame(({ pointer }, delta) => {
    const state = sceneTimeline.getState();
    const presence = galaxyPresence(state);

    const intro = getIntro();
    const eased = 1 - Math.pow(1 - intro, 2);

    const galaxyZ = GALAXY_CONFIG.cameraZ - state.galaxyDive * GALAXY_CONFIG.dive;
    const targetZ = lerp(orbCameraZ, galaxyZ, presence) + (1 - eased) * INTRO_DOLLY;
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, delta * 8);

    // Pointer sway: a whisper for the close orb, an orbit for the wide galaxy.
    const sway = lerp(ORB_PARALLAX, GALAXY_CONFIG.parallax, presence);
    const targetX = pointerReaction ? pointer.x * sway * eased : 0;
    const targetY = pointerReaction ? pointer.y * sway * 0.55 * eased : 0;
    const follow = Math.min(1, delta * 3);
    camera.position.x += (targetX - camera.position.x) * follow;
    camera.position.y += (targetY - camera.position.y) * follow;

    camera.lookAt(0, 0, 0);
  });

  return null;
};

export const MainScene = () => {
  const { orbCameraZ, bloom } = useMemo(() => getParams(window.innerWidth), []);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={50}
        near={0.1}
        far={400}
        position={[0, 0, orbCameraZ + INTRO_DOLLY]}
      />
      <CameraRig />

      <Backdrop />
      {/* The hero's semi-transparent rule, behind the orb (renderOrder −0.5). */}
      <HeroLine />
      <Orb />
      <Galaxy />
      {/* The third form — replaces the orb's return + logo in the final act. */}
      <Brain />
      <Atmosphere />

      {/* Bloom owns a full mipmap chain; the weakest tier renders without it.
          `AdaptiveDpr` is gone too — it fights `frameloop="demand"`, and the dpr
          is now pinned per tier in `scene-canvas`. */}
      {bloom && <Postprocessing />}
    </>
  );
};
