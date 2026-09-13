"use client";

import { animated, config, useSpring } from "@react-spring/web";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState } from "react";

import type { FaqCopy, FaqItemCopy } from "@/data/home";
import { renderInline, type InlineClaims } from "@/utils/inline-copy";

/**
 * An answer carries the landing's three inline copy forms, rendered by the
 * shared renderer (src/utils/inline-copy.tsx): an external body link, an
 * internal route link, and a registered perishable claim with its source and
 * check date as data attributes. The JSON-LD generator reduces the same
 * forms to plain text (src/utils/seo/faq-structured-data.ts), so the schema
 * and the rows read one string.
 */

interface FaqItemProps extends FaqItemCopy {
  claims: InlineClaims;
  open: boolean;
  onToggle: () => void;
}

/**
 * One accordion row. Height is sprung, not transitioned, so the panel is
 * measured before paint and the first open never flashes; the `+` marker
 * turns into an `x` on open. `ReducedMotion` at the app root flips
 * react-spring's global skipAnimation, so both jump under reduced motion.
 *
 * An answer whose subject has a page of its own ends with that page's link,
 * in section 01's CTA grammar (.lp-link, mono caps and a chevron). The
 * target comes from the item's own data, never from the component.
 *
 * KEYBOARD: a collapsed panel is animated to height 0, which does NOT take
 * its links out of the tab order, so a closed answer's CTA would otherwise
 * be reachable by Tab and would scroll the page to an invisible target. The
 * panel carries `inert` while closed, which drops the whole subtree from
 * both the tab order and the accessibility tree, and `aria-hidden` stays for
 * anything that does not implement inert. Opening clears both in the same
 * commit that starts the spring, so the CTA is tabbable as soon as the row
 * opens.
 */
const FaqItem = ({ question, answer, cta, claims, open, onToggle }: FaqItemProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const id = useId();

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => setHeight(panel.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [answer, cta]);

  const reveal = useSpring({ height: open ? height : 0, opacity: open ? 1 : 0, config: config.gentle });
  const marker = useSpring({ rotate: open ? 45 : 0, config: config.stiff });

  return (
    <li>
      <h3 className="lp-faq-h">
        <button type="button" className="lp-faq-q" onClick={onToggle} aria-expanded={open} aria-controls={id}>
          <span>{question}</span>
          <animated.span aria-hidden className="lp-faq-m" style={marker}>
            <span className="lp-faq-m1" />
            <span className="lp-faq-m2" />
          </animated.span>
        </button>
      </h3>
      <animated.div id={id} role="region" className="lp-faq-a" style={reveal} aria-hidden={!open} inert={!open}>
        <div ref={panelRef}>
          <p>{renderInline(answer, claims)}</p>
          {cta && (
            <Link className="lp-link" href={cta.href}>{cta.label}</Link>
          )}
        </div>
      </animated.div>
    </li>
  );
};

export interface FaqSectionProps {
  copy: FaqCopy;
  kicker: string;
  claims: InlineClaims;
}

/**
 * Section 04, frequently asked: six compact rows, the accordion kept (the one
 * place it is the right pattern), the first row open, about half a viewport.
 */
export const FaqSection = ({ copy, kicker, claims }: FaqSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section className="lp-sec lp-faq" id="faq" aria-labelledby="frequently-asked">
      <p className="lp-kicker">{kicker}</p>
      <h2 className="lp-h2" id="frequently-asked">{copy.title}</h2>
      <ul>
        {copy.items.map((item, index) => (
          <FaqItem
            key={item.question}
            {...item}
            claims={claims}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </ul>
    </section>
  );
};
