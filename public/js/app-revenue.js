/* APP REVENUE, the STRK dashboard's selector (2026-09-08).

   Chain-level app revenue for Starknet from growthepie (CC BY 4.0), the
   figure the strk page's dashboard renders as "App revenue · 365D SUM".
   THIS FILE IS THAT SELECTOR: it was inline in public/strk.html, and the
   landing's hero band needs the very same number under the very same label,
   so it moved here and the page now delegates to it. One fetch, one cache
   key, one window rule; two surfaces that cannot disagree.

   Pipeline, unchanged from the page:
     1. the full-history export, filtered to Starknet's app_fees_usd rows,
        as daily [ms, usd] pairs, ascending;
     2. weeklySum() buckets those into calendar weeks, Monday to Sunday UTC
        (the dashboard plots weekly bars);
     3. windowSum() keeps the weeks whose start falls inside the window and
        adds them up, which is exactly what the chart header sums for the
        selected range. 365 days is the dashboard's 1Y.

   The cache is the page's own: the same 'apprev_gtp' key under the same
   localStorage prefix at the same one-hour TTL, so a reader who has seen
   either page warms the other and neither refetches.

   An ES module for the landing's bundle, and it hands itself to
   window.STRK20AppRevenue so the static page's classic inline engine can
   call it. ATTRIBUTION: growthepie, CC BY 4.0. The dashboard credits it on
   the chart's source line; any other surface owes the same credit. */

/** growthepie's full-history app-revenue export (CC BY 4.0). */
export const GROWTHEPIE_APP_REVENUE = 'https://api.growthepie.com/v1/export/app_revenue.json';
export const GROWTHEPIE_CREDIT = { name: 'growthepie', url: 'https://www.growthepie.com', licence: 'CC BY 4.0' };

const DAY = 86400000;
/** the page's TTL['30D'] and its cache prefix, so the store is shared */
const TTL_MS = 36e5;
const STORE = 'strkSeriesCache_v1:';
const KEY = 'apprev_gtp';

const memo = {};

/** the page's cached(): memo, then localStorage, then the network, and a
 *  stale entry rather than nothing if the network fails */
function cached(key, ttl, fetcher) {
  if (memo[key] && Date.now() - memo[key].t < ttl) return Promise.resolve(memo[key].d);
  let st = null;
  try { st = JSON.parse(localStorage.getItem(STORE + key)); } catch (e) {}
  if (st && Date.now() - st.t < ttl) { memo[key] = st; return Promise.resolve(st.d); }
  return fetcher().then((d) => {
    const e = { t: Date.now(), d: d };
    memo[key] = e;
    try { localStorage.setItem(STORE + key, JSON.stringify(e)); } catch (err) {}
    return d;
  }).catch((err) => { if (st) { memo[key] = st; return st.d; } throw err; });
}

function gj(url) { return fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); }); }

/** daily [[ms,v]] -> calendar-week (Mon to Sun, UTC) sums */
export function weeklySum(a) {
  const w = {};
  a.forEach((p) => {
    const d = new Date(p[0]);
    const dow = (d.getUTCDay() + 6) % 7;
    const ws = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
    w[ws] = (w[ws] || 0) + p[1];
  });
  return Object.keys(w).map((k) => [+k, w[k]]).sort((x, y) => x[0] - y[0]);
}

/**
 * The daily series: growthepie's export filtered to Starknet's
 * app_fees_usd rows. Cached under the dashboard's own key.
 */
export function appRevenueSeries() {
  return cached(KEY, TTL_MS, () => gj(GROWTHEPIE_APP_REVENUE)
    .then((a) => a
      .filter((r) => r.origin_key === 'starknet' && r.metric_key === 'app_fees_usd' && isFinite(r.value))
      .map((r) => [Date.parse(r.date), r.value])
      .sort((x, y) => x[0] - y[0])));
}

/** the chart header's rule: sum the bars whose start falls in the window */
export function windowSum(pts, days) {
  const cut = days === Infinity ? -Infinity : Date.now() - days * DAY;
  return pts.filter((p) => p[0] >= cut && isFinite(p[1])).reduce((a, p) => a + p[1], 0);
}

/**
 * The dashboard's "App revenue · 365D SUM": the weekly bars inside the 1Y
 * window, added up. Already a trailing-365-day figure, so nothing
 * annualizes it. Throws if the series is empty, rather than reporting zero.
 */
export const WINDOW_DAYS = 365;

export function appRevenue365() {
  return appRevenueSeries().then((daily) => {
    const weekly = weeklySum(daily);
    if (!weekly.length) throw new Error('app revenue series empty');
    const usd = windowSum(weekly, WINDOW_DAYS);
    if (!isFinite(usd) || usd <= 0) throw new Error('app revenue window empty');
    return { usd: usd, weeks: weekly.filter((p) => p[0] >= Date.now() - WINDOW_DAYS * DAY).length, days: WINDOW_DAYS };
  });
}

if (typeof window !== 'undefined') {
  window.STRK20AppRevenue = {
    GROWTHEPIE_APP_REVENUE, GROWTHEPIE_CREDIT, WINDOW_DAYS,
    appRevenueSeries, weeklySum, windowSum, appRevenue365
  };
}
