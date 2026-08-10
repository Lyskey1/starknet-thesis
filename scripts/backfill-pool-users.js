#!/usr/bin/env node
/* Build-time backfill of the STRK20 privacy pool's cumulative unique
   depositors — writes assets/data/strk20-pool-users.json with one row per
   day the count changed.

   DEFINITION (validated onchain 2026-08-10): pool-summary.userCount is the
   number of unique addresses that ever emitted a Deposit event on the pool
   contract — unique DIRECT depositors, first-Deposit attribution. The
   validation matched three counters exactly at the same instant:
   unique Deposit.user_addr 2,346 = userCount 2,346, Deposit events
   15,640 = depositCount, Withdrawal events 38,038 = withdrawalCount.
   Open-note depositors (OpenNoteDeposited) and withdrawal recipients are
   DISTINCT definitions and must not be merged (unions give 2,361 / 2,449).
   /agg/registrations totals are viewing-key registrations, a different
   metric again (2,367 that day). Do not conflate any of them.

   Method: scan Deposit events (token at keys[2], user_addr at keys[1])
   from block 0 via the Cartridge archive RPC (same choice as
   backfill-staking.js), take each address's FIRST Deposit block, resolve
   every distinct first-block's exact header timestamp (no interpolation),
   bucket by UTC day, cumulative-sum. The result reconciles against the
   live pool-summary.userCount and the script fails hard on divergence
   beyond event-arrival timing (2 users).

   Usage: node scripts/backfill-pool-users.js  (resumable — network results
   are cached in scripts/.backfill-users-cache.json) */

const fs = require('fs');
const path = require('path');

const RPC = 'https://api.cartridge.gg/x/starknet/mainnet';
const POOL = '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a';
const BACKEND = 'https://strk20-dashboard-production.up.railway.app';
const OUT = path.join(__dirname, '..', 'assets', 'data', 'strk20-pool-users.json');
const CACHE_FILE = path.join(__dirname, '.backfill-users-cache.json');

/* ---- keccak-256 (pure JS, BigInt lanes) — for the event selector ---- */
const RC = [
  0x0000000000000001n,0x0000000000008082n,0x800000000000808An,0x8000000080008000n,
  0x000000000000808Bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,
  0x000000000000008An,0x0000000000000088n,0x0000000080008009n,0x000000008000000An,
  0x000000008000808Bn,0x800000000000008Bn,0x8000000000008089n,0x8000000000008003n,
  0x8000000000008002n,0x8000000000000080n,0x000000000000800An,0x800000008000000An,
  0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const ROT = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const M64 = (1n << 64n) - 1n;
const rot = (v, n) => ((v << BigInt(n)) | (v >> BigInt(64 - n))) & M64;
function keccakF(s){
  for (let r = 0; r < 24; r++){
    const C = [], D = [];
    for (let x = 0; x < 5; x++) C[x] = s[x] ^ s[x+5] ^ s[x+10] ^ s[x+15] ^ s[x+20];
    for (let x = 0; x < 5; x++) D[x] = C[(x+4)%5] ^ rot(C[(x+1)%5], 1);
    for (let i = 0; i < 25; i++) s[i] ^= D[i%5];
    const B = new Array(25);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + ((2*x + 3*y) % 5) * 5] = rot(s[x + 5*y], ROT[x + 5*y]);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x + 5*y] = B[x + 5*y] ^ ((~B[(x+1)%5 + 5*y] & M64) & B[(x+2)%5 + 5*y]);
    s[0] ^= RC[r];
  }
}
function keccak256(bytes){
  const s = new Array(25).fill(0n), rate = 136;
  const p = [...bytes]; p.push(0x01);
  while (p.length % rate !== 0) p.push(0);
  p[p.length - 1] |= 0x80;
  for (let off = 0; off < p.length; off += rate){
    for (let i = 0; i < rate / 8; i++){
      let lane = 0n;
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(p[off + i*8 + b]);
      s[i] ^= lane;
    }
    keccakF(s);
  }
  let out = 0n;
  for (let i = 0; i < 4; i++){ const lane = s[i]; for (let b = 0; b < 8; b++) out = (out << 8n) | ((lane >> BigInt(8*b)) & 0xffn); }
  return out;
}
const snKeccak = n => keccak256([...Buffer.from(n, 'utf8')]) & ((1n << 250n) - 1n);
const hex = v => '0x' + v.toString(16);
if (hex(snKeccak('transfer')) !== '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e')
  throw new Error('keccak self-test failed');

/* ---- resumable cache ---- */
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) {}
let dirty = 0;
function saveCache(force){
  if (!force && ++dirty % 50) return;
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

async function rpc(method, params, tries = 5){
  for (let i = 0; i < tries; i++){
    try {
      const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(25000) });
      const text = await r.text();
      let j;
      try { j = JSON.parse(text); } catch (e) { throw new Error('non-JSON reply (' + r.status + '): ' + text.slice(0, 60)); }
      if (j.error) throw new Error(JSON.stringify(j.error));
      return j.result;
    } catch (e){ if (i === tries - 1) throw e; await new Promise(s => setTimeout(s, 4000 * (i + 1))); }
  }
}
const norm = a => '0x' + BigInt(a).toString(16);

async function firstDepositBlocks(){
  const sel = hex(snKeccak('Deposit'));
  const first = new Map();
  let cont, pages = 0, events = 0;
  do {
    const key = 'ev:' + (cont || 'start');
    let res = cache[key];
    if (!res){
      const f = { from_block: { block_number: 0 }, to_block: 'latest', address: POOL, keys: [[sel]], chunk_size: 1000 };
      if (cont) f.continuation_token = cont;
      const raw = await rpc('starknet_getEvents', [f]);
      res = { events: raw.events.map(e => ({ k1: e.keys[1], b: e.block_number })), continuation_token: raw.continuation_token || null };
      // cache only completed (non-tail) pages: the tail page grows with new deposits
      if (res.continuation_token) { cache[key] = res; saveCache(); }
    }
    res.events.forEach(ev => { events++; const a = norm(ev.k1); if (!first.has(a)) first.set(a, ev.b); });
    cont = res.continuation_token; pages++;
    process.stderr.write('\rDeposit scan: page ' + pages + ', events ' + events + ', unique ' + first.size + '   ');
  } while (cont);
  process.stderr.write('\n');
  return { first, events };
}

async function blockDate(b){
  const key = 'ts:' + b;
  if (cache[key]) return cache[key];
  const res = await rpc('starknet_getBlockWithTxHashes', [{ block_number: b }]);
  const d = new Date(res.timestamp * 1000).toISOString().slice(0, 10);
  cache[key] = d; saveCache();
  return d;
}

(async () => {
  const { first, events } = await firstDepositBlocks();
  const blocks = [...new Set(first.values())].sort((a, b) => a - b);
  console.log('addresses:', first.size, '| distinct first-blocks:', blocks.length, '| events:', events);

  // exact header timestamp for every distinct first-deposit block
  const dates = new Map();
  let done = 0;
  const CONC = 3, PACE_MS = 120; // stay under the RPC's rate limit
  await Promise.all(Array.from({ length: CONC }, async (_, w) => {
    for (let i = w; i < blocks.length; i += CONC){
      dates.set(blocks[i], await blockDate(blocks[i]));
      await new Promise(s => setTimeout(s, PACE_MS));
      if (++done % 25 === 0) process.stderr.write('\rtimestamps: ' + done + '/' + blocks.length + '   ');
    }
  }));
  saveCache(true);
  process.stderr.write('\rtimestamps: ' + done + '/' + blocks.length + '\n');

  // bucket first deposits by UTC day, cumulative-sum, keep change-days only
  const perDay = new Map();
  first.forEach(b => { const d = dates.get(b); perDay.set(d, (perDay.get(d) || 0) + 1); });
  const days = [...perDay.keys()].sort();
  let cum = 0;
  const rows = days.map(d => { cum += perDay.get(d); return { date: d, users: cum }; });

  // reconcile against the live backend at head
  const s = await fetch(BACKEND + '/agg/pool-summary').then(r => r.json());
  const head = rows[rows.length - 1].users;
  console.log('series head:', head, '| live pool-summary.userCount:', s.userCount);
  if (Math.abs(head - s.userCount) > 2){
    console.error('DIVERGENCE beyond event-arrival timing — not writing seed. Investigate before shipping.');
    process.exit(1);
  }

  fs.writeFileSync(OUT, JSON.stringify({
    generated: new Date().toISOString(),
    source: 'onchain Deposit events, pool ' + POOL + ' via ' + RPC,
    definition: 'cumulative unique direct depositors (first Deposit event per address), exact block-header timestamps, UTC days; rows only for days the count changed',
    validatedAgainst: { userCount: s.userCount, at: s.dataAsOf },
    days: rows
  }, null, 1) + '\n');
  console.log('wrote', OUT, '(' + rows.length + ' rows, ' + rows[0].date + ' -> ' + rows[rows.length - 1].date + ')');
})();
