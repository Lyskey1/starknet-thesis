/**
 * The digest data module (2026-09-08).
 *
 * Data flow, three steps:
 *   1. scripts/fetch-recap.mjs (CI, or by hand) writes the committed archive
 *      public/data/recap.json from Substack (RSS merge in CI, the archive API
 *      for a full rebuild). scripts/build-digest.js stamps digest.html's
 *      static cards and counts from that file at build.
 *   2. loadDigest() below, at build and on every ISR revalidation of the
 *      landing (src/app/page.tsx, revalidate 3600), fetches the Substack RSS
 *      feed and merges its new items onto recap.json, additions only, keyed
 *      on the canonical URL without query or trailing slash, exactly as the
 *      script's merge mode does; the feed failing falls back to the JSON.
 *   3. /digest is served by src/app/digest/route.ts (revalidate 3600), which
 *      re-stamps the three [data-count] figures in public/digest.html from
 *      the same merged data, so a published issue moves both pages' counts
 *      within the hour with no deploy.
 *
 * The rules below are the build script's, copied verbatim so the landing and
 * the digest page cannot disagree: classify() (monthly recap, roundup, else
 * research, the digest page's "Research" filter), weekly roundups = the
 * HIGHEST roundup number (a double issue counts by its range end), monthly
 * recaps and research articles = entry counts.
 */
import recap from "../../../public/data/recap.json";

export interface RecapPost {
  title: string;
  canonical_url?: string;
  post_date?: string | null;
  published_at?: string;
  date?: string;
  subtitle?: string;
  description?: string;
  cover_image?: string;
  slug?: string;
}

const committed = recap as RecapPost[];

const SUBSTACK = "https://starknetresearch.substack.com/";
const FEED = SUBSTACK + "feed";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 8000;

export type DigestKind = "monthly" | "weekly" | "research";

export const classify = (title: string): DigestKind => {
  const t = (title || "").toLowerCase();
  if (t.indexOf("monthly recap") !== -1) return "monthly";
  if (t.indexOf("roundup") !== -1) return "weekly";
  return "research";
};

/* ---- the fetch script's RSS parser, verbatim ---- */
function decodeEntities(v: string) {
  return String(v)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function xmlField(block: string, tag: string) {
  const m = block.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  if (!m) return "";
  let v = m[1].trim();
  const cd = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cd) v = cd[1];
  return decodeEntities(v).trim();
}
export const normUrl = (u: string | undefined) => String(u || "").split("?")[0].replace(/\/+$/, "");

async function fetchFeed(): Promise<RecapPost[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(FEED, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const posts = items.map((b) => {
      const enc = b.match(/<enclosure[^>]*url="([^"]+)"/i);
      const d = new Date(xmlField(b, "pubDate"));
      const desc = xmlField(b, "description");
      return {
        title: xmlField(b, "title") || "(untitled)",
        canonical_url: normUrl(xmlField(b, "link")),
        post_date: isNaN(d.getTime()) ? null : d.toISOString(),
        subtitle: desc,
        description: desc,
        cover_image: enc ? decodeEntities(enc[1]) : "",
      } as RecapPost;
    }).filter((p) => p.canonical_url);
    if (!posts.length) throw new Error("RSS feed parsed to zero entries");
    return posts;
  } finally {
    clearTimeout(timer);
  }
}

const postDate = (p: RecapPost) => Date.parse(p.post_date || p.published_at || p.date || "") || 0;

export interface DigestData {
  weeklyRoundups: number;
  monthlyRecaps: number;
  researchArticles: number;
  entries: number;
  latest: { title: string; href: string; cover: string | null; date: string | null } | null;
  /** "feed+json" when the live feed merged, "json" when the committed file stood alone. */
  source: "feed+json" | "json";
  freshFromFeed: number;
}

export const countsOf = (posts: RecapPost[]) => {
  let weeklyRoundups = 0, monthlyRecaps = 0, researchArticles = 0;
  for (const p of posts) {
    const kind = classify(p.title);
    if (kind === "weekly") {
      const m = /roundup\s*#?\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(p.title || "");
      if (m) weeklyRoundups = Math.max(weeklyRoundups, +(m[2] || m[1]));
    } else if (kind === "monthly") monthlyRecaps++;
    else researchArticles++;
  }
  return { weeklyRoundups, monthlyRecaps, researchArticles };
};

const latestOf = (posts: RecapPost[]) => {
  const latest = [...posts].sort((a, b) => postDate(b) - postDate(a))[0];
  if (!latest) return null;
  return {
    title: latest.title,
    href: latest.canonical_url || (latest.slug ? SUBSTACK + "p/" + latest.slug : SUBSTACK),
    cover: latest.cover_image || null,
    date: latest.post_date || latest.published_at || latest.date || null,
  };
};

/** The committed file alone (synchronous; the fallback and the build script's view). */
export const digestCounts = () => countsOf(committed);
export const latestIssue = () => latestOf(committed);

/** The live view: the feed merged onto the committed file, or the file alone. */
export async function loadDigest(): Promise<DigestData> {
  let posts = committed;
  let source: DigestData["source"] = "json";
  let freshFromFeed = 0;
  try {
    const have = new Set(committed.map((p) => normUrl(p.canonical_url)));
    const fresh = (await fetchFeed()).filter((p) => !have.has(normUrl(p.canonical_url)));
    posts = committed.concat(fresh);
    source = "feed+json";
    freshFromFeed = fresh.length;
  } catch {
    /* the feed is unreachable from this build or runner: the committed archive stands */
  }
  return { ...countsOf(posts), entries: posts.length, latest: latestOf(posts), source, freshFromFeed };
}
