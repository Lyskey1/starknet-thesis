"use client";

import { animated, config, useSpring } from "@react-spring/web";
import { useId, useLayoutEffect, useRef, useState } from "react";

import type { FaqCopy } from "@/data/home";
import type { FaqClaims } from "@/utils/seo/faq-structured-data";

/**
 * An answer may carry two inline forms: `[label](https://...)` renders a body
 * link, `[[key]]` renders a registered perishable claim with its source and
 * check date as data attributes; everything else is text. The JSON-LD
 * generator reduces the same forms to plain text
 * (src/utils/seo/faq-structured-data.ts), so the schema and the rows read
 * one string.
 */
const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\[\[([a-z0-9-]+)\]\]/g;
const renderAnswer = (text: string, claims: FaqClaims) => {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[3]) {
      const c = claims[m[3]];
      if (c) out.push(
        <span key={m.index} className="th-claim" data-perishable="third-party" data-src={c.src} data-checked={c.checked} data-breaks={c.breaks}>
          {c.text}
        </span>,
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

interface FaqItemProps {
  question: string;
  answer: string;
  claims: FaqClaims;
  open: boolean;
  onToggle: () => void;
}

/**
 * One accordion row. Height is sprung, not transitioned, so the panel is
 * measured before paint and the first open never flashes; the `+` marker
 * turns into an `x` on open. `ReducedMotion` at the app root flips
 * react-spring's global skipAnimation, so both jump under reduced motion.
 */
const FaqItem = ({ question, answer, claims, open, onToggle }: FaqItemProps) => {
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
  }, [answer]);

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
      <animated.div id={id} role="region" className="lp-faq-a" style={reveal} aria-hidden={!open}>
        <div ref={panelRef}>
          <p>{renderAnswer(answer, claims)}</p>
        </div>
      </animated.div>
    </li>
  );
};

export interface FaqSectionProps {
  copy: FaqCopy;
  kicker: string;
  claims: FaqClaims;
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
            question={item.question}
            answer={item.answer}
            claims={claims}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </ul>
    </section>
  );
};
