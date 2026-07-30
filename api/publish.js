/* Serverless publish endpoint for the news content (Vercel function).
   POST /api/publish with header X-Publish-Key and a JSON body of
   { <page>: [entries...] } for one or more known pages. On success it
   commits data/news.json to the repo via the GitHub Contents API; the
   static site redeploys from that commit. Secrets (ADMIN_PUBLISH_KEY,
   GITHUB_TOKEN) live in Vercel environment variables, server side only,
   and are never logged or echoed. */
'use strict';

const crypto = require('crypto');

const PAGES = ['quantum', 'privacy', 'btcfi'];
const REPO = process.env.GITHUB_REPO || 'Lyskey1/starknet-thesis';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH = 'data/news.json';

const MAX_BODY_BYTES = 512 * 1024; // total payload cap for the news target
const MAX_ENTRIES_PER_PAGE = 100;
// entry shape as inventoried from the news engines (publicCards output);
// values are per-field string length caps
const FIELD_CAPS = { url: 2048, title: 400, date: 64, fallbackText: 2000, name: 160, handle: 160, initials: 8, color: 16 };

// ---------- ecosystem target ----------
// Writes data/ecosystem.json: { <categoryId>: [accounts] }. Custom avatars can
// be base64 data URLs (the editor downscales uploads to 96px JPEG, typically
// 3 to 10KB each), so this target gets its own caps: 2MB total (room for a
// couple hundred accounts each carrying a generous data URL; the news cap
// stays 512KB), 150K chars per avatar, 160K chars per entry.
const ECO_FILE = 'data/ecosystem.json';
const ECO_CATS = ['official', 'defi', 'consumer', 'nft', 'appchains', 'tooling', 'starkware', 'snf', 'builders', 'shitposter'];
const ECO_MAX_BODY_BYTES = 2 * 1024 * 1024;
const ECO_MAX_PER_CAT = 200;
const ECO_FIELD_CAPS = { handle: 64, name: 160, url: 2048, description: 600, avatar: 150000 };
const ECO_MAX_ENTRY_CHARS = 160000;

// ---------- btcfi ecosystem target ----------
// Writes data/btcfi-ecosystem.json: { wallets|bridges|defi: [items] }. The
// three categories are fixed and code-owned on the page; only items publish.
// Chip categories (wallets, bridges) carry { name, logo, url }; the defi card
// category additionally carries { tags, description }. Logos may be base64
// data URLs (96px JPEG uploads), so this target shares the 2MB cap rationale.
const BTCFI_ECO_FILE = 'data/btcfi-ecosystem.json';
const BTCFI_CATS = ['wallets', 'bridges', 'defi'];
const BTCFI_MAX_PER_CAT = 100;
const BTCFI_FIELD_CAPS = { name: 120, logo: 150000, url: 2048, description: 400 };
const BTCFI_MAX_TAGS = 8;
const BTCFI_TAG_CAP = 40;
const BTCFI_MAX_ENTRY_CHARS = 160000;

// btcfi ecosystem payload validation; returns null if valid, else a message
function validateBtcfiEco(eco) {
  if (!eco || typeof eco !== 'object' || Array.isArray(eco)) {
    return 'btcfi-ecosystem must be an object of the form { "<categoryId>": [items] }';
  }
  const keys = Object.keys(eco);
  if (!keys.length) return 'btcfi-ecosystem has no category keys; expected one or more of: ' + BTCFI_CATS.join(', ');
  let total = 0;
  for (const k of keys) {
    if (!BTCFI_CATS.includes(k)) return 'unknown btcfi-ecosystem category "' + k + '"; allowed: ' + BTCFI_CATS.join(', ');
    const list = eco[k];
    if (!Array.isArray(list)) return 'btcfi-ecosystem category "' + k + '" must be an array of items';
    if (list.length > BTCFI_MAX_PER_CAT) {
      return 'btcfi-ecosystem category "' + k + '" has ' + list.length + ' items; the cap is ' + BTCFI_MAX_PER_CAT;
    }
    total += list.length;
    const isCard = k === 'defi';
    const allowedList = isCard ? 'name, logo, url, tags, description' : 'name, logo, url';
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const where = 'btcfi-ecosystem category "' + k + '" item ' + (i + 1);
      if (!a || typeof a !== 'object' || Array.isArray(a)) return where + ' must be an object';
      if (typeof a.name !== 'string' || !a.name.trim()) return where + ' is missing its required "name" string';
      for (const f of Object.keys(a)) {
        if (f === 'tags') {
          if (!isCard) return where + ' has field "tags", which chip categories cannot render; allowed: ' + allowedList;
          if (!Array.isArray(a.tags)) return where + ' field "tags" must be an array of strings';
          if (a.tags.length > BTCFI_MAX_TAGS) return where + ' has ' + a.tags.length + ' tags; the cap is ' + BTCFI_MAX_TAGS;
          for (const tg of a.tags) {
            if (typeof tg !== 'string') return where + ' has a non-string tag';
            if (tg.length > BTCFI_TAG_CAP) return where + ' tag "' + tg.slice(0, 20) + '..." is ' + tg.length + ' chars; the cap is ' + BTCFI_TAG_CAP;
          }
          continue;
        }
        if (!(f in BTCFI_FIELD_CAPS) || (f === 'description' && !isCard)) {
          return where + ' has unexpected field "' + f + '"; allowed: ' + allowedList;
        }
        if (typeof a[f] !== 'string') return where + ' field "' + f + '" must be a string';
        if (a[f].length > BTCFI_FIELD_CAPS[f]) {
          return where + ' field "' + f + '" is ' + a[f].length + ' chars; the cap is ' + BTCFI_FIELD_CAPS[f];
        }
      }
      if (a.logo && !/^(assets\/|https:\/\/|http:\/\/|data:image\/)/.test(a.logo)) {
        return where + ' field "logo" must be an assets/ path, an http(s) URL, or a data:image URL';
      }
      if (JSON.stringify(a).length > BTCFI_MAX_ENTRY_CHARS) {
        return where + ' exceeds the ' + BTCFI_MAX_ENTRY_CHARS + ' character per-entry cap';
      }
    }
  }
  if (total === 0) return 'every provided btcfi-ecosystem category is empty; refusing to publish an empty block';
  return null;
}

function send(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.json(obj);
}

// timing-safe comparison that does not leak length either
function keyMatches(given, expected) {
  const a = crypto.createHash('sha256').update(String(given || ''), 'utf8').digest();
  const b = crypto.createHash('sha256').update(String(expected || ''), 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

// ecosystem payload validation; returns null if valid, else a specific message
function validateEco(eco) {
  if (!eco || typeof eco !== 'object' || Array.isArray(eco)) {
    return 'ecosystem must be an object of the form { "<categoryId>": [accounts] }';
  }
  const keys = Object.keys(eco);
  if (!keys.length) return 'ecosystem has no category keys; expected one or more of: ' + ECO_CATS.join(', ');
  let total = 0;
  for (const k of keys) {
    if (!ECO_CATS.includes(k)) return 'unknown ecosystem category "' + k + '"; allowed: ' + ECO_CATS.join(', ');
    const list = eco[k];
    if (!Array.isArray(list)) return 'ecosystem category "' + k + '" must be an array of accounts';
    if (list.length > ECO_MAX_PER_CAT) {
      return 'ecosystem category "' + k + '" has ' + list.length + ' accounts; the cap is ' + ECO_MAX_PER_CAT;
    }
    total += list.length;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const where = 'ecosystem category "' + k + '" account ' + (i + 1);
      if (!a || typeof a !== 'object' || Array.isArray(a)) return where + ' must be an object';
      if (typeof a.handle !== 'string' || !a.handle.trim()) return where + ' is missing its required "handle" string';
      for (const f of Object.keys(a)) {
        if (!(f in ECO_FIELD_CAPS)) {
          return where + ' has unexpected field "' + f + '"; allowed: handle, name, url, description, avatar';
        }
        if (typeof a[f] !== 'string') return where + ' field "' + f + '" must be a string';
        if (a[f].length > ECO_FIELD_CAPS[f]) {
          return where + ' field "' + f + '" is ' + a[f].length + ' chars; the cap is ' + ECO_FIELD_CAPS[f];
        }
      }
      if (a.avatar && !/^(assets\/|https:\/\/|http:\/\/|data:image\/)/.test(a.avatar)) {
        return where + ' field "avatar" must be an assets/ path, an http(s) URL, or a data:image URL';
      }
      if (JSON.stringify(a).length > ECO_MAX_ENTRY_CHARS) {
        return where + ' exceeds the ' + ECO_MAX_ENTRY_CHARS + ' character per-entry cap';
      }
    }
  }
  if (total === 0) return 'every provided ecosystem category is empty; refusing to publish an empty directory';
  return null;
}

// returns null if valid, otherwise a specific actionable message
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'payload must be a JSON object of the form { "<page>": [entries] }';
  }
  const keys = Object.keys(body);
  if (!keys.length) return 'payload has no page keys; expected one or more of: ' + PAGES.join(', ');
  for (const k of keys) {
    if (!PAGES.includes(k)) return 'unknown page key "' + k + '"; allowed: ' + PAGES.join(', ');
    const list = body[k];
    if (!Array.isArray(list)) return 'page "' + k + '" must be an array of entries';
    if (!list.length) return 'page "' + k + '" is empty; refusing to publish an empty list';
    if (list.length > MAX_ENTRIES_PER_PAGE) {
      return 'page "' + k + '" has ' + list.length + ' entries; the cap is ' + MAX_ENTRIES_PER_PAGE;
    }
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const where = 'page "' + k + '" entry ' + (i + 1);
      if (!e || typeof e !== 'object' || Array.isArray(e)) return where + ' must be an object';
      if (typeof e.url !== 'string' || !e.url.trim()) return where + ' is missing its required "url" string';
      for (const f of Object.keys(e)) {
        if (f === 'verified') {
          if (typeof e.verified !== 'boolean') return where + ' field "verified" must be a boolean';
          continue;
        }
        if (!(f in FIELD_CAPS)) {
          return where + ' has unexpected field "' + f + '"; allowed: url, title, date, fallbackText, name, handle, initials, color, verified';
        }
        if (typeof e[f] !== 'string') return where + ' field "' + f + '" must be a string';
        if (e[f].length > FIELD_CAPS[f]) {
          return where + ' field "' + f + '" is ' + e[f].length + ' chars; the cap is ' + FIELD_CAPS[f];
        }
      }
    }
  }
  return null;
}

async function gh(url, token, opts) {
  opts = opts || {};
  const headers = Object.assign({
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'starknet-thesis-publish',
    'X-GitHub-Api-Version': '2022-11-28'
  }, opts.headers || {});
  return fetch('https://api.github.com' + url, Object.assign({}, opts, { headers: headers }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method not allowed; POST a JSON payload' });
  }

  const adminKey = process.env.ADMIN_PUBLISH_KEY;
  const ghToken = process.env.GITHUB_TOKEN;
  if (!adminKey || !ghToken) {
    // configuration problem, not an auth problem; no secret detail leaks
    return send(res, 500, { error: 'publish endpoint is not configured on the server (missing environment variables)' });
  }

  if (!keyMatches(req.headers['x-publish-key'], adminKey)) {
    return send(res, 401, { error: 'invalid or missing publish key (X-Publish-Key header); nothing was published' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return send(res, 400, { error: 'body is not valid JSON' }); }
  }
  if (body === undefined || body === null) return send(res, 400, { error: 'body is not valid JSON (send Content-Type: application/json)' });

  // target routing: the ecosystem writes its own file and must not be mixed
  // with news pages in one request (each publish is atomic per file)
  const isObj = body && typeof body === 'object' && !Array.isArray(body);
  const isEco = isObj && 'ecosystem' in body;
  const isBtcfiEco = isObj && 'btcfi-ecosystem' in body;
  if ((isEco || isBtcfiEco) && Object.keys(body).length > 1) {
    return send(res, 400, { error: 'payload mixes publish targets; publish news, ecosystem, and btcfi-ecosystem separately' });
  }
  const bodyCap = (isEco || isBtcfiEco) ? ECO_MAX_BODY_BYTES : MAX_BODY_BYTES;
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > bodyCap) {
    return send(res, 413, { error: 'payload exceeds the ' + (bodyCap / 1024) + 'KB cap for this target' });
  }

  const problem = isBtcfiEco ? validateBtcfiEco(body['btcfi-ecosystem']) : isEco ? validateEco(body.ecosystem) : validate(body);
  if (problem) return send(res, 400, { error: 'validation failed: ' + problem + '; nothing was published' });

  const filePath = isBtcfiEco ? BTCFI_ECO_FILE : isEco ? ECO_FILE : FILE_PATH;

  // read the current file (content + sha) so a concurrent change conflicts
  // instead of being silently overwritten
  let sha = null;
  let current = {};
  try {
    const getRes = await gh('/repos/' + REPO + '/contents/' + filePath + '?ref=' + BRANCH, ghToken);
    if (getRes.status === 401 || getRes.status === 403) {
      const limited = getRes.headers.get('x-ratelimit-remaining') === '0';
      return send(res, 502, { error: limited ? 'GitHub API rate limit reached; try again later' : 'GitHub token was rejected (bad, revoked, or missing repo permission)' });
    }
    if (getRes.status === 404) {
      sha = null; // file absent: create it
    } else if (!getRes.ok) {
      return send(res, 502, { error: 'GitHub read failed with status ' + getRes.status });
    } else {
      const meta = await getRes.json();
      sha = meta.sha;
      try { current = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8')); } catch (e) { current = {}; }
      if (!current || typeof current !== 'object' || Array.isArray(current)) current = {};
    }
  } catch (e) {
    return send(res, 502, { error: 'could not reach the GitHub API' });
  }

  let merged, message, pages;
  if (isBtcfiEco) {
    const eco = body['btcfi-ecosystem'];
    pages = Object.keys(eco);
    merged = Object.assign({}, current);
    for (const k of pages) merged[k] = eco[k];
    const total = pages.reduce((s, k) => s + eco[k].length, 0);
    message = 'content: publish btcfi ecosystem (' + total + ' items across ' + pages.length + ' categories)';
  } else if (isEco) {
    pages = Object.keys(body.ecosystem);
    merged = Object.assign({}, current);
    for (const k of pages) merged[k] = body.ecosystem[k];
    const total = pages.reduce((s, k) => s + body.ecosystem[k].length, 0);
    message = 'content: publish ecosystem (' + total + ' accounts across ' + pages.length + ' categories)';
  } else {
    pages = Object.keys(body);
    merged = Object.assign({}, current);
    for (const k of pages) merged[k] = body[k];
    message = 'content: publish news (' + pages.join(', ') + ')';
  }

  const putPayload = {
    message: message,
    content: Buffer.from(JSON.stringify(merged, null, 2) + '\n', 'utf8').toString('base64'),
    branch: BRANCH
  };
  if (sha) putPayload.sha = sha;

  try {
    const putRes = await gh('/repos/' + REPO + '/contents/' + filePath, ghToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload)
    });
    if (putRes.status === 409) {
      return send(res, 409, { error: 'conflict: ' + filePath + ' changed while publishing; retry to pick up the latest version' });
    }
    if (putRes.status === 401 || putRes.status === 403) {
      const limited = putRes.headers.get('x-ratelimit-remaining') === '0';
      return send(res, 502, { error: limited ? 'GitHub API rate limit reached; try again later' : 'GitHub token was rejected (bad, revoked, or missing repo permission)' });
    }
    if (putRes.status === 422) {
      return send(res, 409, { error: 'conflict: the file version (sha) is stale; retry to pick up the latest version' });
    }
    if (!putRes.ok) {
      return send(res, 502, { error: 'GitHub write failed with status ' + putRes.status });
    }
    const out = await putRes.json();
    return send(res, 200, { ok: true, commit: out.commit && out.commit.sha, pages: pages });
  } catch (e) {
    return send(res, 502, { error: 'could not reach the GitHub API' });
  }
};
