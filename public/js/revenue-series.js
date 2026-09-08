/* STRK20 PROTOCOL REVENUE, the derivations (2026-09-08).

   One source for every surface that reads the pool's revenue series, the
   /agg/tvl-history days[] the privacy page's section 05 Revenue KPI already
   reads. Pure functions over that array: no fetching, no DOM, no formatting.

   The series is CUMULATIVE since launch. The privacy page differences it to
   draw its daily bars and keeps the raw value as the cumulative headline;
   dailyRevenue() below is that same differencing, so the two cannot disagree.

   An ES module for the landing's bundle, and it also hands itself to
   window.STRK20Revenue so a static page can load it with
   <script type="module" src="js/revenue-series.js"></script> and read the
   same functions from its inline engine. */

/**
 * The daily series from the cumulative one: privacy section 05's own
 * differencing, `Math.max(0, cum[i] - cum[i-1])`. Rows without a numeric
 * feesUsd are dropped first, so a gap never turns into a negative day.
 * The first row keeps `first: true`: its delta is measured against nothing
 * before it, so it cannot be attributed to a single day unless the series
 * genuinely starts at launch.
 */
export function dailyRevenue(days) {
  const rows = (days || []).filter((d) => d && typeof d.feesUsd === 'number');
  return rows.map((d, i) => ({
    date: d.date,
    usd: Math.max(0, d.feesUsd - (i ? rows[i - 1].feesUsd : 0)),
    cumUsd: d.feesUsd,
    first: i === 0
  }));
}

/** The cumulative headline the privacy page's REVENUE cell prints. */
export function cumulativeRevenue(days) {
  const daily = dailyRevenue(days);
  return daily.length ? daily[daily.length - 1].cumUsd : null;
}

/**
 * The annualized run-rate: the trailing COMPLETE days of daily revenue,
 * at most WINDOW_DAYS of them, summed and scaled to a year by 365 / n.
 *
 *   - "complete" excludes the current UTC day, which is still accruing (the
 *     series always carries a partial row for today);
 *   - the first row is excluded, because its delta has nothing before it;
 *   - a short series annualizes over the days it actually has, and reports
 *     that count so the label can say so. Missing days are NEVER padded with
 *     zeros: padding would divide real revenue by an invented denominator and
 *     under-report the rate.
 *
 * Returns null when no complete day is available, never a partial figure.
 * `usd` is a RUN-RATE, not realized revenue.
 */
export const WINDOW_DAYS = 30;
export const YEAR_DAYS = 365;

export function annualizedRevenue(days, opts) {
  const options = opts || {};
  const today = options.today || new Date().toISOString().slice(0, 10);
  const complete = dailyRevenue(days).filter((d) => !d.first && d.date && d.date < today);
  if (!complete.length) return null;
  const window = complete.slice(-(options.windowDays || WINDOW_DAYS));
  const sum = window.reduce((total, d) => total + d.usd, 0);
  return {
    usd: sum * YEAR_DAYS / window.length,
    sum: sum,
    days: window.length,
    from: window[0].date,
    to: window[window.length - 1].date
  };
}

if (typeof window !== 'undefined') {
  window.STRK20Revenue = { dailyRevenue, cumulativeRevenue, annualizedRevenue, WINDOW_DAYS, YEAR_DAYS };
}
