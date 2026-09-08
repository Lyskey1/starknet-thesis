import type { FaqCopy } from "@/data/home";
import type { PerishableClaim } from "@/data/perishable";

/** The registered claims an answer may reference as `[[key]]`. */
export type FaqClaims = Record<string, PerishableClaim>;

/**
 * FAQPage JSON-LD, generated from the same FAQ array the accordion renders
 * (src/data/home.ts homeFaq), so the two cannot disagree. Emit once on the
 * landing route inside a `<script type="application/ld+json">`.
 */
export function getFaqStructuredData(faq: FaqCopy, claims: FaqClaims = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: plainText(item.answer, claims) },
    })),
  };
}

/** `[label](url)` inline links read as their label, `[[key]]` claims as their text. */
export const plainText = (answer: string, claims: FaqClaims = {}) =>
  answer
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, key: string) => claims[key]?.text ?? "");
