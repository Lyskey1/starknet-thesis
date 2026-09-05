import { PressableLink } from "@/components/ui/pressable";
import { GHOST, NAV_LINK, QUIET } from "@/lib/springs/interaction";

import { MobileNav } from "./mobile-nav";

/**
 * Fixed, site-wide header: a FULL-WIDTH bar on the 1392px site container
 * (2026-09-05 nav typography pass over the nav pass; mirrors
 * public/css/vesper-chrome.css so all seven routes carry one bar).
 *
 * The inner row is the FOOTER'S OWN 12-column grid (24px gaps), so the
 * three clusters sit on the footer's axes: brand cluster on col 1 (22px
 * three-bar mark, 10px gap, Archivo Expanded 500 wordmark at 15px), the
 * page links on the col 4 line in the site's mono uppercase eyebrow
 * grammar (IBM Plex Mono 11.5px, .14em, muted .62 ink, hover ink, 280ms),
 * socials + Subscribe ending on the col 13 line. Between 1024 and 1280 the
 * link tracking drops to .10em before anything else; the row never wraps.
 * Glass over content, one hairline bottom border at .10 ink, 64px tall,
 * always there: no hide-on-scroll, no shrink.
 *
 * Below 1024px the bar keeps the brand cluster AND the Subscribe button;
 * the links and the socials hand over to {@link MobileNav}, whose toggle is
 * two bars (deliberately not three: the site mark is a three-bar glyph, and
 * the two must never be confusable).
 */
const NAV = [
  { label: "Privacy", href: "/privacy" },
  { label: "Quantum", href: "/quantum" },
  { label: "BTCFi", href: "/btcfi" },
  { label: "STRK", href: "/strk" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Digest", href: "/digest" },
] as const;

/* Monochrome ink glyphs, 17px, resting .70 ink, hover to accent. Discord is
   the official Starknet community invite as linked from starknet.io; X is
   the owner's account, the footer's own target. */
const SOCIALS = [
  {
    label: "Starknet Discord",
    href: "https://discord.gg/starknet-community",
    path: "M20.32 4.37a19.8 19.8 0 0 0-4.93-1.51 13.8 13.8 0 0 0-.64 1.28 18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.64-1.28c-1.71.29-3.37.8-4.93 1.51A20.3 20.3 0 0 0 .1 18.06a19.9 19.9 0 0 0 6.07 3.06c.49-.66.93-1.37 1.3-2.11a12.9 12.9 0 0 1-2.05-.98c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.16 0c.16.13.33.26.5.38-.65.39-1.34.72-2.05.98.37.74.81 1.45 1.3 2.11a19.8 19.8 0 0 0 6.07-3.06A20.2 20.2 0 0 0 20.32 4.37ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42 2.19 1.09 2.16 2.42c0 1.34-.95 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42 2.19 1.09 2.16 2.42c0 1.34-.95 2.42-2.16 2.42Z",
  },
  {
    label: "Lyskey on X",
    href: "https://x.com/Lyskey",
    path: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z",
  },
  {
    label: "Starknet ecosystem Telegram",
    href: "https://t.me/starknet_ecosystem",
    path: "M21.94 3.6a1.5 1.5 0 0 0-1.53-.26L2.7 10.34c-.9.35-.88 1.63.03 1.95l4.63 1.63 1.79 5.63c.27.86 1.37 1.1 1.98.44l2.58-2.83 4.66 3.42c.72.53 1.75.13 1.93-.75l2.16-14.6a1.5 1.5 0 0 0-.52-1.63ZM9.16 13.94l9.28-6.86c.31-.23.66.19.39.46l-7.5 7.42c-.24.24-.4.55-.45.89l-.35 2.42-1.37-4.33Z",
  },
] as const;

export const SiteHeader = () => {
  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-50 h-16 border-b border-[rgba(245,242,236,0.10)] bg-black/80 backdrop-blur-[12px] backdrop-saturate-[1.15] max-[980px]:bg-black/95 max-[980px]:backdrop-blur-none">
      <div className="mx-auto grid h-full w-[calc(100%-48px)] max-w-[1392px] grid-cols-12 items-center gap-x-6 max-lg:flex max-lg:w-[calc(100%-32px)] max-lg:gap-3.5 max-sm:w-[calc(100%-24px)]">
        {/* brand cluster on col 1: mark 22px, wordmark Archivo Expanded 500 */}
        <PressableLink
          href="/"
          aria-label="Starknet Thesis, home"
          interaction={QUIET}
          className="col-start-1 col-end-4 flex items-center gap-[10px] justify-self-start max-lg:shrink-0"
        >
          <svg
            viewBox="2.4 5.4 21.2 15.2"
            aria-hidden
            focusable="false"
            className="block w-[22px] shrink-0"
          >
            <path d="M4 7 H22" stroke="#8b7bff" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M4 13 H17" stroke="#8b7bff" strokeOpacity="0.55" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M4 19 H12" stroke="#8b7bff" strokeOpacity="0.3" strokeWidth="3.2" strokeLinecap="round" />
          </svg>
          <span className="font-[family-name:var(--font-archivo)] [font-stretch:125%] text-[15px] leading-none font-medium tracking-[-0.01em] whitespace-nowrap text-[#F5F2EC]">
            Starknet Thesis
          </span>
        </PressableLink>

        {/* page links start on the footer's col 4 axis; mono eyebrow grammar */}
        <nav
          aria-label="Main"
          className="col-start-4 col-end-10 flex items-center gap-[22px] font-[family-name:var(--font-plex-mono)] text-[11.5px] leading-[1.2] font-normal tracking-[0.14em] uppercase whitespace-nowrap max-[1279px]:tracking-[0.10em] max-lg:hidden"
        >
          {NAV.map((item) => (
            <PressableLink
              key={item.label}
              href={item.href}
              interaction={NAV_LINK}
              className="text-[rgba(245,242,236,0.62)] transition-colors duration-[280ms] hover:text-[#F5F2EC]"
            >
              {item.label}
            </PressableLink>
          ))}
        </nav>

        {/* right cluster ends on the col 13 line (container right edge) */}
        <div className="col-start-10 col-end-13 flex items-center justify-end gap-3 max-lg:ml-auto">
          <div className="flex items-center gap-1 max-lg:hidden">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener"
                aria-label={s.label}
                className="grid size-[34px] place-items-center text-[rgba(245,242,236,0.70)] transition-colors duration-[280ms] hover:text-signal"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="block size-[17px]">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>

          {/* Subscribe: the links' mono grammar at 11px over the glass
              surface; the trailing 2x2 dot from the old bar is gone */}
          <PressableLink
            href="https://starknetresearch.substack.com"
            interaction={GHOST}
            className="flex shrink-0 items-center rounded-[6px] border border-[rgba(245,242,236,0.22)] bg-[rgba(38,38,38,0.74)] px-[14px] py-[8px] font-[family-name:var(--font-plex-mono)] text-[11px] leading-[1.2] font-normal tracking-[0.14em] uppercase whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
          >
            Subscribe
          </PressableLink>

          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
};
