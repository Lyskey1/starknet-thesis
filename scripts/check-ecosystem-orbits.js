#!/usr/bin/env node
/* Build guard for the ecosystem constellations.

   Both orbit stages on ecosystem.html are built from accounts flagged
   "orbit": true. When a flag set empties, buildOrbits() does not error: it
   takes its documented no-entries branch, wipes the stage and drops
   .has-orbit, so the group header renders full width and the constellation
   simply is not there. That is a silent degrade, and it shipped once already
   (e2c9349 published data/ecosystem.json without the flags, because the
   publish payload and /api/publish's validateEco both allow only
   name/handle/url/description/avatar).

   The page now treats the orbit curation as code-owned and re-applies it by
   handle over the published accounts, so a publish can no longer strip it.
   This check verifies the RESULT of that same resolution, the effective set
   the browser would build, rather than trusting either input on its own: a
   flag whose handle no longer exists in the published directory is a flag
   that will never render, and it is counted as missing here.

   Fails the build if either group carries fewer than MIN_PER_GROUP flagged
   accounts. Wired into "npm run build" ahead of the other steps. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const PAGE = path.join(ROOT, 'ecosystem.html');
const PUBLISHED_FILE = path.join(ROOT, 'data', 'ecosystem.json');
const MIN_PER_GROUP = 8;

/* Pull the DEFAULTS array literal out of the page and evaluate it. It is a
   pure literal (objects, arrays, strings, booleans and comments only), so a
   bracket walk to its matching close plus an eval is enough, and it keeps the
   guard reading the same source the page ships rather than a second copy. */
function readDefaults(src) {
  const marker = 'var DEFAULTS = ';
  const at = src.indexOf(marker);
  if (at === -1) throw new Error('check-ecosystem-orbits: could not find "var DEFAULTS =" in ecosystem.html');
  const start = src.indexOf('[', at);
  let depth = 0, inStr = null, esc = false, end = -1;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i === -1) break; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i); if (i === -1) break; i++; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('check-ecosystem-orbits: DEFAULTS array literal is unterminated');
  // eslint-disable-next-line no-eval
  const value = eval('(' + src.slice(start, end + 1) + ')');
  if (!Array.isArray(value) || !value.length) throw new Error('check-ecosystem-orbits: DEFAULTS did not evaluate to a non-empty array');
  return value;
}

const bare = h => String(h || '').replace(/^@/, '').toLowerCase();

function main() {
  const src = fs.readFileSync(PAGE, 'utf8');
  const defaults = readDefaults(src);
  const published = fs.existsSync(PUBLISHED_FILE)
    ? JSON.parse(fs.readFileSync(PUBLISHED_FILE, 'utf8'))
    : null;

  const counts = {};
  const missing = [];
  for (const cat of defaults) {
    const group = cat.group || 'projects';
    if (!(group in counts)) counts[group] = 0;

    // the curated flags, code-owned, exactly as buildDefaults() reads them
    const curated = new Map();
    if (Array.isArray(cat.accounts)) {
      for (const a of cat.accounts) if (a.orbit) curated.set(bare(a.handle), a.orbitRing === 1 ? 1 : 2);
    }

    // the accounts that will actually exist at runtime
    const live = published && Array.isArray(published[cat.id])
      ? published[cat.id]
      : (Array.isArray(cat.accounts) ? cat.accounts : (cat.handles || []).map(h => ({ handle: h })));
    const liveHandles = new Set(live.map(a => bare(a.handle)));

    for (const [handle] of curated) {
      if (liveHandles.has(handle)) counts[group]++;
      else missing.push(`${group}/${cat.id}: @${handle} is flagged for orbit but is not in the published directory`);
    }
  }

  const groups = Object.keys(counts).sort();
  const short = groups.filter(g => counts[g] < MIN_PER_GROUP);

  for (const line of missing) console.warn('  warning: ' + line);

  if (short.length || !groups.length) {
    const detail = groups.length
      ? groups.map(g => `${g}=${counts[g]}`).join(', ')
      : 'no groups found at all';
    console.error(
      '\nERROR: ecosystem orbit flags below the floor.\n' +
      `  effective orbit-flagged accounts per group: ${detail}\n` +
      `  each group needs at least ${MIN_PER_GROUP}.\n` +
      '  A group at 0 renders the full-width header fallback and the constellation\n' +
      '  disappears without any runtime error. Restore "orbit": true / "orbitRing"\n' +
      '  on the curated accounts in the DEFAULTS block of ecosystem.html.\n'
    );
    process.exit(1);
  }

  console.log('ecosystem orbits: ' + groups.map(g => `${g} ${counts[g]}`).join(', ') +
    ` (floor ${MIN_PER_GROUP} per group)` + (missing.length ? `, ${missing.length} flagged handle(s) not in the directory` : ''));
}

main();
