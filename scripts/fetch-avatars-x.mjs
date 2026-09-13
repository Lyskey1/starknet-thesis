/* Pull every ecosystem avatar from the X API at full resolution.
   unavatar rate-limits far too hard to finish the list (78 handles stuck at
   96px after three passes). The API hands back `profile_image_url`, which is
   the `_normal` 48px variant — strip the suffix for the ORIGINAL upload.
   Needs X_BEARER_TOKEN in .env (gitignored). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'assets', 'avatars');
const DATA = path.join(ROOT, 'public', 'data', 'ecosystem.json');

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')
    .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const TOKEN = env.X_BEARER_TOKEN;
if (!TOKEN) { console.error('X_BEARER_TOKEN missing from .env'); process.exit(1); }

const MIN_BYTES = 2048;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const handles = [...new Set(Object.values(data).flat().map((a) => a.handle).filter(Boolean))];

function widthOf(file) {
  if (!fs.existsSync(file)) return 0;
  const b = fs.readFileSync(file);
  try {
    if (b.slice(0, 4).toString('binary') === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
      const tag = b.slice(12, 16).toString();
      if (tag === 'VP8X') return ((b[24] | (b[25] << 8) | (b[26] << 16)) & 0xffffff) + 1;
      if (tag === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
      if (tag === 'VP8L') return (b.readUInt32LE(21) & 0x3fff) + 1;
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
  } catch { /* unreadable: refetch */ }
  return 0;
}

/* look every handle up, 100 at a time */
const found = new Map();
for (let i = 0; i < handles.length; i += 100) {
  const batch = handles.slice(i, i + 100);
  const url = 'https://api.x.com/2/users/by?usernames=' + batch.map(encodeURIComponent).join(',') +
              '&user.fields=profile_image_url';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!res.ok) { console.error('lookup failed', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
  const json = await res.json();
  (json.data || []).forEach((u) => { if (u.profile_image_url) found.set(u.username.toLowerCase(), u.profile_image_url); });
  (json.errors || []).forEach((e) => console.log('no account', e.value || e.detail));
  console.log(`looked up ${batch.length}, have ${found.size}`);
  await sleep(1200);
}

const extFor = (ct, url) => ct.includes('webp') ? '.webp' : ct.includes('png') ? '.png' :
  (url.endsWith('.png') ? '.png' : '.jpg');

let upgraded = 0, kept = 0, missing = 0;
for (const h of handles) {
  const url = found.get(h.toLowerCase());
  if (!url) { missing++; continue; }
  const existing = ['.webp', '.jpg', '.png'].map((e) => path.join(OUT, h + e)).filter(fs.existsSync);
  const have = existing.length ? Math.max(...existing.map(widthOf)) : 0;
  /* `_normal` is 48px. Dropping the variant gives the original upload, but
     that 404s for plenty of accounts — fall back to the 400x400 variant, then
     to the 200x200, before giving up. */
  const variants = [
    url.replace(/_normal(\.\w+)$/, '$1'),
    url.replace(/_normal(\.\w+)$/, '_400x400$1'),
    url.replace(/_normal(\.\w+)$/, '_200x200$1'),
    url
  ];
  let res = null, chosen = null;
  for (const v of variants) {
    try { res = await fetch(v, { headers: { 'User-Agent': 'Mozilla/5.0' } }); } catch { continue; }
    if (res.ok && (res.headers.get('content-type') || '').startsWith('image/')) { chosen = v; break; }
  }
  if (!chosen) { console.log('no image', h); missing++; continue; }
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) continue;
  const dest = path.join(OUT, h + extFor(ct, chosen));
  /* Write to a scratch name first. Writing straight to `dest` and unlinking it
     when the result is no better DELETES the file we were comparing against,
     which is how a second run wiped 78 avatars it had fetched on the first. */
  const tmp = dest + '.new';
  fs.writeFileSync(tmp, buf);
  const now = widthOf(tmp);
  if (now <= have) { fs.unlinkSync(tmp); kept++; }
  else {
    fs.renameSync(tmp, dest);
    existing.filter((f) => f !== dest).forEach((f) => fs.unlinkSync(f));
    upgraded++; console.log('upgrade', h, have + 'px ->', now + 'px');
  }
  await sleep(120);
}
console.log(`\ndone: ${upgraded} upgraded, ${kept} already fine, ${missing} no X account`);
