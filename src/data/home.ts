/**
 * Copy for the Starknet Thesis landing. Passed in via props — never imported
 * directly by a component.
 */

export interface StatusCopy { label: string; detail: string; scrollHint: string; }

export interface LoaderCopy {
  brand: string; brandDetail: string; bootLabel: string; bootState: string;
  initializing: string; loading: string; coordinates: string; version: string;
}

export interface FaqCopy {
  eyebrow: string; title: string;
  items: { question: string; answer: string }[];
}

export interface FooterCopy {
  wordmark: string; tagline: string;
  columns: { heading: string; links: { label: string; href: string }[] }[];
  legal?: string;
}

export const homeLoader: LoaderCopy = {
  brand: "STARKNET THESIS",
  brandDetail: "THREE FORCES / ONE CHAIN",
  bootLabel: "BOOT SEQUENCE",
  bootState: "● INIT",
  initializing: "INITIALIZING PRIVACY POOL",
  loading: "LOADING PROOFS",
  coordinates: "PRIVACY / QUANTUM / BTCFI",
  version: "v4.0 — one ticker",
};

export const homeFaq: FaqCopy = {
  eyebrow: "05 — QUESTIONS",
  title: "Frequently asked",
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
        "Governments, Big Tech and researchers are converging on the same timeline for when quantum computers break today's elliptic-curve cryptography. Most chains will have to migrate. Starknet's proofs are hash-based, which is post-quantum by construction, with a committed roadmap to full end-to-end post-quantum security.",
    },
    {
      question: "What does BTCFi actually mean here?",
      answer:
        "Turning idle BTC into productive, programmable capital on Starknet: lending, yield and settlement for the largest asset in crypto, without leaving Bitcoin's security behind. Bitcoin is the best asset to hold. It is time to make it the best to use.",
    },
    {
      question: "Where does STRK come in?",
      answer:
        "STRK secures the network and captures the demand the thesis creates. Every one of the three narratives routes value through the same asset. Read the STRK page for the utilities and the numbers.",
    },
    {
      question: "Who writes this, and is it financial advice?",
      answer:
        "Starknet Thesis is an independent, educational project by Lyskey. It is not financial advice and is not affiliated with or endorsed by StarkWare. Always do your own research.",
    },
  ],
};

export const homeFooter: FooterCopy = {
  wordmark: "Starknet Thesis",
  tagline: "Three forces, one chain, one ticker. The independent thesis on how Starknet makes crypto private, quantum-resistant and productive.",
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
      heading: "Follow",
      links: [
        { label: "Ecosystem", href: "/ecosystem" },
        { label: "Digest", href: "/digest" },
        { label: "Newsletter", href: "https://starknetresearch.substack.com" },
      ],
    },
    {
      heading: "Connect",
      links: [
        { label: "X / Twitter", href: "https://x.com/Lyskey" },
        { label: "Network status", href: "https://status.starknet.io/" },
        { label: "llms.txt", href: "/llms.txt" },
      ],
    },
  ],
  legal:
    "Website made for educational purposes only. This is not financial advice. Always DYOR. A personal project, not affiliated with or endorsed by StarkWare. All views expressed here are my own.",
};
