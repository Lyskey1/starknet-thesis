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
s.push(`<rect x="118" y="206" width="138" height="100" rx="12" class="vtGf"/>`);
L(130, 296, 158, 216, 'vtGl'); L(144, 298, 172, 218, 'vtGl');   // glints
// Each mark carries its OWN official form (no generic ring around it),
// all three in the neutral asset gray: the colorway is what makes the
// color argument legible, so no mark ships in brand colors here.
// BITCOIN: public domain. Path data lifted verbatim from
// assets/img/bitcoin-logo.svg (itself verbatim from bitcoin.org's
// press-kit logotop.svg), disc rendered as a gray outline instead of
// the orange fill, the B as gray ink. Not redrawn. Sized to a 33px
// disc: 33/39.119 = 0.84359, origin (0.893,0.469) placed at (125.5,233.5).
s.push('<g transform="translate(124.747,233.104) scale(0.84359)"><g transform="matrix(0.61129216,0,0,0.61129216,-118.80398,-25.96802)">');
s.push('<path d="m258.845 82.989c-4.274 17.143-21.637 27.576-38.782 23.301-17.138-4.274-27.571-21.638-23.295-38.78 4.272-17.145 21.635-27.579 38.775-23.305 17.144 4.274 27.576 21.64 23.302 38.784z" class="vtBtcDisc"/>');
s.push('<path d="m241.91 70.689c0.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-0.875-1.4 5.616c-0.923-0.23-1.871-0.447-2.813-0.662l1.41-5.653-3.509-0.875-1.439 5.766c-0.764-0.174-1.514-0.346-2.242-0.527l0.004-0.018-4.842-1.209-0.934 3.75c0 0 2.605 0.597 2.55 0.634 1.422 0.355 1.679 1.296 1.636 2.042l-1.638 6.571c0.098 0.025 0.225 0.061 0.365 0.117-0.117-0.029-0.242-0.061-0.371-0.092l-2.296 9.205c-0.174 0.432-0.615 1.08-1.609 0.834 0.035 0.051-2.552-0.637-2.552-0.637l-1.743 4.019 4.569 1.139c0.85 0.213 1.683 0.436 2.503 0.646l-1.453 5.834 3.507 0.875 1.439-5.772c0.958 0.26 1.888 0.5 2.798 0.726l-1.434 5.745 3.511 0.875 1.453-5.823c5.987 1.133 10.489 0.676 12.384-4.739 1.527-4.36-0.076-6.875-3.226-8.515 2.294-0.529 4.022-2.038 4.483-5.155zm-8.022 11.249c-1.085 4.36-8.426 2.003-10.806 1.412l1.928-7.729c2.38 0.594 10.012 1.77 8.878 6.317zm1.086-11.312c-0.99 3.966-7.1 1.951-9.082 1.457l1.748-7.01c1.982 0.494 8.365 1.416 7.334 5.553z" class="vtBtcB"/>');
s.push('</g></g>');
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
  const H = 33, cx = 187, top = 250 - H / 2, hw = 0.30702 * H;
  const y = (fr) => top + fr * H;
  PLl([[cx, y(0)], [cx + hw, y(0.50927)], [cx, y(0.69069)], [cx - hw, y(0.50927)], [cx, y(0)]], 'vtMk');
  L(cx, y(0), cx, y(0.69069), 'vtMkh');
  PLl([[cx - hw, y(0.56747)], [cx, y(0.74879)], [cx + hw, y(0.56747)]], 'vtMk');
  PLl([[cx - hw, y(0.56747)], [cx, y(1)], [cx + hw, y(0.56747)]], 'vtMk');
  L(cx, y(0.74879), cx, y(1), 'vtMkh');
}
// STRK: official Starknet mark geometry (assets/img/starknet-mark.svg,
// itself lifted verbatim from starknet.io's theme asset), inlined and
// rendered in the visual's neutral asset gray, the same colorway rule
// the site applied to Xanadu's color-delegating logo. Not redrawn.
s.push('<g transform="translate(215.466,232.829) scale(0.825)" class="vtStrk">');
s.push('<path d="M0.294582 20.813C0.294582 31.719 9.13542 40.5598 20.0414 40.5598C30.9474 40.5598 39.7888 31.719 39.7888 20.813C39.7888 9.90701 30.9474 1.06616 20.0414 1.06616C9.13542 1.06616 0.294582 9.907 0.294582 20.813Z" class="vtStrkDisc"/>');
s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M11.2193 16.1014L11.713 14.5761C11.8133 14.2659 12.0582 14.0245 12.3695 13.9293L13.9023 13.4579C14.1145 13.3931 14.1162 13.0938 13.9057 13.0256L12.3799 12.5319C12.0702 12.4315 11.8288 12.1867 11.7331 11.8753L11.2623 10.3425C11.1975 10.1309 10.8982 10.1286 10.8299 10.3397L10.3362 11.865C10.2359 12.1746 9.991 12.416 9.67963 12.5118L8.14688 12.9826C7.93472 13.0479 7.93243 13.3467 8.14344 13.4149L9.66931 13.9086C9.97896 14.009 10.2204 14.2544 10.3161 14.5658L10.7869 16.0979C10.8517 16.3101 11.151 16.3124 11.2193 16.1014Z" class="vtStrkInk"/>');
s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M35.4461 15.2138C34.8142 14.5072 33.828 14.1093 32.8693 13.9462C31.9028 13.7895 30.8896 13.804 29.9355 13.9735C28.0051 14.3001 26.2514 15.0994 24.7219 16.0854C23.9276 16.5694 23.2502 17.1293 22.5484 17.6996C22.2103 17.988 21.902 18.2952 21.5809 18.5979L20.7036 19.4708C19.7504 20.4672 18.8108 21.3747 17.9017 22.127C16.989 22.8758 16.1356 23.4444 15.2947 23.8416C14.4542 24.2408 13.5549 24.4755 12.3828 24.5131C11.221 24.5541 9.84635 24.3444 8.376 23.9983C6.89774 23.6537 5.34543 23.1625 3.61075 22.7399C4.21602 24.4191 5.12749 25.903 6.2977 27.2594C7.48164 28.5923 8.96003 29.8072 10.8592 30.6062C12.7309 31.4229 15.0831 31.716 17.2825 31.2737C19.4877 30.8493 21.4229 29.8288 22.9871 28.6487C24.5553 27.4565 25.8241 26.0984 26.8937 24.6866C27.189 24.2965 27.3452 24.0782 27.5589 23.7733L28.1494 22.8985C28.5599 22.3573 28.9335 21.7412 29.3397 21.2051C30.1362 20.0822 30.9214 18.9607 31.8339 17.9274C32.2932 17.4033 32.7773 16.902 33.349 16.4203C33.6342 16.1851 33.9423 15.955 34.2835 15.7477C34.6299 15.5241 34.9957 15.3491 35.4461 15.2138Z" class="vtStrkSw"/>');
s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M35.4462 15.2134C34.7673 13.5004 33.5054 12.0585 31.8115 10.9945C30.1279 9.94223 27.7895 9.4052 25.4724 9.86299C24.3277 10.0844 23.2187 10.5106 22.2454 11.0782C21.2766 11.6436 20.4084 12.3241 19.6569 13.0543C19.2817 13.4205 18.9411 13.8026 18.6028 14.1869L17.7258 15.3049L16.3714 17.1046C14.6447 19.4202 12.7853 22.1339 9.73396 22.938C6.73838 23.7274 5.43914 23.0283 3.61086 22.7395C3.94515 23.6026 4.35925 24.4407 4.92063 25.1781C5.47155 25.9304 6.12227 26.637 6.9313 27.2426C7.34015 27.5335 7.7718 27.8206 8.25121 28.0641C8.72843 28.2994 9.24309 28.5064 9.79242 28.6623C10.8851 28.9618 12.1152 29.0667 13.3063 28.9056C14.498 28.7466 15.637 28.369 16.6326 27.8674C17.6355 27.3706 18.5092 26.7656 19.2893 26.127C20.8401 24.8392 22.0464 23.4162 23.0653 21.9778C23.5778 21.2587 24.043 20.5259 24.4733 19.793L24.9797 18.9205C25.1345 18.6654 25.2911 18.4088 25.4502 18.1698C26.0918 17.2095 26.7194 16.4395 27.4817 15.8616C28.2335 15.2687 29.2802 14.8307 30.679 14.7289C32.072 14.626 33.6801 14.8162 35.4462 15.2134Z" class="vtStrkInk"/>');
s.push('<path fill-rule="evenodd" clip-rule="evenodd" d="M27.91 29.4455C27.91 30.7036 28.9304 31.724 30.1885 31.724C31.4466 31.724 32.4658 30.7036 32.4658 29.4455C32.4658 28.1874 31.4466 27.167 30.1885 27.167C28.9304 27.167 27.91 28.1874 27.91 29.4455Z" class="vtStrkSw"/>');
s.push('</g>');
s.push(`<text x="187" y="296.5" class="vtNote">BTC &#183; ETH &#183; STRK &#183; UNCHANGED</text>`);
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
// MAINS. The damage wraps the object: two runs on the front plate, two
// on the side face, two crossing onto the top face. Every point is
// inside its own face (the top face is the quad 44,150 / 314,150 /
// 422.6,117 / 179.6,117 and the side face 314,150 / 422.6,117 /
// 422.6,432 / 314,500), and the side runs dodge the vent (x 333-392,
// y 262-343). NOT ONE on the STARKNET plinth (y > 516): the base layer
// was never the weak part, and that is the whole color argument.
P('M290 152 l-9 12 l7 9 l-12 14 l5 9 l-11 7', 'vtCrack', ' pathLength="1"');   // front, upper right
P('M46 452 l14 -9 l-3 -10 l16 -8 l-2 -9 l13 -6', 'vtCrack', ' pathLength="1"'); // front, lower left
P('M100 196 l9 11 l-6 9 l8 10', 'vtCrack', ' pathLength="1"');                  // front, left of the window
P('M338 176 l10 13 l-5 9 l12 15', 'vtCrack', ' pathLength="1"');                // side, upper
P('M352 380 l8 9 l-4 8 l9 10', 'vtCrack', ' pathLength="1"');                   // side, below the vent
P('M292 149 l14 -5 l-4 -6 l16 -5', 'vtCrack', ' pathLength="1"');               // wraps onto the top face
P('M236 146 l12 -9 l-4 -7 l14 -6', 'vtCrack', ' pathLength="1"');               // top face, over the ribs
// CAPILLARIES: hairline branches off the mains, thinner still
P('M288 173 l-9 4 l-6 -3', 'vtCrack vtCrackH', ' pathLength="1"');
P('M270 203 l-8 8', 'vtCrack vtCrackH', ' pathLength="1"');
P('M74 424 l6 8 l8 3', 'vtCrack vtCrackH', ' pathLength="1"');
P('M348 198 l9 5', 'vtCrack vtCrackH', ' pathLength="1"');
P('M360 397 l8 -5', 'vtCrack vtCrackH', ' pathLength="1"');
P('M244 130 l9 6', 'vtCrack vtCrackH', ' pathLength="1"');
P('M111 216 l9 4', 'vtCrack vtCrackH', ' pathLength="1"');
P('M306 138 l5 -7', 'vtCrack vtCrackH', ' pathLength="1"');
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
s.push(`<clipPath id="vtFaces"><path clip-rule="evenodd" d="M${pts([FTL, FTR, FBR, FBL])} Z M${pts([FTR, BTR, BBR, FBR])} Z M114,202 h146 v108 h-146 Z M112,330 h150 v66 h-150 Z M120,404 h118 v52 h-118 Z"/></clipPath>`);
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
