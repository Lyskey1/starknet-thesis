/**
 * @fileoverview JSON-LD structured data helpers.
 *
 * Structured data lets search engines understand the site as entities
 * (Organization, WebSite) rather than just text, improving rich results.
 * Render the output inside a `<script type="application/ld+json">` tag.
 */

import { siteConfig } from "@/lib/site";

/**
 * Organization + WebSite schema for the site root. Emit once, in the root
 * layout. The two nodes are linked by `@id` so crawlers treat them as related.
 */
export function getSiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        // The publishing entity, not the page title. Must match the
        // `#organization` node emitted by the static pages in public/.
        name: "Starknet Thesis",
        url: siteConfig.rootUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.url}/apple-icon-180x180.png`,
          width: 180,
          height: 180,
        },
        sameAs: [
          "https://x.com/Lyskey",
          "https://starknetresearch.substack.com/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.defaultTitle,
        description: siteConfig.description,
        url: siteConfig.rootUrl,
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en",
      },
    ],
  };
}
