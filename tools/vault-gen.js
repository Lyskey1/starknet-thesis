// SOURCE OF TRUTH for the vault SVG in quantum.html, section 03
// chapter 02 (the <svg id="vtSvg"> block). One vanishing point governs
// every receding edge so the parallels genuinely converge; hand-editing
// the SVG quietly breaks the projection, so change THIS file and
// regenerate instead:
//   node tools/vault-gen.js   -> writes vault-inner.svg.txt
// then replace the inner markup of <svg id="vtSvg"> with the output.
// Line weights: silhouette 2.6 / structure 1.7 / detail 1.05 /
// hairline 0.6, one hierarchy for the whole drawing.
const fs = require('fs');
const VP = { x: 1400, y: -180 };
const T = 0.1; // recede fraction for the vault body
const r = (p, t = T) => [p[0] + (VP.x - p[0]) * t, p[1] + (VP.y - p[1]) * t];
const f = (n) => +n.toFixed(1);
const pts = (a) => a.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');

// ---- vault body
const FTL = [44, 150], FTR = [314, 150], FBR = [314, 500], FBL = [44, 500];
const BTL = r(FTL), BTR = r(FTR), BBR = r(FBR);
// depth interpolators on the side face
const sideTop = (u) => [FTR[0] + (BTR[0] - FTR[0]) * u, FTR[1] + (BTR[1] - FTR[1]) * u];
const sideBot = (u) => [FBR[0] + (BBR[0] - FBR[0]) * u, FBR[1] + (BBR[1] - FBR[1]) * u];
const sideP = (u, s) => { const t = sideTop(u), b = sideBot(u); return [t[0], t[1] + s * (b[1] - t[1])]; };
const topFront = (v) => [FTL[0] + (FTR[0] - FTL[0]) * v, 150];
const topBack = (v) => [BTL[0] + (BTR[0] - BTL[0]) * v, BTL[1] + (BTR[1] - BTL[1]) * v];

// ---- plinth (deeper recede so the vault's back corner lands on it)
const PT = 0.12;
const PFL = [20, 516], PFR = [372, 516], PBRy = [372, 564];
const PBL = r(PFL, PT), PBR = r(PFR, PT), PBRb = r(PBRy, PT);

let s = [];
const L = (x1, y1, x2, y2, cls, extra = '') => s.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"${extra}/>`);
const P = (d, cls, extra = '') => s.push(`<path d="${d}" class="${cls}"${extra}/>`);
const PL = (arr, cls, extra = '') => s.push(`<polygon points="${pts(arr)}" class="${cls}"${extra}/>`);
const PLl = (arr, cls, extra = '') => s.push(`<polyline points="${pts(arr)}" class="${cls}"${extra}/>`);

// ================= PLINTH (emerald from the start) =================
s.push('<g class="vtPlinth">');
PL([PFL, PFR, PBR, PBL], 'vtP2');                       // top face
PL([PFL, PFR, [372, 564], [20, 564]], 'vtP1');          // front face
PL([PFR, PBR, PBRb, [372, 564]], 'vtP2');               // side face
L(20, 540, 372, 540, 'vtPh');                            // front face reveal line
s.push(`<text x="196" y="547" class="vtPlab">STARKNET</text>`);
s.push(`<text x="196" y="586" class="vtPnote">STARK PROOFS: HASH-BASED, POST-QUANTUM BY CONSTRUCTION</text>`);
s.push('</g>');

// ================= SHELL (blue before, emerald after) =================
s.push('<g class="vtShell">');
// top face ribs (detail) + side ribs
for (const v of [0.22, 0.42, 0.62, 0.82]) { const a = topFront(v), b = topBack(v); L(a[0], a[1], b[0], b[1], 'vtD'); }
for (const u of [0.34, 0.64]) { const a = sideTop(u), b = sideBot(u); L(a[0], a[1], b[0], b[1], 'vtD'); }
// vent on the side face: frame + 4 slats along the depth direction
{
  const c = [[0.18, 0.42], [0.72, 0.42], [0.72, 0.58], [0.18, 0.58]].map(([u, sv]) => sideP(u, sv));
  PL(c, 'vtD');
  for (const sv of [0.452, 0.484, 0.516, 0.548]) L(...sideP(0.22, sv), ...sideP(0.68, sv), 'vtH');
}
// structure edges
PL([FTL, FTR, BTR, BTL], 'vtS');                         // top face
PL([FTR, BTR, BBR, FBR], 'vtS');                         // side face
// door + inner frame
s.push(`<rect x="88" y="178" width="202" height="294" rx="10" class="vtS"/>`);
s.push(`<rect x="96" y="186" width="186" height="278" rx="7" class="vtH"/>`);
// hinges: two assemblies, three knuckles each, pin line through
for (const hy of [214, 388]) {
  L(76, hy - 4, 76, hy + 52, 'vtD');                     // pin
  for (let k = 0; k < 3; k++) s.push(`<rect x="${k % 2 ? 70 : 66}" y="${hy + k * 16}" width="12" height="13" rx="2.5" class="vtD"/>`);
}
// rivets seated on the front frame band
for (const [rx, ry] of [[54, 162], [304, 162], [54, 488], [176, 160], [54, 325], [176, 490]]) {
  s.push(`<circle cx="${rx}" cy="${ry}" r="2.6" class="vtD"/><circle cx="${rx}" cy="${ry}" r="0.9" class="vtH"/>`);
}
// silhouette last, heaviest
PL([FTL, BTL, BTR, BBR, FBR, FBL], 'vtSil');
L(FTL[0], FTL[1], FTR[0], FTR[1], 'vtSil');
L(FTR[0], FTR[1], FBR[0], FBR[1], 'vtSil');
s.push('</g>');

// ================= GLASS + ASSETS (gray, never change) =================
s.push('<g class="vtAssets">');
s.push(`<rect x="118" y="200" width="138" height="114" rx="12" class="vtGf"/>`);
L(129, 306, 159, 208, 'vtGl'); L(145, 308, 175, 210, 'vtGl');   // glints

// ================= THE HOARD =================
// The chamber is a vault filling up, not a tray of samples. It runs
// 200-314 now (was 206-306), and the pile inside it stands ~80px tall
// against the ~35px it used to: the visible coin mass is what grew,
// more than the frame did.
// NOTHING HERE ANIMATES, measured rather than asserted: across a full
// send sequence the coin mass changes 65 pixels out of 30,912, which
// is antialiasing. Measure it with the CHAMBER FRAME EXCLUDED (x
// 124-250, y 230-308, inside the glass rect's own edges): the frame
// recolours blue to emerald on send, and including its edges inflated
// the first reading to 682 before that was caught. Re-measure that way
// after any change here rather than trusting the eye.
// WHY THE WINDOW STOPS AT THE CARD, decided on measured geometry, not
// taste: extending the glass to the full plate height would add 124px
// of chamber, but the signature-verifier card (116-258 x 334-392) is
// WIDER than the window and covers it edge to edge, and a gauge plate
// large enough to carry the dial and its label (124-240 x 402-456)
// covers 84% of the remaining width. Only about 21% of that added
// chamber could ever be seen, in two thin bands and two narrow
// columns, so the hoard would read chopped. Stopping at the card's top
// edge instead leaves the card and the gauge on solid black, which is
// exactly the ground they have today: their contrast is unchanged by
// construction rather than defended by darkening coins behind them.
// THE THREE MARKS RIDE COINS now, front rank, face-on, resting on the
// floor at d=0.05, drawn last so nothing occludes them. MR=14.5
// against neighbours of r=8-11: larger, and deliberately so, because
// at the front rank's own radius a mark would sit on a 16-22px disc
// and the glyphs stop reading. A silver dollar among dimes is what a
// hoard looks like anyway.
// KNOWN, MEASURED COST: at 375 the whole drawing scales by 0.546, so a
// marked coin lands at 15.8px across against the 18px the separate
// hero discs used to give. A real regression on mobile, accepted
// rather than hidden. MR is the only dial: 26px gave 14.2px and read
// worse, and 29px was chosen to hold as much of the 18 as the pile's
// own scale allows. If the crop ever fails, raise MR against a
// screenshot at 375, not against this comment.
// PACKING is a real drop simulation: every coin falls until it lands
// on the floor quad or on the highest already-placed coin that
// overlaps it within its own depth layer. That is what builds a heap
// instead of a scatter, and it makes the invariant below checkable.
const CH = { x0: 120, y0: 202, x1: 310 };
const FT = 0.075;
const floorY = (d) => CH.x1 + (VP.y - CH.x1) * FT * d;
const floorL = (d) => CH.x0 + (VP.x - CH.x0) * FT * d;
const floorR = (d) => Math.min(254 + (VP.x - 254) * FT * d, 254);
// THE CREST IS A MOUND CURVE, BY DESIGN. Do not simplify it back to a
// constant. A flat cap was tried and the hoard read as a box filled to
// a line, which is not what a heap looks like; the limit curves
// instead, highest at the chamber's middle and falling toward both
// walls, and the profile then emerges from the packing rather than
// being drawn. Only a screenshot catches this: change it and look, or
// do not change it.
const CREST = (x) => 250 - 22 * Math.sin(Math.PI * Math.max(0, Math.min(1, (x - 118) / 138)));
const OVER = 1.3;             // how far a coin settles into the one below
let _s = 20260820;
const rnd = () => (_s = (_s * 1103515245 + 12345) % 2147483648) / 2147483648;
const rr = (a, b) => a + (b - a) * rnd();

const coins = [];
// where a coin of radius r at depth d would come to rest if dropped at
// x: the floor, or the top of the highest already-placed coin in its
// own depth layer that it overlaps. Computing this WITHOUT committing
// is what lets the packer choose.
function landing(x, d, r) {
  let baseY = floorY(d), on = 'floor';
  for (const c of coins) {
    if (c.hero) continue;                              // nothing piles on the marked coins: they are the front rank
    if (Math.abs(c.d - d) > 0.24) continue;            // only the same depth layer can support
    if (Math.abs(c.x - x) > (c.r + r) * 0.72) continue;
    const cand = c.baseY - 2 * c.ry + OVER;
    if (cand < baseY) { baseY = cand; on = c; }
  }
  return { baseY, on };
}
function commit(x, d, r, ry, cls, land, hero) {
  const coin = { x, d, r, ry, cls, baseY: land.baseY, on: land.on, hero: !!hero };
  coins.push(coin);
  return coin;
}
// GREEDY DENSEST LANDING, AND THIS IS WHAT TURNED A SCATTER INTO A
// MASS. Do not simplify it back to a single random drop. Dropping at
// one uniformly random x builds TOWERS WITH HOLLOWS between them,
// because a coin that happens to land on an existing stack stays
// there, and the drawing then reads as scattered bubbles with dark
// gaps. Trying SIXTEEN positions and committing the one that lands
// LOWEST fills the valleys first, which is how a heap actually forms.
// This and the mound curve above were both failures a screenshot
// found, not requirements from the brief.
function bestDrop(d, r, ry, cls) {
  const lo = floorL(d), hi = floorR(d);
  if (hi - lo < r * 1.4) return null;
  let best = null;
  for (let t = 0; t < 16; t++) {
    const x = rr(lo + r * 0.15, hi - r * 0.15);
    const land = landing(x, d, r);
    if (land.baseY - 2 * ry < CREST(x)) continue;      // would overtop the mound
    if (!best || land.baseY > best.land.baseY) best = { x, land };
  }
  return best ? commit(best.x, d, r, ry, cls, best.land) : null;
}
// the three marked coins go in FIRST so the heap packs around them,
// but they are rendered last so they sit in front of everything
const MR = 14.5;
const MARKED = [{ x: 145, m: 'btc' }, { x: 187, m: 'eth' }, { x: 229, m: 'strk' }];
for (const h of MARKED) h.coin = commit(h.x, 0.05, MR, MR, 'vtCoin1', landing(h.x, 0.05, MR), true);
// then the bank, back to front; counts follow each band's own floor
// width, which narrows as the floor recedes right
function band(n, d0, d1, r0, r1, cls) {
  for (let i = 0; i < n; i++) {
    const r = rr(r0, r1), k = rnd();
    const ry = k < 0.32 ? r * 0.3 : (k < 0.55 ? r * 0.66 : r);
    bestDrop(rr(d0, d1), r, ry, cls);
  }
}
band(16, 0.72, 0.98, 5.0, 6.5, 'vtCoin3');
band(26, 0.38, 0.70, 6.5, 8.5, 'vtCoin2');
band(34, 0.04, 0.36, 8.0, 11.0, 'vtCoin1');

// ---- assertions: on the floor quad, or landed on a placed coin ----
// THESE ARE LOAD-BEARING. They are not a formality: during authoring
// they refused this file's own crest coins, which were perching past
// the edge of the supports they were meant to rest on, and the fix was
// to CLAMP the placement to the invariant rather than widen the
// tolerance. If a coin will not fit, move the coin; relaxing a bound
// here buys a floating coin that no screenshot will catch, because a
// heap hides its own mistakes.
let onFloor = 0, stacked = 0;
for (const c of coins) {
  if (c.on === 'floor') {
    if (Math.abs(c.baseY - floorY(c.d)) > 0.01) throw new Error('coin base off its floor baseline');
    if (c.x < floorL(c.d) - c.r * 0.2 || c.x > floorR(c.d) + c.r * 0.2) throw new Error('coin base outside the floor quad');
    onFloor++;
  } else {
    const sup = c.on;
    if (Math.abs(c.baseY - (sup.baseY - 2 * sup.ry + OVER)) > 0.01) throw new Error('coin not resting on its support');
    if (Math.abs(c.x - sup.x) > (sup.r + c.r) * 0.72) throw new Error('coin overhangs its support');
    if (Math.abs(c.d - sup.d) > 0.24) throw new Error('coin resting across depth layers');
    stacked++;
  }
  if (c.baseY - 2 * c.ry < CREST(c.x) - 0.01) throw new Error('pile overtops the mound');
}
const crest = Math.min.apply(null, coins.map((c) => c.baseY - 2 * c.ry));
console.log('hoard: ' + coins.length + ' coins (' + onFloor + ' on the floor quad, ' + stacked + ' stacked), 3 of them marked; crest y=' + crest.toFixed(1) + ', floor y=' + floorY(0).toFixed(0));

s.push('<clipPath id="vtChamber"><rect x="119" y="201" width="136" height="112" rx="11"/></clipPath>');
s.push('<g clip-path="url(#vtChamber)">');
PLl([[CH.x0, CH.x1], [floorL(1), floorY(1)]], 'vtFloor');
PLl([[floorL(1), floorY(1)], [floorR(1), floorY(1)]], 'vtFloor');
for (const c of coins) {
  if (c.hero) continue;
  const cy = c.baseY - c.ry;
  if (Math.abs(c.ry - c.r) < 0.01) s.push(`<circle cx="${f(c.x)}" cy="${f(cy)}" r="${f(c.r)}" class="${c.cls}"/>`);
  else s.push(`<ellipse cx="${f(c.x)}" cy="${f(cy)}" rx="${f(c.r)}" ry="${f(c.ry)}" class="${c.cls}"/>`);
}
// the marked coins, in front of the mass. Opaque bodies so no coin
// shows through a mark; Bitcoin and Starknet bring their own rim,
// Ethereum is a bare glyph and gets the rim that makes it the same
// object as the other two.
const HY = MARKED[0].coin.baseY - MR;
for (const h of MARKED) s.push(`<circle cx="${h.x}" cy="${f(HY)}" r="${MR}" class="vtHeroDisc"/>`);
s.push(`<circle cx="187" cy="${f(HY)}" r="${MR}" class="vtEthRing"/>`);
// BITCOIN: public domain, path data verbatim from
// assets/img/bitcoin-logo.svg (itself verbatim from bitcoin.org's
// press-kit logotop.svg). Disc as a gray outline instead of the orange
// fill, the B as gray ink. Not redrawn. Fitted to the 26px coin.
{
  const sc = (MR * 2) / 39.119, tx = 145 - MR - 0.893 * sc, ty = HY - MR - 0.469 * sc;
  s.push(`<g transform="translate(${f(tx)},${f(ty)}) scale(${sc.toFixed(6)})"><g transform="matrix(0.61129216,0,0,0.61129216,-118.80398,-25.96802)">`);
  s.push('<path d="m258.845 82.989c-4.274 17.143-21.637 27.576-38.782 23.301-17.138-4.274-27.571-21.638-23.295-38.78 4.272-17.145 21.635-27.579 38.775-23.305 17.144 4.274 27.576 21.64 23.302 38.784z" class="vtBtcDisc"/>');
  s.push('<path d="m241.91 70.689c0.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-0.875-1.4 5.616c-0.923-0.23-1.871-0.447-2.813-0.662l1.41-5.653-3.509-0.875-1.439 5.766c-0.764-0.174-1.514-0.346-2.242-0.527l0.004-0.018-4.842-1.209-0.934 3.75c0 0 2.605 0.597 2.55 0.634 1.422 0.355 1.679 1.296 1.636 2.042l-1.638 6.571c0.098 0.025 0.225 0.061 0.365 0.117-0.117-0.029-0.242-0.061-0.371-0.092l-2.296 9.205c-0.174 0.432-0.615 1.08-1.609 0.834 0.035 0.051-2.552-0.637-2.552-0.637l-1.743 4.019 4.569 1.139c0.85 0.213 1.683 0.436 2.503 0.646l-1.453 5.834 3.507 0.875 1.439-5.772c0.958 0.26 1.888 0.5 2.798 0.726l-1.434 5.745 3.511 0.875 1.453-5.823c5.987 1.133 10.489 0.676 12.384-4.739 1.527-4.36-0.076-6.875-3.226-8.515 2.294-0.529 4.022-2.038 4.483-5.155zm-8.022 11.249c-1.085 4.36-8.426 2.003-10.806 1.412l1.928-7.729c2.38 0.594 10.012 1.77 8.878 6.317zm1.086-11.312c-0.99 3.966-7.1 1.951-9.082 1.457l1.748-7.01c1.982 0.494 8.365 1.416 7.334 5.553z" class="vtBtcB"/>');
  s.push('</g></g>');
}
// ETHEREUM: no branded asset file is copied; the octahedron is DRAWN
// from the mark's canonical proportions (fractions of its own height:
// width 0.61404, upper waist 0.50927, upper inner vertex 0.69069,
// lower shoulders 0.56747, lower inner vertex 0.74879), monoline, gray.
// LICENCE POSITION, checked 2026-08-20 (not legal advice, just what the
// pages say): ethereum.org/en/assets carries the downloadable logo
// files with NO licence statement on the page. ethereum.org's terms of
// use license non-code content, "such as data files, text, music,
// audio files or other sounds, photographs, videos, or other images",
// under CC BY 4.0, but reserve marks separately: "the Foundation logo
// and all related names, logos, product and service names, designs and
// slogans" ... "You must not use such marks without the prior written
// permission of the Foundation." So the permissive content licence and
// the reserved-marks clause point opposite ways for a logo file, and
// we hold no written permission. Hence the shape is drawn from
// geometry rather than lifted from their file, which is also why this
// stays a monoline gray glyph and never the brand colorway. Bitcoin
// (public domain) and Starknet (ours) are lifted verbatim; only this
// one is drawn.
{
  const H = MR * 2 * 0.846, cx = 187, top = HY - H / 2, hw = 0.30702 * H;
  const y = (fr) => top + fr * H;
  PLl([[cx, y(0)], [cx + hw, y(0.50927)], [cx, y(0.69069)], [cx - hw, y(0.50927)], [cx, y(0)]], 'vtMk');
  L(cx, y(0), cx, y(0.69069), 'vtMkh');
  PLl([[cx - hw, y(0.56747)], [cx, y(0.74879)], [cx + hw, y(0.56747)]], 'vtMk');
  PLl([[cx - hw, y(0.56747)], [cx, y(1)], [cx + hw, y(0.56747)]], 'vtMk');
  L(cx, y(0.74879), cx, y(1), 'vtMkh');
}
// STARKNET: ours. Path data verbatim from assets/img/starknet-mark.svg
// (itself verbatim from starknet.io's theme asset), rendered in the
// neutral asset gray. SETTLED 2026-08-22, do not reopen: never the
// navy-and-coral brand colorway, because one exception for our own
// logo would break the neutral-assets rule that makes the colour
// argument legible (same rule as Xanadu's colour-delegating logo).
{
  const sc = (MR * 2) / 40, tx = 229 - MR - 0.041 * sc, ty = HY - MR - 0.813 * sc;
  s.push(`<g transform="translate(${f(tx)},${f(ty)}) scale(${sc.toFixed(6)})" class="vtStrk">`);
  s.push('<path d="M0.294582 20.813C0.294582 31.719 9.13542 40.5598 20.0414 40.5598C30.9474 40.5598 39.7888 31.719 39.7888 20.813C39.7888 9.90701 30.9474 1.06616 20.0414 1.06616C9.13542 1.06616 0.294582 9.907 0.294582 20.813Z" class="vtStrkDisc"/>');
  s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M11.2193 16.1014L11.713 14.5761C11.8133 14.2659 12.0582 14.0245 12.3695 13.9293L13.9023 13.4579C14.1145 13.3931 14.1162 13.0938 13.9057 13.0256L12.3799 12.5319C12.0702 12.4315 11.8288 12.1867 11.7331 11.8753L11.2623 10.3425C11.1975 10.1309 10.8982 10.1286 10.8299 10.3397L10.3362 11.865C10.2359 12.1746 9.991 12.416 9.67963 12.5118L8.14688 12.9826C7.93472 13.0479 7.93243 13.3467 8.14344 13.4149L9.66931 13.9086C9.97896 14.009 10.2204 14.2544 10.3161 14.5658L10.7869 16.0979C10.8517 16.3101 11.151 16.3124 11.2193 16.1014Z" class="vtStrkInk"/>');
  s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M35.4461 15.2138C34.8142 14.5072 33.828 14.1093 32.8693 13.9462C31.9028 13.7895 30.8896 13.804 29.9355 13.9735C28.0051 14.3001 26.2514 15.0994 24.7219 16.0854C23.9276 16.5694 23.2502 17.1293 22.5484 17.6996C22.2103 17.988 21.902 18.2952 21.5809 18.5979L20.7036 19.4708C19.7504 20.4672 18.8108 21.3747 17.9017 22.127C16.989 22.8758 16.1356 23.4444 15.2947 23.8416C14.4542 24.2408 13.5549 24.4755 12.3828 24.5131C11.221 24.5541 9.84635 24.3444 8.376 23.9983C6.89774 23.6537 5.34543 23.1625 3.61075 22.7399C4.21602 24.4191 5.12749 25.903 6.2977 27.2594C7.48164 28.5923 8.96003 29.8072 10.8592 30.6062C12.7309 31.4229 15.0831 31.716 17.2825 31.2737C19.4877 30.8493 21.4229 29.8288 22.9871 28.6487C24.5553 27.4565 25.8241 26.0984 26.8937 24.6866C27.189 24.2965 27.3452 24.0782 27.5589 23.7733L28.1494 22.8985C28.5599 22.3573 28.9335 21.7412 29.3397 21.2051C30.1362 20.0822 30.9214 18.9607 31.8339 17.9274C32.2932 17.4033 32.7773 16.902 33.349 16.4203C33.6342 16.1851 33.9423 15.955 34.2835 15.7477C34.6299 15.5241 34.9957 15.3491 35.4461 15.2138Z" class="vtStrkSw"/>');
  s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M35.4462 15.2134C34.7673 13.5004 33.5054 12.0585 31.8115 10.9945C30.1279 9.94223 27.7895 9.4052 25.4724 9.86299C24.3277 10.0844 23.2187 10.5106 22.2454 11.0782C21.2766 11.6436 20.4084 12.3241 19.6569 13.0543C19.2817 13.4205 18.9411 13.8026 18.6028 14.1869L17.7258 15.3049L16.3714 17.1046C14.6447 19.4202 12.7853 22.1339 9.73396 22.938C6.73838 23.7274 5.43914 23.0283 3.61086 22.7395C3.94515 23.6026 4.35925 24.4407 4.92063 25.1781C5.47155 25.9304 6.12227 26.637 6.9313 27.2426C7.34015 27.5335 7.7718 27.8206 8.25121 28.0641C8.72843 28.2994 9.24309 28.5064 9.79242 28.6623C10.8851 28.9618 12.1152 29.0667 13.3063 28.9056C14.498 28.7466 15.637 28.369 16.6326 27.8674C17.6355 27.3706 18.5092 26.7656 19.2893 26.127C20.8401 24.8392 22.0464 23.4162 23.0653 21.9778C23.5778 21.2587 24.043 20.5259 24.4733 19.793L24.9797 18.9205C25.1345 18.6654 25.2911 18.4088 25.4502 18.1698C26.0918 17.2095 26.7194 16.4395 27.4817 15.8616C28.2335 15.2687 29.2802 14.8307 30.679 14.7289C32.072 14.626 33.6801 14.8162 35.4462 15.2134Z" class="vtStrkInk"/>');
  s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M27.91 29.4455C27.91 30.7036 28.9304 31.724 30.1885 31.724C31.4466 31.724 32.4658 30.7036 32.4658 29.4455C32.4658 28.1874 31.4466 27.167 30.1885 27.167C28.9304 27.167 27.91 28.1874 27.91 29.4455Z" class="vtStrkSw"/>');
  s.push('</g>');
}
s.push('</g>');
// the caption sits just below the glass, between the chamber and the
// card: outside the window because at 7.5px mono it runs ~155px wide
// and the chamber's interior is only 134
s.push(`<text x="187" y="326" class="vtNote">BTC &#183; ETH &#183; STRK &#183; UNCHANGED</text>`);
s.push('</g>');

// ================= BOLTS + SOCKETS =================
s.push('<g class="vtBolts">');
for (const [i, by] of [216, 286, 356, 426].entries()) {
  s.push(`<path d="M300 ${by - 8} h10 v16 h-10" class="vtSock"/>`);            // socket bracket
  s.push(`<rect x="278" y="${by - 4.5}" width="30" height="9" rx="3.5" class="vtBolt vtBolt${i}"/>`);
}
s.push('</g>');

// ================= GAUGE =================
s.push('<g class="vtGauge">');
s.push(`<circle cx="150" cy="430" r="22" class="vtD"/>`);
s.push(`<circle cx="150" cy="430" r="18.5" class="vtH"/>`);
{
  const cx = 150, cy = 430;
  for (let i = 0; i <= 10; i++) {
    const a = (-215 + i * 25) * Math.PI / 180;
    const r1 = i % 5 === 0 ? 13.2 : 15.2, r2 = 17.6;
    L(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), cx + r2 * Math.cos(a), cy + r2 * Math.sin(a), i % 5 === 0 ? 'vtD' : 'vtH');
  }
  const arc = (a1, a2, cls) => {
    const p1 = [cx + 20 * Math.cos(a1 * Math.PI / 180), cy + 20 * Math.sin(a1 * Math.PI / 180)];
    const p2 = [cx + 20 * Math.cos(a2 * Math.PI / 180), cy + 20 * Math.sin(a2 * Math.PI / 180)];
    P(`M${f(p1[0])} ${f(p1[1])} A20 20 0 0 1 ${f(p2[0])} ${f(p2[1])}`, cls);
  };
  arc(-215, -160, 'vtGr');   // red zone, start of the sweep
  arc(-20, 35, 'vtGg');      // emerald zone, end of the sweep
}
s.push(`<line x1="150" y1="430" x2="150" y2="415.5" class="vtNeedle"/>`);
s.push(`<circle cx="150" cy="430" r="2.2" class="vtD"/>`);
// GAUGE LABEL BAND: y 404-421, x 180-232, and it is threading a gap.
// Bounds, so the next person to move it knows what is around it:
// the card slot's bottom edge at y=392 above, the plinth's receding
// top-face edge at y=432 below (it crosses this area THROUGH the
// transparent shell, which a screenshot caught after a first attempt
// at y=427/438 landed on it), the bolt column at x=278 to the right,
// and the dial itself out to x=172 on the left. The original centered
// position at y=463 ran into the door's inner frame line at y=464.
// Two short lines instead of one long one keeps the right margin.
s.push(`<text x="180" y="410" class="vtNote vtNoteL">VERIFIER</text>`);
s.push(`<text x="180" y="421" class="vtNote vtNoteL">INTEGRITY</text>`);
s.push('</g>');

// ================= VERIFIER CARD SLOT =================
s.push('<g class="vtSlotG">');
s.push(`<rect x="116" y="334" width="142" height="58" rx="8" class="vtD"/>`);
s.push(`<clipPath id="vtClip"><rect x="118" y="336" width="138" height="54" rx="7"/></clipPath>`);
s.push('<g clip-path="url(#vtClip)">');
s.push(`<g class="vtCard vtCardOld"><rect x="124" y="342" width="126" height="42" rx="5" class="vtCr"/><rect x="132" y="350" width="11" height="8" rx="1.5" class="vtCrH"/><text x="150" y="357.5" class="vtCwho">SIGNATURE VERIFIER</text><text x="132" y="376" class="vtCname vtCnameR">ECDSA</text><text x="248" y="376" class="vtCtag vtCtagR">SHOR-BREAKABLE</text></g>`);
s.push(`<g class="vtCard vtCardNew"><rect x="124" y="342" width="126" height="42" rx="5" class="vtCg"/><rect x="132" y="350" width="11" height="8" rx="1.5" class="vtCgH"/><text x="150" y="357.5" class="vtCwho">SIGNATURE VERIFIER</text><text x="132" y="376" class="vtCname vtCnameG">FALCON-512</text><text x="248" y="376" class="vtCtag vtCtagG">LATTICE</text></g>`);
s.push('</g></g>');

// ================= FRACTURES + DISPLACED PLATE (red) =================
s.push('<g class="vtWeak">');
// ================= FRACTURES, third increase (2026-08-22) =========
// The first two passes put hairlines on the top face, the side face and
// the front face's left margin, and the drawing stopped reading more
// damaged because THE DOOR PLATE, its largest surface and where the eye
// actually rests, was nearly clean. This pass works the plate: the
// stiles either side of the window, the top rail above it, the band
// below the card, and the lower plate around the gauge.
// FEWER, LONGER RUNS, deliberately, and this is a judgement not a
// compliance: short cracks accumulate into surface texture, while a run
// that travels 260px down a stile reads as structural failure. So this
// adds FOUR long mains and six capillaries instead of a dozen short
// scratches, and the left stile's existing run is EXTENDED rather than
// paralleled, so the plate carries one long fracture interrupted by the
// caption band instead of two unrelated marks.
// NOT ONE on the STARKNET plinth (y > 516): the base layer was never
// the weak part, and that is the whole colour argument.
//
// STOP LINE. THE PLATE IS AT ITS LIMIT AND FRACTURES END HERE. Three
// reasons, and a fourth increase has to argue against them rather than
// around them. (1) The ground still clean is only narrow bands: 14px
// below the card, 12px at the bottom rail, 20px in the caption band.
// Cracks there can only be SHORT, and short cracks read as wear and
// texture, not as damage. (2) The card and the window are now framed by
// fracture on all four sides; more crowds them instead of damaging the
// plate. (3) THE NUMBER: the ECDSA card is down to 35% of the red ink
// on the plate (2,335px of 6,684), from nearly all of it before this
// pass. It still wins the eye because it carries a fill where cracks
// are hairlines, but it wins by less, and it is the most important
// element in the drawing. Fewer and longer was the right shape for
// this pass precisely because a run the height of a stile reads as
// structural failure where ten short ones read as wear.
//
// THE LATTICE IS NOT AFFECTED BY ANY OF THIS, so do not re-raise it.
// It was raised and then measured: cracks retract 0.9s to 1.35s (see
// .vt-on .vtCrack, with capillaries 80ms ahead at .82s) and the FIRST
// lattice stroke does not land until 2.4s. Red ink on the plate reads
// 6,684px before the send, 127px at 2.0s, and 128px at 3.2s with the
// weave in progress; the residual is the dial's own red zone, which is
// scale marking and not damage. So the payoff arrives on a healed
// plate, ~98% of the red already gone, and a busier before-state makes
// the healed after-state read as a BIGGER change, not a smaller one.
//
// ENFORCEMENT, and none of it is by eye. Each crack declares the face
// it lives on and every vertex is asserted inside that face's own quad
// (front 44-314 x 150-500; top 44,150 / 314,150 / 422.6,117 /
// 179.6,117; side 314,150 / 422.6,117 / 422.6,432 / 314,500). Every
// SEGMENT is then tested against the protected regions: the window, the
// card body, the gauge dial, the gauge label, the contents caption and
// the three marked coins. Segment-versus-rectangle and
// segment-versus-circle, not vertex containment, because a crack can
// step over a small target without either end landing in it. The check
// paid for itself by failing a PRE-EXISTING capillary that ended at
// (120,220), four pixels inside the window. It had been there since
// the SECOND increase and no screenshot had caught it, because four
// pixels of hairline inside a glass panel is invisible to the eye and
// obvious to a segment test. Note WHY it was caught: the test is
// segment-versus-rectangle, not vertex containment. A vertex test only
// asks whether an endpoint landed in a protected shape, and a crack
// can step clean over a small target with both ends outside it.
// And the check was PROVEN rather than trusted: run against the old
// data it throws 'crack segment 111,216->120,220 crosses the window',
// and a probe aimed at the dial throws 'crosses the dial face'. If you
// change this file, re-run those two probes; a check nobody has seen
// fail is a check nobody should believe.
const FACES = {
  front: [FTL, FTR, FBR, FBL],
  top: [FTL, FTR, BTR, BTL],
  side: [FTR, BTR, BBR, FBR],
};
const KEEP = [
  { n: 'window', x0: 118, y0: 200, x1: 256, y1: 314 },
  { n: 'card body', x0: 116, y0: 334, x1: 258, y1: 392 },
  { n: 'gauge label', x0: 178, y0: 402, x1: 234, y1: 426 },
  { n: 'contents caption', x0: 108, y0: 317, x1: 266, y1: 330 },
];
const KEEPC = [
  { n: 'dial face', x: 150, y: 430, r: 24 },
  { n: 'BTC coin', x: 145, y: HY, r: MR + 1 },
  { n: 'ETH coin', x: 187, y: HY, r: MR + 1 },
  { n: 'STRK coin', x: 229, y: HY, r: MR + 1 },
];
function inPoly(p, poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cr) < 0.5) continue;
    const sg = cr > 0 ? 1 : -1;
    if (!sign) sign = sg; else if (sg !== sign) return false;
  }
  return true;
}
function segSeg(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
function segRect(p, q, R) {
  if (Math.max(p[0], q[0]) < R.x0 || Math.min(p[0], q[0]) > R.x1) return false;
  if (Math.max(p[1], q[1]) < R.y0 || Math.min(p[1], q[1]) > R.y1) return false;
  const inside = (t) => t[0] > R.x0 && t[0] < R.x1 && t[1] > R.y0 && t[1] < R.y1;
  if (inside(p) || inside(q)) return true;
  const c = [[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]];
  for (let i = 0; i < 4; i++) if (segSeg(p, q, c[i], c[(i + 1) % 4])) return true;
  return false;
}
function segCircle(p, q, C) {
  const dx = q[0] - p[0], dy = q[1] - p[1], L2 = dx * dx + dy * dy;
  let t = L2 ? ((C.x - p[0]) * dx + (C.y - p[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] + t * dx - C.x, p[1] + t * dy - C.y) < C.r;
}
const CRACKS = [
  // ---- mains already on the object ----
  { f: 'front', hair: 0, name: 'front upper right', p: [[290, 152], [281, 164], [288, 173], [276, 187], [281, 196], [270, 203]] },
  { f: 'front', hair: 0, name: 'front lower left', p: [[46, 452], [60, 443], [57, 433], [73, 425], [71, 416], [84, 410]] },
  // the left stile's run, EXTENDED down to the caption band this pass
  { f: 'front', hair: 0, name: 'left stile, upper', p: [[100, 196], [109, 207], [103, 216], [111, 226], [105, 248], [112, 270], [104, 292], [110, 312]] },
  { f: 'side', hair: 0, name: 'side upper', p: [[338, 176], [348, 189], [343, 198], [355, 213]] },
  { f: 'side', hair: 0, name: 'side below the vent', p: [[352, 380], [360, 389], [356, 397], [365, 407]] },
  { f: 'top', hair: 0, name: 'wraps onto the top face', p: [[292, 149], [306, 144], [302, 138], [318, 133]] },
  { f: 'top', hair: 0, name: 'top face over the ribs', p: [[236, 146], [248, 137], [244, 130], [258, 124]] },
  // ---- new mains, all on the door plate ----
  // the right stile, top rail to bottom rail: 264px, the longest run in
  // the drawing. Held to x 261-276 so it clears the window (256) and the
  // card (258) on one side and the inner frame (282) on the other, and
  // pushed to x >= 268 through y 312-336 so it passes RIGHT of the
  // caption instead of through it.
  { f: 'front', hair: 0, name: 'right stile, full height', p: [[272, 192], [266, 214], [273, 238], [265, 262], [271, 288], [269, 312], [276, 336], [266, 360], [272, 386], [262, 410], [269, 436], [264, 456]] },
  // below the card, then down the lower right plate. Threads the 14px
  // band between the card's bottom (392) and the dial's keep-out top
  // (406), stays above the label (402) until it is clear of x=234, then
  // falls to the bottom rail.
  { f: 'front', hair: 0, name: 'below the card, into the lower plate', p: [[98, 396], [116, 401], [134, 395], [152, 400], [170, 394], [190, 398], [212, 394], [234, 398], [250, 414], [258, 438], [266, 458]] },
  // the left stile below the caption, continuing the upper run
  { f: 'front', hair: 0, name: 'left stile, lower', p: [[105, 331], [112, 352], [104, 374], [111, 396], [103, 418], [110, 440], [102, 458]] },
  // the top rail, above the window
  { f: 'front', hair: 0, name: 'top rail', p: [[138, 188], [158, 197], [178, 189], [198, 196], [218, 188]] },
  // ---- capillaries: hairline branches off the mains ----
  { f: 'front', hair: 1, p: [[288, 173], [279, 177], [273, 174]] },
  { f: 'front', hair: 1, p: [[270, 203], [262, 211]] },
  { f: 'front', hair: 1, p: [[74, 424], [80, 432], [88, 435]] },
  { f: 'side', hair: 1, p: [[348, 198], [357, 203]] },
  { f: 'side', hair: 1, p: [[360, 397], [368, 392]] },
  { f: 'top', hair: 1, p: [[244, 130], [253, 136]] },
  // was [[111,216],[120,220]] until this pass: the second point sat
  // inside the window and the new segment check caught it. Turned away
  // from the glass instead of being trimmed to the edge.
  { f: 'front', hair: 1, p: [[111, 216], [103, 221]] },
  { f: 'top', hair: 1, p: [[306, 138], [311, 131]] },
  // ---- new capillaries off the new mains ----
  { f: 'front', hair: 1, p: [[266, 214], [259, 209]] },
  { f: 'front', hair: 1, p: [[262, 410], [253, 406]] },
  { f: 'front', hair: 1, p: [[250, 414], [243, 423]] },
  { f: 'front', hair: 1, p: [[266, 458], [274, 451]] },
  { f: 'front', hair: 1, p: [[104, 374], [96, 378]] },
  { f: 'front', hair: 1, p: [[110, 440], [119, 447]] },
];
let mains = 0, hairs = 0;
for (const c of CRACKS) {
  const poly = FACES[c.f];
  for (const pt of c.p) {
    if (!inPoly(pt, poly)) throw new Error('crack vertex ' + pt + ' is off the ' + c.f + ' face' + (c.name ? ' (' + c.name + ')' : ''));
  }
  for (let i = 0; i < c.p.length - 1; i++) {
    for (const R of KEEP) {
      if (segRect(c.p[i], c.p[i + 1], R)) throw new Error('crack segment ' + c.p[i] + '->' + c.p[i + 1] + ' crosses the ' + R.n + (c.name ? ' (' + c.name + ')' : ''));
    }
    for (const C of KEEPC) {
      if (segCircle(c.p[i], c.p[i + 1], C)) throw new Error('crack segment ' + c.p[i] + '->' + c.p[i + 1] + ' crosses the ' + C.n + (c.name ? ' (' + c.name + ')' : ''));
    }
  }
  const d = 'M' + c.p.map((q) => f(q[0]) + ' ' + f(q[1])).join(' L');
  P(d, c.hair ? 'vtCrack vtCrackH' : 'vtCrack', ' pathLength="1"');
  if (c.hair) hairs++; else mains++;
}
const plateLen = CRACKS.filter((c) => !c.hair).reduce((t, c) => {
  let L = 0;
  for (let i = 0; i < c.p.length - 1; i++) L += Math.hypot(c.p[i + 1][0] - c.p[i][0], c.p[i + 1][1] - c.p[i][1]);
  return t + L;
}, 0);
console.log('fractures: ' + mains + ' mains + ' + hairs + ' capillaries = ' + (mains + hairs) + ' paths; total main length ' + Math.round(plateLen) + 'px');
// displaced corner plate on the DOOR's top-right corner: the seat
// outline stays put, the plate itself sits shifted and slightly turned,
// and the displacement stays inside the front face so the silhouette
// is never broken
PL([[236, 188], [280, 188], [280, 238], [236, 231]], 'vtSeat');
s.push(`<g class="vtPlate"><polygon points="236,188 280,188 280,238 236,231" class="vtPlateP"/></g>`);
s.push('</g>');

// ================= LATTICE (Falcon is lattice-based; the mesh IS the =====
// replacement for the elliptic curve, never remove it as ornament) =======
// clip: the two shell faces MINUS the window, the card slot and the
// gauge, so the mesh never crosses anything that must stay readable
s.push(`<clipPath id="vtFaces"><path clip-rule="evenodd" d="M${pts([FTL, FTR, FBR, FBL])} Z M${pts([FTR, BTR, BBR, FBR])} Z M114,202 h146 v124 h-146 Z M112,330 h150 v66 h-150 Z M120,404 h118 v52 h-118 Z"/></clipPath>`);
s.push('<g class="vtLattice" clip-path="url(#vtFaces)">');
let li = 0;
for (let k = -6; k <= 3; k++) L(44 + k * 52, 560, 44 + k * 52 + 460, 100, `vtLat vtLat${li++}`, ' pathLength="1"');
for (let k = 0; k <= 9; k++) L(-16 + k * 52, 100, -16 + k * 52 + 460, 560, `vtLat vtLat${li++}`, ' pathLength="1"');
s.push('</g>');

// ================= ANNOTATION =================
s.push(`<text x="44" y="104" class="vtNote vtNoteL">WALLET / ACCOUNT CONTRACT</text>`);
// the tense, carried as a drawing annotation rather than a disclaimer:
// four words of mono in the opposite top corner read as a revision stamp
// on a plan. Right-anchored at 456 to mirror the heading's 44. It
// replaced a sentence under the drawing that asserted more than it
// needed to; the fractures are the future tense, this dates them.
s.push(`<text x="456" y="104" class="vtNote vtNoteR">SHOWN AS OF Q-DAY</text>`);

fs.writeFileSync('vault-inner.svg.txt', s.join('\n      '));
console.log('lines:', s.length, 'lattice strokes:', li, 'bytes:', s.join('').length);
