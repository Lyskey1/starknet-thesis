// Digest data fetcher — two modes:
//
//   node scripts/fetch-recap.mjs           MERGE mode (default; what CI runs)
//   node scripts/fetch-recap.mjs --full    FULL archive mode (manual/local)
//
// MERGE: fetches the publication's RSS feed (<substack>/feed — designed for
// machine consumption, so it isn't bot-blocked the way the archive API is on
// GitHub runner IPs) and MERGES new entries into data/recap.json: posts whose
// URL isn't already present are added; existing entries are never modified or
// deleted. Zero parsed entries = hard failure (exit 1); zero NEW entries is a
// clean no-op. RSS only carries the latest ~20 posts, which is plenty for a
// daily merge on top of the committed archive baseline.
//
// FULL: hits Substack's (unofficial) paginated archive API directly for the
// complete history — kept for manual local rebuilds (it 403s from CI IPs).
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
// CI routes the feed through a Cloudflare Worker proxy (Substack 403s runner
// IPs even for RSS): FEED_URL overrides the target, FEED_PROXY_KEY (if set)
// is sent as the x-proxy-key header. Local runs default to the direct feed.
const FEED = process.env.FEED_URL || (SUBSTACK + 'feed');
const FEED_PROXY_KEY = process.env.FEED_PROXY_KEY || '';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
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
      headers: { 'User-Agent': UA, Accept: 'application/json' },
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

  // CI guard: an empty archive means Substack changed/failed — fail loudly
  // rather than writing an empty file for downstream steps to trip over.
  if (!all.length) throw new Error('archive returned zero posts — refusing to write an empty recap.json');

  // newest → oldest
  all.sort((a, b) => new Date(b.post_date || 0) - new Date(a.post_date || 0));

  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`\nSaved ${all.length} posts to ${path.relative(ROOT, OUT)}  (${pages} pages fetched).`);
}

// ============================ MERGE MODE (RSS) ============================
function decodeEntities(v) {
  return String(v)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function xmlField(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
  if (!m) return '';
  let v = m[1].trim();
  const cd = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cd) v = cd[1];
  return decodeEntities(v).trim();
}
// URLs compared without query/trailing slash so utm-tagged feed links still
// match the archive's canonical_url values
function normUrl(u) { return String(u || '').split('?')[0].replace(/\/+$/, ''); }

async function fetchRssOnce() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers = { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' };
    if (FEED_PROXY_KEY) headers['x-proxy-key'] = FEED_PROXY_KEY;
    const res = await fetch(FEED, { signal: ctrl.signal, headers: headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRss() {
  let xml;
  for (let attempt = 0; ; attempt++) {  // same backoff policy as the archive pages
    try { xml = await fetchRssOnce(); break; }
    catch (err) {
      if (attempt >= BACKOFFS_MS.length) throw new Error(`RSS feed failed after ${BACKOFFS_MS.length} retries: ${err.message}`);
      const wait = BACKOFFS_MS[attempt];
      console.log(`  feed fetch failed (${err.message}); retry ${attempt + 1}/${BACKOFFS_MS.length} in ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const posts = items.map((b) => {
    const enc = b.match(/<enclosure[^>]*url="([^"]+)"/i);
    const d = new Date(xmlField(b, 'pubDate'));
    const desc = xmlField(b, 'description');
    return {                                  // exact same shape as pick()
      title: xmlField(b, 'title') || '(untitled)',
      canonical_url: normUrl(xmlField(b, 'link')),
      post_date: isNaN(d.getTime()) ? null : d.toISOString(),
      subtitle: desc,
      description: desc,
      cover_image: enc ? decodeEntities(enc[1]) : '',
    };
  }).filter((p) => p.canonical_url);
  if (!posts.length) throw new Error('RSS feed parsed to zero entries — an empty feed is an error, not a state');
  return posts;
}

async function merge() {
  if (!fs.existsSync(OUT)) throw new Error('merge mode needs an existing data/recap.json baseline (run with --full once)');
  let existing;
  try { existing = JSON.parse(fs.readFileSync(OUT, 'utf8')); }
  catch (e) { throw new Error('existing data/recap.json is unreadable: ' + e.message); }
  if (!Array.isArray(existing) || !existing.length) throw new Error('existing data/recap.json is empty or not an array');

  const have = new Set(existing.map((p) => normUrl(p.canonical_url)));
  const rss = await fetchRss();
  const fresh = rss.filter((p) => !have.has(p.canonical_url));
  console.log('RSS: ' + rss.length + ' entries in the feed, ' + fresh.length + ' new.');
  if (!fresh.length) { console.log('data/recap.json unchanged.'); return; }

  // additions only — existing entry objects pass through untouched
  const all = existing.concat(fresh);
  all.sort((a, b) => new Date(b.post_date || 0) - new Date(a.post_date || 0));
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  fresh.forEach((p) => console.log('  + ' + (p.post_date || '').slice(0, 10) + '  ' + p.title));
  console.log('Saved ' + all.length + ' posts to ' + path.relative(ROOT, OUT) + '.');
}

const runner = process.argv.includes('--full') ? main : merge;
runner().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
