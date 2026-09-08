import type { FaqCopy } from "@/data/home";

/**
 * FAQPage JSON-LD, generated from the same FAQ array the accordion renders
 * (src/data/home.ts homeFaq), so the two cannot disagree. Emit once on the
 * landing route inside a `<script type="application/ld+json">`.
 */
export function getFaqStructuredData(faq: FaqCopy) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
