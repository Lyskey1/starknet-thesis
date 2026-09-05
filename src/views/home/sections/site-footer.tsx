"use client";

import Link from "next/link";

import type { FooterCopy } from "@/data/home";

export interface SiteFooterProps {
  copy: FooterCopy;
}

/**
 * Site footer, the two-band close shared with the six static thesis pages.
 *
 * This is a faithful port of `public/css/vesper-chrome.css` (`.vc-cta-band`,
 * `.vc-title`, `form.vc-sub`, `.vc-btn`, `nav.vc-links`, `.vc-col`, `.vc-rule`,
 * `.vc-base`) plus the markup in `public/privacy.html`, so all seven routes
 * close on one design. Band one is a full-bleed accent block: kicker, statement,
 * email capture and two straight-cornered buttons. Band two is the link band,
 * four divided columns over a rule, then the brand lockup and the legal line.
 *
 * Two deliberate differences from the static sheet, both about not breaking this
 * page:
 *
 * - the static sheet uses `width: 100vw; margin-left: calc(50% - 50vw)` to break
 *   out of its page's inset. Here the footer's container is already full width,
 *   so plain `w-full` gives the identical result without `100vw` overflowing
 *   past a visible scrollbar (which would put a horizontal scrollbar on the
 *   landing page);
 * - band two carries no background, so the live background shader keeps drawing
 *   through it. That matches what the static pages actually render, where
 *   `eco-stage.css` forces `footer.vc-footer` transparent so the page backdrop
 *   shows through.
 *
 * The `vc-*` class names carry no styles here (this page loads no static
 * stylesheet). They are parity hooks: they name each part after its counterpart
 * in `vesper-chrome.css`, so the cross-route verification can address all seven
 * footers with one set of selectors.
 *
 * The controls are plain elements with `transition-colors` rather than the
 * sprung `Pressable*` wrappers: `GHOST_SIGNAL` and `MUTED_LINK` animate
 * background and colour, which would fight the solid `vc-btn` fills.
 */
export const SiteFooter = ({ copy }: SiteFooterProps) => {
  return (
    <footer className="vc-footer relative w-full font-general text-[#fafafa]">
      {/* ---- band one: the accent statement block ---- */}
      <div className="vc-cta-band w-full bg-signal py-[clamp(36px,4.5vh,60px)] text-white">
        <div className="mx-auto grid w-[calc(100%-48px)] max-w-[1392px] grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-end gap-x-[56px] gap-y-[40px] text-left min-h-[min(24vh,250px)] max-lg:min-h-0 max-lg:grid-cols-1 max-lg:items-start max-lg:gap-[32px]">
          <div className="block">
            <p className="vc-kicker mb-[20px] font-hud-mono text-[11px] leading-[1.2] font-normal tracking-[0.2em] text-white uppercase">
              Starknet Thesis
            </p>
            <h2 className="vc-title font-general text-[clamp(34px,4.4vw,66px)] leading-[0.96] font-light tracking-[-0.022em] text-white">
              Three forces,
              <br />
              one chain,
              <br />
              one ticker.
            </h2>
          </div>

          {/* The subscribe action the previous footer carried, unchanged: a GET
              to Substack's own subscribe endpoint, which is why it still works
              with no `/api` route behind it. */}
          <form
            action="https://starknetresearch.substack.com/subscribe"
            method="get"
            target="_blank"
            rel="noopener"
            data-umami-event="footer-subscribe"
            className="vc-sub ml-auto flex w-full max-w-[440px] flex-col items-stretch gap-[18px] max-lg:ml-0 max-lg:max-w-[520px]"
          >
            <label className="block">
              <span className="mb-[9px] block font-hud-mono text-[11px] leading-[1.2] tracking-[0.16em] text-white/80 uppercase">
                Get the thesis in your inbox
              </span>
              <input
                aria-label="Email"
                name="email"
                type="email"
                required
                placeholder="you@domain.com"
                className="h-[46px] w-full min-w-0 border border-white/50 bg-black/[0.16] px-[14px] font-general text-[15px] leading-[1.2] text-white outline-none placeholder:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              />
            </label>
            <div className="flex items-stretch gap-[12px] max-sm:flex-col">
              {/* the dg-glass primary surface from vesper-chrome.css,
                  transliterated to Tailwind: translucent fill over the band,
                  backdrop blur, half-pixel accent hairline, inset top
                  highlight; solid below 980px per the site glass rule */}
              <button
                type="submit"
                className="vc-btn inline-flex h-[52px] min-w-0 flex-1 items-center justify-between gap-[14px] bg-[rgba(38,38,38,0.74)] px-[18px] font-general text-[15px] leading-[1.2] whitespace-nowrap text-[#fafafa] backdrop-blur-[12px] backdrop-saturate-[1.15] transition-colors duration-250 shadow-[0_0_0_0.5px_rgba(197,52,0,0.65),inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-[rgba(48,48,48,0.8)] hover:shadow-[0_0_0_0.5px_rgba(197,52,0,0.9),inset_0_1px_0_rgba(255,255,255,0.28)] max-[980px]:bg-[#262626] max-[980px]:backdrop-blur-none max-sm:w-full max-sm:flex-none"
              >
                Subscribe
                <Arrow />
              </button>
              <Link
                href="/"
                className="vc-btn inline-flex h-[52px] min-w-0 flex-1 items-center justify-between gap-[14px] bg-[#fafafa] px-[18px] font-general text-[15px] leading-[1.2] whitespace-nowrap text-[#0d0d0d] no-underline transition-colors duration-250 hover:bg-white max-sm:w-full max-sm:flex-none"
              >
                Read the thesis
                <Arrow />
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* ---- band two: three rows on one 12-column grid (24px gutters),
           mirroring vesper-chrome.css's .dgf-grid rules: links on cols
           1 / 5 / 9 as equal thirds, identity on cols 1-5 with the legal
           line LEFT-aligned on cols 9-12, and the baseline bar with the
           copyright on col 1 and the status pill on col 9, so the rows
           share two vertical alignment lines. Rows stack below 700px. ---- */}
      <div className="vc-cols mx-auto w-[calc(100%-48px)] max-w-[1392px]">
        <nav
          aria-label="Footer"
          className="vc-links dgf-grid grid grid-cols-12 items-start gap-x-[24px] max-[700px]:flex max-[700px]:flex-col"
        >
          {copy.columns.map((column) => (
            <div
              key={column.heading}
              className="vc-col col-span-4 flex flex-col gap-[20px] py-[48px] max-[700px]:py-[24px]"
            >
              <h3 className="font-hud-mono text-[11px] leading-[1.2] font-normal tracking-[0.18em] text-[rgba(250,250,250,0.65)] uppercase">
                {column.heading}
              </h3>
              <ul className="flex list-none flex-col gap-[12px] p-0">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="inline-block py-[2px] -my-[2px] font-general text-[16px] leading-[1.25] text-[#fafafa] no-underline transition-colors duration-250 hover:text-signal"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="vc-rule mx-auto w-[calc(100%-48px)] max-w-[1392px] border-t border-[#262626]" />

      <div className="vc-base dgf-grid mx-auto grid w-[calc(100%-48px)] max-w-[1392px] grid-cols-12 items-start gap-x-[24px] pt-[24px] pb-[48px] max-[700px]:flex max-[700px]:flex-col max-[700px]:gap-y-[28px] max-[700px]:pb-[32px]">
        <div className="vc-brand col-span-5 flex flex-col gap-[8px]">
          <span className="block h-[26px] w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/hero/logo.svg"
              alt={copy.wordmark}
              className="block h-full w-full"
            />
          </span>
          <p className="max-w-[40ch] font-general text-[15px] leading-[1.5] font-normal text-[rgba(250,250,250,0.65)] normal-case">
            {copy.tagline}
          </p>
        </div>
        {copy.legal && (
          <p className="vc-legal col-span-4 col-start-9 font-general text-[11.5px] leading-[1.6] text-[rgba(250,250,250,0.52)] normal-case">
            {copy.legal}
          </p>
        )}
      </div>

      {/* the classic baseline bar; the status pill mirrors css/styles.css's
          .status/.dot component (its pulse lives in globals.css with a
          reduced-motion guard) */}
      <div className="dgf-foot mx-auto w-[calc(100%-48px)] max-w-[1392px]">
        <div className="dgf-bar dgf-grid grid grid-cols-12 items-start gap-x-[24px] border-t border-[#262626] pt-[24px] pb-[40px] font-hud-mono text-[12px] tracking-[0.06em] text-[rgba(250,250,250,0.55)] max-[700px]:flex max-[700px]:flex-col max-[700px]:gap-y-[12px] max-[700px]:pt-[20px] max-[700px]:pb-[36px]">
          <span className="col-span-5">
            © 2026 · Made by{" "}
            <a
              href="https://x.com/Lyskey"
              target="_blank"
              rel="noopener"
              className="text-[rgba(250,250,250,0.72)] no-underline transition-colors duration-250 hover:text-signal"
            >
              Lyskey
            </a>
          </span>
          <a
            className="dgf-status col-span-4 col-start-9 justify-self-start text-inherit no-underline"
            href="https://status.starknet.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="inline-flex items-center gap-[8px] text-[#c53400]">
              <span
                aria-hidden
                className="vc-status-dot block size-[7px] rounded-full bg-[#c53400] shadow-[0_0_8px_#c53400]"
              />
              All systems operational
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};

/** The `.vc-btn i` chevron: a bare corner rotated 45deg, no icon font. */
const Arrow = () => (
  <span
    aria-hidden
    className="block size-[7px] flex-none rotate-45 border-t-[1.5px] border-r-[1.5px] border-current"
  />
);
