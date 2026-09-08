import Link from "next/link";

import { Flywheel } from "./flywheel";
import { LogoRow, type LogoItem } from "./logo-row";

/**
 * Sections 02 and 03 in one viewport: the ticker on the left, the two signal
 * cards on the right. Every count is derived from the data modules the
 * ecosystem and digest pages are built from (src/lib/data): the six logos
 * are public/data/landing-featured.json's slugs through the avatar pipeline,
 * the digest counts follow the digest page's classifier (its "Research"
 * filter is the third), and the digest card's object is the real Substack
 * cover of the newest issue, the URL the digest page hotlinks.
 */
export interface TickerSignalsProps {
  tickerKicker: string;
  signalsKicker: string;
  projectsTracked: number;
  weeklyRoundups: number;
  monthlyRecaps: number;
  researchArticles: number;
  logos: LogoItem[];
  latest: { title: string; href: string; cover: string | null } | null;
}

export const TickerSignals = ({ tickerKicker, signalsKicker, projectsTracked, weeklyRoundups, monthlyRecaps, researchArticles, logos, latest }: TickerSignalsProps) => (
  <div className="lp-twoup" id="ticker-signals">
    <section className="lp-ticker" id="ticker" aria-labelledby="the-thesis-in-a-single-asset">
      <p className="lp-kicker">{tickerKicker}</p>
      <h2 className="lp-h2" id="the-thesis-in-a-single-asset">The thesis, in a single asset.</h2>
      <p className="lp-p">
        Privacy, quantum resistance and Bitcoin all run on Starknet. STRK is the asset that secures the
        network and captures the demand the thesis creates.
      </p>
      <Link className="lp-link" href="/strk">What STRK does across the network</Link>
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
            <h3>Ecosystem</h3>
            <p>The builders and projects worth following.</p>
            <p className="lp-mono">{projectsTracked.toLocaleString("en-US")} projects tracked</p>
            <Link className="lp-link" href="/ecosystem">Explore the ecosystem</Link>
          </div>
          <LogoRow items={logos} />
        </article>
        <article className="lp-card" id="signal-digest">
          <div>
            <h3>Digest</h3>
            <p>Starknet&apos;s shipping, recapped every week and every month.</p>
            <p className="lp-mono">
              {weeklyRoundups.toLocaleString("en-US")} weekly roundups <span aria-hidden="true">&middot;</span>{" "}
              {monthlyRecaps.toLocaleString("en-US")} monthly recaps <span aria-hidden="true">&middot;</span>{" "}
              {researchArticles.toLocaleString("en-US")} research articles
            </p>
            <Link className="lp-link" href="/digest">Read the digest</Link>
          </div>
          {latest && (
            <a className="lp-issue" href={latest.href} target="_blank" rel="noopener noreferrer">
              {latest.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="lp-cover" src={latest.cover} alt="" width={220} height={124} loading="lazy" decoding="async" />
              ) : null}
              <span className="lp-cover-t">{latest.title}</span>
            </a>
          )}
        </article>
      </div>
    </section>
  </div>
);
