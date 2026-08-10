#!/usr/bin/env node
/* Build-time backfill of Starknet block times — writes
   assets/data/block-time-history.json with one row per full UTC day.

   Method: for every UTC midnight since genesis (block 1, 2021-11-16), find
   the first block whose timestamp reaches that midnight (binary search on
   block timestamps via the Cartridge archive RPC, the same source and
   pattern as backfill-staking.js / backfill-pool-users.js). A day's block
   count is the delta between consecutive midnight boundaries and its
   average block time is 86400 / blocks. Days with zero blocks (sparse
   early-2021/2022 stretches) emit avgSec: null and are skipped by the
   chart's isFinite filter, never interpolated.

   Coherence check: boundary block numbers must be non-decreasing and the
   per-day block counts must sum to the span between the first and last
   boundary — any mismatch fails the run rather than writing a partial file.

   Usage: node scripts/backfill-block-times.js  (resumable — block
   timestamps are cached in scripts/.backfill-cache.json, shared with the
   staking backfill, which uses the same ts:<n> key convention) */

const fs = require('fs');
const path = require('path');

const RPC = 'https://api.cartridge.gg/x/starknet/mainnet';
const OUT = path.join(__dirname, '..', 'assets', 'data', 'block-time-history.json');
const DAY = 86400;

const CACHE_FILE = path.join(__dirname, '.backfill-cache.json');
let CACHE = {};
try { CACHE = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) {}
let dirty = 0;
function saveCache(force){
  dirty++;
  if (force || dirty >= 250) { fs.writeFileSync(CACHE_FILE, JSON.stringify(CACHE)); dirty = 0; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// HTTP via curl subprocess with retries — Node's own fetch persistently fails
// TCP connects to some Cloudflare-fronted hosts on this build machine, while
// curl connects fine (same workaround as backfill-staking.js).
const { execFile } = require('child_process');
function curlRun(args){
  return new Promise((res, rej) => execFile('curl', args, { maxBuffer: 64 * 1024 * 1024 },
    (e, stdout) => e ? rej(e) : res(stdout)));
}
const PACE_MS = 130; // per-worker gap between calls — stays under the RPC's rate limit
async function rpc(method, params){
  const args = ['-s', '--max-time', '60', '-X', 'POST', '-H', 'Content-Type: application/json',
    '-d', JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), RPC];
  for (let i = 0; ; i++) {
    try {
      await sleep(PACE_MS);
      const body = await curlRun(args);
      if (/rate limit/i.test(body)) throw new Error('RATE_LIMIT');
      const d = JSON.parse(body);
      if (d.error) throw new Error(JSON.stringify(d.error));
      return d.result;
    } catch (e) {
      if (i >= 6) throw e;
      await sleep(e.message === 'RATE_LIMIT' ? 6000 * (i + 1) : 1500 * (i + 1));
    }
  }
}
async function blockTs(n){
  const key = 'ts:' + n;
  if (CACHE[key] != null) return CACHE[key];
  const r = await rpc('starknet_getBlockWithTxHashes', [{ block_number: n }]);
  CACHE[key] = r.timestamp; saveCache();
  return r.timestamp;
}

// first block with timestamp >= target, searched inside (lo, hi]
async function boundary(target, lo, hi){
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    ((await blockTs(mid)) < target) ? lo = mid + 1 : hi = mid;
  }
  return lo;
}

async function main(){
  const latest = await rpc('starknet_blockNumber', []);
  const latestTs = await blockTs(latest);
  const genTs = await blockTs(1);
  const first = Math.ceil(genTs / DAY) * DAY;   // first UTC midnight after genesis
  const last = Math.floor(latestTs / DAY) * DAY; // most recent UTC midnight
  const targets = [];
  for (let t = first; t <= last; t += DAY) targets.push(t);
  console.log('boundaries to find:', targets.length,
    '(' + new Date(first * 1000).toISOString().slice(0, 10),
    'to', new Date(last * 1000).toISOString().slice(0, 10) + ')');

  // WORKERS contiguous chunks; each seeds its first boundary from the full
  // range, then walks its days with a window predicted from the last day's
  // block count (doubled until it covers the target).
  const WORKERS = 3;
  const bounds = new Array(targets.length);
  const per = Math.ceil(targets.length / WORKERS);
  let done = 0;
  async function worker(w){
    const from = w * per, to = Math.min(targets.length, from + per);
    if (from >= to) return;
    let lo = 1, rate = 2000; // blocks/day guess, corrected after the first day
    for (let i = from; i < to; i++) {
      let hi = Math.min(latest, lo + Math.max(4 * rate, 2000));
      while (hi < latest && (await blockTs(hi)) < targets[i]) { lo = hi; hi = Math.min(latest, hi + (hi - lo || 2000) * 2); }
      const b = await boundary(targets[i], lo, hi);
      bounds[i] = b;
      if (i > from) rate = Math.max(1, b - bounds[i - 1]);
      lo = b;
      if (++done % 100 === 0) console.log('  ' + done + '/' + targets.length);
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
  saveCache(true);

  // coherence: boundaries non-decreasing, day counts sum to the span
  let sum = 0;
  for (let i = 1; i < bounds.length; i++) {
    if (!(bounds[i] >= bounds[i - 1])) throw new Error('boundary regression at ' + i);
    sum += bounds[i] - bounds[i - 1];
  }
  if (sum !== bounds[bounds.length - 1] - bounds[0]) throw new Error('block count mismatch');

  const days = [];
  for (let i = 0; i + 1 < targets.length; i++) {
    const blocks = bounds[i + 1] - bounds[i];
    days.push({
      date: new Date(targets[i] * 1000).toISOString().slice(0, 10),
      firstBlock: bounds[i], // chain height at the day's start boundary — the TOTAL BLOCKS series derives from this, no separate walk
      blocks,
      avgSec: blocks > 0 ? Math.round(DAY / blocks * 1000) / 1000 : null
    });
  }
  const out = {
    generated: new Date().toISOString(),
    source: {
      chain: 'Cartridge archive RPC (' + RPC + ')',
      method: 'first block per UTC day by timestamp binary search; avgSec = 86400 / blocks that day; zero-block days carry avgSec null'
    },
    days
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const tail = days.slice(-3).map(d => d.date + ' ' + d.blocks + ' blocks ' + d.avgSec + 's').join(' | ');
  console.log('wrote', OUT, days.length, 'days · tail:', tail);
}

main().catch(e => { console.error(e); process.exit(1); });
