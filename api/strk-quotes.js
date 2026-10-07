/* Same-origin proxy for CompareSTRK's live STRK venue quotes (Vercel function).
   GET /api/strk-quotes[?size=100|1000|10000|100000|1000000] feeds the venue comparison device
   under section 05 of /strk. Upstream is CompareSTRK by avnu, whose "How it
   works" page declares https://www.comparestrk.com/api/quotes public.

   Size probe (2026-10-07): of tradeSizeUsd, size, amount and usd, only `size`
   changes the upstream tradeSizeUsd (1000 -> 1000, 10000 -> 10000); the other
   three are ignored and return the $100 default. Only the five whitelisted
   sizes are forwarded; anything else falls back to 100. At $100K and $1M
   upstream answers with partial fills and off-market venues (checked
   2026-10-07); those flags pass through untouched.

   Response contract:
     200 { ts, tradeSizeUsd, includeFees, marketPrice, isLive,
           venues: [{ source, type, chain, quote, price, venueSpreadBps,
                      feePercent, route, isConnected, isStale, isOffMarket,
                      isPartialFill, fillPercent, ageMs }],
           stale? }                 // stale:true = last-good copy, upstream failed
     503 { ok: false }              // upstream failed and no last-good copy yet

   Last-good copies are held in memory per size, so they live as long as the
   warm function instance does; a cold instance with a failing upstream 503s.
   Upstream answers CEX venues with chain set to a dash glyph (U+2014) as a
   placeholder; that is normalized to null so the client never prints it. */
'use strict';

const UPSTREAM = 'https://www.comparestrk.com/api/quotes';
const SIZES = [100, 1000, 10000, 100000, 1000000];
const TIMEOUT_MS = 4000;
const CACHE = 'public, s-maxage=5, stale-while-revalidate=20';

const lastGood = {}; // size -> trimmed payload

function send(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.json(obj);
}

const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
const str = v => (typeof v === 'string' && v.trim() && !/^[\u2012-\u2015-]+$/.test(v.trim()) ? v.trim() : null);

function trim(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.venues)) return null;
  const ts = num(d.timestamp);
  if (ts == null) return null;
  return {
    ts,
    tradeSizeUsd: num(d.tradeSizeUsd),
    includeFees: d.includeFees === true,
    marketPrice: num(d.marketPrice),
    isLive: d.isLive === true,
    venues: d.venues.filter(v => v && typeof v === 'object' && str(v.source)).map(v => ({
      source: str(v.source),
      type: v.type === 'CEX' || v.type === 'DEX' ? v.type : null,
      chain: str(v.chain),
      quote: str(v.quote),
      price: num(v.price),
      venueSpreadBps: num(v.venueSpreadBps),
      feePercent: num(v.feePercent),
      route: str(v.route),
      isConnected: v.isConnected === true,
      isStale: v.isStale === true,
      isOffMarket: v.isOffMarket === true,
      isPartialFill: v.isPartialFill === true,
      fillPercent: num(v.fillPercent),
      ageMs: num(v.ageMs)
    }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false });
  }
  const asked = Number(req.query && req.query.size);
  const size = SIZES.indexOf(asked) >= 0 ? asked : 100;

  try {
    const up = await fetch(UPSTREAM + '?size=' + size, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!up.ok) throw new Error('upstream ' + up.status);
    // upstream sometimes answers a burst with an empty 200 body; JSON.parse
    // throws on it and the request is treated as a failure
    const payload = trim(JSON.parse(await up.text()));
    if (!payload) throw new Error('unrecognized upstream shape');
    lastGood[size] = payload;
    res.setHeader('Cache-Control', CACHE);
    return send(res, 200, payload);
  } catch (e) {
    const good = lastGood[size];
    if (good) {
      res.setHeader('Cache-Control', CACHE);
      return send(res, 200, Object.assign({}, good, { stale: true }));
    }
    res.setHeader('Cache-Control', 'no-store');
    return send(res, 503, { ok: false });
  }
};
