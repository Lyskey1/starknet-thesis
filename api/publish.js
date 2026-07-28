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

const MAX_BODY_BYTES = 512 * 1024; // total payload cap
const MAX_ENTRIES_PER_PAGE = 100;
// entry shape as inventoried from the news engines (publicCards output);
// values are per-field string length caps
const FIELD_CAPS = { url: 2048, title: 400, date: 64, fallbackText: 2000, name: 160, handle: 160, initials: 8, color: 16 };

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
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return send(res, 413, { error: 'payload exceeds the ' + (MAX_BODY_BYTES / 1024) + 'KB cap' });
  }

  const problem = validate(body);
  if (problem) return send(res, 400, { error: 'validation failed: ' + problem + '; nothing was published' });

  // read the current file (content + sha) so a concurrent change conflicts
  // instead of being silently overwritten
  let sha = null;
  let current = {};
  try {
    const getRes = await gh('/repos/' + REPO + '/contents/' + FILE_PATH + '?ref=' + BRANCH, ghToken);
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

  const pages = Object.keys(body);
  const merged = Object.assign({}, current);
  for (const k of pages) merged[k] = body[k];

  const putPayload = {
    message: 'content: publish news (' + pages.join(', ') + ')',
    content: Buffer.from(JSON.stringify(merged, null, 2) + '\n', 'utf8').toString('base64'),
    branch: BRANCH
  };
  if (sha) putPayload.sha = sha;

  try {
    const putRes = await gh('/repos/' + REPO + '/contents/' + FILE_PATH, ghToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload)
    });
    if (putRes.status === 409) {
      return send(res, 409, { error: 'conflict: ' + FILE_PATH + ' changed while publishing; retry to pick up the latest version' });
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
