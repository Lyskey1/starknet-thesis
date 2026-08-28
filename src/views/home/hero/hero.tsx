"use client";

import { animated } from "@react-spring/web";
import { Fragment, useEffect, useMemo, useState } from "react";
import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { sceneTimeline } from "@/lib/scene/timeline";
import { hiddenWhenClear, smoothstep, useSceneClock } from "../overlay";
import { LETTER_REVEAL, UNIT_REVEAL, WORD_REVEAL } from "../reveal";
import { SendRequest } from "../send-request";

/**
 * Hero overlay: the Figma "Motion instead of chrome" screen, plus a second,
 * scroll-driven beat layered on top of it.
 *
 * A fixed layer over the WebGL scene: the display title top-left, and a
 * bottom-anchored cluster carrying the tagline, tags, supporting copy, and the
 * Send Request CTA. Two copy sets share that one layout: the framing
 * statement first (`INTRO`, revealed once the loader hands off, same as
 * before), then, still over the orb, a crossfade into the Quantum-specific
 * pitch (`QUANTUM`) before the whole overlay clears for the second act. Each
 * set is its own `absolute inset-0` block so the crossfade doesn't add height
 * on the mobile stacked layout, since only one block's content is ever flowing.
 *
 * ## Two layouts, one tree (ADR-0029)
 * At **≥1024px** this is the Figma artboard, sized in `vw` (Figma pixels ÷ 14.4),
 * with every element absolutely placed at its design offset.
 *
 * Below 1024px those offsets stop meaning anything: the artboard is 1440 wide,
 * so its 16px body copy would land at 4px on a phone. The `max-lg:` rules turn
 * the overlay into a plain top-to-bottom flex stack sized in `rem`, and pull the
 * children back into flow. The `!` matters: `TextEngine` hardcodes `position` as
 * an **inline** style, so only `position: static !important` can beat it.
 */

const INTRO = {
  title: "Starknet is the answer to crypto's three hardest problems",
  tagline:
    "Real onchain privacy. Post-quantum proofs by design. Bitcoin turned into productive capital.",
  support:
    "Three forces converging on a single chain, with STRK capturing the value at every turn. STRK is the ticker on the whole thesis.",
  tags: ["[ QUANTUM ]", "[ PRIVACY ]", "[ BTCFI ]"],
};

const QUANTUM = {
  title: "Quantum will break most chains",
  tagline: "Starknet has been waiting for it.",
  support:
    "Hash-based proofs are post-quantum by construction, with a committed roadmap to full end-to-end security.",
  tags: ["[ HASH-BASED PROOFS ]", "[ POST-QUANTUM BY DESIGN ]", "[ NO CURVE ASSUMPTIONS ]"],
};

/** Where the intro hands off to the Quantum beat, and where that beat clears. */
const CROSSFADE_START = 0.1;
const CROSSFADE_END = 0.16;
const QUANTUM_GONE_START = 0.24;
const QUANTUM_GONE_END = 0.3;

interface HeroCopy {
  title: string;
  tagline: string;
  support: string;
  tags: string[];
}

/** One copy set at the hero's shared layout. Opacity is the caller's job. */
const HeroCopyBlock = ({
  copy,
  mode,
  enabled,
  immediateOut,
}: {
  copy: HeroCopy;
  mode: "once" | "always";
  enabled: boolean;
  immediateOut?: boolean;
}) => (
  <div className="absolute inset-0 max-lg:flex max-lg:flex-col max-lg:justify-between max-lg:px-[1.5rem] max-lg:pt-[6.5rem] max-lg:pb-[2rem] max-sm:px-[1.25rem] max-sm:pt-[5.5rem]">
    <TextEngine
      tag="h1"
      mode={mode}
      enabled={enabled}
      immediateOut={immediateOut}
      delayIn={200}
      {...LETTER_REVEAL}
      style={{ position: "absolute" }}
      className="absolute top-[9.028vw] left-[1.667vw] w-[52vw] font-general text-[4.6vw] leading-[0.9] font-light max-lg:static! max-lg:w-full max-lg:text-[3.25rem] max-sm:text-[2.375rem]"
    >
      {copy.title}
    </TextEngine>

    {/* Bottom cluster: children at their exact Figma offsets on desktop, a
        simple stack below 1024. */}
    <div className="absolute right-[1.667vw] bottom-[2.153vw] left-[1.667vw] h-[14.514vw] max-lg:static! max-lg:flex max-lg:h-auto max-lg:flex-col max-lg:gap-[1.25rem]">
      <TextEngine
        tag="p"
        mode={mode}
        enabled={enabled}
        immediateOut={immediateOut}
        delayIn={500}
        {...WORD_REVEAL}
        style={{ position: "absolute" }}
        className="absolute top-0 left-0 w-[27.5vw] font-tag text-[1.111vw] leading-[1.2] uppercase max-lg:static! max-lg:w-full max-lg:text-[0.9375rem] max-sm:text-[0.8125rem]"
      >
        {copy.tagline}
      </TextEngine>

      <TextEngine
        tag="p"
        mode={mode}
        enabled={enabled}
        immediateOut={immediateOut}
        delayIn={560}
        {...WORD_REVEAL}
        style={{ position: "absolute" }}
        className="absolute top-0 right-0 w-[19.348vw] text-left font-general text-[1.111vw] leading-[1.2] max-lg:static! max-lg:w-full max-lg:text-[0.9375rem] max-sm:text-[0.8125rem]"
      >
        {copy.support}
      </TextEngine>

      <Inview
        mode={mode}
        enabled={enabled}
        delayIn={700}
        {...UNIT_REVEAL}
        className="absolute top-[13.194vw] left-0 flex items-center gap-[1.667vw] font-tag text-[1.111vw] leading-[1.2] whitespace-nowrap uppercase max-lg:static max-lg:flex-wrap max-lg:gap-[0.75rem] max-lg:text-[0.75rem] max-lg:whitespace-normal"
      >
        {copy.tags.map((tag, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <span className="size-[0.208vw] shrink-0 bg-white max-lg:size-[0.1875rem]" />
            )}
            <span>{tag}</span>
          </Fragment>
        ))}
      </Inview>

      <Inview
        mode={mode}
        enabled={enabled}
        delayIn={820}
        {...UNIT_REVEAL}
        className="pointer-events-auto absolute top-[10.972vw] right-0 max-lg:static"
      >
        <SendRequest href="/quantum" />
      </Inview>
    </div>
  </div>
);

export interface HeroProps {
  /** Flips true once the loader curtain lifts, gating the intro reveal. */
  introStarted: boolean;
}

export const Hero = ({ introStarted }: HeroProps) => {
  const clock = useSceneClock();

  const introOpacity = useMemo(
    () => clock.to((value) => 1 - smoothstep(CROSSFADE_START, CROSSFADE_END, value)),
    [clock],
  );
  const introVisibility = useMemo(() => hiddenWhenClear(introOpacity), [introOpacity]);

  const quantumOpacity = useMemo(
    () =>
      clock.to(
        (value) =>
          smoothstep(CROSSFADE_START, CROSSFADE_END, value) -
          smoothstep(QUANTUM_GONE_START, QUANTUM_GONE_END, value),
      ),
    [clock],
  );
  const quantumVisibility = useMemo(() => hiddenWhenClear(quantumOpacity), [quantumOpacity]);

  // TextEngine's `enabled` is a plain boolean, not a spring: it gates the
  // per-letter reveal/hide animation itself, so it only needs to flip at the
  // crossfade's edges, not track it continuously.
  const [quantumActive, setQuantumActive] = useState(false);
  useEffect(
    () =>
      sceneTimeline.subscribe((value) =>
        setQuantumActive((prev) => {
          const next = value > CROSSFADE_START && value < QUANTUM_GONE_END;
          return prev === next ? prev : next;
        }),
      ),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-10 text-white">
      <animated.div style={{ opacity: introOpacity, visibility: introVisibility }}>
        <HeroCopyBlock copy={INTRO} mode="once" enabled={introStarted} />
      </animated.div>
      <animated.div style={{ opacity: quantumOpacity, visibility: quantumVisibility }}>
        <HeroCopyBlock copy={QUANTUM} mode="always" enabled={quantumActive} immediateOut={false} />
      </animated.div>
    </div>
  );
};
