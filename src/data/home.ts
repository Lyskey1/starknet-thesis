/**
 * Copy for the Starknet Thesis landing. Passed in via props, never imported
 * directly by a component.
 */
import { FOLLOW_LINKS } from "@/lib/links";

export interface FaqCopy {
  eyebrow: string; title: string;
  /** Answers are plain text with two inline forms: `[label](https://url)` renders a
   *  body link; `[[key]]` renders a registered perishable claim (src/data/perishable.ts,
   *  filled by the view), for wording that carries a source and a check date. */
  items: { question: string; answer: string }[];
}

export interface FooterCopy {
  wordmark: string; tagline: string;
  columns: { heading: string; links: { label: string; href: string }[] }[];
  legal?: string;
}

export const homeFaq: FaqCopy = {
  eyebrow: "Frequently asked",
  title: "Frequently asked.",
  items: [
    {
      question: "What is the Starknet thesis, in one line?",
      answer:
        "Privacy, quantum resistance and Bitcoin put to work are three separate multi-billion-dollar markets. Starknet is the only chain that sits in all three at once, and STRK is the claim on that intersection.",
    },
    {
      question: "How is privacy on Starknet different from a mixer?",
      answer:
        "STRK20 is a privacy pool on Starknet itself, for any token and any use case, powered by ZK proofs. Entry escrows a viewing key that the proof enforces; by default it does nothing, and under a verified lawful request it can unwind one user's trail while the rest of the pool stays sealed. Private, not invisible.",
    },
    {
      question: "Why does quantum matter for a blockchain today?",
      answer:
        "Governments, Big Tech and researchers are converging on the same timeline, [[qday-timeline]], for when quantum computers break today's elliptic-curve cryptography. Most chains will have to migrate. Starknet's proofs are hash-based, which is post-quantum by construction, with a committed roadmap to full end-to-end post-quantum security.",
    },
    {
      question: "What does BTCFi actually mean here?",
      answer:
        "Turning idle BTC into working capital on Starknet: lend and borrow against it, earn yield on it, stake it to secure the network, trade it for cents, and shield it when you want privacy.",
    },
    {
      question: "Where does STRK come in?",
      answer:
        "STRK secures the network and captures the demand the thesis creates. Every one of the three narratives routes value through the same asset. Read the STRK page for the utilities and the numbers.",
    },
    {
      question: "Who writes this, and is it financial advice?",
      answer:
        "Starknet Thesis is an independent, educational project by [Lyskey](https://x.com/Lyskey). It is not financial advice and is not affiliated with or endorsed by StarkWare. Always do your own research.",
    },
  ],
};

export const homeFooter: FooterCopy = {
  wordmark: "Starknet Thesis",
  // the banner headline owns "Three forces, one chain, one ticker.", said
  // once per viewport; the identity block carries only the descriptive line
  tagline: "The independent thesis on how Starknet makes crypto private, quantum-resistant and productive.",
  columns: [
    {
      heading: "Thesis",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Quantum", href: "/quantum" },
        { label: "BTCFi", href: "/btcfi" },
        { label: "STRK", href: "/strk" },
      ],
    },
    {
      heading: "Signals",
      links: [
        { label: "Ecosystem", href: "/ecosystem" },
        { label: "Digest", href: "/digest" },
      ],
    },
    {
      heading: "Follow",
      // one source with the nav icons: src/lib/links.ts
      links: [...FOLLOW_LINKS],
    },
    // CONNECT went with the 2026-09 footer grid: /llms.txt keeps being
    // served, only its footer link went.
  ],
  legal:
    "Website made for educational purposes only. This is not financial advice. Always DYOR. A personal project, not affiliated with or endorsed by StarkWare. All views expressed here are my own.",
};
