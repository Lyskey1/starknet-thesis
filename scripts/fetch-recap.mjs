// Build-time recap fetcher for the Recap page.
//
//   node scripts/fetch-recap.mjs
//
// Hits Substack's (unofficial) paginated archive API DIRECTLY — Node has no CORS
// restriction, so there's no proxy to rate-limit us. Unlike the RSS feed (capped to
// the latest posts), the archive API returns the FULL history. The result is written
// to data/recap.json, which digest.html then loads as a plain same-origin fetch.
//
// Pagination:
//   • sequential, ~400ms between pages (gentle on Substack)
//   • the offset advances by the NUMBER OF ITEMS RETURNED, not a fixed +50 — Substack's
//     first page is short (offset 0 limit 50 returns 23, not 50), so a fixed step would
//     skip posts. Advancing by count visits every offset (0, 23, 73, …) with no gaps.
//   • the ONLY stop condition is a page that returns an EMPTY array (the true end)
//   • a failed page is retried up to 4× with exponential backoff before giving up

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data');
const OUT = path.join(OUT_DIR, 'recap.json');

const SUBSTACK = 'https://starknetresearch.substack.com/';
const ARCHIVE = SUBSTACK + 'api/v1/archive?sort=new&limit=50&offset=';
const PAGE_DELAY = 400;                        // ms between successful pages
const BACKOFFS_MS = [1000, 2000, 4000, 8000];  // retry a failed page up to 4× (1s, 2s, 4s, 8s)
const TIMEOUT_MS = 20000;                      // per-request hard timeout

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One HTTP attempt for a given offset. Throws on any non-OK / bad-shape / timeout.
async function fetchOnce(offset) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ARCHIVE + offset, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Fetch one page, retrying up to BACKOFFS_MS.length times with exponential backoff.
async function fetchPage(offset) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(offset);
    } catch (err) {
      if (attempt >= BACKOFFS_MS.length) {
        throw new Error(`offset ${offset} failed after ${BACKOFFS_MS.length} retries: ${err.message}`);
      }
      const wait = BACKOFFS_MS[attempt];
      console.log(`  offset ${offset} failed (${err.message}); retry ${attempt + 1}/${BACKOFFS_MS.length} in ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
}

// Keep only the fields the cards need.
function pick(post) {
  return {
    title: post.title || '(untitled)',
    canonical_url: post.canonical_url || (post.slug ? SUBSTACK + 'p/' + post.slug : SUBSTACK),
    post_date: post.post_date || post.published_at || post.date || null,
    subtitle: post.subtitle || '',
    description: post.description || post.truncated_body_text || '',
    cover_image: post.cover_image || '',
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const all = [];
  const seen = new Set();
  let offset = 0;
  let pages = 0;

  console.log('Fetching the Starknet Research archive directly from Substack…\n');

  while (true) {
    const list = await fetchPage(offset);
    if (!list.length) {
      console.log(`  offset ${offset} → 0 posts (end of archive)`);
      break;
    }
    let added = 0;
    for (const p of list) {
      const key = p.canonical_url || p.id || ((p.slug || '') + (p.post_date || ''));
      if (!seen.has(key)) {
        seen.add(key);
        all.push(pick(p));
        added++;
      }
    }
    pages++;
    console.log(`  offset ${offset} → ${list.length} posts (${added} new, ${all.length} total)`);
    offset += list.length; // advance by items actually returned (first page is short)
    await sleep(PAGE_DELAY);
  }

  // newest → oldest
  all.sort((a, b) => new Date(b.post_date || 0) - new Date(a.post_date || 0));

  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`\nSaved ${all.length} posts to ${path.relative(ROOT, OUT)}  (${pages} pages fetched).`);
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
