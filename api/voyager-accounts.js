/* DORMANT Route 2 scaffold — nothing on the site calls this endpoint.

   Gate-test outcomes (2026-08-10): Voyager's Cloudflare challenges both
   container egress AND Vercel egress (this function, deployed, returned
   upstream 403 cf-mitigated: challenge), but PASSES GitHub Actions runner
   IPs. The shipped pipeline is therefore the daily Actions seed refresh
   (.github/workflows/refresh-accounts-seed.yml writing
   assets/data/voyager-accounts-seed.json). This file stays only as the
   ready scaffold for the documented keyed API (api.voyager.online) should
   a VOYAGER_API_KEY ever be provisioned: keyed when the env var exists,
   the (gated) public feed otherwise.

   Response contract, stable for the client regardless of route:
     200 { source: 'voyager-keyed'|'voyager-public',
           head: <number>,                    // latest cumulative count
           days: [[msUtc, cumulativeCount]] } // ascending, daily
     502 { error, upstreamStatus, cfMitigated, bodyHead } // client keeps seed

   Secrets: VOYAGER_API_KEY (and optional VOYAGER_API_ENDPOINT while their
   docs stay gated) live in Vercel env vars, server side only, never
   committed and never echoed (same rules as api/publish.js).

   Cache: s-maxage=3600 + stale-while-revalidate so the CDN absorbs page
   traffic; the metric moves ~300/day, an hour of staleness is nothing. */
'use strict';

const PUBLIC_URL = 'https://voyager.online/api/daily-stats?metrics=account_contracts&timerange=';
const TIMERANGES = ['1d', '1w', '1m', '1y', 'max']; // their validated enum (verified 2026-08-10)

// browser-like headers for the public feed; harmless on the keyed API
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://voyager.online/analytics?page=accounts'
};

/* payload -> ascending [[ms, cumulative]]. Shape pinned from the live feed
   (2026-08-10): { items: [{ date, value, commulative_value, ... }] } — the
   running total is 'commulative_value' (their spelling; the fixed spelling
   is accepted too), 'value' is per-day new accounts and the per-wallet
   splits are never taken. Same parser as scripts/refresh-accounts-seed.mjs;
   keep the two in step. */
function normalize(payload){
  const rows = payload && Array.isArray(payload.items) ? payload.items : null;
  if (!rows || !rows.length) return null;
  const out = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') return null;
    const ms = Date.parse(r.date);
    const v = isFinite(r.commulative_value) ? Number(r.commulative_value)
      : isFinite(r.cumulative_value) ? Number(r.cumulative_value) : null;
    if (!isFinite(ms) || v == null) return null;
    out.push([ms, v]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET only' }); return; }
  const tr = TIMERANGES.indexOf(req.query && req.query.timerange) >= 0 ? req.query.timerange : 'max';

  const key = process.env.VOYAGER_API_KEY || '';
  let url, source, headers;
  if (key) {
    // Route 2: documented API. Their docs are Cloudflare-gated too, so the
    // exact path is provisional until read with the key in hand; override
    // via VOYAGER_API_ENDPOINT without a redeploy of this logic.
    url = process.env.VOYAGER_API_ENDPOINT || 'https://api.voyager.online/beta/analytics/daily-stats?metrics=account_contracts&timerange=' + tr;
    source = 'voyager-keyed';
    headers = Object.assign({}, HEADERS, { 'x-api-key': key, 'apikey': key });
  } else {
    url = PUBLIC_URL + tr;
    source = 'voyager-public';
    headers = HEADERS;
  }

  try {
    const up = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    const text = await up.text();
    if (!up.ok) {
      res.status(502).json({
        error: 'upstream ' + up.status,
        upstreamStatus: up.status,
        cfMitigated: up.headers.get('cf-mitigated') || null,
        bodyHead: text.slice(0, 300)
      });
      return;
    }
    const days = normalize(JSON.parse(text));
    if (!days) { res.status(502).json({ error: 'unrecognized upstream shape', bodyHead: text.slice(0, 300) }); return; }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ source, head: days[days.length - 1][1], days });
  } catch (e) {
    res.status(502).json({ error: String(e && e.message || e).slice(0, 200) });
  }
};
