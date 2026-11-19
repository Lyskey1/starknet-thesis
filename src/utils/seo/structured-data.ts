/**
 * @fileoverview JSON-LD structured data helpers.
 *
 * Structured data lets search engines understand the site as entities
 * (Organization, WebSite) rather than just text, improving rich results.
 * Render the output inside a `<script type="application/ld+json">` tag.
 */

import { siteConfig } from "@/lib/site";

/**
 * Organization + Person + WebSite + WebPage schema for the site root. Emit once, in the root
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
        // The author, as the static pages in public/ already publish it
        // (same @id, same fields), so the seven pages name one entity.
        "@type": "Person",
        "@id": `${siteConfig.url}/#lyskey`,
        name: siteConfig.author,
        url: "https://x.com/Lyskey",
        sameAs: [
          "https://x.com/Lyskey",
          "https://starknetresearch.substack.com/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        // The site's name, not the landing title: Google reads this node for
        // the site name it prints in results. Same string on the static pages.
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.rootUrl,
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "WebPage",
        "@id": `${siteConfig.url}/#webpage`,
        url: siteConfig.rootUrl,
        name: siteConfig.defaultTitle,
        description: siteConfig.description,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        author: { "@id": `${siteConfig.url}/#lyskey` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en",
      },
    ],
  };
}
