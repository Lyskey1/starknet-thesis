/**
 * The landing (2026-09-08 correction pass): a sectioned page on the site's
 * shared components, replacing the scroll-driven WebGL scene.
 *
 * A Server Component: it reads the data modules (ecosystem, digest, the two
 * derived fees), numbers the sections from one ordered list (the page's only
 * numbering system: kickers 01..04), and hands everything down as props.
 * Order: hero, problems, ticker + signals in one viewport, faq, then the
 * footer's accent panel and the footer.
 *
 * The shared stylesheets are the static pages' own files under public/css
 * (th-hero, th-selector, th-vault, glass-cards), linked here rather than
 * copied; landing.css carries the token bridge and the parity copy of the
 * base type rules those components compose on the static pages.
 */
import { homeFaq, homeFooter } from "@/data/home";
import { digestCounts, latestIssue } from "@/lib/data/digest";
import { postQuantumAccountFeeStrk, privateTransferFee } from "@/lib/data/derived-fees";
import { pinnedProjects, projectsTracked } from "@/lib/data/ecosystem";
import { getFaqStructuredData } from "@/utils/seo/faq-structured-data";

import { Hero } from "./home/hero/hero";
import { Problems } from "./home/problems/problems";
import { FaqSection } from "./home/sections/faq-section";
import { SiteFooter } from "./home/sections/site-footer";
import { TickerSignals } from "./home/signals/ticker-signals";

import "./home/landing.css";

/** The section order; the kicker number is the position, never typed. */
const SECTIONS = ["The three problems", "The ticker", "Signals", "Frequently asked"] as const;
const kicker = (index: number) => `${String(index + 1).padStart(2, "0")} · ${SECTIONS[index]}`;

export const HomeView = () => {
  const counts = digestCounts();
  const latest = latestIssue();
  const logos = pinnedProjects().map(({ name, handle, url, src, monogram }) => ({ name, handle, url, src, monogram }));
  const projects = projectsTracked();

  return (
    <main className="landing">
      {/* The shared component sheets are the static pages' own files under
          public/css, linked (React hoists them into <head>) rather than
          copied into the bundle, so /quantum and the landing read ONE file;
          the mono face is the same Google Fonts request the static pages
          make, by family name, because the shared sheets name it. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/glass-cards.css" precedence="shared" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/th-hero.css" precedence="shared" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/th-selector.css" precedence="shared" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/th-vault.css" precedence="shared" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap"
        precedence="fonts"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getFaqStructuredData(homeFaq)) }}
      />

      <Hero projectsTracked={projects} weeklyRoundups={counts.weeklyRoundups} />
      <Problems
        kicker={kicker(0)}
        privateTransferFee={privateTransferFee()}
        postQuantumFeeStrk={postQuantumAccountFeeStrk()}
      />
      <TickerSignals
        tickerKicker={kicker(1)}
        signalsKicker={kicker(2)}
        projectsTracked={projects}
        weeklyRoundups={counts.weeklyRoundups}
        monthlyRecaps={counts.monthlyRecaps}
        logos={logos}
        latest={latest}
      />
      <FaqSection copy={homeFaq} kicker={kicker(3)} />
      <SiteFooter copy={homeFooter} />
    </main>
  );
};
