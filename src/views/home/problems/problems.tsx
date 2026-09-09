import Link from "next/link";

import { PERISHABLE, type PerishableClaim } from "@/data/perishable";
import { PillarObject } from "./pillar-object";
import { ProblemsEngine } from "./problems-engine";

/**
 * Section 01, the three problems: quantum's Head Start component, the
 * object-selector triptych (public/css/th-selector.css + public/js/
 * selector-panel.js, both cut out of quantum.html so the two pages run one
 * component). Three tiles in nav order, Privacy, Quantum, BTCFi, each a
 * static snapshot of its object, over a fixed-height two-column detail panel:
 * copy left, the live object right.
 *
 * Objects (2026-09-08): the privacy and quantum panels carry those pages'
 * own hero objects (privacy's keyed metal-human clip, quantum's particle
 * funnel), imported from the modules the pages load; BTCFi keeps the
 * particle coin. The vault stays on the quantum page. Tiles carry PNG stills
 * captured from this page's own panel (public/assets/landing); no tile
 * mounts a live system.
 *
 * Every number on the panels arrives derived: the private-transfer fee from
 * public/js/fee-config.js and the post-quantum account fee from
 * tools/record-gen.js (src/lib/data/derived-fees.ts). A missing source hides
 * its stat line; nothing here falls back to a literal. Perishable claims come
 * from src/data/perishable.ts with their source and check date.
 */
export interface ProblemsProps {
  kicker: string;
  privateTransferFee: string | null;
  postQuantumFeeStrk: string | null;
}

const RAIL_ID = "problemsRail";

const Claim = ({ claim }: { claim: PerishableClaim }) => (
  <span
    className="th-claim"
    data-perishable="third-party"
    data-src={claim.src}
    data-checked={claim.checked}
    data-breaks={claim.breaks}
    data-says={claim.says}
  >
    {claim.text}
  </span>
);

export const Problems = ({ kicker, privateTransferFee, postQuantumFeeStrk }: ProblemsProps) => (
  <section className="lp-sec problems" id="problems" aria-labelledby="the-three-hardest-problems">
    <header className="lp-head">
      <p className="lp-kicker">{kicker}</p>
      <h2 className="lp-h2" id="the-three-hardest-problems">
        All three, answered <b className="lp-nowrap">on one chain.</b>
      </h2>
    </header>

    <div className="qw hst" id={RAIL_ID}>
      <div className="qw-rail hst-rail" role="tablist" aria-label="The three problems">
        <button className="qw-ped hst-tile" type="button" role="tab" id="problems-privacy" data-ch="0" aria-selected="true" aria-controls="problems-panel" tabIndex={0}>
          <span className="hst-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/landing/thumb-privacy.png" alt="" width={64} height={76} loading="lazy" decoding="async" />
          </span>
          <span className="hst-name">Privacy</span>
          <span className="hst-prog" aria-hidden="true"><i /></span>
        </button>
        <button className="qw-ped hst-tile" type="button" role="tab" id="problems-quantum" data-ch="1" aria-selected="false" aria-controls="problems-panel" tabIndex={-1}>
          <span className="hst-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/landing/thumb-quantum.png" alt="" width={64} height={76} loading="lazy" decoding="async" />
          </span>
          <span className="hst-name">Quantum</span>
          <span className="hst-prog" aria-hidden="true"><i /></span>
        </button>
        <button className="qw-ped hst-tile" type="button" role="tab" id="problems-btcfi" data-ch="2" aria-selected="false" aria-controls="problems-panel" tabIndex={-1}>
          <span className="hst-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/landing/thumb-btcfi.png" alt="" width={64} height={76} loading="lazy" decoding="async" />
          </span>
          <span className="hst-name">BTCFi</span>
          <span className="hst-prog" aria-hidden="true"><i /></span>
        </button>
      </div>

      <div className="qw-shell">
        <div className="qw-panel" id="problems-panel" role="tabpanel" aria-live="polite">
          <article className="qw-ch is-on" data-ch="0">
            <div className="th-st-item">
              <div className="th-stark-duo">
                <div className="lp-copy">
                  <h3 className="lp-h3">Every wallet is a public ledger.</h3>
                  <p>
                    Starknet makes that optional: real onchain privacy for any asset and any use case. One
                    shared pool, deep DeFi integration, built into the wallet, a compliance path from day
                    one, and fees measured in cents.
                  </p>
                  {privateTransferFee && (
                    <div className="lp-stat">
                      <b>{privateTransferFee}</b>
                      <span>Per private transfer, derived</span>
                    </div>
                  )}
                  <div className="lp-close">Live on Mainnet today.</div>
                  <Link className="lp-link" href="/privacy">Read Privacy</Link>
                </div>
                <div className="lp-object">
                  <PillarObject kind="human" index={0}>
                    {/* privacy.html's hero object markup, verbatim: the clip the key module reads */}
                    <div className="pv-human">
                      <div className="pv-figure">
                        <video muted loop playsInline preload="metadata" poster="/assets/video/metal-human.jpg">
                          <source src="/assets/video/metal-human.mp4" type="video/mp4" />
                        </video>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="pv-still" src="/assets/video/metal-human.jpg" alt="" />
                      </div>
                    </div>
                  </PillarObject>
                </div>
              </div>
            </div>
          </article>

          <article className="qw-ch" data-ch="1">
            <div className="th-st-item">
              <div className="th-stark-duo">
                <div className="lp-copy">
                  <h3 className="lp-h3">Quantum will break most chains.</h3>
                  <p>
                    Starknet&apos;s proofs were born post-quantum: STARKs are hash-based, with no
                    elliptic-curve assumptions, since the first block. Post-quantum accounts{" "}
                    <Claim claim={PERISHABLE["pq-accounts-mainnet"]} />, and moving yours is one
                    transaction, not a hard fork.
                  </p>
                  {postQuantumFeeStrk && (
                    <div className="lp-stat">
                      <b>{postQuantumFeeStrk} STRK</b>
                      <span>STRK per post-quantum account tx, derived</span>
                    </div>
                  )}
                  <div className="lp-close">Starknet has been waiting for it.</div>
                  <Link className="lp-link" href="/quantum">Read Quantum</Link>
                </div>
                <div className="lp-object">
                  <PillarObject kind="funnel" index={1} />
                </div>
              </div>
            </div>
          </article>

          <article className="qw-ch" data-ch="2">
            <div className="th-st-item">
              <div className="th-stark-duo">
                <div className="lp-copy">
                  <h3 className="lp-h3">The biggest asset, barely used.</h3>
                  {/* the btc-largest-asset claim moved OUT of the heading and into this
                      paragraph when the heading was shortened (2026-09-09). It keeps its
                      sourced span, so the registry entry is still rendered with its
                      data-src and data-checked; do not restate the superlative in the
                      heading, or the page carries the claim twice under one source. */}
                  <p>
                    Bitcoin is <Claim claim={PERISHABLE["btc-largest-asset"]} /> and most of it sits
                    idle. On Starknet it becomes working capital: lend and borrow against it, earn
                    yield on it, stake it to secure the network, trade it for cents, and shield it
                    when you want privacy.
                  </p>
                  {/* no stat line: the btcfi page's BTC figures live in an inline fetch engine with
                      an inline seed, not in a data module this build can read */}
                  <div className="lp-close">Starknet puts it to work.</div>
                  <Link className="lp-link" href="/btcfi">Read BTCFi</Link>
                </div>
                <div className="lp-object">
                  <PillarObject kind="coin" index={2} />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
    <ProblemsEngine rootId={RAIL_ID} />
  </section>
);
