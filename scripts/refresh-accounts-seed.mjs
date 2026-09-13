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
   with diagnostics on stdout and NOTHING written.

   The endpoint's FULL metric vocabulary, enumerated via its own enum
   validator from an Actions runner on 2026-08-11 (one-shot probe workflow,
   retired after recording this): *, transactions_per_block,
   transactions_per_second, max_transactions_per_second, transactions_count,
   classes_count, events_count, messages_count, contracts_count,
   cairo_1_classes, cairo_1_contracts, account_contracts_count,
   active_account_contracts, l1_block_creation_time, l2_block_creation_time,
   proof_generation_time, fee_per_block, tvl, account_contracts,
   active_accounts, gas_per_block, user_operations_count,
   user_operations_per_block, user_operations_per_second,
   max_user_operations_per_second, account_calls_count,
   account_calls_per_block, account_calls_per_second,
   max_account_calls_per_second, eth_transfer_fee, erc20_transfer_fee,
   swap_fee, nft_mint_fee, starkgate_eth_deposit_fee,
   starkgate_eth_withdrawal_fee, l1_block_verification_cost.
   NO token-holders metric and NO monthly-users metric exist here; checked,
   not missed. active_accounts is DAILY actives by wallet type (1,651 on
   2026-08-09), a different definition from growthepie daa (15.3K same day),
   never conflate the two.

   TOKEN HOLDERS via Starkscan, attempted 2026-08-11 with the provisioned
   STARKSCAN_API_KEY (repo secret): the key authenticates and reads the
   read-tier endpoints fine (/v1/SN_MAIN/status and /token/{STRK} both 200,
   x-ratelimit-limit 120 light;w=60), but BOTH holders endpoints
   (/token/{token}/holders and /holders/analytics, the one carrying
   holderCount) returned 403 {"code":"forbidden","docSlug":"api/auth"} with
   either accepted auth header. The public OpenAPI spec marks them
   x-starkscan-key-tier: partner; the live API enforces it. The metric
   stays unbuilt until a partner-tier key exists; no alternative free
   holder-count source is known (explorers bot-gated, Token Terminal
   keyed). STRK token address verified: 0x04718f5a0fc34cc1af16a1cdee98ffb2
   0c31f5cd61d6ab07201858f4287c938d, chain path segment SN_MAIN, header
   X-Starkscan-Api-Key.

   MONTHLY USERS via Starkscan, probed live 2026-08-11 (read tier): does
   NOT exist there either. /v1/{chain}/metrics/network (read tier) has
   monthly buckets on window=all, but (1) its activeSenderCount is NOT an
   active-users measure: July 2026 monthly bucket = 984 vs one daily
   bucket = 674 vs growthepie daa ~15K the same period, so it counts some
   much narrower sender notion, definition undocumented; (2) coverage was
   partial with the materializer lagging 719,241 blocks (~2 weeks) and
   only ONE monthly bucket served; (3) window=all is spec-bounded to the
   latest 9,000 prepared hours, no deep history. /metrics/wallets (read,
   beta) returned coverageStatus "unavailable" (source_contract_mismatch)
   with empty items. The MAU audit trail is therefore complete: growthepie
   computes maa but serves it only on paid/gated endpoints; Voyager's
   vocabulary has no monthly metric; Starkscan has no usable one at any
   accessible tier. No free MAU source exists as of 2026-08-11. */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'data', 'voyager-accounts-seed.json');
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
