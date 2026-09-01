"use client";

import { animated } from "@react-spring/web";
import { useEffect, useMemo, useState } from "react";
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

const INTRO: HeroCopy = {
  eyebrow: "The thesis",
  title: "Starknet is the answer to crypto's three hardest problems",
  stats: [
    { value: "3 / 1", label: "Three problems, one chain" },
    { value: "STRK", label: "The ticker on the whole thesis" },
  ],
  note: "Real onchain privacy. Post-quantum proofs by design. Bitcoin turned into productive capital.",
  turn: "Quantum. Privacy. BTCFi.",
  cta: "/quantum",
};

const QUANTUM: HeroCopy = {
  eyebrow: "Quantum",
  title: "Quantum will break most chains",
  stats: [
    { value: "Hash-based", label: "Post-quantum by construction" },
    { value: "0", label: "Curve assumptions" },
  ],
  note: "A committed roadmap to full end-to-end post-quantum security, on a proof system built for it.",
  turn: "Starknet has been waiting for it.",
  cta: "/quantum",
};

/**
 * Where the intro hands off to the Quantum beat, and where that beat clears.
 *
 * Quantum is the FIRST act, so it holds the frame for the length of the orb
 * rather than flashing past: the old 0.16 to 0.24 window was 8% of one track
 * and read as if the act had been skipped entirely. Privacy's copy
 * ({@link SectionGalaxy}) now comes in after this clears, so the order reads
 * Quantum, then Privacy, then BTCFi.
 */
const CROSSFADE_START = 0.18;
const CROSSFADE_END = 0.32;
const QUANTUM_GONE_START = 0.82;
const QUANTUM_GONE_END = 0.96;

interface HeroCopy {
  eyebrow: string;
  title: string;
  stats: { value: string; label: string }[];
  note: string;
  turn: string;
  cta: string;
}

/**
 * One copy set at the hero's shared layout. Opacity is the caller's job.
 *
 * The layout is the privacy page's hero: eyebrow and title top-left, two
 * mono readouts down the right flank, a mono note bottom-left, and the
 * accent payoff line bottom-right with the CTA under it.
 */
const HeroCopyBlock = ({
  copy,
  mode,
  enabled,
  immediateOut,
  heading = "h1",
}: {
  copy: HeroCopy;
  mode: "once" | "always";
  enabled: boolean;
  immediateOut?: boolean;
  /**
   * Which heading level this act's title renders as. The hero plays two acts
   * through this one block, and both used to emit an h1, so the landing page
   * shipped TWO h1 elements. The opening act is the page's heading; every
   * later act is a section inside it, so it takes h2.
   */
  heading?: "h1" | "h2";
}) => (
  <div className="absolute inset-0 max-lg:flex max-lg:flex-col max-lg:justify-between max-lg:px-[1.5rem] max-lg:pt-[6.5rem] max-lg:pb-[2rem] max-sm:px-[1.25rem] max-sm:pt-[5.5rem]">
    <Inview
      mode={mode}
      enabled={enabled}
      delayIn={100}
      {...UNIT_REVEAL}
      className="absolute top-[7.2vw] left-[1.667vw] font-tag text-[0.9vw] tracking-[0.2em] text-signal uppercase max-lg:static max-lg:text-[0.75rem]"
    >
      {copy.eyebrow}
    </Inview>

    <TextEngine
      tag={heading}
      mode={mode}
      enabled={enabled}
      immediateOut={immediateOut}
      delayIn={200}
      {...LETTER_REVEAL}
      style={{ position: "absolute" }}
      className="absolute top-[9.028vw] left-[1.667vw] w-[52vw] font-general text-[4.6vw] leading-[0.9] font-light max-lg:static! max-lg:mt-[0.75rem] max-lg:w-full max-lg:text-[3.25rem] max-sm:text-[2.375rem]"
    >
      {copy.title}
    </TextEngine>

    {/* Right flank: two mono readouts, the way the privacy hero carries its stats. */}
    <Inview
      mode={mode}
      enabled={enabled}
      delayIn={500}
      {...UNIT_REVEAL}
      className="absolute top-[18vw] right-[1.667vw] flex flex-col gap-[7vw] text-left font-tag text-[0.8vw] leading-[1.5] tracking-[0.12em] text-white/70 uppercase max-lg:static max-lg:mt-[1.5rem] max-lg:flex-row max-lg:gap-[2rem] max-lg:text-[0.7rem]"
    >
      {copy.stats.map((stat) => (
        <span key={stat.label} className="block">
          <b className="block font-normal text-white">{stat.value}</b>
          {stat.label}
        </span>
      ))}
    </Inview>

    {/* Bottom-left: the mono note. */}
    <TextEngine
      tag="p"
      mode={mode}
      enabled={enabled}
      immediateOut={immediateOut}
      delayIn={560}
      {...WORD_REVEAL}
      style={{ position: "absolute" }}
      className="absolute bottom-[6.2vw] left-[1.667vw] w-[22vw] font-tag text-[0.85vw] leading-[1.7] tracking-[0.06em] text-white/70 uppercase max-lg:static! max-lg:mt-[1.5rem] max-lg:w-full max-lg:text-[0.75rem]"
    >
      {copy.note}
    </TextEngine>

    {/* Bottom-right: the accent payoff and the CTA under it. */}
    <div className="absolute right-[1.667vw] bottom-[2.153vw] flex flex-col items-end gap-[1.25vw] max-lg:static! max-lg:mt-[1.5rem] max-lg:items-start max-lg:gap-[1rem]">
      <TextEngine
        tag="p"
        mode={mode}
        enabled={enabled}
        immediateOut={immediateOut}
        delayIn={400}
        {...WORD_REVEAL}
        style={{ position: "relative" }}
        className="w-[38vw] text-right font-general text-[4.2vw] leading-[0.95] font-bold tracking-[-0.01em] text-signal uppercase max-lg:w-full max-lg:text-left max-lg:text-[2.25rem] max-sm:text-[1.75rem]"
      >
        {copy.turn}
      </TextEngine>
      <Inview
        mode={mode}
        enabled={enabled}
        delayIn={820}
        {...UNIT_REVEAL}
        className="pointer-events-auto max-lg:w-full"
      >
        <SendRequest href={copy.cta} />
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
        <HeroCopyBlock copy={QUANTUM} mode="always" enabled={quantumActive} immediateOut={false} heading="h2" />
      </animated.div>
    </div>
  );
};
