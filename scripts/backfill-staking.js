#!/usr/bin/env node
/* Build-time backfill of Starknet staking history — writes
   assets/data/strk-staking-history.json with one row per month boundary.

   Sources (all free, keyless):
   - Onchain state at historical blocks via the Cartridge RPC (full archive;
     Lava prunes, 1RPC/dRPC don't serve starknet_call, Blast is dead):
     get_total_stake (STRK, 1e18) and get_total_stake_for_token per BTC token
     (WBTC/LBTC/strkBTC 1e8, tBTC/SolvBTC 1e18). Blocks for each month
     boundary found by binary search on block timestamps.
   - Monthly STRK & BTC prices: Binance 1M klines (open = price at the
     boundary). CoinGecko market_chart is capped at 365d keyless.
   - Circulating supply: CoinGecko market_chart (last 365d, mcap/price at the
     boundary); earlier months from Wayback Machine snapshots of the
     CoinGecko coin page (build-time only, politely throttled).

   Coherence: computed fields (tvs_usd, pct_staked) are only emitted for a
   month when EVERY input resolved. A BTC "entrypoint does not exist" at old
   blocks means BTC staking didn't exist yet — structurally zero for TVS, and
   the btc_staked series simply starts later. A token reverting "Token is not
   active" contributes zero (deactivated token, e.g. LBTC).

   Usage: node scripts/backfill-staking.js  (resumable — network results are
   cached in .backfill-cache.json next to this script) */

const fs = require('fs');
const path = require('path');

const RPC = 'https://api.cartridge.gg/x/starknet/mainnet';
const STK = '0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7';
const SEL_TOTAL = '0x226ffc5db8f68325947f4c4fcbea7117624ed26d4a1354693f63de203c453c8';
const SEL_FOR_TOKEN = '0x176a8635700dc88038a0257dda52c3a5b40d0909ab74b6b813012eb416c2486';
const TOKENS = [
  { n: 'WBTC',    a: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac', d: 8 },
  { n: 'tBTC',    a: '0x04daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32f', d: 18 },
  { n: 'SolvBTC', a: '0x0593e034dda23eea82d2ba9a30960ed42cf4a01502cc2351dc9b9881f9931a68', d: 18 },
  { n: 'strkBTC', a: '0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135', d: 8 },
  { n: 'LBTC',    a: '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4', d: 8 },
];

const CACHE_FILE = path.join(__dirname, '.backfill-cache.json');
let CACHE = {};
try { CACHE = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) {}
function saveCache(){ fs.writeFileSync(CACHE_FILE, JSON.stringify(CACHE)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// HTTP via curl subprocess with retries — Node's own fetch persistently fails
// TCP connects to some Cloudflare-fronted hosts on this build machine, while
// curl connects fine. Returns a minimal fetch-like {ok, json(), text()}.
const { execFile } = require('child_process');
function curlRun(args){
  return new Promise((res, rej) => execFile('curl', args, { maxBuffer: 64 * 1024 * 1024 },
    (e, stdout) => e ? rej(e) : res(stdout)));
}
async function f(url, opts){
  const args = ['-s', '-L', '--max-time', '60'];
  if (opts && opts.method === 'POST') args.push('-X', 'POST', '-H', 'Content-Type: application/json', '-d', opts.body);
  args.push(url);
  for (let i = 0; ; i++) {
    try {
      const body = await curlRun(args);
      if (!body) throw new Error('empty response: ' + url);
      return { ok: true, json: async () => JSON.parse(body), text: async () => body };
    } catch (e) { if (i >= 2) throw e; await sleep(1500 * (i + 1)); }
  }
}

async function rpc(method, params){
  const r = await f(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function blockTs(n){
  const key = 'ts:' + n;
  if (CACHE[key] != null) return CACHE[key];
  const d = await rpc('starknet_getBlockWithTxHashes', [{ block_number: n }]);
  if (!d.result) throw new Error('block ' + n + ': ' + JSON.stringify(d.error));
  CACHE[key] = d.result.timestamp; saveCache();
  return d.result.timestamp;
}
async function latestBlock(){
  const d = await rpc('starknet_blockNumber', []);
  return d.result;
}
// first block with timestamp >= target
async function blockAt(targetSec, hi){
  const key = 'blk:' + targetSec;
  if (CACHE[key] != null) return CACHE[key];
  let lo = 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    ((await blockTs(mid)) < targetSec) ? lo = mid + 1 : hi = mid;
  }
  CACHE[key] = lo; saveCache();
  return lo;
}
// starknet_call at a block; returns {v} | {err:'missing'|'inactive'|'other'}
async function callAt(selector, calldata, block){
  const key = 'call:' + selector.slice(0, 10) + ':' + calldata.join(',') + ':' + block;
  if (CACHE[key] != null) return CACHE[key];
  const d = await rpc('starknet_call', [{ contract_address: STK, entry_point_selector: selector, calldata }, { block_number: block }]);
  let out;
  if (d.result && d.result.length) out = { v: d.result[0] };
  else {
    const msg = JSON.stringify(d.error || {});
    // structural absences (entrypoint pre-upgrade, contract pre-deployment,
    // token not yet registered) vs a deactivated token vs a real failure
    out = { err: /entrypoint does not exist|Contract not found|Invalid token/i.test(msg) ? 'missing'
      : /not active/i.test(msg) ? 'inactive' : 'other:' + msg.slice(0, 300) };
  }
  CACHE[key] = out; saveCache();
  return out;
}

async function binanceMonthly(symbol){
  const key = 'bin:' + symbol;
  if (CACHE[key]) return CACHE[key];
  const r = await f('https://api.binance.com/api/v3/klines?symbol=' + symbol + '&interval=1M&limit=50');
  const a = await r.json();
  const out = {}; // 'YYYY-MM-01' -> open price at boundary
  a.forEach(k => { out[new Date(k[0]).toISOString().slice(0, 10)] = parseFloat(k[1]); });
  CACHE[key] = out; saveCache();
  return out;
}
async function cgCirc(){ // 'YYYY-MM-01' -> circulating (last 365d only)
  const key = 'cgcirc';
  if (CACHE[key]) return CACHE[key];
  const r = await f('https://api.coingecko.com/api/v3/coins/starknet/market_chart?vs_currency=usd&days=365&interval=daily');
  const d = await r.json();
  const out = {};
  d.prices.forEach((p, i) => {
    const day = new Date(p[0]).toISOString().slice(0, 10);
    const m = d.market_caps[i];
    if (day.endsWith('-01') && m && p[1] > 0) out[day] = m[1] / p[1];
  });
  CACHE[key] = out; saveCache();
  return out;
}
async function waybackCirc(monthIso){ // circulating from an archived CoinGecko page
  const key = 'wb:' + monthIso;
  if (CACHE[key] !== undefined) return CACHE[key];
  const stamp = monthIso.replace(/-/g, '');
  try {
    const av = await (await f('http://archive.org/wayback/available?url=coingecko.com/en/coins/starknet&timestamp=' + stamp)).json();
    const snap = av.archived_snapshots && av.archived_snapshots.closest;
    if (!snap || !snap.available) { CACHE[key] = null; saveCache(); return null; }
    // reject snapshots more than 6 days from the boundary
    const snapDate = new Date(snap.timestamp.slice(0,4)+'-'+snap.timestamp.slice(4,6)+'-'+snap.timestamp.slice(6,8));
    if (Math.abs(snapDate - new Date(monthIso)) > 6 * 86400000) { CACHE[key] = null; saveCache(); return null; }
    await sleep(25000); // stay well under archive.org rate limits
    const html = await (await f(snap.url)).text();
    let m = html.match(/data-coin-circulating-supply="([\d.]+)"/) ||
            html.match(/Circulating Supply[\s\S]{0,600}?([\d,]{9,})/);
    const v = m ? parseFloat(m[1].replace(/,/g, '')) : null;
    CACHE[key] = (v && v > 1e9 && v < 1e10) ? v : null; saveCache();
    return CACHE[key];
  } catch (e) { return undefined; } // transient — retry on next run, don't cache
}

(async () => {
  const latest = await latestBlock();
  await blockTs(latest); // pin upper bound in cache
  const months = [];
  for (let y = 2024, mo = 11; y < 2027; ) {
    const iso = y + '-' + String(mo).padStart(2, '0') + '-01';
    if (new Date(iso + 'T00:00:00Z').getTime() > Date.now()) break;
    months.push(iso);
    mo++; if (mo > 12) { mo = 1; y++; }
  }
  const [strkPx, btcPx, circCg] = [await binanceMonthly('STRKUSDT'), await binanceMonthly('BTCUSDT'), await cgCirc()];

  const rows = [];
  for (const iso of months) {
    const target = Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 1000);
    const block = await blockAt(target, latest);
    // STRK staked
    const st = await callAt(SEL_TOTAL, [], block);
    const strk = st.v ? parseInt(st.v, 16) / 1e18 : (st.err === 'missing' ? null : null);
    // BTC staked: sum tokens; all-'missing' => BTC staking not live yet (structural 0 for TVS)
    let btc = 0, anyToken = false, tokenFail = false;
    for (const t of TOKENS) {
      const c = await callAt(SEL_FOR_TOKEN, [t.a], block);
      if (c.v) { btc += parseInt(c.v, 16) / Math.pow(10, t.d); anyToken = true; }
      else if (c.err === 'inactive') { /* deactivated token: zero */ }
      else if (c.err === 'missing') { /* entrypoint or token absent at this block */ }
      else tokenFail = true;
    }
    const btcStaked = tokenFail ? null : (anyToken ? btc : null); // null pre-launch (series absent)
    const btcForTvs = tokenFail ? null : (anyToken ? btc : 0);    // structurally zero pre-launch
    let circ = circCg[iso] != null ? circCg[iso] : await waybackCirc(iso);
    if (circ === undefined) circ = null;
    const sp = strkPx[iso] != null ? strkPx[iso] : null;
    const bp = btcPx[iso] != null ? btcPx[iso] : null;
    // coherent pairs: computed fields exist only when every input resolved
    const tvs = (strk != null && sp != null && btcForTvs != null && bp != null) ? strk * sp + btcForTvs * bp : null;
    const pct = (strk != null && circ != null) ? strk / circ * 100 : null;
    const row = { date: iso, block, strk_staked: strk && Math.round(strk), btc_staked: btcStaked != null ? +btcStaked.toFixed(3) : null,
      strk_price: sp, btc_price: bp, circulating: circ != null ? Math.round(circ) : null,
      tvs_usd: tvs != null ? Math.round(tvs) : null, pct_staked: pct != null ? +pct.toFixed(3) : null };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  const out = { generated: new Date().toISOString(), source: { chain: 'Cartridge archive RPC', prices: 'Binance 1M klines', circulating: 'CoinGecko (365d) + Wayback snapshots' }, months: rows };
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'data', 'strk-staking-history.json'), JSON.stringify(out, null, 1));
  console.log('written: assets/data/strk-staking-history.json (' + rows.length + ' months)');
})();
