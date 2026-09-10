/**
 * The landing (2026-09-08 correction passes): a sectioned page on the site's
 * shared components, replacing the scroll-driven WebGL scene.
 *
 * A Server Component: it reads the data modules (ecosystem, digest with the
 * live Substack feed merged, the two derived fees, the Q-day constant),
 * numbers the sections from one ordered list (the page's only numbering
 * system: kickers 01..04), and hands everything down as props. Order: hero,
 * problems, ticker + signals in one viewport, faq, then the footer's accent
 * panel and the footer. The page regenerates hourly (src/app/page.tsx).
 *
 * The shared stylesheets are the static pages' own files under public/css
 * (th-hero, th-selector, glass-cards), linked here rather than copied;
 * landing.css carries the token bridge and the parity copy of the base type
 * rules those components compose on the static pages.
 */
import { homeFaq, homeFooter, homeProblems, homeTicker } from "@/data/home";
import { PERISHABLE } from "@/data/perishable";
import { loadDigest } from "@/lib/data/digest";
import { postQuantumAccountFeeStrk, privateTransferFee } from "@/lib/data/derived-fees";
import { landingFeaturedProjects, projectsTracked } from "@/lib/data/ecosystem";
import { qdayYear } from "@/lib/data/qday";
import { getFaqStructuredData } from "@/utils/seo/faq-structured-data";
import type { InlineClaims } from "@/utils/inline-copy";

import { Hero } from "./home/hero/hero";
import { PageBackdrop } from "./home/page-backdrop";
import { Problems } from "./home/problems/problems";
import { FaqSection } from "./home/sections/faq-section";
import { SiteFooter } from "./home/sections/site-footer";
import { TickerSignals } from "./home/signals/ticker-signals";

import "./home/landing.css";

/** The section order; the kicker number is the position, never typed. */
const SECTIONS = ["The three problems", "The ticker", "Signals", "Frequently asked"] as const;
const kicker = (index: number) => `${String(index + 1).padStart(2, "0")} · ${SECTIONS[index]}`;

export const HomeView = async () => {
  const digest = await loadDigest();
  const logos = landingFeaturedProjects().map(({ name, handle, url, src, monogram }) => ({ name, handle, url, src, monogram }));
  const projects = projectsTracked();
  const year = qdayYear();

  /* One registered-claim table for the whole page: section 01's panels and
     the FAQ answers reference the same keys, so a claim registered once is
     rendered once wherever the copy names it. The Q-day timeline's text is
     the only filled one; its year comes from the constant the quantum page
     counts down from, never typed. */
  const claims: InlineClaims = {
    ...PERISHABLE,
    "qday-timeline": {
      ...PERISHABLE["qday-timeline"],
      text: year ? PERISHABLE["qday-timeline"].text.replace("{QDAY_YEAR}", String(year)) : "",
    },
  };

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
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap"
        precedence="fonts"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getFaqStructuredData(homeFaq, claims)) }}
      />

      <PageBackdrop />
      <Hero />
      <Problems
        kicker={kicker(0)}
        copy={homeProblems}
        claims={claims}
        privateTransferFee={privateTransferFee()}
        postQuantumFeeStrk={postQuantumAccountFeeStrk()}
      />
      <TickerSignals
        tickerKicker={kicker(1)}
        ticker={homeTicker}
        claims={claims}
        signalsKicker={kicker(2)}
        projectsTracked={projects}
        weeklyRoundups={digest.weeklyRoundups}
        monthlyRecaps={digest.monthlyRecaps}
        researchArticles={digest.researchArticles}
        logos={logos}
        latest={digest.latest}
      />
      <FaqSection copy={homeFaq} kicker={kicker(3)} claims={claims} />
      <SiteFooter copy={homeFooter} />
    </main>
  );
};
