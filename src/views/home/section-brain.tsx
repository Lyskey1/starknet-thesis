"use client";

import { animated } from "@react-spring/web";
import { useEffect, useMemo, useState } from "react";
import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { sceneTimeline } from "@/lib/scene/timeline";
import { hiddenWhenClear, smoothstep, useSceneClock } from "./overlay";
import { LETTER_REVEAL, UNIT_REVEAL, WORD_REVEAL } from "./reveal";
import { SendRequest } from "./send-request";

/**
 * Third-section overlay — the Figma "convergence" screen over the brain. A fixed
 * layer that brings the two prior titles together: "Motion instead of chrome"
 * top-left and "Reads presence, in motion" bottom-right, with the Send Request
 * CTA bottom-left and a supporting line on each flank.
 *
 * It fades against the global clock's brain window, and the copy reveals (fade +
 * blur + rise) when the brain owns the frame. A fixed overlay can't rely on
 * in-view, so the reveal gates on the clock window (`active`) and reverses when
 * it leaves. Desktop measurements are the Figma pixels in `vw` (÷14.4).
 *
 * Below 1024px (ADR-0029) the four-corner composition collapses to a single
 * column — the two titles read as one stacked pair, which is what the section is
 * about anyway.
 */

const TITLE_LEFT = "Bitcoin is the best asset to hold";
const TITLE_RIGHT = "Time to make it the best to use";
const TAGLINE_LEFT =
  "Idle BTC turned into productive, programmable capital on Starknet: lending, yield and settlement without leaving Bitcoin's security behind.";
const TAGLINE_RIGHT = "DeFi. Scale. Privacy. Resilience. All four, one stack.";

export const SectionBrain = () => {
  const clock = useSceneClock();

  const opacity = useMemo(
    () =>
      clock.to((value) => {
        const shown = smoothstep(2.2, 2.65, value);
        const gone = smoothstep(3.6, 4.1, value);
        return shown * (1 - gone);
      }),
    [clock],
  );
  const visibility = useMemo(() => hiddenWhenClear(opacity), [opacity]);

  const [active, setActive] = useState(false);
  useEffect(
    () =>
      sceneTimeline.subscribe((value) =>
        setActive((prev) => {
          const next = value > 2.55 && value < 3.7;
          return prev === next ? prev : next;
        }),
      ),
    [],
  );

  return (
    <animated.div
      className="pointer-events-none fixed inset-0 z-10 text-white max-lg:flex max-lg:flex-col max-lg:justify-center max-lg:gap-[1.25rem] max-lg:px-[1.5rem] max-lg:py-[6.5rem] max-sm:px-[1.25rem]"
      style={{ opacity, visibility }}
    >
      <TextEngine
        tag="h2"
        mode="always"
        enabled={active}
        immediateOut={false}
        {...LETTER_REVEAL}
        style={{ position: "absolute" }}
        className="absolute top-[9.028vw] left-[1.667vw] w-[41.875vw] font-general text-[5.556vw] leading-[0.9] font-light max-lg:static! max-lg:w-full max-lg:text-[2.75rem] max-sm:text-[2rem]"
      >
        {TITLE_LEFT}
      </TextEngine>

      <TextEngine
        tag="p"
        mode="always"
        enabled={active}
        immediateOut={false}
        delayIn={200}
        {...WORD_REVEAL}
        style={{ position: "absolute" }}
        className="absolute top-[calc(50%+2.361vw)] left-[1.667vw] w-[26.597vw] font-tag text-[1.111vw] leading-[1.2] uppercase max-lg:static! max-lg:w-full max-lg:text-[0.8125rem] max-sm:text-[0.75rem]"
      >
        {TAGLINE_LEFT}
      </TextEngine>

      <TextEngine
        tag="p"
        mode="always"
        enabled={active}
        immediateOut={false}
        delayIn={260}
        {...WORD_REVEAL}
        style={{ position: "absolute" }}
        className="absolute top-[calc(50%+2.361vw)] right-[1.667vw] w-[14.583vw] justify-end text-right font-tag text-[1.111vw] leading-[1.2] uppercase max-lg:static! max-lg:w-full max-lg:justify-start max-lg:text-left max-lg:text-[0.8125rem] max-sm:text-[0.75rem]"
      >
        {TAGLINE_RIGHT}
      </TextEngine>

      <TextEngine
        tag="p"
        mode="always"
        enabled={active}
        immediateOut={false}
        delayIn={120}
        {...LETTER_REVEAL}
        style={{ position: "absolute" }}
        className="absolute right-[1.667vw] bottom-[1.667vw] w-[40.972vw] justify-end text-right font-general text-[5.556vw] leading-[0.9] font-light max-lg:static! max-lg:w-full max-lg:justify-start max-lg:text-left max-lg:text-[2.75rem] max-sm:text-[2rem]"
      >
        {TITLE_RIGHT}
      </TextEngine>

      <Inview
        mode="always"
        enabled={active}
        immediateOut={false}
        delayIn={500}
        {...UNIT_REVEAL}
        className="pointer-events-auto absolute bottom-[1.667vw] left-[1.667vw] max-lg:static max-lg:mt-[0.75rem]"
      >
        <SendRequest href="/btcfi" />
      </Inview>
    </animated.div>
  );
};
