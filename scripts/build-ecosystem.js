#!/usr/bin/env node
/* Static pre-render of the ecosystem directory.

   Same pattern as build-digest.js, for the same reason: /ecosystem is built
   entirely client side (js/eco-index.js, js/eco-globe.js) from
   data/ecosystem.json, so a crawler that does not run JS (GPTBot, ClaudeBot,
   PerplexityBot, all of which robots.txt and llms.txt court) used to see a
   page with no h1 and about a hundred words of chrome. This writes the real
   directory (every account, its handle as a link, its category and its
   description) plus the page's one h1 into ecosystem.html between
   <!-- STATIC-ECO:START --> and <!-- STATIC-ECO:END -->.

   Runs automatically on every Vercel deploy (vercel.json buildCommand ->
   `npm run build`), after build-digest.js and BEFORE build-search-index.js
   so the search index is built from the regenerated HTML. Running it by hand
   (`node scripts/build-ecosystem.js`) is only needed for LOCAL PREVIEW after
   editing data/ecosystem.json.

   CI-safe: exits non-zero with a loud message if ecosystem.json is missing,
   malformed or empty, or if the markers are gone from ecosystem.html.

   The block lives inside #ecoIndex, the same container eco-index.js renders
   into. On load the script appends its interactive index next to this block
   and marks the block data-enhanced, which clips it (never display:none, the
   text stays in the DOM). Without JS the block is the page: a styled,
   readable list. Idempotent, and emits exactly ONE heading, which carries an
   explicit id, because build-search-index.js aborts on a heading without one.
   No dependencies. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const DATA = path.join(ROOT, 'data', 'ecosystem.json');
const PAGE = path.join(ROOT, 'ecosystem.html');
const START = '<!-- STATIC-ECO:START -->';
const END = '<!-- STATIC-ECO:END -->';

/* The h1 text is the hero title eco-globe.js used to emit as an h2 (copy A);
   the script now emits a non-heading there so this stays the page's only
   heading of rank 1 and nothing is duplicated. */
const H1_ID = 'the-people-building-shaping-starknet';
const H1_TEXT = 'The people building &amp; shaping Starknet';
const KICKER = 'The projects &amp; the voices';

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');

function die(msg) { console.error('build-ecosystem FAILED: ' + msg); process.exit(1); }

if (!fs.existsSync(DATA)) die('data/ecosystem.json not found');
if (!fs.existsSync(PAGE)) die('ecosystem.html not found');

let data;
try { data = JSON.parse(fs.readFileSync(DATA, 'utf8')); }
catch (e) { die('data/ecosystem.json is not valid JSON: ' + e.message); }
if (!data || typeof data !== 'object' || Array.isArray(data)) die('data/ecosystem.json must be an object of category arrays');

let page = fs.readFileSync(PAGE, 'utf8');

/* Category labels come from the DEFAULTS block already embedded in
   ecosystem.html (same source build-search-index.js reads), so the static
   list and the interactive one always name a category the same way. Any
   category present in the JSON but absent there falls back to its id,
   capitalized: a new category can never silently drop out of the list. */
function labelsFromPage(src) {
  const out = {};
  const re = /"id":\s*"([^"]+)",\s*"group":\s*"[^"]*",\s*"label":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = m[2];
  return out;
}
const LABELS = labelsFromPage(page);
const labelFor = id => LABELS[id] || (id.charAt(0).toUpperCase() + id.slice(1));

const cats = Object.keys(data).filter(k => Array.isArray(data[k]) && data[k].length);
if (!cats.length) die('data/ecosystem.json has no non-empty category arrays');

const expected = cats.reduce((n, c) => n + data[c].length, 0);

function itemHTML(acc, catLabel) {
  if (!acc || typeof acc !== 'object') return '';
  const handle = String(acc.handle || '').replace(/^@/, '');
  const name = acc.name || (handle ? '@' + handle : '');
  if (!name && !handle) return '';
  const url = acc.url || (handle ? 'https://x.com/' + handle : '');
  const linked = url
    ? '<a class="ixs-name" href="' + escA(url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>'
    : '<span class="ixs-name">' + esc(name) + '</span>';
  const desc = acc.description ? '<span class="ixs-desc">' + esc(acc.description) + '</span>' : '';
  return '<li class="ixs-item">' + linked +
    '<span class="ixs-cat">' + esc(catLabel) + '</span>' + desc + '</li>';
}

let count = 0;
const groups = cats.map(function (cat) {
  const label = labelFor(cat);
  const items = data[cat].map(function (acc) {
    const html = itemHTML(acc, label);
    if (html) count++;
    return html;
  }).filter(Boolean).join('');
  return '<div class="ixs-group"><p class="es-kicker">' + esc(label) + '</p><ul class="ixs-list">' + items + '</ul></div>';
}).join('');

if (count === 0) die('no accounts rendered');
if (count !== expected) die('rendered ' + count + ' accounts but the data holds ' + expected + ' (an entry is missing a name and a handle)');

const block = START +
  '\n  <!-- Pre-rendered from data/ecosystem.json: regenerated automatically on deploy (npm run build); run node scripts/build-ecosystem.js for local preview.\n' +
  '       js/eco-index.js appends its interactive index beside this block and marks it data-enhanced (clipped, still in the DOM). Without JS this IS the directory. -->\n' +
  '  <div class="ixs" id="eco-directory">' +
    '<div class="ix-head"><p class="es-kicker">' + KICKER + '</p>' +
    '<h1 id="' + H1_ID + '">' + H1_TEXT + '</h1></div>' +
    groups +
  '</div>\n  ' + END;

const si = page.indexOf(START), ei = page.indexOf(END);
if (si < 0 || ei < 0 || ei < si) die('STATIC-ECO markers not found (or reversed) in ecosystem.html');
page = page.slice(0, si) + block + page.slice(ei + END.length);

/* ---- the ld+json ItemList: regenerated from the same data (2026-09-05) ----
   The directory's structured data used to be a hand-maintained blob and
   silently rotted (it still carried pre-reorder positions and retired
   handles). Rebuild the #directory ItemList's numberOfItems and
   itemListElement from data/ecosystem.json on every run, so the structured
   data can never disagree with the page again. Project categories emit
   Organization items, the people categories Person items, matching the
   original markup. */
const PEOPLE_CATS = ['starkware', 'snf', 'builders', 'shitposter'];
const LD_RE = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/;
const ldMatch = page.match(LD_RE);
if (!ldMatch) die('ld+json block not found in ecosystem.html');
let graph;
try { graph = JSON.parse(ldMatch[2]); }
catch (e) { die('ld+json block is not valid JSON: ' + e.message); }
const dir = (graph['@graph'] || []).find(n => n['@id'] === 'https://starknetthesis.io/ecosystem#directory');
if (!dir) die('#directory ItemList not found in the ld+json graph');
let pos = 0;
dir.itemListElement = cats.flatMap(cat => data[cat].map(acc => {
  const handle = String(acc.handle || '').replace(/^@/, '');
  pos += 1;
  const item = {
    '@type': PEOPLE_CATS.indexOf(cat) !== -1 ? 'Person' : 'Organization',
    name: handle || String(acc.name || '').replace(/^@/, ''),
    url: acc.url || ('https://x.com/' + handle),
  };
  if (acc.description) item.description = acc.description;
  item.sameAs = [item.url];
  return { '@type': 'ListItem', position: pos, item };
}));
dir.numberOfItems = pos;
page = page.replace(LD_RE, ldMatch[1] + JSON.stringify(graph) + ldMatch[3]);

fs.writeFileSync(PAGE, page);
console.log('ecosystem.html: static block rebuilt with ' + count + ' accounts across ' + cats.length + ' categories; ld+json ItemList regenerated (' + pos + ' items)');
