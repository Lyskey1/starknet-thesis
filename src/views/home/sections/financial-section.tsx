"use client";

import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import {
  CARD_REVEAL,
  LETTER_REVEAL,
  MASK_REVEAL,
  UNIT_REVEAL,
  WORD_REVEAL,
} from "../reveal";

/**
 * First closing section — the Figma "A living interface" card.
 *
 * A white card inset from the viewport edges, so the scene's shader stays visible
 * around it as the card floats up over the still-drawing scene. The card is in
 * flow and shorter than the viewport, so it scrolls in and out. It scales up,
 * unblurs, and tilts on the horizontal axis as it arrives (`CARD_REVEAL` on the
 * perspective wrapper), and its copy reveals over it (`mode="always"`, so both
 * reverse as the card leaves): the title letter-by-letter, the bodies
 * word-by-word, the labels fade-rise, and the photo unmasks top→bottom.
 * Desktop measurements are the Figma pixels in `vw` (÷14.4).
 *
 * Below 1024px (ADR-0029) the fixed-height card and its absolutely-placed columns
 * give way to a padded stack that grows with its content.
 *
 * > The card used to carry a 30px backdrop blur. Its background is opaque
 * > (`bg-white`), so the blur was never visible — it only cost a full-card
 * > backdrop-filter pass, every frame, over a live WebGL canvas. (Written out
 * > rather than quoted as a class name: Tailwind scans raw file text, so even a
 * > mention in a comment keeps the dead rule in the stylesheet.)
 */

const BODY_ONE =
  "Privacy, quantum resistance and Bitcoin all run on Starknet. STRK is the asset that secures the network and captures the demand the thesis creates.";
const BODY_TWO =
  "Each narrative is a multi-billion-dollar market on its own. Starknet is the only chain that sits in all three at once, and STRK is the claim on that intersection.";

export const FinancialSection = () => {
  return (
    <section className="relative mx-auto h-[44.167vw] w-[96.667vw] [perspective:1400px] max-lg:h-auto max-lg:w-[calc(100%-3rem)] max-sm:w-[calc(100%-2rem)]">
      <Inview
        mode="always"
        immediateOut={false}
        from={CARD_REVEAL.from}
        to={CARD_REVEAL.to}
        config={CARD_REVEAL.config}
        className="relative h-full w-full origin-bottom border border-white/10 bg-white text-black max-lg:flex max-lg:flex-col max-lg:gap-[1rem] max-lg:p-[1.5rem] max-sm:p-[1.25rem]"
      >
        <TextEngine
          tag="h2"
          mode="always"
          immediateOut={false}
          {...LETTER_REVEAL}
          style={{ position: "absolute" }}
          className="absolute top-[2.222vw] left-[2.222vw] w-[41.875vw] font-general text-[5.556vw] leading-[0.9] font-light max-lg:static! max-lg:w-full max-lg:text-[2.75rem] max-sm:text-[2.125rem]"
        >
          The thesis, in a single asset
        </TextEngine>

        <Inview
          mode="always"
          immediateOut={false}
          from={MASK_REVEAL.from}
          to={MASK_REVEAL.to}
          config={MASK_REVEAL.config}
          className="absolute top-[2.222vw] right-[2.222vw] h-[39.722vw] w-[27.361vw] max-lg:relative max-lg:h-[20rem] max-lg:w-full max-sm:h-[15rem]"
        >
          {/* `next/image`, not a raw `<img>`: the source is a 1200×1495 PNG (668 KB)
              that never renders wider than ~27vw, and the project already
              configures AVIF/WebP + device sizes in `next.config.ts`. Served raw it
              was the single heaviest asset on the page — heavier than the scene. */}
          <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/img/stark-logo.png" alt="Starknet" className="block w-[55%] max-w-[16rem]" />
          </div>
        </Inview>

        <Inview
          mode="always"
          immediateOut={false}
          from={UNIT_REVEAL.from}
          to={UNIT_REVEAL.to}
          config={UNIT_REVEAL.config}
          className="absolute top-[34.236vw] left-[2.222vw] font-general text-[1.111vw] leading-[1.2] max-lg:static max-lg:mt-[0.5rem] max-lg:text-[0.875rem]"
        >
          [ 01 ]
        </Inview>
        <TextEngine
          tag="p"
          mode="always"
          immediateOut={false}
          delayIn={120}
          {...WORD_REVEAL}
          style={{ position: "absolute" }}
          className="absolute top-[36.667vw] left-[2.222vw] w-[20.347vw] font-general text-[1.111vw] leading-[1.2] max-lg:static! max-lg:w-full max-lg:text-[0.9375rem] max-sm:text-[0.875rem]"
        >
          {BODY_ONE}
        </TextEngine>

        <Inview
          mode="always"
          immediateOut={false}
          from={UNIT_REVEAL.from}
          to={UNIT_REVEAL.to}
          config={UNIT_REVEAL.config}
          className="absolute top-[34.236vw] left-[24.792vw] font-general text-[1.111vw] leading-[1.2] max-lg:static max-lg:mt-[0.5rem] max-lg:text-[0.875rem]"
        >
          [ 02 ]
        </Inview>
        <TextEngine
          tag="p"
          mode="always"
          immediateOut={false}
          delayIn={180}
          {...WORD_REVEAL}
          style={{ position: "absolute" }}
          className="absolute top-[36.667vw] left-[24.792vw] w-[20.347vw] font-general text-[1.111vw] leading-[1.2] max-lg:static! max-lg:w-full max-lg:text-[0.9375rem] max-sm:text-[0.875rem]"
        >
          {BODY_TWO}
        </TextEngine>
      </Inview>
    </section>
  );
};
