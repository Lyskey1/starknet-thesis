import Link from "next/link";

import type { ProblemsCopy } from "@/data/home";
import { renderInline, type InlineClaims } from "@/utils/inline-copy";
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
 * Not one sentence is typed here. Every string comes from homeProblems
 * (src/data/home.ts) and is rendered through the shared inline renderer, so
 * a paragraph's links and its registered perishable claims read the same in
 * a panel as they do in the FAQ.
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
  copy: ProblemsCopy;
  claims: InlineClaims;
  privateTransferFee: string | null;
  postQuantumFeeStrk: string | null;
}

const RAIL_ID = "problemsRail";

/** tile identity and its still: structure, not copy */
const SLOTS = [
  { id: "problems-privacy", thumb: "/assets/landing/thumb-privacy.png" },
  { id: "problems-quantum", thumb: "/assets/landing/thumb-quantum.png" },
  { id: "problems-btcfi", thumb: "/assets/landing/thumb-btcfi.png" },
] as const;

/** the copy column, identical on all three panels; only the object differs */
const PanelCopyColumn = ({
  panel,
  claims,
  stat,
}: {
  panel: ProblemsCopy["panels"][number];
  claims: InlineClaims;
  stat: string | null;
}) => (
  <div className="lp-copy">
    <h3 className="lp-h3">{panel.heading}</h3>
    <p>{renderInline(panel.body, claims)}</p>
    {panel.statLabel && stat && (
      <div className="lp-stat">
        <b>{stat}</b>
        <span>{panel.statLabel}</span>
      </div>
    )}
    <div className="lp-close">{panel.close}</div>
    <Link className="lp-link" href={panel.link.href}>{panel.link.label}</Link>
  </div>
);

export const Problems = ({ kicker, copy, claims, privateTransferFee, postQuantumFeeStrk }: ProblemsProps) => {
  const [privacy, quantum, btcfi] = copy.panels;
  /* the post-quantum figure prints in STRK, the unit its caption names */
  const pqStat = postQuantumFeeStrk ? `${postQuantumFeeStrk} STRK` : null;

  return (
    <section className="lp-sec problems" id="problems" aria-labelledby="the-three-hardest-problems">
      <header className="lp-head">
        <p className="lp-kicker">{kicker}</p>
        <h2 className="lp-h2" id="the-three-hardest-problems">
          {copy.title.lead}
          <b className="lp-nowrap">{copy.title.nowrap}</b>
        </h2>
      </header>

      <div className="qw hst" id={RAIL_ID}>
        <div className="qw-rail hst-rail" role="tablist" aria-label="The three problems">
          {copy.panels.map((panel, index) => (
            <button
              key={SLOTS[index].id}
              className="qw-ped hst-tile"
              type="button"
              role="tab"
              id={SLOTS[index].id}
              data-ch={index}
              aria-selected={index === 0}
              aria-controls="problems-panel"
              tabIndex={index === 0 ? 0 : -1}
            >
              <span className="hst-thumb" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SLOTS[index].thumb} alt="" width={64} height={76} loading="lazy" decoding="async" />
              </span>
              <span className="hst-name">{panel.tab}</span>
              <span className="hst-prog" aria-hidden="true"><i /></span>
            </button>
          ))}
        </div>

        <div className="qw-shell">
          <div className="qw-panel" id="problems-panel" role="tabpanel" aria-live="polite">
            <article className="qw-ch is-on" data-ch="0">
              <div className="th-st-item">
                <div className="th-stark-duo">
                  <PanelCopyColumn panel={privacy} claims={claims} stat={privateTransferFee} />
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
                  <PanelCopyColumn panel={quantum} claims={claims} stat={pqStat} />
                  <div className="lp-object">
                    <PillarObject kind="funnel" index={1} />
                  </div>
                </div>
              </div>
            </article>

            <article className="qw-ch" data-ch="2">
              <div className="th-st-item">
                <div className="th-stark-duo">
                  <PanelCopyColumn panel={btcfi} claims={claims} stat={null} />
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
};
