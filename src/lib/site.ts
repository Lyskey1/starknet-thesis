/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { publicEnv } from "@/env";

const siteOrigin = publicEnv.NEXT_PUBLIC_SITE_URL ?? "https://starknetthesis.io";

export const siteConfig = {
  /** Short brand name. Used for og:site_name and the Organization node. */
  name: "Starknet Thesis",
  /** Full landing page title. Also the name of the WebSite JSON-LD node. */
  defaultTitle: "Starknet Thesis: Privacy, Quantum Security, BTCFi",
  description: "An independent thesis on Starknet's three differentiators: private transfers via STRK20, a post-quantum proving system, and Bitcoin staking and DeFi (BTCFi).",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: siteOrigin,
  /**
   * Site root with a trailing slash, matching sitemap.xml and the static
   * pages JSON-LD. Use for the bare `url` fields in JSON-LD. Canonical and
   * og:url are not affected: Next normalises those to the `trailingSlash`
   * setting in next.config, which strips the slash.
   */
  rootUrl: `${siteOrigin}/`,
  /** Default Open Graph / Twitter share image (path under `public/`). */
  ogImage: "/assets/og-default.png",
  twitterHandle: "@Lyskey",
  author: "Lyskey",
  /** Browser theme-color (address bar / PWA). Matches `--void` / the orb backdrop. */
  themeColor: "#0d0d0d",
} as const;
