#!/usr/bin/env node
/* Derives every score in privacy.html's comparison table from the one place
   the data actually lives: the cell state classes (s-y / s-p / s-n) in the
   table body, and rewrites each column's score in place, so no number is
   typed by hand.

   The table was transposed on 2026-08-27 into the Framer pricing shape:
   criteria are ROWS, protocols are COLUMNS headed by name and score. Ordering
   is therefore a column order, which this script verifies rather than
   rewrites — moving a column means moving one cell in every row.

   Scoring convention, matching the legend: a partial never counts.
   Exits 1 if STRK20 does not derive to a perfect score, because the section
   intro ("Not on one criterion. On all of them.") is only true at 7 of 7,
   and 1 if the columns are not in descending score order. */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'public', 'privacy.html');
let src = fs.readFileSync(FILE, 'utf8');

const table = src.match(/<table class="fx-table">[\s\S]*?<\/table>/);
if (!table) { console.error('privacy-matrix: no .fx-table found'); process.exit(1); }
const html = table[0];

/* column order, from the head */
const names = [...html.matchAll(/<span class="fx-pname">([^<]*)<\/span>/g)].map((m) => m[1].trim());
if (!names.length) { console.error('privacy-matrix: no protocol columns'); process.exit(1); }

/* one row per criterion; the nth cell belongs to the nth protocol */
const body = html.match(/<tbody>[\s\S]*?<\/tbody>/);
if (!body) { console.error('privacy-matrix: no tbody'); process.exit(1); }
const rows = [...body[0].matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((m) => m[0]);

const scores = names.map(() => 0);
let criteria = 0;
for (const row of rows) {
  const cells = [...row.matchAll(/<td class="fx-cell s-([ynp])/g)].map((m) => m[1]);
  if (!cells.length) continue;
  if (cells.length !== names.length) {
    console.error(`privacy-matrix: row has ${cells.length} cells, expected ${names.length}`);
    process.exit(1);
  }
  criteria++;
  cells.forEach((state, i) => { if (state === 'y') scores[i]++; });
}

/* rewrite each column's score, in column order */
let i = 0;
const next = html.replace(/<span class="fx-score">[^<]*<\/span>/g,
  () => `<span class="fx-score">${scores[i]}/${criteria}</span>`.replace('$', '$$') && `<span class="fx-score">${scores[i++]}/${criteria}</span>`);
src = src.replace(html, next);

/* the hero strip's two stats derive from the same data: the STRK20 column's
   score (below, once names are known) and the fee target in js/fee-config.js.
   Stamped here so a no-JS reader sees the derived figures; the page re-derives
   both at runtime from the DOM table and the same constant. */
const champIdx = names.indexOf('STRK20');
if (champIdx !== -1) {
  src = src.replace(/(<[^>]*\bdata-matrix-score\b[^>]*>)[^<]*(<\/)/g, `$1${scores[champIdx]}/${criteria}$2`);
}
const feeSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'fee-config.js'), 'utf8');
const feeM = feeSrc.match(/STRK20_TARGET_FEE_USD\s*=\s*([\d.]+)/);
if (!feeM) { console.error('privacy-matrix: STRK20_TARGET_FEE_USD missing from js/fee-config.js'); process.exit(1); }
const feeTxt = '$' + Number(feeM[1]).toFixed(2);
src = src.replace(/(<[^>]*\bdata-fee-target="plain"[^>]*>)[^<]*(<\/)/g, `$1${feeTxt}$2`);
src = src.replace(/(<[^>]*\bdata-fee-target\b(?!=)[^>]*>)[^<]*(<\/)/g, `$1~${feeTxt}$2`);
fs.writeFileSync(FILE, src);

const champ = names.indexOf('STRK20');
if (champ === -1) { console.error('privacy-matrix: STRK20 column missing'); process.exit(1); }
if (scores[champ] !== criteria) {
  console.error(`privacy-matrix: STRK20 derives to ${scores[champ]}/${criteria}, but the section intro claims all of them`);
  process.exit(1);
}
for (let k = 1; k < scores.length; k++) {
  if (scores[k] > scores[k - 1]) {
    console.error(`privacy-matrix: ${names[k]} (${scores[k]}) outscores ${names[k - 1]} (${scores[k - 1]}) but sits to its right`);
    process.exit(1);
  }
}
console.log(`privacy-matrix: ${names.length} protocols scored over ${criteria} criteria — ` +
  names.map((n, k) => `${n} ${scores[k]}/${criteria}`).join(', '));
