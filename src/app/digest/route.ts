import fs from "node:fs";
import path from "node:path";

import { loadDigest } from "@/lib/data/digest";

/**
 * /digest (2026-09-08): the static page public/digest.html, served here so
 * its three hero counts can follow the Substack feed without a deploy. The
 * file is read as built (scripts/build-digest.js stamped its static cards
 * and counts from the committed archive); the three [data-count] figures
 * are re-stamped from the same merged data the landing reads, with the
 * build script's own replacement, and the response is regenerated hourly.
 * The card block stays the build's ten newest.
 */
export const revalidate = 3600;

const FILE = path.join(process.cwd(), "public", "digest.html");

export async function GET() {
  let html = fs.readFileSync(FILE, "utf8");
  const d = await loadDigest();
  const COUNTS: Record<string, number> = {
    "weekly-roundups": d.weeklyRoundups,
    "monthly-recaps": d.monthlyRecaps,
    "research-articles": d.researchArticles,
  };
  for (const key of Object.keys(COUNTS)) {
    html = html.replace(
      new RegExp("(<[^>]*\\bdata-count=\"" + key + "\"[^>]*>)[^<]*(</)", "g"),
      `$1${COUNTS[key].toLocaleString("en-US")}$2`,
    );
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "x-digest-source": d.source,
    },
  });
}
