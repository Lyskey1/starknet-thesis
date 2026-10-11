#!/usr/bin/env node
/* Inline fallback for the published video sets.

   data/videos.json is the published source of truth for each video set
   (one key per set, written by POST /api/publish's videos target). The
   page fetches it at load, but a reader must never see an empty grid
   while that fetch is in flight, or forever if it fails. So every build
   writes each set into its page as an inline seed, between markers:

     var L1_SEEDS = /* VIDEOS:quantumL1:START *\/[...]/* VIDEOS:quantumL1:END *\/;

   A publish commits data/videos.json, the commit redeploys, and this
   script rewrites the seed, so the inline copy is the last build's
   published set and the fetch only matters when the HTML is staler than
   the file (a cached page).

   The file is checked with the SAME rules the publish endpoint applies
   (api/publish.js validateVideos), so a hand-edited file that a publish
   would refuse also fails the deploy instead of rendering.

   Runs on every deploy (`npm run build`). Idempotent. No dependencies. */

const fs = require('fs');
const path = require('path');
const { validateVideos } = require('../api/publish.js');

const ROOT = path.join(__dirname, '..', 'public');
const DATA = path.join(ROOT, 'data', 'videos.json');
// set id -> the page that carries its inline seed
const SETS = { quantumL1: 'quantum.html' };

function die(msg) { console.error('build-videos FAILED: ' + msg); process.exit(1); }

if (!fs.existsSync(DATA)) die('data/videos.json not found');
let data;
try { data = JSON.parse(fs.readFileSync(DATA, 'utf8')); }
catch (e) { die('data/videos.json is not valid JSON: ' + e.message); }
const problem = validateVideos(data);
if (problem) die('data/videos.json: ' + problem);

for (const id of Object.keys(SETS)) {
  const page = path.join(ROOT, SETS[id]);
  const start = '/* VIDEOS:' + id + ':START */';
  const end = '/* VIDEOS:' + id + ':END */';
  let html = fs.readFileSync(page, 'utf8');
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a || html.indexOf(start, a + 1) >= 0) die(SETS[id] + ' must carry exactly one ' + start + ' ... ' + end + ' pair');
  // `<` escaped so no title can close the script element it sits in
  const json = JSON.stringify(data[id] || []).replace(/</g, '\\u003c');
  const next = html.slice(0, a + start.length) + json + html.slice(b);
  if (next !== html) fs.writeFileSync(page, next);
  console.log('build-videos: ' + id + ' -> ' + SETS[id] + ' (' + (data[id] || []).length + ' video' + ((data[id] || []).length === 1 ? '' : 's') + ')');
}
