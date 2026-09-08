/**
 * The digest data module, read at build time from the same file
 * scripts/build-digest.js stamps the digest page from
 * (public/data/recap.json, the Substack archive).
 *
 * The three functions below are the build script's own rules, copied
 * verbatim so the landing and the digest page cannot disagree:
 *   - classify(): "monthly recap" in the title is a monthly, "roundup" is a
 *     weekly, anything else is research;
 *   - weekly roundups = the HIGHEST roundup number, a double issue
 *     ("roundup 219-220") counting by the range's end, because the archive
 *     starts at roundup 51 and an entry count would undercount twice over;
 *   - monthly recaps = the entry count.
 * The latest issue is the newest post by date, the first card the digest
 * page renders; its cover is the Substack CDN URL the digest page hotlinks.
 */
import recap from "../../../public/data/recap.json";

export interface RecapPost {
  title: string;
  canonical_url?: string;
  post_date?: string;
  published_at?: string;
  date?: string;
  subtitle?: string;
  description?: string;
  cover_image?: string;
  slug?: string;
}

const posts = recap as RecapPost[];

export type DigestKind = "monthly" | "weekly" | "research";

export const classify = (title: string): DigestKind => {
  const t = (title || "").toLowerCase();
  if (t.indexOf("monthly recap") !== -1) return "monthly";
  if (t.indexOf("roundup") !== -1) return "weekly";
  return "research";
};

export const digestCounts = () => {
  let weeklyRoundups = 0;
  let monthlyRecaps = 0;
  let researchArticles = 0;
  for (const p of posts) {
    const kind = classify(p.title);
    if (kind === "weekly") {
      const m = /roundup\s*#?\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(p.title || "");
      if (m) weeklyRoundups = Math.max(weeklyRoundups, +(m[2] || m[1]));
    } else if (kind === "monthly") {
      monthlyRecaps++;
    } else {
      researchArticles++;
    }
  }
  return { weeklyRoundups, monthlyRecaps, researchArticles };
};

const postDate = (p: RecapPost) => Date.parse(p.post_date || p.published_at || p.date || "") || 0;

/** The newest issue: title, link and the Substack cover the digest page shows. */
export const latestIssue = () => {
  const latest = [...posts].sort((a, b) => postDate(b) - postDate(a))[0];
  if (!latest) return null;
  const SUBSTACK_URL = "https://starknetresearch.substack.com/";
  return {
    title: latest.title,
    href: latest.canonical_url || (latest.slug ? SUBSTACK_URL + "p/" + latest.slug : SUBSTACK_URL),
    cover: latest.cover_image || null,
    date: latest.post_date || latest.published_at || latest.date || null,
  };
};
