/* Pull every ecosystem avatar again at 400px.
   The originals on disk are 96x96 — fine for a 40px chip, mush on a 330px
   card. unavatar serves the source image at a requested size; anything that
   comes back no bigger than what we already have is left alone. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'public');
const OUT = path.join(ROOT, 'assets', 'avatars');
const DATA = path.join(ROOT, 'data', 'ecosystem.json');

const SIZE = 400;
const GAP_MS = 5200;   /* unavatar 429s hard below ~5s between handles */
const MIN_BYTES = 2048;
/* A 429 is the limiter, not a missing avatar — the same handle returns a real
   image once it lets through. Treating it as "unavailable" left 78 accounts on
   their 96px originals. */
const BACKOFFS_MS = [20000, 45000, 90000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const handles = [...new Set(Object.values(data).flat().map((a) => a.handle).filter(Boolean))];

/* width of a PNG/JPEG/WEBP already on disk, or 0 */
function widthOf(file) {
  if (!fs.existsSync(file)) return 0;
  const b = fs.readFileSync(file);
  try {
    if (b.slice(0, 4).toString('binary') === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
      const tag = b.slice(12, 16).toString();
      if (tag === 'VP8X') return ((b[24] | (b[25] << 8) | (b[26] << 16)) & 0xffffff) + 1;
      if (tag === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
      if (tag === 'VP8L') return ((b.readUInt32LE(21) & 0x3fff) + 1);
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return b.readUInt16BE(i + 7);
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    if (b.slice(1, 4).toString() === 'PNG') return b.readUInt32BE(16);
  } catch { /* unreadable header: treat as tiny and refetch */ }
  return 0;
}

const extFor = (ct) => ct.includes('webp') ? '.webp' : ct.includes('png') ? '.png' : '.jpg';

let upgraded = 0, kept = 0, missed = 0;
for (const h of handles) {
  const existing = ['.webp', '.jpg', '.png'].map((e) => path.join(OUT, h + e)).filter(fs.existsSync);
  const have = existing.length ? Math.max(...existing.map(widthOf)) : 0;
  if (have >= SIZE) { kept++; continue; }
  let got = null;
  const sources = [
    `https://unavatar.io/x/${encodeURIComponent(h)}?size=${SIZE}&fallback=false`,
    `https://unavatar.io/twitter/${encodeURIComponent(h)}?size=${SIZE}&fallback=false`
  ];
  outer: for (const url of sources) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      } catch { break; }
      if (res.status === 429) {
        if (attempt >= BACKOFFS_MS.length) break;
        console.log('  429   ' + h + ' — waiting ' + (BACKOFFS_MS[attempt] / 1000) + 's');
        await sleep(BACKOFFS_MS[attempt]);
        continue;
      }
      if (!res.ok) break;
      const ct = res.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) break;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < MIN_BYTES) break;
      got = { buf, ext: extFor(ct) };
      break outer;
    }
    await sleep(600);
  }
  if (!got) { missed++; console.log('miss  ', h, '(kept ' + have + 'px)'); await sleep(GAP_MS); continue; }
  const dest = path.join(OUT, h + got.ext);
  fs.writeFileSync(dest, got.buf);
  const now = widthOf(dest);
  if (now <= have) { fs.unlinkSync(dest); kept++; }
  else {
    /* a bigger file in a different extension makes the old one dead weight */
    existing.filter((f) => f !== dest).forEach((f) => fs.unlinkSync(f));
    upgraded++; console.log('upgrade', h, have + 'px ->', now + 'px');
  }
  await sleep(GAP_MS);
}
console.log(`\ndone: ${upgraded} upgraded, ${kept} already fine, ${missed} unavailable`);
