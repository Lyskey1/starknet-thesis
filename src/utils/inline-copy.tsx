import Link from "next/link";

import type { PerishableClaim } from "@/data/perishable";

/** The registered claims a copy string may reference as `[[key]]`. */
export type InlineClaims = Record<string, PerishableClaim>;

/**
 * The landing's inline copy forms. Copy lives as plain strings in
 * src/data/home.ts; three forms inside a string become elements here, and
 * everything else is text:
 *
 *   [label](https://host/path)   an external body link, new tab
 *   [label](/path)               an internal route link, same tab, next/link
 *   [[claim-key]]                a registered perishable claim, rendered with
 *                                its source and its dates as data attributes
 *
 * One renderer for every section, so a paragraph reads the same whether the
 * FAQ accordion or a section 01 panel renders it, and the JSON-LD generator
 * reduces the same three forms to plain text
 * (src/utils/seo/faq-structured-data.ts).
 */
export const INLINE_TOKEN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)|\[\[([a-z0-9-]+)\]\]/g;

/**
 * One registered claim, as the audit reads it. `data-perishable` follows the
 * source: an owner-sourced claim is marked "owner" (the quantum page's
 * convention), anything with a URL behind it is "third-party". A claim that
 * rests on more than one source carries the rest in `data-src-also`; a
 * client effect flags a claim past `data-breaks` as `data-stale`
 * (src/views/home/problems/problems-engine.tsx).
 */
export const ClaimSpan = ({ claim }: { claim: PerishableClaim }) => (
  <span
    className="th-claim"
    data-perishable={claim.src === "owner" ? "owner" : "third-party"}
    data-src={claim.src}
    data-checked={claim.checked}
    data-breaks={claim.breaks}
    data-says={claim.says}
    data-src-also={claim.alsoSrc?.join(" ")}
    data-note={claim.note}
  >
    {claim.text}
  </span>
);

export const renderInline = (text: string, claims: InlineClaims = {}): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_TOKEN)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[3]) {
      const claim = claims[m[3]];
      if (claim) out.push(<ClaimSpan key={m.index} claim={claim} />);
    } else if (m[2].startsWith("/")) {
      out.push(
        <Link key={m.index} className="lp-a" href={m[2]}>
          {m[1]}
        </Link>,
      );
    } else {
      out.push(
        <a key={m.index} className="lp-a" href={m[2]} target="_blank" rel="noopener noreferrer">
          {m[1]}
        </a>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};
