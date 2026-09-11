/**
 * Copy for the Starknet Thesis landing. Passed in via props, never imported
 * directly by a component: every sentence the page says lives here, and no
 * section types one inline.
 *
 * Prose fields are plain strings carrying three inline forms, rendered by
 * src/utils/inline-copy.tsx and reduced to plain text by the JSON-LD
 * generator, so the schema and the page read one string:
 *
 *   [label](https://host/path)   an external body link, new tab
 *   [label](/path)               an internal route link, same tab
 *   [[key]]                      a registered perishable claim
 *                                (src/data/perishable.ts, filled by the view)
 *
 * No figure is typed here. A stat line carries its CAPTION only; the number
 * itself is derived at build from the file the thesis page derives it from
 * (src/lib/data), and a missing source hides its line.
 */
import { FOLLOW_LINKS } from "@/lib/links";

export interface FaqCopy {
  eyebrow: string; title: string;
  items: { question: string; answer: string }[];
}

/** One section 01 panel: the copy column of the object-selector triptych. */
export interface PanelCopy {
  /** the rail tile's name, and the panel's identity */
  tab: string;
  heading: string;
  body: string;
  /** the derived stat's caption, omitted where the panel carries no stat */
  statLabel?: string;
  close: string;
  link: { label: string; href: string };
}

export interface ProblemsCopy {
  /** the h2, split where it must not wrap */
  title: { lead: string; nowrap: string };
  panels: [PanelCopy, PanelCopy, PanelCopy];
}

export interface TickerCopy {
  title: string;
  body: string;
  link: { label: string; href: string };
}

/** One signals card. `mono` is a format string; `{n}` and `{m}` are counts. */
export interface SignalCardCopy {
  heading: string;
  blurb: string;
  mono: string;
  link: { label: string; href: string };
}

export interface FooterCopy {
  wordmark: string; tagline: string;
  columns: { heading: string; links: { label: string; href: string }[] }[];
  legal?: string;
}

/**
 * Section 01, the three problems, in nav order. Each panel states the
 * problem and then the answer; the perishable tokens are the wording that
 * carries a source and a check date.
 *
 * OWNER COPY PASS, 2026-09-10: the three bodies below are owner-approved and
 * shipped verbatim. Two of them changed what the page asserts, not only how
 * it reads:
 *  - privacy now claims "the cheapest privacy fees on the market", a
 *    comparative superlative. It is registered as an owner-sourced claim
 *    with a ninety-day break date, because the repository holds no sourced
 *    fee comparison to rest it on.
 *  - quantum now says accounts "are already running", and no longer carries
 *    the sentence that existing accounts do not change by themselves. The
 *    migration register that says so is cited on the roadmap claim in the
 *    same paragraph. See src/data/perishable.ts, "pq-accounts-running".
 */
export const homeProblems: ProblemsCopy = {
  title: { lead: "All three, answered ", nowrap: "on one chain." },
  panels: [
    {
      tab: "Privacy",
      heading: "Every wallet is a public ledger.",
      body:
        "Every interaction on a blockchain is public, and until now there was no other choice: " +
        "balances, counterparties, salaries and strategies, visible to anyone, forever. Starknet " +
        "makes it optional: real onchain privacy for any asset and any use case, " +
        "[[privacy-cheapest-fees]], deep DeFi integration and composability, shielding in a few " +
        "seconds, accessible straight from the wallet UI, with a compliance path from day one.",
      statLabel: "Per private transfer",
      close: "Live on Mainnet today.",
      link: { label: "Read Privacy", href: "/privacy" },
    },
    {
      tab: "Quantum",
      heading: "Quantum will break most chains.",
      body:
        "Every major chain signs with elliptic-curve cryptography, and a working quantum computer " +
        "breaks it. While most chains will have to migrate everything, Starknet has already done " +
        "most of the work: its proofs are hash-based, which is post-quantum by construction, " +
        "account abstraction lets a wallet migrate in a single transaction, and " +
        "[[pq-accounts-running]]. For the rest, [[pq-roadmap-public]].",
      statLabel: "STRK per post-quantum account tx",
      close: "Starknet has been waiting for it.",
      link: { label: "Read Quantum", href: "/quantum" },
    },
    {
      tab: "BTCFi",
      heading: "The biggest asset, barely used.",
      body:
        "Bitcoin is [[btc-largest-asset]] and most of it sits idle. Starknet built the perfect " +
        "ecosystem for it: native staking, lending and borrowing, swaps, perps, options and yield, " +
        "with BTC as collateral throughout.",
      // no stat line: the btcfi page's BTC figures live in an inline fetch engine
      // with an inline seed, not in a data module this build can read
      close: "Starknet puts it to work.",
      link: { label: "Read BTCFi", href: "/btcfi" },
    },
  ],
};

/**
 * Section 02, the ticker. Heading and link are unchanged by the 2026-09-10
 * owner copy pass; the body is owner-approved and shipped verbatim. It names
 * the three narratives in the page's own order and then says what STRK does
 * with them: secure, pay (gas and privacy fees alike), govern.
 */
export const homeTicker: TickerCopy = {
  title: "The thesis, in a single asset.",
  body:
    "Onchain privacy, Bitcoin put to work in DeFi, and quantum resistance as the long-term bet: " +
    "all three run on Starknet, and STRK is the asset that captures all of it. It secures the " +
    "network, pays the fees, gas and privacy fees alike, and governs the protocol. Put simply, " +
    "STRK captures the demand the thesis creates.",
  link: { label: "What STRK does across the network", href: "/strk" },
};

/**
 * Section 03, the two signal cards. Both mono lines are count templates:
 * `{key}` is filled from the data module the matching page is built from,
 * never typed. .lp-mono uppercases them in CSS, so the case written here is
 * only the source's own; the ecosystem line is quoted from the owner's copy
 * pass (2026-09-10) as written.
 *
 * The ecosystem line's two counts are the two halves of one split: an
 * account's category key in public/data/ecosystem.json is what separates a
 * project from a person, on the ecosystem page's globe and here alike
 * (src/lib/data/ecosystem.ts). Editing that file moves both pages.
 */
export const homeSignals: { ecosystem: SignalCardCopy; digest: SignalCardCopy } = {
  ecosystem: {
    heading: "Ecosystem",
    blurb: "The builders and projects worth following.",
    mono: "{n} PROJECTS TRACKED \u00b7 {m} VOICES",
    link: { label: "Explore the ecosystem", href: "/ecosystem" },
  },
  digest: {
    heading: "Digest",
    blurb: "Starknet's shipping, recapped every week and every month.",
    mono: "{w} weekly roundups \u00b7 {m} monthly recaps \u00b7 {r} research articles",
    link: { label: "Read the digest", href: "/digest" },
  },
};

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
      /* the fee claim is the SAME registry entry section 01's privacy panel
         renders, not a second one: one owner-sourced claim, one break date,
         one place to re-verify it (src/data/perishable.ts). */
      answer:
        "STRK20 is a privacy pool on Starknet itself, for any token and any use case, powered by ZK proofs. It has [[privacy-cheapest-fees]], deep DeFi integration and composability, shielding and unshielding in a few seconds, and it is accessible straight from the wallet UI.",
    },
    {
      question: "Why does quantum matter for a blockchain today?",
      /* the year is the Q-day constant the quantum page counts down from
         (public/js/qday-config.js through src/lib/data/qday.ts), filled into
         the claim's text by the view; nothing here types it. */
      answer:
        "Governments, Big Tech and researchers are converging on the same timeline, [[qday-timeline]], for when quantum computers break today's elliptic-curve cryptography. While most chains will have to migrate everything, Starknet has already done most of the work: its proofs are hash-based, which is post-quantum by construction, account abstraction allows wallets to migrate in a single transaction, and [[pq-accounts-running]]. For the rest, [[pq-roadmap-public]].",
    },
    {
      question: "What does BTCFi actually mean here?",
      answer:
        "Turning idle BTC into working capital on Starknet: lend and borrow against it, earn yield on it, stake it to secure the network, trade it for cents, and shield it when you want privacy.",
    },
    {
      question: "Where does STRK come in?",
      answer:
        "STRK secures the network through staking, pays for gas and for privacy fees, and governs the protocol. Every one of the three narratives routes value through the same asset. Read [the STRK page](/strk) for the utilities and the numbers.",
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
