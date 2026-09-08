/**
 * The landing's perishable-claims registry (2026-09-08), the quantum page's
 * contract (Q_PERISHABLE) in the landing's module form.
 *
 * A perishable claim is a statement that is true today and can stop being
 * true: it carries the source it was checked against (data-src), the day a
 * HUMAN last re-read that source (data-checked) and a break date, the day
 * the claim must be re-verified before it may keep rendering as-is. The
 * component renders the three as data attributes on the claim's span; a
 * client effect flags a claim past its break date (data-stale), so a lapsed
 * check is visible in the DOM rather than silently trusted. Re-verify and
 * move the dates HERE, never in the markup.
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
} satisfies Record<string, PerishableClaim>;

export type PerishableKey = keyof typeof PERISHABLE;
