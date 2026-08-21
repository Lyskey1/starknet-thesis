// SOURCE OF TRUTH for the transaction-record SVG in quantum.html,
// section 03 chapter 03 (the <svg id="rcSvg"> block). Regenerate with
//   node tools/record-gen.js   -> writes record-inner.svg.txt
// and replace the inner markup of <svg id="rcSvg"> with the output.
//
// This is a RECORD, not a mechanism: it reports one transaction that
// already happened, so unlike the vault in chapter 02 it is flat, with
// no vanishing point and no animation. It shares the vault's line
// grammar so the chapters read as one family: the same weight ladder
// (structure 1.7 / detail 1.05 / hairline 0.6), the same mono, the
// same neutral ink with the section's emerald for verified facts.
//
// EVERY VALUE BELOW IS VERIFIED, and the check is recorded beside it.
// Nothing here is quoted from an announcement; all of it was read off
// the chain or out of the implementation's own repository on
// 2026-08-21. See the chapter's markup comment for the full ledger.
const fs = require('fs');

const TX = {
  // starknet_getTransactionByHash / getTransactionReceipt, confirmed
  // against two independent public RPC endpoints
  hash: '0x72ae4404b44ad78de65bdc460f8cc87fea4a15ce93e07a37c6a68e9adb0a4b3',
  block: 12156522,
  // block timestamp 1784717185 = 2026-07-22 10:46 UTC
  date: '22 JULY 2026',
  // actual_fee 0x1aba6437b7129348 FRI = 1.925961981111735 STRK. Shown to
  // two decimals. NO DOLLAR FIGURE: the USD value moves with the STRK
  // price, and deriving it from our own live source would print a
  // number that disagrees with the announcement we are citing.
  feeStrk: '1.93',
  // the signature array on the INVOKE v3 transaction. Starknet ECDSA is
  // (r, s) = 2 felts, so 31 felts is on-chain evidence that a lattice
  // scheme authorised this, not an elliptic curve. This is the best
  // evidence on the page: a property of the transaction itself rather
  // than a claim about it.
  felts: 31,
  ecdsaFelts: 2,
};

const f = (n) => +n.toFixed(1);
const s = [];
const L = (x1, y1, x2, y2, cls) => s.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"/>`);
const T = (x, y, cls, txt, extra = '') => s.push(`<text x="${f(x)}" y="${f(y)}" class="${cls}"${extra}>${txt}</text>`);

// ---- the record's body ----
s.push('<rect x="8" y="8" width="424" height="304" rx="12" class="rcPanel"/>');

// header: where it ran, and when
T(26, 34, 'rcHead rcOk', 'STARKNET MAINNET');
T(414, 34, 'rcHead rcEnd', TX.date);
L(26, 48, 414, 48, 'rcRule');

// the hero: what it cost. The fee is the answer to the unspoken
// objection that post-quantum signatures are prohibitively expensive.
T(26, 116, 'rcHero', TX.feeStrk);
T(162, 116, 'rcUnit', 'STRK');
T(26, 138, 'rcLab', 'TRANSACTION FEE, PAID ON MAINNET');
L(26, 156, 414, 156, 'rcRule');

// the proof: signature size, drawn. One block per felt, same pitch on
// both rows, so the comparison is the picture rather than the caption.
T(26, 178, 'rcLab', 'SIGNATURE CARRIED');
// pitch is set so the longer row ENDS before its own note: 31 blocks
// from x=132 at 6.6 finish at 337, and the note is right-anchored at
// 414 needing about 62px, so it starts near 352
const X0 = 132, PITCH = 6.6, BW = 4.8, H = 11;
[
  { y: 196, n: TX.ecdsaFelts, name: 'ECDSA', cls: 'rcBlkOld', note: TX.ecdsaFelts + ' FELTS' },
  { y: 222, n: TX.felts, name: 'FALCON-512', cls: 'rcBlkNew', note: TX.felts + ' FELTS' },
].forEach((row) => {
  T(26, row.y + 9, 'rcRow', row.name);
  for (let i = 0; i < row.n; i++) {
    s.push(`<rect x="${f(X0 + i * PITCH)}" y="${row.y}" width="${BW}" height="${H}" rx="1.5" class="${row.cls}"/>`);
  }
  T(414, row.y + 9, 'rcNote rcEnd', row.note);
});
L(26, 250, 414, 250, 'rcRule');

// where to check it
T(26, 268, 'rcLab', 'BLOCK ' + TX.block);
T(414, 268, 'rcLab rcEnd', TX.hash.slice(0, 10) + '…' + TX.hash.slice(-6));

// the caveat, and it is the only red on the record so it cannot be
// missed. Wording is the implementation's own.
s.push('<rect x="26" y="280" width="388" height="22" rx="5" class="rcWarnBox"/>');
T(220, 295, 'rcWarn', 'EXPERIMENTAL AND UNAUDITED · RESEARCH AND BENCHMARKING');

fs.writeFileSync('record-inner.svg.txt', s.join('\n        '));
console.log('record: ' + s.length + ' nodes, ' + TX.felts + ' + ' + TX.ecdsaFelts + ' signature blocks, ' + s.join('').length + ' bytes');
