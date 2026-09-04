#!/usr/bin/env node
/* Static pre-render of the digest list, plus the page's live counts.

   Runs automatically on every Vercel deploy (vercel.json buildCommand →
   `npm run build`), so production always ships a fresh static block and
   fresh numbers. Running it manually (`node scripts/build-digest.js`) is
   only needed for LOCAL PREVIEW after updating data/recap.json.

   CI-safe: exits non-zero with a loud message if recap.json is missing,
   malformed, empty, or if the markers are gone from digest.html. A broken
   data file blocks the deploy instead of shipping a broken digest.

   TWO JOBS:

   1. STATIC BLOCK. Reads data/recap.json, renders the 10 most recent entries
   with EXACTLY the markup the client-side renderer in digest.html produces:
   same classes, so the same styles apply. The only intentional difference is
   a semantic <time datetime> element for the date, where the client renderer
   emits a <div>; both are the card's last child so they land in the same
   place. Rewrites everything between <!-- STATIC-DIGEST:START --> and
   <!-- STATIC-DIGEST:END --> in digest.html.

   2. DIGEST COUNTS. Every count the page displays is derived from
   data/recap.json here, never hand-edited, so the numbers advance on their
   own as the workflow merges new posts:
     - weekly-roundups: the HIGHEST roundup number parsed from the weekly
       titles ("Starknet roundup 233", "Starknet roundup 219-220" → 220).
       A count of weekly ENTRIES would be wrong twice over: double issues
       are one entry for two roundups, and the Substack archive only starts
       at roundup 51 (the earlier ones predate the publication), so the
       issue numbering is the real published total.
     - monthly-recaps: the count of entries titled "monthly recap". The
       numbering and the entry count agree here (the archive holds every
       recap from #1), and the build fails loudly if they ever diverge.
   The values are stamped into every element carrying a data-count
   attribute; the numbers committed in digest.html are only the last stamp.

   Idempotent: running it twice produces the same file. On load, the page's
   JS replaces the whole static block with the full hydrated archive; without
   JS, these 10 entries stay readable. No dependencies. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const DATA = path.join(ROOT, 'data', 'recap.json');
const PAGE = path.join(ROOT, 'digest.html');
const START = '<!-- STATIC-DIGEST:START -->';
const END = '<!-- STATIC-DIGEST:END -->';
const N = 10;

/* ---- mirrors of the client renderer's helpers (keep in sync with digest.html) ---- */
const SUBSTACK_URL = 'https://starknetresearch.substack.com/';
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_LABELS = { monthly: 'Monthly digest', weekly: 'Weekly digest', research: 'Research' };
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escA = s => esc(s).replace(/"/g,'&quot;');
function classify(title){
  const t = (title || '').toLowerCase();
  if (t.indexOf('monthly recap') !== -1) return 'monthly';
  if (t.indexOf('roundup') !== -1) return 'weekly';
  return 'research';
}
const fmtDate = d => MN[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();

function cardHTML(post){
  const d = new Date(post.post_date || post.published_at || post.date || 0);
  const title = post.title || '(untitled)';
  const link = post.canonical_url || (post.slug ? SUBSTACK_URL + 'p/' + post.slug : SUBSTACK_URL);
  const cover = post.cover_image || '';
  const cat = classify(title);
  const dateHtml = isNaN(d.getTime()) || !d.getTime() ? '' :
    '<time class="dgw-date" datetime="' + d.toISOString().slice(0, 10) + '">' + esc(fmtDate(d)) + '</time>';
  return '<a class="recap-card dgw-card" data-umami-event="digest-entry-click" data-cat="' + cat + '" href="' + escA(link) + '" target="_blank" rel="noopener">' +
    '<span class="recap-cover dgw-cover">' + (cover ? '<img src="' + escA(cover) + '" loading="lazy" alt="">' : '') + '</span>' +
    '<span class="dgw-top">' +
      '<span class="dgw-cat">' + CAT_LABELS[cat] + '</span>' +
    '</span>' +
    '<span class="dgw-title">' + esc(title) + ' <span class="dgw-ext" aria-hidden="true">↗</span></span>' +
    dateHtml +
  '</a>';
}

/* ---- CI validation: fail the build loudly rather than ship a broken digest ---- */
function die(msg){ console.error('build-digest FAILED: ' + msg); process.exit(1); }
if (!fs.existsSync(DATA)) die('data/recap.json not found');
if (!fs.existsSync(PAGE)) die('digest.html not found');
let raw;
try { raw = JSON.parse(fs.readFileSync(DATA, 'utf8')); }
catch (e) { die('data/recap.json is not valid JSON: ' + e.message); }
if (!Array.isArray(raw) || raw.length === 0) die('data/recap.json must be a non-empty array (got ' + (Array.isArray(raw) ? 'empty array' : typeof raw) + ')');
const bad = raw.findIndex(p => !p || typeof p !== 'object' || !(p.title || p.canonical_url || p.slug));
if (bad !== -1) die('data/recap.json entry #' + bad + ' has neither title nor a resolvable URL');

const posts = raw
  .slice()
  .sort((a, b) => new Date(b.post_date || b.published_at || b.date || 0) - new Date(a.post_date || a.published_at || a.date || 0))
  .slice(0, N);
if (posts.length === 0) die('no posts to render');

/* ---- the displayed counts, derived from the same data (see the header) ---- */
let weeklyRoundups = 0;   // highest roundup number in the archive's titles
let monthlyRecaps = 0;    // count of monthly recap entries
let monthlyMaxNum = 0;    // highest recap number, cross-check only
for (const p of raw) {
  const cat = classify(p.title);
  if (cat === 'weekly') {
    // "roundup 233" and the double issues "roundup 219-220" both parse; the
    // range's END is the number the issue ran to
    const m = /roundup\s*#?\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(p.title || '');
    if (m) weeklyRoundups = Math.max(weeklyRoundups, +(m[2] || m[1]));
  } else if (cat === 'monthly') {
    monthlyRecaps++;
    const m = /recap\s*#\s*(\d+)/i.exec(p.title || '');
    if (m) monthlyMaxNum = Math.max(monthlyMaxNum, +m[1]);
  }
}
if (!weeklyRoundups) die('no roundup number could be parsed from any weekly title');
if (!monthlyRecaps) die('no monthly recap entries in data/recap.json');
if (monthlyMaxNum && monthlyMaxNum !== monthlyRecaps)
  die('monthly recap numbering (#' + monthlyMaxNum + ') and entry count (' + monthlyRecaps + ') disagree: a recap is missing from or duplicated in the data');

const COUNTS = { 'weekly-roundups': weeklyRoundups, 'monthly-recaps': monthlyRecaps };

const block = START +
  '\n    <!-- Pre-rendered from data/recap.json: regenerated automatically on deploy (npm run build). Run node scripts/build-digest.js for local preview. -->\n    ' +
  posts.map(cardHTML).join('\n    ') + '\n    ' + END;

let page = fs.readFileSync(PAGE, 'utf8');
const si = page.indexOf(START), ei = page.indexOf(END);
if (si < 0 || ei < 0 || ei < si) die('STATIC-DIGEST markers not found (or reversed) in digest.html');
page = page.slice(0, si) + block + page.slice(ei + END.length);

/* stamp every data-count element; each key must hit at least once, so a
   reworded page that drops a marker fails the build instead of shipping a
   number that silently stops advancing */
for (const key of Object.keys(COUNTS)) {
  let hits = 0;
  page = page.replace(
    new RegExp('(<[^>]*\\bdata-count="' + key + '"[^>]*>)[^<]*(</)', 'g'),
    (_, open, close) => { hits++; return open + COUNTS[key] + close; }
  );
  if (!hits) die('no data-count="' + key + '" element found in digest.html');
}

fs.writeFileSync(PAGE, page);
console.log('digest.html: static block rebuilt with ' + posts.length + ' entries (latest: ' + (posts[0] && posts[0].title) + ')');
console.log('digest.html: counts stamped: weekly-roundups ' + weeklyRoundups + ', monthly-recaps ' + monthlyRecaps);
