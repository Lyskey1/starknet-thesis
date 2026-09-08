import Link from "next/link";

import { PERISHABLE } from "@/data/perishable";
import { PillarObject } from "./pillar-object";
import { ProblemsEngine } from "./problems-engine";
import { VaultDevice } from "./vault-device";

/**
 * Section 01, the three problems: quantum's Head Start component, the
 * object-selector triptych (public/css/th-selector.css + public/js/
 * selector-panel.js, both cut out of quantum.html so the two pages run one
 * component). Three tiles in nav order, Privacy, Quantum, BTCFi, each a
 * static snapshot of its object, over a fixed-height two-column detail panel:
 * copy left, the live object right.
 *
 * Snapshots: the privacy and BTCFi tiles carry PNG stills of their particle
 * objects (public/assets/landing, captured from this page's own panel at
 * 1440), the quantum tile a static clone of the panel's vault drawing built
 * by the engine at load; no tile mounts a live particle system.
 *
 * Every number on the panels arrives derived: the private-transfer fee from
 * public/js/fee-config.js and the post-quantum account fee from
 * tools/record-gen.js (src/lib/data/derived-fees.ts). A missing source hides
 * its stat line; nothing here falls back to a literal.
 */
export interface ProblemsProps {
  kicker: string;
  privateTransferFee: string | null;
  postQuantumFeeStrk: string | null;
}

const RAIL_ID = "problemsRail";

const claim = PERISHABLE["btc-largest-asset"];

export const Problems = ({ kicker, privateTransferFee, postQuantumFeeStrk }: ProblemsProps) => (
  <section className="lp-sec problems" id="problems" aria-labelledby="the-three-hardest-problems">
    <header className="lp-head">
      <p className="lp-kicker">{kicker}</p>
      <h2 className="lp-h2" id="the-three-hardest-problems">
        The three hardest problems in crypto, <b>answered on Starknet.</b>
      </h2>
    </header>

    <div className="qw hst" id={RAIL_ID}>
      <div className="qw-rail hst-rail" role="tablist" aria-label="The three problems">
        <button className="qw-ped hst-tile" type="button" role="tab" id="problems-privacy" data-ch="0" aria-selected="true" aria-controls="problems-panel" tabIndex={0}>
          <span className="hst-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/landing/thumb-privacy.png" alt="" width={96} height={117} loading="lazy" decoding="async" />
          </span>
          <span className="hst-name">Privacy</span>
          <span className="hst-prog" aria-hidden="true"><i /></span>
        </button>
        <button className="qw-ped hst-tile" type="button" role="tab" id="problems-quantum" data-ch="1" aria-selected="false" aria-controls="problems-panel" tabIndex={-1}>
          <span className="hst-thumb" data-hst-clone="vtSvg" aria-hidden="true" />
          <span className="hst-name">Quantum</span>
          <span className="hst-prog" aria-hidden="true"><i /></span>
        </button>
        <button className="qw-ped hst-tile" type="button" role="tab" id="problems-btcfi" data-ch="2" aria-selected="false" aria-controls="problems-panel" tabIndex={-1}>
          <span className="hst-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/landing/thumb-btcfi.png" alt="" width={96} height={117} loading="lazy" decoding="async" />
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
                    Starknet makes that optional: real onchain privacy for any asset, in one shared pool,
                    with a compliance path built in.
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
                  <PillarObject kind="silhouette" index={0} />
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
                    Starknet&apos;s proofs are hash-based, post-quantum by construction, with a committed
                    roadmap to full end-to-end post-quantum security.
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
                  <VaultDevice />
                </div>
              </div>
            </div>
          </article>

          <article className="qw-ch" data-ch="2">
            <div className="th-st-item">
              <div className="th-stark-duo">
                <div className="lp-copy">
                  <h3 className="lp-h3">
                    Bitcoin is{" "}
                    <span
                      className="th-claim"
                      data-perishable="third-party"
                      data-src={claim.src}
                      data-checked={claim.checked}
                      data-breaks={claim.breaks}
                    >
                      {claim.text}
                    </span>
                    , and it still needs real DeFi.
                  </h3>
                  <p>
                    Idle BTC turned into productive, programmable capital on Starknet: lending, yield and
                    settlement without leaving Bitcoin&apos;s security behind.
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
