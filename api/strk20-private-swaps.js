/* Same-origin proxy for the STRK20 dashboard's Starkscan sync (Vercel function).
   GET /api/strk20-private-swaps feeds /privacy section 05: the VOLUME SWAPPED
   KPI, the private swap chart, AVNU's private row in the per-app table, and
   the deposit / withdrawal / swap counts of the activity card.

   Upstream is the endpoint strk20.starknet.io/dashboard itself reads for the
   same figures (its dashboard/modules/starkscan-sync.js):
     https://strk20.starknet.io/api/dashboard-sync?source=starkscan
   It sends no CORS header, so a browser on this site cannot call it directly.

   The dashboard's own acceptance rules are applied here, unchanged:
     - source === 'starkscan'
     - poolStatus.materializationFresh === true
     - fetchedAt no more than 90s old (and not in the future by > 5 min)
     - privateSwaps: no error, coverage.status === 'observed_only', a finite
       observedTotal.volumeUsd
   Anything else is a 503, never a partial or remembered payload: the page
   then shows its unavailable state, as the dashboard does.

   Response contract (strings from upstream become numbers):
     200 { fetchedAt, coverage: 'observed_only', definition,
           total: { volumeUsd, swapCount },
           venues: { <protocol>: { name, volumeUsd, swapCount } },
           daily: [{ date, volumeUsd, swapCount }],   // last 30 UTC days
           pool: { depositCount, withdrawalCount } }
     503 { ok: false }

   CDN-cached 5 minutes; the page re-checks fetchedAt itself. */
'use strict';

const UPSTREAM = 'https://strk20.starknet.io/api/dashboard-sync?source=starkscan';
const TIMEOUT_MS = 4000; // per attempt; two attempts fit the 10s function budget
const CACHE = 'public, s-maxage=300, stale-while-revalidate=120';

function send(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.json(obj);
}

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function shape(d, now) {
  if (!d || d.source !== 'starkscan') return null;
  if (!d.poolStatus || d.poolStatus.materializationFresh !== true) return null;
  const age = now - Date.parse(d.fetchedAt);
  if (!Number.isFinite(age) || age < -300000 || age > 90000) return null;
  const ps = d.privateSwaps;
  if ((d.errors && d.errors.privateSwaps) || !ps || !ps.coverage || ps.coverage.status !== 'observed_only') return null;
  const totalUsd = num(ps.observedTotal && ps.observedTotal.volumeUsd);
  if (totalUsd === null || totalUsd < 0) return null;

  const venues = {};
  for (const v of Array.isArray(ps.venues) ? ps.venues : []) {
    const vol = num(v && v.volumeUsd);
    if (!v || typeof v.protocol !== 'string' || vol === null) continue;
    venues[v.protocol] = { name: String(v.protocolName || v.protocol), volumeUsd: vol, swapCount: num(v.swapCount) };
  }
  const daily = (Array.isArray(ps.daily) ? ps.daily : [])
    .map(x => ({ date: x && x.date, volumeUsd: num(x && x.volumeUsd), swapCount: num(x && x.swapCount) }))
    .filter(x => typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.volumeUsd !== null);

  return {
    fetchedAt: d.fetchedAt,
    coverage: 'observed_only',
    definition: typeof ps.definition === 'string' ? ps.definition : '',
    total: { volumeUsd: totalUsd, swapCount: num(ps.observedTotal.swapCount) },
    venues,
    daily,
    pool: { depositCount: num(d.poolStatus.depositCount), withdrawalCount: num(d.poolStatus.withdrawalCount) }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false });
  }
  /* Upstream re-materializes about once a minute, so a read can land near
     the 90s gate (ages of 56-58s were sampled on 2026-11-16). One retry
     after a short pause picks up the next materialization instead of
     failing the cell for the next five CDN minutes. */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt) await new Promise(r => setTimeout(r, 1000));
      const up = await fetch(UPSTREAM, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!up.ok) throw new Error('upstream ' + up.status);
      const payload = shape(JSON.parse(await up.text()), Date.now());
      if (!payload) throw new Error('upstream failed the dashboard acceptance rules');
      res.setHeader('Cache-Control', CACHE);
      return send(res, 200, payload);
    } catch (e) { /* fall through to the retry, then the 503 */ }
  }
  res.setHeader('Cache-Control', 'no-store');
  return send(res, 503, { ok: false });
};

module.exports.shape = shape;
