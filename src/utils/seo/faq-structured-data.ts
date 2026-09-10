import type { FaqCopy } from "@/data/home";
import type { InlineClaims } from "@/utils/inline-copy";

/** The registered claims an answer may reference as `[[key]]`. */
export type FaqClaims = InlineClaims;

/**
 * FAQPage JSON-LD, generated from the same FAQ array the accordion renders
 * (src/data/home.ts homeFaq), so the two cannot disagree. Emit once on the
 * landing route inside a `<script type="application/ld+json">`.
 */
export function getFaqStructuredData(faq: FaqCopy, claims: InlineClaims = {}) {
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

/**
 * The inline forms reduced to text: `[label](url)` and `[label](/path)` read
 * as their label, `[[key]]` claims as their registered text. Both link forms
 * are matched here, so an internal route link cannot leak its href into the
 * schema (src/utils/inline-copy.tsx renders the same two).
 */
export const plainText = (answer: string, claims: InlineClaims = {}) =>
  answer
    .replace(/\[([^\]]+)\]\((?:https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, "$1")
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, key: string) => claims[key]?.text ?? "");
