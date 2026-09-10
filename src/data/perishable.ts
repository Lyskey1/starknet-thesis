/**
 * The landing's perishable-claims registry (2026-09-08), the quantum page's
 * contract (Q_PERISHABLE and the .th-claim audit attributes) in the
 * landing's module form.
 *
 * A perishable claim is a statement that is true today and can stop being
 * true: it carries the source it was checked against (data-src), the day a
 * HUMAN last re-read that source (data-checked), what the source says
 * (data-says, where the claim quotes one) and a break date, the day the
 * claim must be re-verified before it may keep rendering as-is. The
 * component renders them as data attributes on the claim's span; a client
 * effect flags a claim past its break date (data-stale), so a lapsed check
 * is visible in the DOM rather than silently trusted. Re-verify and move
 * the dates HERE, never in the markup.
 */
export interface PerishableClaim {
  /** The claim text as rendered. */
  text: string;
  /** Where it was checked. */
  src: string;
  /** ISO date a human last re-read the source. */
  checked: string;
  /** ISO date after which the claim needs re-verification. */
  breaks: string;
  /** The source's own words, where the claim rests on a quote. */
  says?: string;
  /**
   * Further sources behind the same wording, where one sentence rests on
   * more than one. `src` stays the primary; these ride `data-src-also`.
   */
  alsoSrc?: string[];
  /**
   * Why the claim is registered the way it is, for an owner-sourced claim
   * above all: what would replace it, and when. Rides `data-note`, the
   * quantum page's convention for the same case.
   */
  note?: string;
}

export const PERISHABLE = {
  /* Bitcoin's market capitalization ranks first among crypto assets on
     every major tracker. Checked against CoinMarketCap's ranking on the
     date below; a quarter is the re-check cadence. */
  "btc-largest-asset": {
    text: "crypto's largest asset",
    src: "https://coinmarketcap.com/",
    checked: "2026-09-08",
    breaks: "2026-12-08",
  },
  /* Section 01's quantum panel, the running-accounts half (2026-09-10).
     Supersedes "pq-accounts-mainnet", whose wording ("have been demonstrated
     on Mainnet") the owner's copy pass replaced with "already running on
     Starknet"; the sources are the same two the quantum page already cites,
     and both are kept because one sentence now rests on both. Primary: the
     StarkWare announcement of S2morrow on Mainnet with Falcon-512. Second:
     the 22 July 2026 OpenZeppelin Falcon-512 account that executed a real
     transfer on Starknet mainnet, whose recorded fee is the same 1.93 STRK
     the panel's stat line derives (tools/record-gen.js).
     WORDING NOTE, carried from the 2026-09-09 correction on the entry this
     replaces: the sources support accounts that run and transact on Mainnet.
     They do not support anybody being protected today. StarkWare's own
     migration register says, verbatim, "Existing accounts do not change
     automatically". The owner's copy states the first and no longer states
     the second; the register is cited on the roadmap claim in the same
     paragraph, so the qualification is one link away rather than in the
     sentence. Yearly re-read: the claim can only strengthen with time. */
  "pq-accounts-running": {
    text: "quantum-safe accounts are already running on Starknet",
    src: "https://www.linkedin.com/posts/starkware_post-quantum-wallets-are-now-live-on-starknet-activity-7445099734052225024-MUUi",
    alsoSrc: ["https://x.com/StarkWareLtd/status/2079955780019864015"],
    checked: "2026-08-21",
    breaks: "2027-08-21",
    says: "And now, S2morrow is live on Starknet Mainnet, using Falcon-512, a NIST-standardized post-quantum signature scheme.",
  },
  /* Section 01's quantum panel, the roadmap half (2026-09-10). The source is
     StarkWare's Quantum Hub migration register, the per-surface register the
     quantum page already cites sixteen times for exactly these statuses; the
     check date is that page's own last read of it. "Updated in real time" is
     a claim about the register itself, so a quarterly re-read is the cadence:
     if the register stops moving, the claim stops being true. */
  "pq-roadmap-public": {
    text: "a committed roadmap to full end-to-end post-quantum security is public and updated in real time",
    src: "https://quantum.starkware.co/migration-register",
    checked: "2026-09-09",
    breaks: "2026-12-09",
    note: "StarkWare Quantum Hub, migration register: the public, per-surface register of Starknet's post-quantum migration, the same source the quantum page's surface rows cite",
  },
  /* The industry's converging deadline: the quantum page's section 01
     names Microsoft, Google and IBM at the same year and links each; its
     countdown counts to js/qday-config.js. The source here is the Google
     Cloud migration timeline the quantum page links (it carries no data-src
     of its own for this claim). The text is filled from the Q-day constant
     at render (src/lib/data/qday.ts). */
  "qday-timeline": {
    text: "around {QDAY_YEAR}",
    src: "https://blog.google/innovation-and-ai/technology/safety-security/cryptography-migration-timeline/",
    checked: "2026-09-08",
    breaks: "2027-01-01",
  },
  /* Section 01's privacy panel and FAQ 5a, one entry for both (2026-09-10).
     OWNER-SOURCED. The repository does not hold a sourced fee comparison to
     point at: privacy.html's .fx-table scores seven criteria (multi-asset,
     no secrets, compliance, fast, programmable, DeFi, ecosystem) and price
     is not one of them, and the two fee figures that do appear there live in
     cell tooltips with no data-src of their own (STRK20's "about $0.12",
     which is js/fee-config.js re-stated, and RAILGUN's "0.25% fee each
     way"). A comparative superlative needs the other side of the comparison
     measured, and nothing in the repository measures it, so this rests on
     the owner until a public comparison exists. Ninety days. */
  "privacy-cheapest-fees": {
    text: "the cheapest privacy fees on the market",
    src: "owner",
    checked: "2026-09-10",
    breaks: "2026-12-09",
    note: "owner-sourced comparative claim; replace with a public comparison when available",
  },
  /* APP REVENUE on the hero band: chain-level app revenue for Starknet from
     growthepie's app_fees_usd export (CC BY 4.0), the trailing 365 days, the
     same figure and window the strk dashboard renders. The dashboard keeps
     its own credit on the chart's source line; it has no perishable-registry
     entry of its own, so this is the site's one entry for the claim. */
  "app-revenue-365d": {
    text: "App revenue, 365D",
    src: "https://api.growthepie.com/v1/export/app_revenue.json",
    checked: "2026-09-08",
    breaks: "2026-12-08",
    says: "growthepie, app_fees_usd for Starknet, CC BY 4.0",
  },
} satisfies Record<string, PerishableClaim>;

export type PerishableKey = keyof typeof PERISHABLE;
