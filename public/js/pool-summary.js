/* THE STRK20 POOL SUMMARY, one module for every surface (2026-09-20).

   Every pool figure on the site (privacy.html section 05 KPI row, strk.html's
   "TVL in STRK20 pool" cell, btcfi.html's "Encrypted strkBTC" card, the
   landing's baseline band) reads the STRK20 dashboard backend's
   /agg/pool-summary. Until this file, each page fetched it and formatted it
   on its own, so the same number could print four ways and each page held
   its own idea of what the payload contains. THIS FILE IS THE ONE PLACE
   BOTH HAPPEN: one fetch (cache-busted, the pages' own rule), one reader
   that names every field a page renders and returns null for anything the
   payload lacks, one set of printers.

   WHAT THE PAYLOAD IS. The backend (strk20-dashboard-production.up.railway.app)
   declares its own provenance: tvlSource "starkscan-finalized" and every
   perToken.source "starkscan" (balances are StarkScan's finalized pool
   balances, proxied server-side), every perToken.priceSource "avnu" (the
   USD conversion). tvlUsd is the sum of the priced rows' balanceUsd;
   unpriced rows contribute zero, which is why priceCoverageComplete can be
   false and tvlUsd is then a LOWER BOUND. tvlAsOf / tvlAsOfBlock is the
   block the balances were read at: THAT is the data's time, not the
   moment a browser fetched it. perToken lists the tokens currently
   holding a balance in the pool (37 on 2026-09-20; the 8 tokens that
   entered and were fully withdrawn are absent); it is keyed by contract
   address, so one symbol can appear twice (USDC, wstETH).

   NO LITERAL FALLBACK. A page that cannot get a figure renders
   UNAVAILABLE_VALUE and its own "data unavailable" sub, never a remembered number.

   An ES module for the landing's bundle (src/lib/data/live-sources.ts
   imports it), and it hands itself to window.STRK20PoolSummary so the
   static pages' classic inline engines can call it (the app-revenue.js
   pattern). */

/** the backend, and the one endpoint this module reads */
export const STRK20_API = 'https://strk20-dashboard-production.up.railway.app';
export const POOL_SUMMARY_PATH = '/agg/pool-summary';
export const POOL_SUMMARY_URL = STRK20_API + POOL_SUMMARY_PATH;

/** the unavailable state's value: an em dash where the number would be. The
    subtitle ("data unavailable") is each page's own, cased to match its
    neighbours (caps on privacy's KPI row, sentence case on strk and btcfi). */
export const UNAVAILABLE_VALUE = '—';

/** the pages' cache-busting rule: every call pulls fresh numbers */
export function bust(url) {
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
}

/**
 * The raw payload. Rejects on a non-2xx, so a caller's catch is the one
 * place that decides what an outage looks like (the unavailable state).
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<any>}
 */
export function fetchPoolSummary(fetchImpl) {
  const f = fetchImpl || fetch;
  return f(bust(POOL_SUMMARY_URL)).then((r) => {
    if (!r.ok) throw new Error(POOL_SUMMARY_PATH + ' ' + r.status);
    return r.json();
  });
}

/** a finite number or null: no field ever reaches a page as NaN or a string */
function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : null;
}

/**
 * Every field a page renders, read once, null where the payload lacks it.
 *
 *   tvlUsd                 shielded value in USD, sum of priced balances
 *   tvlAsOf                ms since epoch of tvlAsOf (the balances' block time)
 *   tvlAsOfBlock           that block number
 *   userCount              pool users (NOT registrations.totalUsers, a
 *                          different metric; never conflate)
 *   priceCoverageComplete  false when some tokens holding a balance are unpriced
 *   unpricedTokenCount     the payload's own count of those
 *   tokenCount             perToken.length, tokens currently holding a balance
 *   withBalances           perToken rows with balanceRaw > 0 (raw token units,
 *                          so an unpriced token with a real balance counts)
 *   pricedCount            tokenCount - unpricedTokenCount, the payload's own
 *                          statement; falls back to the per-row priced flags
 *   token(symbol)          the first perToken row with that symbol, or null
 *
 * @param {any} s the raw payload
 */
export function readPoolSummary(s) {
  const perToken = s && Array.isArray(s.perToken) ? s.perToken : null;
  const asOf = s && typeof s.tvlAsOf === 'string' ? Date.parse(s.tvlAsOf) : NaN;
  const tokenCount = perToken ? perToken.length : null;
  const unpriced = num(s && s.unpricedTokenCount);
  let pricedCount = null;
  if (tokenCount !== null && unpriced !== null) pricedCount = tokenCount - unpriced;
  else if (perToken) pricedCount = perToken.filter((t) => t && t.priced === true).length;
  return {
    tvlUsd: num(s && s.tvlUsd),
    tvlAsOf: isFinite(asOf) ? asOf : null,
    tvlAsOfBlock: num(s && s.tvlAsOfBlock),
    userCount: num(s && s.userCount),
    priceCoverageComplete: s && typeof s.priceCoverageComplete === 'boolean' ? s.priceCoverageComplete : null,
    unpricedTokenCount: unpriced,
    tokenCount,
    withBalances: perToken ? perToken.filter((t) => t && parseFloat(t.balanceRaw || '0') > 0).length : null,
    pricedCount,
    perToken,
    token: (symbol) => (perToken ? perToken.filter((t) => t && t.symbol === symbol)[0] || null : null),
  };
}

/**
 * Price coverage, the way the payload reports it: complete, or N of M priced.
 * `text` is the shortest truthful form; null when the payload cannot say.
 * @param {ReturnType<typeof readPoolSummary>} r
 */
export function coverage(r) {
  if (!r || r.priceCoverageComplete === null) return null;
  if (r.priceCoverageComplete) return { complete: true, priced: r.pricedCount, total: r.tokenCount, text: '' };
  if (r.pricedCount === null || r.tokenCount === null) return null;
  return { complete: false, priced: r.pricedCount, total: r.tokenCount, text: r.pricedCount + ' of ' + r.tokenCount + ' priced' };
}

/** privacy.html section 05 and the landing band: `$` + the rounded integer with en-US separators */
export function formatShieldedValue(v) {
  return '$' + Math.round(v).toLocaleString('en-US');
}

/** strk.html's abbr(), the dashboard's compact print */
export function abbr(v) {
  v = Math.abs(v);
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

/** strk.html's "TVL in STRK20 pool" cell: `$` + abbr */
export function formatShieldedValueCompact(v) {
  return '$' + abbr(v);
}

/** counts (assets, users): the rounded integer with en-US separators */
export function formatCount(v) {
  return Math.round(v).toLocaleString('en-US');
}

/**
 * How old a data time is, in the pages' caps wording. `at` is the payload's
 * tvlAsOf (ms), never a fetch time.
 * @param {number} at
 * @param {number} [now]
 */
export function ageLabel(at, now) {
  const m = Math.floor(((now === undefined ? Date.now() : now) - at) / 60000);
  return m < 1 ? 'JUST NOW' : m < 60 ? m + ' MIN AGO' : m < 2880 ? Math.floor(m / 60) + ' HR AGO' : Math.floor(m / 1440) + ' DAYS AGO';
}

const api = {
  STRK20_API, POOL_SUMMARY_PATH, POOL_SUMMARY_URL, UNAVAILABLE_VALUE,
  bust, fetchPoolSummary, readPoolSummary, coverage,
  formatShieldedValue, abbr, formatShieldedValueCompact, formatCount, ageLabel,
};
if (typeof window !== 'undefined') window.STRK20PoolSummary = api;
export default api;
