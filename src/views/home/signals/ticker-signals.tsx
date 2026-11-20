import { Fragment } from "react";
import type { SignalCardCopy, TickerCopy } from "@/data/home";
import { fillCounts, renderInline, type InlineClaims } from "@/utils/inline-copy";
import { Flywheel } from "./flywheel";
import { LogoRow, type LogoItem } from "./logo-row";

/**
 * Sections 02 and 03 in one viewport: the ticker on the left, the two signal
 * cards on the right. Not a sentence here is typed: every string comes from
 * homeTicker and homeSignals (src/data/home.ts).
 *
 * Every count is derived from the data modules the ecosystem and digest
 * pages are built from (src/lib/data): the six logos are
 * public/data/landing-featured.json's slugs through the avatar pipeline, the
 * ecosystem card's two counts are the two halves of the globe's own split
 * (an account's category key in public/data/ecosystem.json is what separates
 * a project from a person, on both pages), the digest counts follow the
 * digest page's classifier (its "Research" filter is the third), and the
 * digest card's object is the real Substack cover of the newest issue, the
 * URL the digest page hotlinks.
 */
export interface TickerSignalsProps {
  tickerKicker: string;
  ticker: TickerCopy;
  claims: InlineClaims;
  signalsKicker: string;
  signals: { ecosystem: SignalCardCopy; digest: SignalCardCopy };
  projectsTracked: number;
  voicesTracked: number;
  weeklyRoundups: number;
  monthlyRecaps: number;
  researchArticles: number;
  logos: LogoItem[];
  latest: { title: string; href: string; cover: string | null } | null;
}

/**
 * A filled mono line. The separators stay aria-hidden, so a screen reader
 * reads the counts as counts and not as punctuation.
 */
const MonoLine = ({ text }: { text: string }) => (
  <p className="lp-mono">
    {text.split("\u00b7").map((part, index) => (
      <Fragment key={index}>
        {index > 0 && <span aria-hidden="true">&middot;</span>}
        {part}
      </Fragment>
    ))}
  </p>
);

/**
 * The newest issue's cover, sized for where it is shown. The feed hands back
 * Substack's CDN URL with no width, which serves the 1920x1080 original as a
 * PNG (1.2 MB on 2026-11-19) into a 220px slot. The same CDN resizes and
 * re-encodes on request: the transform sits in the path segment before the
 * encoded source, so swapping that segment asks for a WebP at the width the
 * slot needs (about 21 KB at 440px, 60 KB at 880px). A URL of any other
 * shape is returned untouched, with no srcset.
 */
const SUBSTACK_FETCH = /^(https:\/\/substackcdn\.com\/image\/fetch\/)[^/]+(\/.+)$/;
const coverAt = (url: string, width: number) =>
  url.replace(SUBSTACK_FETCH, `$1w_${width},c_limit,f_webp,q_auto:good,fl_progressive:steep$2`);
const coverSources = (url: string) =>
  SUBSTACK_FETCH.test(url)
    ? {
        src: coverAt(url, 440),
        srcSet: `${coverAt(url, 440)} 440w, ${coverAt(url, 880)} 880w`,
        /* 220px beside the card's text; the card's full width once it stacks */
        sizes: "(max-width: 980px) calc(100vw - 90px), 220px",
      }
    : { src: url };

export const TickerSignals = ({ tickerKicker, ticker, claims, signalsKicker, signals, projectsTracked, voicesTracked, weeklyRoundups, monthlyRecaps, researchArticles, logos, latest }: TickerSignalsProps) => (
  <div className="lp-twoup" id="ticker-signals">
    <section className="lp-ticker" id="ticker" aria-labelledby="the-thesis-in-a-single-asset">
      <p className="lp-kicker">{tickerKicker}</p>
      <h2 className="lp-h2" id="the-thesis-in-a-single-asset">{ticker.title}</h2>
      <p className="lp-p">{renderInline(ticker.body, claims)}</p>
      <a className="lp-link" href={ticker.link.href}>{ticker.link.label}</a>
      <div className="lp-fly" aria-hidden="true">
        <Flywheel />
      </div>
    </section>

    <section className="lp-signals" id="signals" aria-labelledby="signals-title">
      <p className="lp-kicker">{signalsKicker}</p>
      <h2 className="lp-h2 lp-vh" id="signals-title">Signals</h2>
      <div className="lp-cards">
        <article className="lp-card" id="signal-ecosystem">
          <div>
            <h3>{signals.ecosystem.heading}</h3>
            <p>{signals.ecosystem.blurb}</p>
            <MonoLine text={fillCounts(signals.ecosystem.mono, { n: projectsTracked, m: voicesTracked })} />
            <a className="lp-link" href={signals.ecosystem.link.href}>{signals.ecosystem.link.label}</a>
          </div>
          <LogoRow items={logos} />
        </article>
        <article className="lp-card" id="signal-digest">
          <div>
            <h3>{signals.digest.heading}</h3>
            <p>{signals.digest.blurb}</p>
            <MonoLine
              text={fillCounts(signals.digest.mono, { w: weeklyRoundups, m: monthlyRecaps, r: researchArticles })}
            />
            <a className="lp-link" href={signals.digest.link.href}>{signals.digest.link.label}</a>
          </div>
          {latest && (
            <a className="lp-issue" href={latest.href} target="_blank" rel="noopener noreferrer">
              {latest.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="lp-cover" {...coverSources(latest.cover)} alt="" width={220} height={124} loading="lazy" decoding="async" />
              ) : null}
              <span className="lp-cover-t">{latest.title}</span>
            </a>
          )}
        </article>
      </div>
    </section>
  </div>
);
