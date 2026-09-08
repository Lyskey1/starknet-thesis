/**
 * The ecosystem data module, read at build time from the same file the
 * ecosystem page fetches at runtime (public/data/ecosystem.json).
 *
 * The count mirrors public/js/eco-globe.js exactly: "projects" are the six
 * project categories flattened (official, defi, consumer, nft, appchains,
 * tooling); the four people categories are "voices" and are not counted
 * here. Order inside a category is the data order, never re-sorted: the
 * owner pins accounts by dragging them to the head of their category, so
 * the first entry of each category is that category's pinned account.
 */
import ecosystem from "../../../public/data/ecosystem.json";

export interface EcosystemAccount {
  name: string;
  handle: string;
  url: string;
  description: string;
  avatar?: string;
}

type EcosystemData = Record<string, EcosystemAccount[] | undefined>;

/** The same list, in the same order, as eco-globe.js. */
export const PROJECT_CATEGORIES = [
  "official",
  "defi",
  "consumer",
  "nft",
  "appchains",
  "tooling",
] as const;

const data = ecosystem as EcosystemData;

export const projectAccounts = (): EcosystemAccount[] =>
  PROJECT_CATEGORIES.flatMap((key) => data[key] ?? []);

/** The number the ecosystem page's globe shows as PROJECTS. */
export const projectsTracked = (): number => projectAccounts().length;

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

/** The ecosystem page's initials rule: first letters of the first two words. */
export const monogramFor = (name: string): string => {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  const first = words[0]?.charAt(0) ?? "";
  const second = words[1]?.charAt(0) ?? words[0]?.charAt(1) ?? "";
  return (first + second).toUpperCase();
};
