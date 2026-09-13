/**
 * The ecosystem data module, read at build time from the same file the
 * ecosystem page fetches at runtime (public/data/ecosystem.json).
 *
 * The counts mirror public/js/eco-globe.js exactly, and off the same field:
 * an account's TYPE is the top-level category key it sits under in
 * ecosystem.json, and that key is the only thing separating a project from a
 * person on either page. The globe splits the ten keys into six project
 * categories (official, defi, consumer, nft, appchains, tooling) and four
 * people categories (starkware, snf, builders, shitposter), counts each
 * side, and prints them as PROJECTS and VOICES. The two lists below are
 * those two, so moving one entry between categories moves the ecosystem
 * page's globe count and the landing's signals card together.
 *
 * Order inside a category is the data order, never re-sorted: the owner pins
 * accounts by dragging them to the head of their category, so the first
 * entry of each category is that category's pinned account.
 */
import ecosystem from "../../../public/data/ecosystem.json";
import featured from "../../../public/data/landing-featured.json";

export interface EcosystemAccount {
  name: string;
  handle: string;
  url: string;
  description: string;
  avatar?: string;
}

type EcosystemData = Record<string, EcosystemAccount[] | undefined>;

/** The project half of eco-globe.js's split, same list, same order. */
export const PROJECT_CATEGORIES = [
  "official",
  "defi",
  "consumer",
  "nft",
  "appchains",
  "tooling",
] as const;

/** The people half of the same split: the globe's VOICES. */
export const VOICE_CATEGORIES = ["starkware", "snf", "builders", "shitposter"] as const;

const data = ecosystem as EcosystemData;

const accountsIn = (categories: readonly string[]): EcosystemAccount[] =>
  categories.flatMap((key) => data[key] ?? []);

export const projectAccounts = (): EcosystemAccount[] => accountsIn(PROJECT_CATEGORIES);
export const voiceAccounts = (): EcosystemAccount[] => accountsIn(VOICE_CATEGORIES);

/** The number the ecosystem page's globe shows as PROJECTS. */
export const projectsTracked = (): number => projectAccounts().length;

/** The number the ecosystem page's globe shows as VOICES. */
export const voicesTracked = (): number => voiceAccounts().length;

/**
 * The pinned head of each project category, in category order: one logo
 * per category, six in all. `avatar` follows the ecosystem page's own
 * resolution chain as far as a build can go: the account's avatar field,
 * else the local mirror at assets/avatars/<handle>.jpg. The monogram
 * fallback is applied at runtime by the image's error handler.
 */
export const pinnedProjects = (): (EcosystemAccount & { src: string; monogram: string })[] =>
  PROJECT_CATEGORIES.map((key) => (data[key] ?? [])[0])
    .filter((account): account is EcosystemAccount => Boolean(account))
    .map((account) => ({
      ...account,
      src: account.avatar && !account.avatar.startsWith("data:")
        ? `/${account.avatar}`
        : `/assets/avatars/${encodeURIComponent(account.handle)}.jpg`,
      monogram: monogramFor(account.name),
    }));

/**
 * The landing's featured six, from public/data/landing-featured.json (slugs =
 * ecosystem handles, slot order preserved), resolved against every category
 * of ecosystem.json and run through the same avatar chain as pinnedProjects.
 * A slug missing from the data is dropped, never invented.
 */
export const landingFeaturedProjects = (): (EcosystemAccount & { src: string; monogram: string })[] => {
  const all = Object.values(data).flatMap((list) => list ?? []);
  return (featured as { handles: string[] }).handles
    .map((handle) => all.find((account) => account.handle.toLowerCase() === handle.toLowerCase()))
    .filter((account): account is EcosystemAccount => Boolean(account))
    .map((account) => ({
      ...account,
      src: account.avatar && !account.avatar.startsWith("data:")
        ? `/${account.avatar}`
        : `/assets/avatars/${encodeURIComponent(account.handle)}.jpg`,
      monogram: monogramFor(account.name),
    }));
};

/** The ecosystem page's initials rule: first letters of the first two words. */
export const monogramFor = (name: string): string => {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  const first = words[0]?.charAt(0) ?? "";
  const second = words[1]?.charAt(0) ?? words[0]?.charAt(1) ?? "";
  return (first + second).toUpperCase();
};
