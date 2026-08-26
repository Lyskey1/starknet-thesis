#!/usr/bin/env node
/* Derives every score in privacy.html's completeness matrix from the one place
   the data actually lives: the cell state classes (y / p / n) on the matrix
   <tbody>. Orders the rows by that score and rewrites the SCORE column in
   place, so no number is typed by hand.

   Scoring convention, matching the legend: a partial never counts.
   Ordering: score descending, ties keep source order (stable).
   Exits 1 if STRK20 does not derive to a perfect score, because the section
   intro ("Not on one criterion. On all of them.") is only true at 7 of 7.
   The scorecard and competitor bars this script also used to write were
   removed on 2026-08-12; the matrix is now the only consumer. */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'public', 'privacy.html');
let src = fs.readFileSync(FILE, 'utf8');

const grid = src.match(/<table class="pgrid">[\s\S]*?<\/table>/);
if (!grid) { console.error("privacy-matrix: no .pgrid table found"); process.exit(1); }
const tbody = grid[0].match(/<tbody>([\s\S]*?)<\/tbody>/);
if (!tbody) { console.error('privacy-matrix: no matrix tbody found'); process.exit(1); }

const rows = [];
const ROW = /<tr id="([^"]+)"([^>]*)>([\s\S]*?)<\/tr>/g;
let m;
while ((m = ROW.exec(tbody[1]))) {
  const [, id, attrs, body] = m;
  const name = (body.match(/<th scope="row" class="pname">([^<]+)<\/th>/) || [])[1];
  const cells = [...body.matchAll(/<td class="([ynp])"/g)].map(c => c[1]);
  if (!name || cells.length !== 7) { console.error(`privacy-matrix: row ${id} is malformed`); process.exit(1); }
  rows.push({ id, name, cells, score: cells.filter(c => c === 'y').length, champ: /champ-row/.test(attrs) });
}
if (rows.length !== 7) { console.error(`privacy-matrix: expected 7 rows, found ${rows.length}`); process.exit(1); }

const champ = rows.find(r => r.champ);
const field = rows.filter(r => !r.champ).sort((a, b) => b.score - a.score);
if (!champ) { console.error('privacy-matrix: no champion row'); process.exit(1); }
if (champ.score !== 7) {
  console.error(`privacy-matrix: ${champ.name} derives to ${champ.score}/7, but the section intro claims every criterion. Refusing to write.`);
  process.exit(1);
}

/* the matrix rows themselves: reordered to the derived ranking and their score
   cells rewritten. Cell markup, states and tooltips are carried across
   verbatim, so this pass can never edit the underlying data. */
const rowHtml = r => {
  const cellsRe = /<td class="[ynp]"[\s\S]*?<\/td>/g;
  const body = tbody[1].match(new RegExp(`<tr id="${r.id}"[^>]*>([\\s\\S]*?)</tr>`))[1];
  const cells = body.match(cellsRe).slice(0, 7).join('');
  return `      <tr id="${r.id}"${r.champ ? ' class="champ-row"' : ''}>\n` +
         `        <th scope="row" class="pname">${r.name}</th>\n` +
         `        ${cells}\n` +
         `        <td class="score">${r.score}/7</td>\n      </tr>`;
};
const ordered = [champ, ...field].map(rowHtml).join('\n');
src = src.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>\n${ordered}\n        </tbody>`);

fs.writeFileSync(FILE, src);
console.log(`privacy matrix: ${champ.name} ${champ.score}/7 · field ` +
  field.map(r => `${r.name} ${r.score}`).join(', '));
