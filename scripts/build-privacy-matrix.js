#!/usr/bin/env node
/* Derives every number in privacy.html's "privacy completeness" block from the
   one place the data actually lives: the cell state classes (y / p / n) on the
   matrix <tbody>. Rewrites the three AUTO regions in place, so scores, the
   field ordering and the bar widths can never drift from the matrix they claim
   to summarise, and nothing is typed by hand.

   Scoring convention, matching the legend: a partial never counts.
   Ordering: score descending, ties keep source order (stable).
   Exits 1 if STRK20 does not derive to a perfect score, because the statement
   copy above it ("STRK20 does not") is only true at 7 of 7. */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'privacy.html');
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
  console.error(`privacy-matrix: ${champ.name} derives to ${champ.score}/7, but the block claims a perfect score. Refusing to write.`);
  process.exit(1);
}

const region = (tag, body) => {
  const re = new RegExp(`(<!-- PVC:AUTO-${tag} START -->\\n)([\\s\\S]*?)(    <!-- PVC:AUTO-${tag} END -->)`);
  if (!re.test(src)) { console.error(`privacy-matrix: AUTO-${tag} region missing`); process.exit(1); }
  src = src.replace(re, (_, a, __, c) => a + body + c);
};

region('CARD',
`    <div class="pvc-card" id="strk20">
      <div class="pvc-card-bloom" aria-hidden="true"></div>
      <p class="pvc-card-label">${champ.name}</p>
      <p class="pvc-card-score">${champ.score}<span>/7</span></p>
      <p class="pvc-card-state">Complete</p>
      <div class="pvc-card-segs" aria-hidden="true">${'<i></i>'.repeat(champ.score)}</div>
    </div>
`);

region('FIELD',
`    <div class="pvc-field">
${field.map(r =>
`      <div class="pvc-col"><p class="pvc-col-score">${r.score}<span>/7</span></p>` +
`<p class="pvc-col-name">${r.name}</p>` +
`<div class="pvc-track"><i style="width:${(r.score / 7 * 100).toFixed(4)}%"></i></div></div>`).join('\n')}
    </div>
`);

/* the matrix rows themselves: reordered to the derived ranking and their score
   cells rewritten. Cell markup, states and tooltips are carried across
   verbatim, so this pass can never edit the underlying data. */
const rowHtml = r => {
  const cellsRe = /<td class="[ynp]"[\s\S]*?<\/td>/g;
  const body = tbody[1].match(new RegExp(`<tr id="${r.id}"[^>]*>([\\s\\S]*?)</tr>`))[1];
  const cells = body.match(cellsRe).slice(0, 7).join('');
  return `        <tr id="${r.id}"${r.champ ? ' class="champ-row"' : ''}>\n` +
         `          <th scope="row" class="pname">${r.name}</th>\n` +
         `          ${cells}\n` +
         `          <td class="score">${r.score}/7</td>\n        </tr>`;
};
const ordered = [champ, ...field].map(rowHtml).join('\n');
src = src.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>\n${ordered}\n          </tbody>`);

fs.writeFileSync(FILE, src);
console.log(`privacy matrix: ${champ.name} ${champ.score}/7 · field ` +
  field.map(r => `${r.name} ${r.score}`).join(', '));
