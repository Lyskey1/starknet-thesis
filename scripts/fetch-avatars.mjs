// One-off avatar fetcher for the Ecosystem page.
//
//   node scripts/fetch-avatars.mjs
//
// Reads every handle from the ecosystem data (all categories in ecosystem.html)
// and downloads each profile image to assets/avatars/<handle>.jpg.
//
// Designed to be GENTLE so it finishes without tripping unavatar's rate limit:
//   • one request at a time (no parallelism), ~5.5s between handles
//   • on HTTP 429, exponential backoff (30s, 60s, 120s, 120s) and retry the same
//     handle up to 4 times before giving up
//   • resumable: handles whose assets/avatars/<handle>.jpg already exists are skipped,
//     so you can stop (Ctrl-C) and re-run anytime
//
// Uses `?fallback=false` so unavatar returns a real 404 instead of a generic
// placeholder — that's how we tell a genuine miss apart from a rate-limit.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'ecosystem.html');
const OUT = path.join(ROOT, 'assets', 'avatars');

const DELAY_MS = 5500;                       // gap between handles
const SOURCE_GAP_MS = 600;                   // gap between the two sources of one handle
const MIN_BYTES = 512;                       // smaller than this isn't a real image
const BACKOFFS_MS = [30000, 60000, 120000, 120000]; // 429 backoff schedule (up to 4 retries)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pull every handle out of ecosystem.html and flatten + de-dupe them. Two forms
// are supported: the shorthand `handles:[ 'a', 'b' ]` lists used by the People
// categories, and the full account objects `{ "handle": "a", … }` used by the
// Projects categories (exported from the editor).
function extractHandles(html) {
  const handles = new Set();
  const re = /handles:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(html))) {
    const hre = /'([^']+)'|"([^"]+)"/g;
    let h;
    while ((h = hre.exec(m[1]))) handles.add((h[1] || h[2]).trim());
  }
  const hre = /["']handle["']\s*:\s*["']([^"']+)["']/g;
  let h;
  while ((h = hre.exec(html))) handles.add(h[1].trim());
  return [...handles];
}

function sourcesFor(handle) {
  const e = encodeURIComponent(handle);
  return [
    `https://unavatar.io/x/${e}?fallback=false`,
    `https://unavatar.io/twitter/${e}?fallback=false`,
  ];
}

// One HTTP attempt. Returns { buf } on a real image, { rateLimited:true } on 429,
// or { miss:true } on a genuine 404 / non-image.
async function fetchOnce(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.status === 429) return { rateLimited: true };
    if (!res.ok) return { miss: true };
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return { miss: true };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_BYTES) return { miss: true };
    return { buf };
  } catch {
    return { miss: true };
  }
}

// Fetch one handle: try each source; on 429 back off and retry the WHOLE handle
// (up to BACKOFFS_MS.length times). A genuine 404 from every source is not retried.
async function fetchHandle(handle) {
  const sources = sourcesFor(handle);
  for (let attempt = 0; ; attempt++) {
    let sawRateLimit = false;
    for (const src of sources) {
      const r = await fetchOnce(src);
      if (r.buf) return { buf: r.buf, via: src.includes('/x/') ? 'x' : 'twitter' };
      if (r.rateLimited) { sawRateLimit = true; break; } // stop; back off the whole handle
      await sleep(SOURCE_GAP_MS); // genuine miss → try next source
    }
    if (!sawRateLimit) return { reason: 'no image (404)' };       // genuine miss, no retry
    if (attempt >= BACKOFFS_MS.length) return { reason: 'rate-limited (429)' };
    const wait = BACKOFFS_MS[attempt];
    console.log(`        rate-limited (429); waiting ${wait / 1000}s, retry ${attempt + 1}/${BACKOFFS_MS.length}…`);
    await sleep(wait);
  }
}

async function main() {
  const html = fs.readFileSync(HTML, 'utf8');
  const handles = extractHandles(html);
  fs.mkdirSync(OUT, { recursive: true });

  const total = handles.length;
  console.log(`Found ${total} handles. Writing to ${path.relative(ROOT, OUT)}/  (gentle mode)\n`);

  let downloaded = 0, skipped = 0;
  const failed = [];

  for (let i = 0; i < total; i++) {
    const h = handles[i];
    const tag = `[${i + 1}/${total}]`;
    const dest = path.join(OUT, `${h}.jpg`);

    // Resume: already have it → skip.
    if (fs.existsSync(dest) && fs.statSync(dest).size >= MIN_BYTES) {
      skipped++;
      console.log(`${tag} skipped @${h} (already have it)`);
      continue;
    }

    const res = await fetchHandle(h);
    if (res.buf) {
      fs.writeFileSync(dest, res.buf);
      downloaded++;
      console.log(`${tag} downloaded @${h} (${res.via}, ${(res.buf.length / 1024).toFixed(0)} KB)`);
    } else {
      failed.push(h);
      console.log(`${tag} FAILED @${h} (${res.reason})`);
    }

    if (i < total - 1) await sleep(DELAY_MS);
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log(`Done. ${downloaded} downloaded, ${skipped} skipped (already had), ${failed.length} failed  (of ${total} total).`);
  if (failed.length) {
    console.log(`\nFailed handles (re-run to retry, or drop a JPG into assets/avatars/<handle>.jpg manually):`);
    console.log('  ' + failed.join(', '));
  }
}

main();
