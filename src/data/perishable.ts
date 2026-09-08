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
  /* Post-quantum accounts on Mainnet: quantum's Head Start tab 03 claim,
     same source, same check date, same quote (public/quantum.html, the
     .th-claim in the data-ch="2" panel). The claim can only strengthen with
     time; the break date is a yearly re-read. */
  "pq-accounts-mainnet": {
    text: "already run on Mainnet",
    src: "https://www.linkedin.com/posts/starkware_post-quantum-wallets-are-now-live-on-starknet-activity-7445099734052225024-MUUi",
    checked: "2026-08-21",
    breaks: "2027-08-21",
    says: "And now, S2morrow is live on Starknet Mainnet, using Falcon-512, a NIST-standardized post-quantum signature scheme.",
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
} satisfies Record<string, PerishableClaim>;

export type PerishableKey = keyof typeof PERISHABLE;
