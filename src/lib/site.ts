/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { publicEnv } from "@/env";

export const siteConfig = {
  name: "Starknet Thesis: Privacy, Quantum Security, BTCFi",
  description: "An independent thesis on Starknet's three differentiators: private transfers via STRK20, a post-quantum proving system, and Bitcoin staking and DeFi (BTCFi).",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: publicEnv.NEXT_PUBLIC_SITE_URL ?? "https://starknetthesis.io",
  /** Default Open Graph / Twitter share image (path under `public/`). */
  ogImage: "/assets/og-default.png",
  twitterHandle: "@Lyskey",
  author: "Lyskey",
  /** Browser theme-color (address bar / PWA). Matches `--void` / the orb backdrop. */
  themeColor: "#0d0d0d",
} as const;
