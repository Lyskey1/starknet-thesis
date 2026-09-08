import Link from "next/link";

import { HeroTorus } from "./hero-torus";
import { ShieldedValue } from "./shielded-value";

/**
 * The landing hero, the site's three-zone hero component (2026-09-08).
 *
 * This is quantum's hero, markup class for class: the QHX frame from
 * public/css/th-hero.css (extracted out of quantum.html so the two pages
 * share one sheet), the shared display classes (.hero-eyebrow,
 * .hero-title.vch-title, .hero-subtitle.vch-sub) and the glass CTA tier
 * (.dg-glass), whose static-page rules the landing carries as a parity copy
 * in landing.css. Zones: the editorial column on the container, the particle
 * object on the right-column stage, and the baseline strip on the shared
 * fixed geometry. Nothing here restyles the component; the one addition is
 * the strip's UPDATED stamp under the live stat, a new element.
 *
 * The strip's three stats are derived, never typed: the shielded value is
 * fetched live (see ShieldedValue), the two counts arrive as props from the
 * data modules the ecosystem and digest pages are built from.
 */
export interface HeroProps {
  projectsTracked: number;
  weeklyRoundups: number;
}

export const Hero = ({ projectsTracked, weeklyRoundups }: HeroProps) => (
  <section className="hero qhx" id="hero" aria-labelledby="hero-title">
    <div className="qhx-wrap">
      <div className="qhx-scene">
        <HeroTorus />
        <div className="qhx-col">
          <p className="hero-eyebrow">The thesis</p>
          <h1 id="hero-title" className="hero-title vch-title">
            Starknet is the answer to crypto&apos;s <em>three hardest problems.</em>
          </h1>
          <p className="hero-subtitle vch-sub">
            Real onchain privacy, post-quantum proofs by design, and Bitcoin turned into productive
            capital. Three forces converging on a single chain, with STRK capturing the value at every
            turn.
          </p>
          <div className="qhx-ctas">
            <Link className="qhx-cta dg-glass dg-glass--primary" href="/privacy">
              Read the thesis
            </Link>
            <Link className="qhx-cta dg-glass" href="/strk">
              Why STRK
            </Link>
          </div>
        </div>
      </div>
      <div className="qhx-strip">
        <ul className="qhx-stats">
          <ShieldedValue />
          <li>
            <b>{projectsTracked.toLocaleString("en-US")}</b>
            <span>Projects tracked</span>
          </li>
          <li>
            <b>{weeklyRoundups.toLocaleString("en-US")}</b>
            <span>Weekly roundups</span>
          </li>
        </ul>
        <p className="qhx-turn is-accent">Privacy. Quantum. BTCFi.</p>
      </div>
    </div>
  </section>
);
