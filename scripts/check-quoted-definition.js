#!/usr/bin/env node
/* Build gate for the ONE quoted third-party string on the site: the Prism by
   Aegis metric definition on strk.html's Apps card.

   Why this needs a gate at all. We publish a metric whose definition we cannot
   state, so the provenance is recorded instead: data-says on #pdaPanel holds
   Aegis's exact wording with data-checked beside it, and definitionQuoted in
   the seed holds the same string with its own checked date. Two records of one
   quote, maintained by different hands (one in markup, one written by the
   refresh script), which is exactly the shape that drifts. This asserts they
   are byte-identical.
   NOTHING RENDERS THE QUOTE TODAY. The card showed it until 2026-08-22 and the
   block was removed on the owner's call; only the data keeps it. When it was
   rendered there was a third copy, a static <q id="pdaDef">, and this check
   asserted all three agreed so the DOM had to equal data-says. If the quote
   ever goes back on the page, restore that third comparison.

   It also refuses an em dash anywhere in the Apps panel's own prose. The site
   rule is no em dashes; this enforces it where the rule was actually broken
   (an &mdash; sat immediately after the closing </q> and read as though it
   were inside the quote) rather than site-wide, because strk.html carries 71
   pre-existing em dashes in older copy that are a separate decision.
   NOTE the asymmetry, it is deliberate: the QUOTE itself is exempt. If Aegis
   ever write an em dash, we reproduce it, because the whole point is that the
   string is theirs. Only our own prose around it is linted. */

const fs = require('fs');

const HTML = 'strk.html';
const SEED = 'assets/data/prism-dau-seed.json';
const fail = (msg) => { console.error('check-quoted-definition: ' + msg); process.exit(1); };

const html = fs.readFileSync(HTML, 'utf8');

/* the panel, from its id to the end of its footer row */
const at = html.indexOf('id="pdaPanel"');
if (at === -1) fail(`could not find id="pdaPanel" in ${HTML}`);
const metaAt = html.indexOf('tk-meta', at);
if (metaAt === -1) fail('could not find the panel footer (tk-meta) after #pdaPanel');
const panelRaw = html.slice(at, html.indexOf('</div>', metaAt));
/* HTML comments are stripped before either test below. They are not rendered,
   so an em dash in one breaks no rule, and the note explaining this check
   necessarily mentions the <q> element it is looking for. Testing the raw
   slice made the guard fire on its own documentation. */
const panel = panelRaw.replace(/<!--[\s\S]*?-->/g, '');

/* 1. the attribute */
const saysM = /data-says="([^"]*)"/.exec(panel);
if (!saysM) fail('no data-says attribute on #pdaPanel');
const says = saysM[1];
if (!says.trim()) fail('data-says is empty');

/* the quote must not be rendered again without restoring the comparison above */
if (/<q\b/.test(panel)) {
  fail('a <q> element is back in the panel. The quote is rendered again, so\n' +
       '  restore the assertion that its text equals data-says (see the header).');
}

/* 2. the seed the refresh script writes. Absent is allowed: a fresh checkout
   may not have run the workflow yet. */
let seedText = null;
if (fs.existsSync(SEED)) {
  let seed;
  try { seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); }
  catch (e) { fail(`${SEED} is not valid JSON: ${e.message}`); }
  seedText = seed && seed.definitionQuoted && seed.definitionQuoted.text;
  if (typeof seedText !== 'string' || !seedText.trim()) fail(`${SEED} has no definitionQuoted.text`);
}

const show = (s) => JSON.stringify(s);
if (seedText !== null && seedText !== says) {
  fail(`the seed's definitionQuoted.text does not equal data-says. The two\n` +
       `  provenance records disagree about what Aegis actually said.\n` +
       `  seed      ${show(seedText)}\n  data-says ${show(says)}`);
}

/* our prose, with the quoted attribute itself removed first: if Aegis ever
   write an em dash we reproduce it, so only our own words are linted */
const ourProse = panel.replace(/data-says="[^"]*"/, '');
if (/—|&mdash;/.test(ourProse)) {
  fail('an em dash appears in the Apps panel\'s own prose. The site rule is no\n' +
       '  em dashes; use a comma or a period. (The quoted string itself is exempt.)');
}

console.log(`quoted definition: ${seedText === null ? 'attribute only (no seed)' : 'seed and attribute agree'}, ` +
  `${says.length} chars, not rendered, no em dash in our prose`);
