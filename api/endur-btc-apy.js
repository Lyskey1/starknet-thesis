/* Same-origin proxy for Endur's BTC staking APY (Vercel function).
   GET /api/endur-btc-apy feeds the "BTC staking APY" card in the live
   metrics row of /btcfi. Upstream is the endpoint Endur's own dashboard
   (dashboard.endur.fi) calls for its LST stats: app.endur.fi/api/lst/stats,
   public, no key. One entry per liquid staking pool: { asset, tvlUsd, apy }.

   BTC pools are picked with the dashboard's own rule (asset starts with
   "TBTC" or contains "BTC"), so the card covers exactly the pools the
   dashboard counts as BTC. The figure is the TVL-weighted average of their
   APYs: a pool with no TVL or no finite APY is skipped, and the response
   carries how many pools went in.

   Response contract:
     200 { ts, apy, pools, tvlUsd, stale? }  // apy is a fraction (0.03 = 3%)
                                             // stale:true = last-good copy
     503 { ok: false }                       // upstream failed, no copy yet

   Cached an hour at the CDN; the last-good copy lives in memory for as long
   as the warm instance does, so a cold instance with a failing upstream
   503s and the card shows its cached value or "n/a". */
'use strict';

const UPSTREAM = 'https://app.endur.fi/api/lst/stats';
const TIMEOUT_MS = 5000;
const CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';

let lastGood = null;

function send(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.json(obj);
}

const isBtc = a => typeof a === 'string' && (a.startsWith('TBTC') || a.includes('BTC'));

function average(list) {
  if (!Array.isArray(list)) return null;
  let tvl = 0, weighted = 0, pools = 0;
  for (const p of list) {
    if (!p || !isBtc(p.asset)) continue;
    const t = Number(p.tvlUsd), a = Number(p.apy);
    if (!isFinite(t) || t <= 0 || !isFinite(a) || a < 0 || a > 1) continue;
    tvl += t; weighted += a * t; pools++;
  }
  if (!pools) return null;
  return { ts: Date.now(), apy: weighted / tvl, pools, tvlUsd: tvl };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false });
  }
  try {
    const up = await fetch(UPSTREAM, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!up.ok) throw new Error('upstream ' + up.status);
    const payload = average(JSON.parse(await up.text()));
    if (!payload) throw new Error('no BTC pools in upstream');
    lastGood = payload;
    res.setHeader('Cache-Control', CACHE);
    return send(res, 200, payload);
  } catch (e) {
    if (lastGood) {
      res.setHeader('Cache-Control', CACHE);
      return send(res, 200, Object.assign({}, lastGood, { stale: true }));
    }
    res.setHeader('Cache-Control', 'no-store');
    return send(res, 503, { ok: false });
  }
};
