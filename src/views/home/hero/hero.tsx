import Link from "next/link";

import { HeroTorus } from "./hero-torus";
import { LiveStats } from "./live-stats";

/**
 * The landing hero, the site's three-zone hero component (2026-09-08).
 *
 * This is quantum's hero, markup class for class: the QHX frame from
 * public/css/th-hero.css (extracted out of quantum.html so the two pages
 * share one sheet), the shared display classes (.hero-eyebrow,
 * .hero-title.vch-title, .hero-subtitle.vch-sub) and the glass CTA tier
 * (.dg-glass), whose static-page rules the landing carries as a parity copy
 * in landing.css. Zones: the editorial column on the container, the particle
 * torus on the right-column stage, and the baseline strip on the shared
 * fixed geometry. Nothing here restyles the component.
 *
 * The strip is three LIVE numbers and one UPDATED stamp (see LiveStats);
 * nothing on it is typed.
 */
export const Hero = () => (
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
        <LiveStats />
        <p className="qhx-turn is-accent">Privacy. Quantum. BTCFi.</p>
      </div>
    </div>
  </section>
);
