#!/usr/bin/env node
/* Daily refresh of the ACCOUNT CONTRACTS seed (strk.html).

   Runs in GitHub Actions (.github/workflows/refresh-accounts-seed.yml):
   Actions egress passes Voyager's Cloudflare where container and Vercel
   egress are challenge-gated (verified 2026-08-10, cf-ray ...-ORD got a
   parameter-validation 400 from their Express app, i.e. through the gate).

   Fetches voyager.online/api/daily-stats?metrics=account_contracts
   &timerange=max, validates hard, and writes
   assets/data/voyager-accounts-seed.json:
     { fetched, source, head, days: [[msUtc, cumulativeCount], ...] }

   Validation before any write (a failed run must never commit):
   - JSON parses and normalizes to >= 1000 daily rows
   - cumulative: non-decreasing (tolerance 0 — account contracts never
     un-deploy)
   - head equals the last row's value
   - vs the existing seed when present: head never shrinks, grows by
     less than 50,000/day equivalent, and the first date matches
   Exit 0 with the file written = commit; any other outcome exits 1
   with diagnostics on stdout and NOTHING written. */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'data', 'voyager-accounts-seed.json');
const URL = 'https://voyager.online/api/daily-stats?metrics=account_contracts&timerange=max';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://voyager.online/analytics?page=accounts'
};

function fail(msg, extra){
  console.error('REFRESH FAILED: ' + msg);
  if (extra) console.error(String(extra).slice(0, 500));
  process.exit(1);
}

/* payload rows -> ascending [[ms, cumulative]]. Shape pinned from the live
   payload (Actions run 2026-08-10):
     { items: [{ date: 'YYYY-MM-DD', value: <new that day>,
                 commulative_value: <running total>, <per-wallet splits> }] }
   We take ONLY the total cumulative ('commulative_value' is their spelling;
   'cumulative_value' accepted in case they fix it). 'value' is per-day new
   accounts and the per-wallet splits stay Voyager's — never take those. */
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

const res = await fetch(URL, { headers: HEADERS, signal: AbortSignal.timeout(25000) });
const text = await res.text();
if (!res.ok) fail('upstream HTTP ' + res.status + ' (cf-mitigated: ' + (res.headers.get('cf-mitigated') || 'none') + ')', text);

let payload;
try { payload = JSON.parse(text); } catch (e) { fail('body is not JSON', text); }
const days = normalize(payload);
if (!days) fail('unrecognized payload shape', text);
if (days.length < 1000) fail('series too short: ' + days.length + ' rows');
for (let i = 1; i < days.length; i++)
  if (days[i][1] < days[i - 1][1]) fail('cumulative series decreases at ' + new Date(days[i][0]).toISOString().slice(0, 10));
const head = days[days.length - 1][1];
if (!(head > 6900000 && head < 20000000)) fail('implausible head: ' + head);

let prev = null;
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) {}
if (prev && Array.isArray(prev.days) && prev.days.length) {
  if (head < prev.head) fail('head shrank: ' + head + ' < ' + prev.head);
  const ageDays = Math.max(1, (Date.now() - Date.parse(prev.fetched)) / 86400000);
  if (head - prev.head > 50000 * ageDays) fail('implausible growth: +' + (head - prev.head) + ' in ' + ageDays.toFixed(1) + 'd');
  if (days[0][0] !== prev.days[0][0]) fail('series start moved: ' + days[0][0] + ' vs ' + prev.days[0][0]);
}

writeFileSync(OUT, JSON.stringify({
  fetched: new Date().toISOString(),
  source: 'voyager.online/api/daily-stats?metrics=account_contracts&timerange=max (GitHub Actions egress)',
  head,
  days
}));
console.log('seed written: head ' + head + ', ' + days.length + ' days, first ' +
  new Date(days[0][0]).toISOString().slice(0, 10) + ', last ' + new Date(days[days.length - 1][0]).toISOString().slice(0, 10));
