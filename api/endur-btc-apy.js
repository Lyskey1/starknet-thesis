/* Same-origin proxy for Endur's BTC staking APYs (Vercel function).
   GET /api/endur-btc-apy feeds the "Up to X.XX% APY" line of the BTC staked
   card in the live metrics row of /btcfi, and the APY column of that card's
   by-token tooltip. Upstream is the endpoint Endur's own dashboard
   (dashboard.endur.fi) calls for its LST stats: app.endur.fi/api/lst/stats,
   public, no key. One entry per liquid staking pool: { asset, tvlUsd, apy }.

   BTC pools are picked with the dashboard's own rule (asset starts with
   "TBTC" or contains "BTC"), so the figures cover exactly the pools the
   dashboard counts as BTC. Each pool keeps its own APY; apy is the highest
   of them. A pool with no TVL or no finite APY is skipped.

   Response contract:
     200 { ts, apy, pools: [{ asset, apy, tvlUsd }] }  // apy values are
                                                        // fractions (0.03 = 3%)
     503 { ok: false }                                  // upstream failed

   Cached an hour at the CDN. No last-good copy: the page hides the APY line
   rather than show an old reading, and it checks ts for the same reason. */
'use strict';

const UPSTREAM = 'https://app.endur.fi/api/lst/stats';
const TIMEOUT_MS = 5000;
const CACHE = 'public, s-maxage=3600, stale-while-revalidate=600';

function send(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.json(obj);
}

const isBtc = a => typeof a === 'string' && (a.startsWith('TBTC') || a.includes('BTC'));

function perPool(list) {
  if (!Array.isArray(list)) return null;
  const pools = [];
  for (const p of list) {
    if (!p || !isBtc(p.asset)) continue;
    const t = Number(p.tvlUsd), a = Number(p.apy);
    if (!isFinite(t) || t <= 0 || !isFinite(a) || a < 0 || a > 1) continue;
    pools.push({ asset: p.asset, apy: a, tvlUsd: t });
  }
  if (!pools.length) return null;
  return { ts: Date.now(), apy: Math.max(...pools.map(p => p.apy)), pools };
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
    const payload = perPool(JSON.parse(await up.text()));
    if (!payload) throw new Error('no BTC pools in upstream');
    res.setHeader('Cache-Control', CACHE);
    return send(res, 200, payload);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return send(res, 503, { ok: false });
  }
};
