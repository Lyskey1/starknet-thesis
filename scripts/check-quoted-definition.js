#!/usr/bin/env node
/* Build gate for the ONE quoted third-party string on the site: the Prism by
   Aegis metric definition on strk.html's Apps card.

   Why this needs a gate at all. We publish a metric whose definition we cannot
   state, so the card quotes Aegis's own wording instead. A quote is only worth
   printing if it is exact, and this particular string lives in THREE places
   that can drift apart independently:
     1. data-says on #pdaPanel        (the perishable-claim record)
     2. the static <q id="pdaDef">    (what renders before/without the seed)
     3. definitionQuoted.text in the seed, which the renderer copies into <q>
   The rendered text therefore equals data-says if and only if all three agree,
   which is what this asserts. Checking the three sources is equivalent to
   checking the DOM and needs no browser, so it can run in the normal build.

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
const panel = html.slice(at, html.indexOf('</div>', metaAt));

/* 1. the attribute */
const saysM = /data-says="([^"]*)"/.exec(panel);
if (!saysM) fail('no data-says attribute on #pdaPanel');
const says = saysM[1];
if (!says.trim()) fail('data-says is empty');

/* 2. the static fallback inside <q> */
const qM = /<q id="pdaDef">([\s\S]*?)<\/q>/.exec(panel);
if (!qM) fail('no <q id="pdaDef"> in the panel');
const qText = qM[1].trim();

/* 3. the seed the renderer copies from. Absent is allowed: the workflow may
   not have run in a fresh checkout, and the static fallback still governs. */
let seedText = null;
if (fs.existsSync(SEED)) {
  let seed;
  try { seed = JSON.parse(fs.readFileSync(SEED, 'utf8')); }
  catch (e) { fail(`${SEED} is not valid JSON: ${e.message}`); }
  seedText = seed && seed.definitionQuoted && seed.definitionQuoted.text;
  if (typeof seedText !== 'string' || !seedText.trim()) fail(`${SEED} has no definitionQuoted.text`);
}

const show = (s) => JSON.stringify(s);
if (qText !== says) {
  fail(`the rendered quote would not equal data-says.\n` +
       `  <q>       ${show(qText)}\n  data-says ${show(says)}`);
}
if (seedText !== null && seedText !== says) {
  fail(`the seed's definitionQuoted.text does not equal data-says, so the\n` +
       `  renderer would overwrite <q> with a different string.\n` +
       `  seed      ${show(seedText)}\n  data-says ${show(says)}`);
}

/* our prose around the quote, with the quote itself removed first */
const ourProse = panel.replace(/<q id="pdaDef">[\s\S]*?<\/q>/, '').replace(/data-says="[^"]*"/, '');
if (/—|&mdash;/.test(ourProse)) {
  fail('an em dash appears in the Apps panel\'s own prose. The site rule is no\n' +
       '  em dashes; use a comma or a period. (The quoted string itself is exempt.)');
}

console.log(`quoted definition: 3 copies agree, ${says.length} chars, no em dash in our prose`);
