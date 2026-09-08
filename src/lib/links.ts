/**
 * The site's outbound destinations, one source (2026-09-08).
 *
 * The header's social icons and the footer's FOLLOW column used to carry
 * these as separate literals; both now read this module. The values are the
 * ones the six static pages' shared header block carries (public/*.html,
 * the `vc-header` block): Discord is the official Starknet community invite
 * as linked from starknet.io, X is the owner's account, Telegram is the
 * Starknet ecosystem group, the newsletter is the Substack.
 */
export const LINKS = {
  newsletter: "https://starknetresearch.substack.com",
  x: "https://x.com/Lyskey",
  discord: "https://discord.gg/starknet-community",
  telegram: "https://t.me/starknet_ecosystem",
} as const;

/** The FOLLOW column, in the order the brief fixes: Newsletter, X, Discord, Telegram. */
export const FOLLOW_LINKS = [
  { label: "Newsletter", href: LINKS.newsletter },
  { label: "X / Twitter", href: LINKS.x },
  { label: "Discord", href: LINKS.discord },
  { label: "Telegram", href: LINKS.telegram },
] as const;
