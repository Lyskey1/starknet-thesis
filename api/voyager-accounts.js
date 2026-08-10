/* Read-only proxy for the ACCOUNT CONTRACTS metric (strk.html card + chart).

   Why a proxy: every Voyager surface is Cloudflare-gated for non-browser
   clients (gate-tested from a clean container 2026-08-10: cf-mitigated:
   challenge on voyager.online/api/daily-stats). This function exists to
   (Route 1) test whether Vercel's egress passes where the container's did
   not, and (Route 2) carry the documented keyed API (api.voyager.online)
   once VOYAGER_API_KEY is provisioned. Upstream order: keyed when the env
   var exists, public feed otherwise.

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
const TIMERANGES = ['1w', '1m', 'all'];

// browser-like headers for the public feed; harmless on the keyed API
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://voyager.online/analytics?page=accounts'
};

/* Tolerant normalizer: Voyager's exact payload shape is unverifiable while
   their docs are gated, so accept any array of rows carrying one date-like
   and one number-like field, or {metric: [rows]} / {data: [rows]} wrappers.
   Returns ascending [[ms, value]] or null when nothing matches. */
function normalize(payload){
  let rows = null;
  if (Array.isArray(payload)) rows = payload;
  else if (payload && typeof payload === 'object') {
    for (const k of ['account_contracts', 'accountContracts', 'data', 'items', 'days', 'result']) {
      if (Array.isArray(payload[k])) { rows = payload[k]; break; }
      if (payload[k] && typeof payload[k] === 'object') {
        for (const k2 of Object.keys(payload[k])) {
          if (Array.isArray(payload[k][k2])) { rows = payload[k][k2]; break; }
        }
        if (rows) break;
      }
    }
  }
  if (!rows || !rows.length) return null;
  const out = [];
  for (const r of rows) {
    if (Array.isArray(r) && r.length >= 2 && isFinite(r[1])) {
      const ms = r[0] > 1e12 ? r[0] : r[0] * 1000;
      out.push([ms, Number(r[1])]);
      continue;
    }
    if (r && typeof r === 'object') {
      let ms = null, v = null;
      for (const k of Object.keys(r)) {
        const val = r[k];
        if (ms == null && /date|day|time/i.test(k)) {
          const t = typeof val === 'number' ? (val > 1e12 ? val : val * 1000) : Date.parse(val);
          if (isFinite(t)) ms = t;
        } else if (v == null && isFinite(val) && !/date|day|time/i.test(k)) {
          v = Number(val);
        }
      }
      if (ms != null && v != null) out.push([ms, v]);
    }
  }
  if (!out.length) return null;
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET only' }); return; }
  const tr = TIMERANGES.indexOf(req.query && req.query.timerange) >= 0 ? req.query.timerange : 'all';

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
