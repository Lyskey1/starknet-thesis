#!/usr/bin/env node
/* Daily refresh of the PER-APP ACTIVE USERS seed (strk.html, Apps group).

   Runs in GitHub Actions (.github/workflows/refresh-prism-dau.yml) for the
   same reason every other seed here does: NOTHING on the page may fetch a
   third party at runtime. The reader's browser only ever reads a committed
   same-origin JSON file, so a bad day upstream cannot break the page, cannot
   slow it, and cannot see our readers.

   WHOSE DATA THIS IS. api-internal-prism.aegisanalytics.xyz is an INTERNAL,
   undocumented endpoint: no version in the path, no cache-control, and every
   documentation path on the host 404s including the root. Aegis's terms are
   marked Draft and say "All Rights Reserved"; they are silent on
   redistribution. The data is theirs, which is why the card credits "Prism by
   Aegis" in the panel itself with a link to their dashboard rather than in a
   footnote, and why the metric is quoted in their words rather than restated
   in ours. If Aegis publish the key-based API their docs advertise, move BASE
   to it and send the key from a repository secret rather than staying on this
   host. If Aegis ask us to stop, this is one workflow and one panel to
   remove.

   THE DEFINITION IS STILL OUTSTANDING. We do not know how uniqueUsers is
   computed and we do not invent one. The seed carries Aegis's OWN wording
   verbatim and the card prints that string attributed to them. Two things about their data are
   unexplained and are the subject of the outstanding question to Aegis:
     - rows where users exceed transactions (LayerSwap 141 users / 54 txs and
       Bitget 40/39 on 2026-08-22), which a plain "addresses that sent a
       transaction" definition cannot produce;
     - Focus Tree reading 26,297 unique users over 24h and 26,298 over 7d on
       2026-08-21, i.e. a field that does not compose across windows.
   Their own subtitle says "user engagement and account creations", and the
   account-creations half is the likeliest explanation for the first: an
   account created by a bridge or exchange deposit is a user that never sent
   anything. That is a HYPOTHESIS and is not written to the seed as fact.

   Validation before any write, because a failed run must commit nothing and
   leave the last good seed in place:
     - HTTP 200, JSON parses, success === true
     - meta.window is the window we asked for
     - at least MIN_APPS rows survive shape checks
     - every kept row: non-empty name, finite users >= 0, finite txs >= 0
     - the leader holds less than 100% and more than 0 of the tracked total
     - against the existing seed when present: at least half the app names
       still appear, so a shape change upstream fails loudly instead of
       silently replacing the ranking with something else
   Exit 0 with the file written = commit. Anything else exits 1 with
   diagnostics and writes nothing. */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const BASE = 'https://api-internal-prism.aegisanalytics.xyz/api/stats/leaderboard';
const WINDOW = '24h';
const OUT = 'public/assets/data/prism-dau-seed.json';
const MIN_APPS = 8;
const KEEP = 12; // the card shows ten; one spare either side for ties/churn

/* THE API RETURNS NO DEFINITION, so this one is quoted by hand from the
   dashboard heading and carries its own checked date. It is a claim a human
   verified on a day, not a live field, and the seed says so: if Aegis reword
   the heading this string keeps saying the old thing until someone re-reads
   it. Re-read it, update the text, and move DEFINITION_CHECKED with it. */
const DEFINITION_TEXT = 'Daily Active Users - rankings by user engagement and account creations';
const DEFINITION_FROM = 'https://aegis-starknet-dashboard.vercel.app/leaderboard/dau-leaderboard';
const DEFINITION_CHECKED = '2026-08-22';

const die = (msg) => { console.error('FAIL: ' + msg); process.exit(1); };

const url = `${BASE}?category=all&window=${WINDOW}`;
const res = await fetch(url, { headers: { accept: 'application/json' } }).catch((e) => die('fetch threw: ' + e.message));
if (!res.ok) die(`HTTP ${res.status} from ${url}`);

const body = await res.json().catch((e) => die('response is not JSON: ' + e.message));
if (body.success !== true) die('success !== true');
if (!Array.isArray(body.data)) die('data is not an array');
/* their meta is load-bearing: it is the only thing telling us which window
   these numbers describe, and a ranking labelled with the wrong window is
   worse than no ranking. Checked in three steps so a failure says which. */
if (!body.meta || typeof body.meta !== 'object' || Array.isArray(body.meta)) die('no meta object on the response');
if (typeof body.meta.window !== 'string') die(`meta.window is absent or not a string (got ${typeof body.meta.window})`);
if (body.meta.window !== WINDOW) die(`meta.window is "${body.meta.window}", expected "${WINDOW}"`);

const apps = body.data
  .map((r) => ({
    name: typeof r.name === 'string' ? r.name.trim() : '',
    category: typeof r.category === 'string' ? r.category.trim() : '',
    users: Number(r.uniqueUsers),
    txs: Number(r.txCount),
  }))
  .filter((r) => r.name && Number.isFinite(r.users) && r.users >= 0 && Number.isFinite(r.txs) && r.txs >= 0)
  .sort((a, b) => b.users - a.users);

if (apps.length < MIN_APPS) die(`only ${apps.length} usable rows, need ${MIN_APPS}`);

const total = apps.reduce((a, r) => a + r.users, 0);
if (!(total > 0)) die('tracked total users is zero');
if (apps[0].users > total) die('leader exceeds the total, arithmetic is impossible');

if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    const before = new Set((prev.apps || []).map((a) => a.name));
    if (before.size) {
      const kept = [...before].filter((n) => apps.some((a) => a.name === n)).length;
      if (kept * 2 < before.size) die(`only ${kept} of ${before.size} known apps still present, refusing to replace the ranking`);
    }
  } catch { /* an unreadable previous seed is not a reason to block a good fetch */ }
}

/* NOTHING OF OURS SITS BESIDE ANYTHING OF THEIRS. sourceMeta is Aegis's own
   meta object copied through untouched, whatever shape it arrives in;
   everything we compute or assume lives under derived, so a later reader can
   never mistake one of our numbers for one of their fields. That confusion
   was real: the seed used to write a top-level `window` that looked like
   their meta.window and was in fact our own constant, guaranteed equal only
   by the guard above. */
const out = {
  endpoint: url,
  attribution: { source: 'Prism by Aegis', sourceUrl: DEFINITION_FROM },
  sourceMeta: body.meta,
  derived: {
    fetched: new Date(Number(body.meta.timestamp) || Date.now()).toISOString(),
    window: WINDOW, // what we ASKED for; equal to sourceMeta.window by the guard
    trackedUsers: total,
    trackedUsersScope: `sum of uniqueUsers over all ${apps.length} rows Aegis returned, not a network total and not a sum of the rows shown`,
    appsKept: Math.min(KEEP, apps.length),
    fieldMap: 'uniqueUsers -> users, txCount -> txs; rows dropped unless name is non-empty and both figures are finite and >= 0, then sorted by users descending and sliced',
  },
  definitionQuoted: {
    text: DEFINITION_TEXT,
    quotedFrom: DEFINITION_FROM,
    checked: DEFINITION_CHECKED,
    note: 'copied by hand from the dashboard heading; the API returns no definition, so this does not follow Aegis if they reword it',
  },
  apps: apps.slice(0, KEEP),
};

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${OUT}: ${out.apps.length} apps, ${total} tracked users, leader ${apps[0].name} at ${apps[0].users}`);
