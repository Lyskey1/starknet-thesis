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
              <button
                type="submit"
                className="vc-btn inline-flex h-[52px] min-w-0 flex-1 items-center justify-between gap-[14px] bg-[#0d0d0d] px-[18px] font-general text-[15px] leading-[1.2] whitespace-nowrap text-[#fafafa] transition-colors duration-250 hover:bg-black max-sm:w-full max-sm:flex-none"
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

      {/* ---- band two: link columns, then brand + legal ---- */}
      <div className="vc-cols mx-auto w-[calc(100%-48px)] max-w-[1392px]">
        <nav
          aria-label="Footer"
          className="vc-links grid grid-cols-4 items-stretch max-lg:grid-cols-2 max-lg:gap-y-[40px] max-sm:grid-cols-1 max-sm:gap-y-0"
        >
          {copy.columns.map((column) => (
            <div
              key={column.heading}
              className="vc-col flex flex-col gap-[22px] border-l border-[#262626] px-[28px] pt-[56px] pb-[60px] first:border-l-0 first:pl-0 max-lg:px-0 max-lg:pt-[40px] max-lg:pb-[40px] max-lg:pl-[24px] max-lg:odd:border-l-0 max-lg:odd:pl-0 max-sm:border-l-0 max-sm:px-0 max-sm:py-[28px] max-sm:pl-0"
            >
              <h3 className="font-hud-mono text-[11px] leading-[1.2] font-normal tracking-[0.18em] text-[rgba(250,250,250,0.65)] uppercase">
                {column.heading}
              </h3>
              <ul className="flex list-none flex-col gap-[18px] p-0">
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

      <div className="vc-base mx-auto grid w-[calc(100%-48px)] max-w-[1392px] grid-cols-[minmax(0,396px)_minmax(0,1fr)] items-start gap-x-[56px] gap-y-[28px] pt-[32px] pb-[40px] max-lg:grid-cols-1">
        <div className="vc-brand flex flex-col gap-[16px]">
          <span className="block h-[26px] w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/hero/logo.svg"
              alt={copy.wordmark}
              className="block h-full w-full"
            />
          </span>
          <p className="font-general text-[15px] leading-[1.5] font-normal text-[rgba(250,250,250,0.65)] normal-case">
            {copy.tagline}
          </p>
        </div>
        {copy.legal && (
          <p className="vc-legal font-tag text-[12px] leading-[1.6] text-[rgba(250,250,250,0.45)] uppercase">
            {copy.legal}
          </p>
        )}
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
