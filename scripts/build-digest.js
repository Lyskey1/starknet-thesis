#!/usr/bin/env node
/* Static pre-render of the digest list — run `node scripts/build-digest.js`
   after updating data/recap.json (i.e. after `node scripts/fetch-recap.mjs`).

   Reads data/recap.json, renders the 10 most recent entries with EXACTLY the
   markup the client-side renderer in digest.html produces (same classes, so
   the same styles apply — the only intentional difference is a semantic
   <time datetime> element for the date, visually identical because
   .recap-content is a flex column), and rewrites everything between
   <!-- STATIC-DIGEST:START --> and <!-- STATIC-DIGEST:END --> in digest.html.
   Idempotent: running it twice produces the same file. On load, the page's
   JS replaces the whole block with the full hydrated archive; without JS,
   these 10 entries stay readable. No dependencies. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
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
function stripHTML(html){
  return String(html || '').replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/\s+/g, ' ').trim();
}
function excerpt(html, n){
  const t = stripHTML(html);
  if (t.length <= n) return t;
  let cut = t.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  if (sp > 60) cut = cut.slice(0, sp);
  return cut.replace(/[\s,.;:!?\-–—]+$/, '') + '…';
}
const fmtDate = d => MN[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();

function cardHTML(post){
  const d = new Date(post.post_date || post.published_at || post.date || 0);
  const title = post.title || '(untitled)';
  const link = post.canonical_url || (post.slug ? SUBSTACK_URL + 'p/' + post.slug : SUBSTACK_URL);
  const cat = classify(title);
  const ex = excerpt(post.description || post.subtitle || post.truncated_body_text, 180);
  const cover = post.cover_image ? '<div class="recap-cover"><img src="' + escA(post.cover_image) + '" loading="lazy" alt=""></div>' : '';
  const dateHtml = isNaN(d.getTime()) || !d.getTime() ? '' :
    '<time class="recap-date" datetime="' + d.toISOString().slice(0, 10) + '">' + esc(fmtDate(d)) + '</time>';
  return '<a class="recap-card" data-cat="' + cat + '" href="' + escA(link) + '" target="_blank" rel="noopener">' +
    cover +
    '<div class="recap-content">' +
      '<span class="recap-cat ' + cat + '">' + CAT_LABELS[cat] + '</span>' +
      '<h3 class="recap-title">' + esc(title) + '</h3>' +
      dateHtml +
      (ex ? '<p class="recap-excerpt">' + esc(ex) + '</p>' : '') +
    '</div>' +
  '</a>';
}

const posts = JSON.parse(fs.readFileSync(DATA, 'utf8'))
  .slice()
  .sort((a, b) => new Date(b.post_date || b.published_at || b.date || 0) - new Date(a.post_date || a.published_at || a.date || 0))
  .slice(0, N);

const block = START +
  '\n    <!-- Pre-rendered from data/recap.json — regenerate with: node scripts/build-digest.js -->\n    ' +
  posts.map(cardHTML).join('\n    ') + '\n    ' + END;

let page = fs.readFileSync(PAGE, 'utf8');
const si = page.indexOf(START), ei = page.indexOf(END);
if (si < 0 || ei < 0) { console.error('markers not found in digest.html'); process.exit(1); }
page = page.slice(0, si) + block + page.slice(ei + END.length);
fs.writeFileSync(PAGE, page);
console.log('digest.html: static block rebuilt with ' + posts.length + ' entries (latest: ' + (posts[0] && posts[0].title) + ')');
