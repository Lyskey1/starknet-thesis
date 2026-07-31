#!/usr/bin/env node
/* Build-time search index for starknetthesis.io.
   Run from the Vercel buildCommand (npm run build) alongside build-digest.js:
   never hand-maintained, never stale — every publish is a commit, every
   commit rebuilds, so the index refreshes itself on publish.

   Writes data/search-index.json: one entry per addressable content surface
   across the 7 public pages plus the published data files (news.json,
   ecosystem.json, btcfi-ecosystem.json, recap.json).

   Out of scope BY DESIGN: live metric VALUES, chart series, and anything
   fetched after load — a number that changes on every fetch cannot live in
   a build-time index. Metric LABELS, definitions and sources are indexed
   instead, so a query like "app revenue" lands on the right panel even
   though the number is live.

   Excluded and ASSERTED (build fails if any of these leak into the output):
   nav, footer, every admin/editor affordance (they live in JS string
   literals and in the hidden #ecoModal markup), reference/ mockups, and
   script contents generally (two whitelisted literal extractions aside:
   the btcfi timeline milestones and the strk CEX directory, which are
   static published copy that happens to live in JS arrays).

   --write-ids: adds id attributes to headings and cards that lack an
   anchor, deriving stable slugs from their text. Existing ids are never
   renamed. Run once and commit; the normal build only reads. */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'search-index.json');
const WRITE_IDS = process.argv.includes('--write-ids');

const PAGES = [
  { file: 'index.html', page: 'index', label: 'Home' },
  { file: 'privacy.html', page: 'privacy', label: 'Privacy' },
  { file: 'quantum.html', page: 'quantum', label: 'Quantum' },
  { file: 'btcfi.html', page: 'btcfi', label: 'BTCFi' },
  { file: 'strk.html', page: 'strk', label: 'STRK' },
  { file: 'ecosystem.html', page: 'ecosystem', label: 'Ecosystem' },
  { file: 'digest.html', page: 'digest', label: 'Digest' },
];

/* Admin/editor strings that must NEVER appear in the public index. The
   build hard-fails if any of them do. Kept lowercase; matched folded. */
const FORBIDDEN = [
  'edit news', 'edit ecosystem', 'edit account', 'done editing',
  'copy json', 'import json', 'publish key', 'unsaved local draft',
  'reset to published', 'discard draft', 'add card', 'add item',
  'delete this card', 'publishing…', 'news_publish_key', 'admin_gate',
  'edit sources', 'upload logo',
];

const BODY_CAP = 240;

/* ---------------- tiny tolerant HTML tree parser ---------------- */
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function parseHTML(src) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null, start: 0 };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
  let m, last = 0;
  while ((m = re.exec(src))) {
    if (m.index > last && cur.tag !== 'script' && cur.tag !== 'style') {
      cur.children.push({ tag: '#text', text: src.slice(last, m.index), start: last, parent: cur });
    }
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) { // closing tag
      let n = cur;
      while (n && n.tag !== m[1].toLowerCase()) n = n.parent;
      if (n) { n.end = re.lastIndex; cur = n.parent || root; }
      continue;
    }
    const tag = m[2].toLowerCase();
    if (cur.tag === 'script' || cur.tag === 'style') continue; // raw text until close
    const attrs = {};
    (m[3] || '').replace(/([\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g,
      (_, k, v, dq, sq) => { attrs[k.toLowerCase()] = dq != null ? dq : sq != null ? sq : (v || ''); return ''; });
    const node = { tag, attrs, children: [], parent: cur, start: m.index, tagEnd: re.lastIndex };
    cur.children.push(node);
    if (!VOID.has(tag) && !m[0].endsWith('/>')) cur = node;
  }
  return root;
}
function walk(node, fn) { fn(node); (node.children || []).forEach(c => walk(c, fn)); }
function textOf(node) {
  let out = '';
  walk(node, n => { if (n.tag === '#text') out += n.text; });
  return clean(out);
}
function hasClass(n, c) { return n.attrs && (' ' + (n.attrs.class || '') + ' ').includes(' ' + c + ' '); }
function closest(n, pred) { for (let x = n; x; x = x.parent) if (x.attrs && pred(x)) return x; return null; }
function find(node, pred, out = []) { walk(node, n => { if (n.tag !== '#text' && n !== node && pred(n)) out.push(n); }); return out; }

/* ---------------- text helpers ---------------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', times: '×', darr: '↓', uarr: '↑', rarr: '→', larr: '←' };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (_, n) => ENT[n.toLowerCase()] != null ? ENT[n.toLowerCase()] : '&' + n + ';');
}
function clean(s) { return decode(s).replace(/\s+/g, ' ').trim(); }
function cap(s, n = BODY_CAP) { s = clean(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
function slugify(s) {
  return clean(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-') || 'section';
}

/* ---------------- per-page extraction ---------------- */
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/* containers whose text is never content */
function isExcluded(n) {
  for (let x = n; x; x = x.parent) {
    if (!x.tag) continue;
    if (x.tag === 'nav' || x.tag === 'footer' || x.tag === 'script' || x.tag === 'style' || x.tag === 'head') return true;
    if (x.attrs && (x.attrs.id === 'ecoModal' || hasClass(x, 'eco-modal-backdrop') || hasClass(x, 'eco-admin') || hasClass(x, 'news-editor') || hasClass(x, 'news-admin-bar') || hasClass(x, 'nav-overlay'))) return true;
  }
  return false;
}

/* card selectors per page: one entry per element, title from its own
   heading/label, body from its text */
const CARD_SPECS = {
  index: [
    { cls: 'lg-card', kind: 'card' },
    { cls: 'th-card', kind: 'card' },
    { cls: 'conv-beat', kind: 'section' },
  ],
  privacy: [
    { cls: 'sp-card', kind: 'card' },
    { cls: 'wp-card', kind: 'card' },
    { cls: 'case', kind: 'card' },
    { cls: 'leak', kind: 'card' },
    { cls: 'landmass', kind: 'card' },
    { cls: 'snode', kind: 'card' },
    { cls: 'pb-li', kind: 'card' },
  ],
  quantum: [
    { cls: 'th-pm-card', kind: 'card' },
    { cls: 'bar-col', kind: 'chart label' },
    { cls: 'countdown', kind: 'card' },
  ],
  btcfi: [
    { cls: 'problem-item', kind: 'card' },
    { cls: 'catalyst-item', kind: 'card' },
    { cls: 'threat-card', kind: 'card' },
    { cls: 'risk-quote', kind: 'card' },
    { cls: 'mode-item', kind: 'card' },
    { cls: 'roadmap-step', kind: 'card' },
    { cls: 'staking-band', kind: 'card' },
    { cls: 'metric-box', kind: 'metric' },
  ],
  strk: [
    { cls: 'util-panel', kind: 'card' },
    { cls: 'venn-side', kind: 'card' },
    { cls: 'cell', kind: 'metric', within: 'numbers' },
    { cls: 'panel', kind: 'card', within: 'numbers' },
    { cls: 'buy-cat', kind: 'section' },
    { cls: 'bear', kind: 'card' },
  ],
  ecosystem: [],
  digest: [],
};
const TITLE_CLASSES = ['mode-item-title', 'metric-label', 'step-name', 'catalyst-tag', 'wp-t', 'cl', 'ptitle', 'bh-title', 'tx', 'k', 'lt', 'lb', 'lbl'];

function titleFor(node) {
  const h = find(node, n => HEADINGS.has(n.tag))[0];
  if (h) return clean(textOf(h));
  for (const tc of TITLE_CLASSES) {
    const t = find(node, n => hasClass(n, tc))[0];
    if (t) return clean(textOf(t));
  }
  const lbl = find(node, n => hasClass(n, 'tag') || hasClass(n, 'idx') || hasClass(n, 'bl'))[0];
  if (lbl) return clean(textOf(lbl));
  return cap(textOf(node), 60);
}

function extractPage(pg, src, idPlan) {
  /* src also consulted for whitelisted literals below */
  const root = parseHTML(src);
  const entries = [];
  const seenNodes = new Set();

  const planned = new Map();
  function ensureAnchor(node, title, selfOnly) {
    /* nearest existing id on self or ancestors wins; otherwise plan one.
       A node is planned at most once, even if two specs match it.
       selfOnly (expandable rows): the row itself must carry the anchor,
       or the deep link cannot open it. */
    for (let x = node; x; x = selfOnly ? null : x.parent) {
      if (x.attrs && x.attrs.id) return x.attrs.id;
      if (planned.has(x)) return planned.get(x);
    }
    const slug = uniqueSlug(idPlan, slugify(title));
    planned.set(node, slug);
    idPlan.add.push({ node, slug });
    return slug;
  }

  /* card-level entries first, so headings inside cards don't double-emit */
  for (const spec of (CARD_SPECS[pg.page] || [])) {
    for (const node of find(root, n => hasClass(n, spec.cls))) {
      if (isExcluded(node) || seenNodes.has(node)) continue;
      if (spec.within && !closest(node, x => x.attrs.id === spec.within)) continue;
      if (spec.cls === 'cell' && !closest(node, x => x.attrs.id === 'numbers')) continue;
      const title = titleFor(node);
      if (!title) continue;
      const body = cap(textOf(node).replace(title, '').trim());
      entries.push({ page: pg.page, anchor: ensureAnchor(node, title), title, body, kind: spec.kind });
      walk(node, n => seenNodes.add(n));
    }
  }

  /* quantum roadmap rows: main row + its detail row as one entry */
  if (pg.page === 'quantum') {
    const rows = find(root, n => hasClass(n, 'th-mainrow'));
    rows.forEach(row => {
      if (isExcluded(row)) return;
      const cells = find(row, n => n.tag === 'td').map(textOf);
      const title = cells[0] ? cells[0].replace(/^▸\s*/, '') : '';
      let detail = '';
      const sibs = row.parent.children.filter(c => c.tag === 'tr');
      const i = sibs.indexOf(row);
      if (i >= 0 && sibs[i + 1] && hasClass(sibs[i + 1], 'th-detailrow')) detail = textOf(sibs[i + 1]);
      const body = cap([cells.slice(1).join(' · '), detail].filter(Boolean).join(' — '));
      if (title) entries.push({ page: pg.page, anchor: ensureAnchor(row, title, true), title, body, kind: 'table row' });
      walk(row, n => seenNodes.add(n));
    });
  }

  /* privacy comparison-table rows: the cell verdicts live in data-tip
     ATTRIBUTES (tooltip labels), invisible to text extraction */
  if (pg.page === 'privacy') {
    for (const row of find(root, n => n.tag === 'tr')) {
      if (isExcluded(row) || seenNodes.has(row)) continue;
      const name = find(row, n => hasClass(n, 'pname'))[0];
      if (!name) continue;
      const title = clean(textOf(name));
      const tips = find(row, n => n.attrs && n.attrs['data-tip']).map(n => decode(n.attrs['data-tip']));
      if (!title || !tips.length) continue;
      entries.push({ page: pg.page, anchor: ensureAnchor(row, title, true), title, body: cap(tips.join(' · ')), kind: 'table row' });
      walk(row, n => seenNodes.add(n));
    }
  }

  /* btcfi: the network metric counts five tokens whose names live in the
     TOKENS literal and the runtime tooltip; index the names on the metric */
  if (pg.page === 'btcfi') {
    const tok = src.match(/var TOKENS = \[([\s\S]*?)\];/);
    if (tok) {
      const names = [...tok[1].matchAll(/name: '([^']+)'/g)].map(x => x[1]);
      const netMetric = entries.find(e => /BTC on Starknet network/i.test(e.title));
      if (netMetric && names.length) netMetric.body = cap(netMetric.body + ' · By token: ' + names.join(', '));
    }
  }

  /* heading-level sections for everything not already captured */
  const heads = find(root, n => HEADINGS.has(n.tag)).filter(h => !isExcluded(h) && !seenNodes.has(h));
  /* flat document-order text runs for body slicing */
  const runs = [];
  walk(root, n => { if (n.tag === '#text' && !isExcluded(n) && !seenNodes.has(n.parent)) runs.push(n); });
  heads.forEach((h, hi) => {
    const title = clean(textOf(h));
    if (!title) return;
    const from = h.end || h.tagEnd;
    const next = heads[hi + 1];
    const to = next ? next.start : Infinity;
    let body = '';
    for (const r of runs) {
      if (r.start >= from && r.start < to) { body += r.text + ' '; if (body.length > 600) break; }
    }
    entries.push({ page: pg.page, anchor: ensureAnchor(h, title), title, body: cap(body), kind: 'section' });
  });

  return entries;
}

function uniqueSlug(idPlan, slug) {
  let s = slug, i = 2;
  while (idPlan.used.has(s)) s = slug + '-' + i++;
  idPlan.used.add(s);
  return s;
}

/* ---------------- whitelisted JS-literal extractions ---------------- */
function btcfiMilestones(src) {
  const m = src.match(/var milestones\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return [];
  const out = [];
  const re = /\{year:'([^']*)',\s*name:'((?:\\'|[^'])*)',\s*btc:\w+,\s*desc:'((?:\\'|[^'])*)'\}/g;
  let x;
  while ((x = re.exec(m[1]))) {
    out.push({ page: 'btcfi', anchor: 'tlDetail', title: x[2].replace(/\\'/g, "'") + ' (' + x[1] + ')',
      body: cap(x[3].replace(/\\'/g, "'").replace(/\\u2019/g, '’')), kind: 'card' });
  }
  return out;
}
function strkCex(src) {
  const m = src.match(/const CEX\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return [];
  const names = [...m[1].matchAll(/name:"([^"]+)"/g)].map(x => x[1]);
  return names.map(n => ({ page: 'strk', anchor: 'where-to-get-strk', title: n,
    body: 'Centralized exchange listing STRK · Where to get STRK', kind: 'card' }));
}
function ecosystemCategories(src) {
  /* category ids/labels live in the embedded DEFAULTS JSON */
  const out = [];
  const re = /"id":\s*"([^"]+)",\s*"group":\s*"[^"]*",\s*"label":\s*"([^"]+)"/g;
  let x;
  while ((x = re.exec(src))) out.push({ id: x[1], label: x[2] });
  return out;
}

/* ---------------- data file entries ---------------- */
function dataEntries() {
  const out = [];
  const news = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'news.json'), 'utf8'));
  for (const [page, list] of Object.entries(news)) {
    list.forEach(t => out.push({ page, anchor: 'newsSection', title: clean(t.title || t.fallbackText || 'News'),
      body: cap([t.date, t.fallbackText].filter(Boolean).join(' · ')), kind: 'news', url: t.url }));
  }
  const eco = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ecosystem.json'), 'utf8'));
  for (const [catId, accounts] of Object.entries(eco)) {
    (accounts || []).forEach(a => out.push({ page: 'ecosystem', anchor: catId, cat: catId,
      title: '@' + (a.handle || a.name || ''), body: cap([a.name, a.desc || a.description].filter(Boolean).join(' · ')), kind: 'account' }));
  }
  const be = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'btcfi-ecosystem.json'), 'utf8'));
  const anchors = { wallets: 'btcfiWallets', bridges: 'btcfiBridges', defi: 'btcfiDefi' };
  for (const [k, items] of Object.entries(be)) {
    (items || []).forEach(it => out.push({ page: 'btcfi', anchor: anchors[k] || 'btcfiDefi',
      title: it.name, body: cap([k === 'defi' ? (it.tags || []).join(', ') : k, it.description].filter(Boolean).join(' · ')), kind: 'ecosystem item' }));
  }
  const recap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'recap.json'), 'utf8'));
  recap.forEach(r => out.push({ page: 'digest', anchor: 'recapGrid', title: clean(r.title),
    body: cap([String(r.post_date || '').slice(0, 10), r.subtitle || r.description].filter(Boolean).join(' · ')), kind: 'digest', url: r.canonical_url }));
  return out;
}

/* ---------------- synonyms (expanded into the index at build time) ---------------- */
/* pairs: query intent -> tokens appended to matching entries' hidden alias field */
const SYNONYMS = [
  ['zk', 'zero knowledge'], ['pq', 'post quantum'], ['eo', 'executive order'],
  ['tvl', 'total value locked'], ['tvs', 'total value secured'],
  ['aa', 'account abstraction'], ['fpi', 'financial privacy inc'],
  ['strk20', 'strk 20'], ['strkbtc', 'strk btc'], ['zkstark', 'zk stark'],
  ['btcfi', 'bitcoin defi'], ['cex', 'centralized exchange'], ['dex', 'decentralized exchange'],
];

/* ---------------- id injection ---------------- */
function applyIds(file, src, idPlan) {
  if (!idPlan.add.length) return src;
  const inserts = idPlan.add
    .map(({ node, slug }) => ({ at: node.start + 1 + node.tag.length, txt: ' id="' + slug + '"' }))
    .sort((a, b) => b.at - a.at);
  let out = src;
  for (const ins of inserts) out = out.slice(0, ins.at) + ins.txt + out.slice(ins.at);
  fs.writeFileSync(path.join(ROOT, file), out);
  console.log(`  ${file}: injected ${idPlan.add.length} ids`);
  return out;
}

/* ---------------- main ---------------- */
function main() {
  let entries = [];
  let injected = 0;
  for (const pg of PAGES) {
    let src = fs.readFileSync(path.join(ROOT, pg.file), 'utf8');
    const idPlan = { add: [], used: new Set([...src.matchAll(/id="([^"]+)"/g)].map(m => m[1])) };
    const pageEntries = extractPage(pg, src, idPlan);
    if (idPlan.add.length) {
      if (WRITE_IDS) { src = applyIds(pg.file, src, idPlan); injected += idPlan.add.length; }
      else throw new Error(`${pg.file}: ${idPlan.add.length} sections lack ids (` +
        idPlan.add.slice(0, 5).map(a => a.slug).join(', ') + '…). Run with --write-ids and commit.');
    }
    /* one page-level entry so the page name itself is a first-class hit */
    const metaDesc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const firstAnchored = pageEntries[0];
    if (firstAnchored) pageEntries.unshift({ page: pg.page, anchor: firstAnchored.anchor,
      title: pg.label, body: cap(decode(metaDesc)), kind: 'page' });
    entries = entries.concat(pageEntries);
    if (pg.page === 'btcfi') entries = entries.concat(btcfiMilestones(src));
    if (pg.page === 'strk') entries = entries.concat(strkCex(src));
    if (pg.page === 'ecosystem') {
      ecosystemCategories(src).forEach(c => entries.push({ page: 'ecosystem', anchor: c.id, cat: c.id,
        title: c.label, body: 'Ecosystem category · Starknet accounts to follow', kind: 'section' }));
    }
  }
  entries = entries.concat(dataEntries());

  /* attach build-time aliases so the client stays dumb */
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  entries.forEach(e => {
    const hay = fold(e.title + ' ' + e.body);
    const alias = [];
    for (const [a, b] of SYNONYMS) {
      if (hay.includes(fold(a))) alias.push(b);
      const bt = fold(b);
      if (bt.split(' ').every(t => hay.includes(t))) alias.push(a);
    }
    if (alias.length) e.alias = [...new Set(alias)].join(' ');
  });

  /* drop empty/dup titles per page+anchor */
  const seen = new Set();
  entries = entries.filter(e => {
    if (!e.title || e.title.length < 2) return false;
    const k = e.page + '|' + e.anchor + '|' + e.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  /* exclusion assertion: fail loudly if admin text leaked */
  const dump = fold(JSON.stringify(entries));
  for (const bad of FORBIDDEN) {
    if (dump.includes(fold(bad))) throw new Error(`EXCLUSION VIOLATION: "${bad}" leaked into the search index. Build aborted.`);
  }

  const outObj = { built: new Date().toISOString(), count: entries.length, entries };
  fs.writeFileSync(OUT, JSON.stringify(outObj));
  const raw = fs.statSync(OUT).size;
  const gz = zlib.gzipSync(fs.readFileSync(OUT)).length;
  console.log(`search index: ${entries.length} entries, ${(raw / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzipped${injected ? `, ${injected} ids injected` : ''}`);
  const byPage = {};
  entries.forEach(e => { byPage[e.page] = (byPage[e.page] || 0) + 1; });
  console.log('  per page:', JSON.stringify(byPage));
}
main();
