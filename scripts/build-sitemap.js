#!/usr/bin/env node
/* Sitemap <lastmod> dates, derived instead of typed (2026-11-19).

   public/sitemap.xml carried hand-written dates, and they went stale: on
   2026-11-19 six of the seven still said early September while every page
   had changed that week. A lastmod that never moves teaches a crawler to
   ignore it.

   Runs in `npm run build`, after build-digest.js. For each URL already in
   the sitemap it rewrites <lastmod> and nothing else (the URL list stays
   hand-maintained):

     - the last git commit that touched the page's own files (SOURCES below);
     - for /digest and the landing, also the newest post in
       public/data/recap.json, because both print the latest roundup and the
       digest workflow can land a post without touching either page's markup.

   GIT HISTORY MAY BE MISSING. Vercel clones with a shallow history unless the
   project sets VERCEL_DEEP_CLONE=true. In a shallow clone the oldest fetched
   commit looks as if it added every file, so its date is NOT a file's real
   last change; such a commit is treated as "unknown". When the date is
   unknown the committed <lastmod> is kept. A date never moves backwards.

   Exits non-zero only if sitemap.xml is missing or has no <url> entries. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const RECAP = path.join(ROOT, 'public', 'data', 'recap.json');
const ORIGIN = 'https://starknetthesis.io';

/* the files whose change means the page changed */
const SOURCES = {
  '/': ['src'],
  '/privacy': ['public/privacy.html'],
  '/quantum': ['public/quantum.html'],
  '/btcfi': ['public/btcfi.html'],
  '/strk': ['public/strk.html'],
  '/ecosystem': ['public/ecosystem.html', 'public/data/ecosystem.json'],
  '/digest': ['public/digest.html', 'public/data/recap.json'],
};
const FOLLOWS_RECAP = ['/', '/digest'];

const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};

/* the shallow boundary commits, whose dates say nothing about a file */
const shallow = new Set();
try {
  const gitDir = git(['rev-parse', '--git-dir']);
  if (gitDir) fs.readFileSync(path.resolve(ROOT, gitDir, 'shallow'), 'utf8').split('\n').forEach((l) => l.trim() && shallow.add(l.trim()));
} catch { /* not shallow */ }

const gitDate = (paths) => {
  const out = git(['log', '-1', '--format=%H %ct', '--', ...paths]);
  if (!out) return null;
  const [sha, ts] = out.split(' ');
  if (shallow.has(sha)) return null;
  const ms = Number(ts) * 1000;
  return isFinite(ms) && ms > 0 ? ms : null;
};

const recapDate = () => {
  try {
    const posts = JSON.parse(fs.readFileSync(RECAP, 'utf8'));
    const times = (Array.isArray(posts) ? posts : []).map((p) => Date.parse(p && p.post_date)).filter(isFinite);
    return times.length ? Math.max(...times) : null;
  } catch { return null; }
};

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, '+00:00');

if (!fs.existsSync(SITEMAP)) { console.error('build-sitemap: public/sitemap.xml is missing'); process.exit(1); }
let xml = fs.readFileSync(SITEMAP, 'utf8');
const recap = recapDate();
let seen = 0;
const report = [];

xml = xml.replace(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g, (block, loc, old) => {
  seen += 1;
  const route = loc.replace(ORIGIN, '').replace(/\/$/, '') || '/';
  const paths = SOURCES[route];
  if (!paths) { report.push(`${route}  kept (no source list)`); return block; }
  const candidates = [Date.parse(old), gitDate(paths), FOLLOWS_RECAP.includes(route) ? recap : null].filter((v) => typeof v === 'number' && isFinite(v));
  if (!candidates.length) { report.push(`${route}  kept (no date known)`); return block; }
  const next = iso(Math.max(...candidates));
  report.push(`${route}  ${old} -> ${next}`);
  return block.replace(`<lastmod>${old}</lastmod>`, `<lastmod>${next}</lastmod>`);
});

if (!seen) { console.error('build-sitemap: no <url> entries with <lastmod> found in sitemap.xml'); process.exit(1); }
fs.writeFileSync(SITEMAP, xml);
console.log(`build-sitemap: ${seen} urls${shallow.size ? ' (shallow git history: unknown dates kept)' : ''}`);
report.forEach((l) => console.log('  ' + l));
