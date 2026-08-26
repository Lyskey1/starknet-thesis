"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  FaqCopy,
  FooterCopy,
  LoaderCopy,
} from "@/data/home";
import { useProgressTrigger } from "@/hooks/animation/use-progress-trigger";
import { subscribeToTicker } from "@/lib/animation/ticker";
import { startIntro } from "@/lib/scene/intro";
import { setOutro } from "@/lib/scene/outro";
import {
  advanceTimeline,
  configureTimeline,
  sceneTimeline,
} from "@/lib/scene/timeline";
import { getParams } from "./scene/adaptive";
import { Hero } from "./hero/hero";
import { SectionBrain } from "./section-brain";
import { SectionGalaxy } from "./section-galaxy";
import { FaqSection } from "./sections/faq-section";
import { FinancialSection } from "./sections/financial-section";
import { SiteFooter } from "./sections/site-footer";
import { toLvh } from "./hud/windows";
import { Loader } from "./loader/loader";
import { SceneCanvas } from "./scene/scene-canvas";

export interface ScrollStageProps {
  loader: LoaderCopy;
  faq: FaqCopy;
  footer: FooterCopy;
}

/**
 * The scroll document. Nothing here is visible — four viewport-tall tracks exist
 * purely to be measured; their progress advances the global clock that the WebGL
 * scene and the three fixed section overlays ({@link Hero}, {@link SectionGalaxy},
 * {@link SectionBrain}) read.
 *
 * Track 4 measures track 3 against the viewport *bottom* rather than its top,
 * which is what makes the clock run at double rate through its middle. That is
 * faithful to the original timeline, not an oversight.
 */
export const ScrollStage = ({ loader, faq, footer }: ScrollStageProps) => {
  const trackOne = useRef<HTMLDivElement>(null);
  const trackTwo = useRef<HTMLDivElement>(null);
  const trackThree = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);

  // Flips true when the loader curtain lifts — gates the section reveals.
  const [introStarted, setIntroStarted] = useState(false);

  const handleReady = useCallback(() => {
    startIntro();
    setIntroStarted(true);
  }, []);

  // Ease the scene clock toward the scroll position, harder on weaker tiers.
  // Driven by the shared ticker rather than by the render loop, so the overlays
  // keep moving even while the scene has stopped drawing.
  useEffect(() => {
    configureTimeline(getParams(window.innerWidth).progressLerp);

    let last = performance.now();
    return subscribeToTicker(() => {
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      advanceTimeline(delta);
    }, () => 0);
  }, []);

  const setTrack = useCallback(
    (index: number) =>
      ({ progress }: { progress: number }) =>
        sceneTimeline.setTrack(index, progress),
    [],
  );

  useProgressTrigger({
    elementRef: trackOne,
    start: "top top",
    end: "bottom top",
    onChange: setTrack(0),
  });
  useProgressTrigger({
    elementRef: trackTwo,
    start: "top top",
    end: "bottom top",
    onChange: setTrack(1),
  });
  useProgressTrigger({
    elementRef: trackThree,
    start: "top top",
    end: "bottom top",
    onChange: setTrack(2),
  });
  useProgressTrigger({
    elementRef: trackThree,
    start: "top bottom",
    end: "bottom bottom",
    onChange: setTrack(3),
  });

  // The Financial card floats up: fades the scene overlays and plays the brain's
  // exit, but the scene keeps drawing (the shader stays visible around the card).
  // The burst spans a full viewport of scroll (`top bottom` → `top top`), not half,
  // so it stays soft and gradual instead of detonating on the first nudge.
  useProgressTrigger({
    elementRef: outroRef,
    start: "top bottom",
    end: "top top",
    onChange: useCallback(
      ({ progress }: { progress: number }) => setOutro(progress),
      [],
    ),
  });

  return (
    <>
      <SceneCanvas />
      <Loader copy={loader} onReady={handleReady} />

      <main className="relative">
        <Hero introStarted={introStarted} />
        <SectionGalaxy />
        <SectionBrain />

        <div aria-hidden className="pointer-events-none relative">
          {/* Each track is one clock unit; its height is the scroll distance that
              advances it. `toLvh(1)` (see SCROLL_TRACK_LVH) makes that longer than
              a viewport, so the scenes need more scroll to hand off. */}
          <div ref={trackOne} className="relative" style={{ height: toLvh(1) }} />
          <div ref={trackTwo} className="relative" style={{ height: toLvh(1) }} />
          <div ref={trackThree} className="relative" style={{ height: toLvh(1) }} />
          {/* Trailing space (not a track). Half a track keeps the closing content
              — and the outro-driven brain burst — right after the spin ends at
              clock 4, so there is no dead scroll where the brain sits still. */}
          <div className="relative" style={{ height: toLvh(1.1) }} />
        </div>

        <div className="relative z-10">
          {/* The Financial and FAQ cards float over the still-drawing scene — no
              opaque surface here, so the shader shows around them. They stack
              close together (small gap). */}
          <div ref={outroRef} className="mb-[1.667vw]">
            <FinancialSection />
          </div>
          <FaqSection copy={faq} />

          {/* The footer is transparent over the live shader (like the cards), so
              nothing opaque covers the scene — the frame gate keeps drawing it. */}
          <SiteFooter copy={footer} />
        </div>
      </main>
    </>
  );
};
