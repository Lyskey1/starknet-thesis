/* Pull every ecosystem avatar from the X API at full resolution, and each
   account's display name.
   unavatar rate-limits far too hard to finish the list (78 handles stuck at
   96px after three passes). The API hands back `profile_image_url`, which is
   the `_normal` 48px variant — strip the suffix for the ORIGINAL upload.
   DISPLAY NAMES (2026-09-23): the same lookup returns `name`, the account's
   display name. It is written to a `displayName` field on every matching
   account in data/ecosystem.json and data/ecosystem-export.json. THIS
   SCRIPT IS THE ONLY WRITER of that field: the editor's publish path
   (ecosystem.html -> /api/publish) rebuilds accounts from name/handle/url/
   description/avatar and would drop it, so a publish must be followed by a
   run of this script. `name` in the data stays the legacy "@handle" string
   the directory renders; the hero chip reads displayName. Names pass through
   scripts/lib/display-name.mjs (emoji, joiners and dangling separators out;
   letters in every script and em-dashes untouched); every altered name is
   printed before -> after, and every name carrying an em-dash is listed, so a
   fetch can be reviewed before it ships.
   Needs X_BEARER_TOKEN in the environment or in .env (gitignored).
   --dry-run reports what would change and writes nothing. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeDisplayName } from './lib/display-name.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'assets', 'avatars');
const DATA = path.join(ROOT, 'public', 'data', 'ecosystem.json');

const EXPORT = path.join(ROOT, 'public', 'data', 'ecosystem-export.json');
const DRY = process.argv.includes('--dry-run');

const envFile = path.join(ROOT, '.env');
const env = fs.existsSync(envFile) ? Object.fromEntries(
  fs.readFileSync(envFile, 'utf8').split('\n')
    .filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
) : {};
const TOKEN = process.env.X_BEARER_TOKEN || env.X_BEARER_TOKEN;
if (!TOKEN) { console.error('X_BEARER_TOKEN missing from the environment and from .env'); process.exit(1); }

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
const found = new Map(), names = new Map();
const altered = [], emDashed = [], emptied = [];
for (let i = 0; i < handles.length; i += 100) {
  const batch = handles.slice(i, i + 100);
  const url = 'https://api.x.com/2/users/by?usernames=' + batch.map(encodeURIComponent).join(',') +
              '&user.fields=profile_image_url,name';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  if (!res.ok) { console.error('lookup failed', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
  const json = await res.json();
  (json.data || []).forEach((u) => {
    if (u.profile_image_url) found.set(u.username.toLowerCase(), u.profile_image_url);
    const raw = String(u.name || '');
    const r = sanitizeDisplayName(raw);   // cap = the publish endpoint's 160, so the two never disagree
    if (r.name) names.set(u.username.toLowerCase(), r.name);
    else if (raw.trim()) emptied.push({ handle: u.username, before: raw });
    if (r.name && r.altered) altered.push({ handle: u.username, before: raw, after: r.name });
    if (r.emDash) emDashed.push({ handle: u.username, name: r.name });
  });
  (json.errors || []).forEach((e) => console.log('no account', e.value || e.detail));
  console.log(`looked up ${batch.length}, have ${found.size}`);
  await sleep(1200);
}

const extFor = (ct, url) => ct.includes('webp') ? '.webp' : ct.includes('png') ? '.png' :
  (url.endsWith('.png') ? '.png' : '.jpg');

/* ---- review output: what the sanitizer changed, what carries an em-dash ---- */
const q = (t) => JSON.stringify(t);
console.log(`\nnames altered by the sanitizer: ${altered.length}`);
altered.forEach((a) => console.log(`  ${a.handle}: ${q(a.before)} -> ${q(a.after)}`));
console.log(`names emptied by the sanitizer (handle shown instead): ${emptied.length}`);
emptied.forEach((a) => console.log(`  ${a.handle}: ${q(a.before)} -> (none)`));
console.log(`names containing an em-dash (kept as is, review): ${emDashed.length}`);
emDashed.forEach((a) => console.log(`  ${a.handle}: ${q(a.name)}`));
console.log('');

/* ---- display names -> ecosystem.json + the export ---- */
function stampNames(file, accountsOf) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  let set = 0, changed = 0, unnamed = [];
  for (const a of accountsOf(doc)) {
    if (!a.handle) continue;
    const nm = names.get(String(a.handle).toLowerCase());
    if (!nm) { unnamed.push(a.handle); continue; }
    if (a.displayName !== nm) changed++;
    a.displayName = nm; set++;
  }
  const out = JSON.stringify(doc, null, 2) + '\n';
  if (!DRY && out !== raw) fs.writeFileSync(file, out);
  console.log(`${DRY ? '[dry-run] ' : ''}${path.relative(ROOT, file)}: displayName on ${set} accounts (${changed} new or changed), ${unnamed.length} without a name from X${unnamed.length ? ': ' + unnamed.join(', ') : ''}`);
  return unnamed;
}
const unnamed = stampNames(DATA, (doc) => Object.values(doc).flat());
if (fs.existsSync(EXPORT)) stampNames(EXPORT, (doc) => (Array.isArray(doc) ? doc : []).flatMap((c) => c.accounts || []));
console.log(`display names: ${handles.length - unnamed.length} of ${handles.length} handles named, ${unnamed.length} still missing`);
if (DRY) { console.log('[dry-run] skipping avatar downloads'); process.exit(0); }

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
