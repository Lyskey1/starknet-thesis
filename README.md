# Starknet Thesis — Website

A multi-page static site presenting the Starknet × Bitcoin thesis (quantum resistance, privacy, BTCFi, STRK, recaps, ecosystem). Pure HTML/CSS/JS — no build step, no framework.

## Pages
- `index.html` — overview / landing
- `quantum.html` — Page 01, Quantum resistance ✅
- `privacy.html` — Page 02, Privacy (placeholder)
- `btcfi.html` — Page 03, BTCFi ✅
- `strk.html` — Page 04, STRK utilities (placeholder)
- `digest.html` — Page 05, Digest. Its data (`data/recap.json`) and static
  pre-render refresh automatically every day at 06:00 UTC via GitHub Actions
  (`.github/workflows/refresh-digest.yml`); a manual run is available from
  the repo's Actions tab ("Refresh digest" → Run workflow).
- `ecosystem.html` — Page 06, Ecosystem (placeholder)

All pages share `css/styles.css` (design system: colors, fonts, components).

## Run it locally

### Option A — VS Code "Live Server" (easiest)
1. Open this folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.
4. It opens at `http://127.0.0.1:5500` and auto-reloads on save.

### Option B — Python (already installed on most machines)
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`.

### Option C — Node
```bash
npx serve
```

> Note: you must use a local server (not open the file directly with `file://`), otherwise `css/styles.css` won't load.

## Deploy online (later, via Claude Code)
This is a static site, so it deploys anywhere in seconds:
- **Vercel**: `npx vercel` (or connect the GitHub repo at vercel.com)
- **Netlify**: drag the folder onto app.netlify.com, or `npx netlify deploy`
- **GitHub Pages**: push to a repo, enable Pages in settings

Ask Claude Code: *"deploy this folder to Vercel"* and it will handle git + config.

## Editing content
- **News**: `data/news.json` is the source of truth for published news (keyed
  `quantum` / `privacy` / `btcfi`). Publish through the admin panel (below) or
  hand-edit the file and commit. Each page still carries an in-code `tweets`
  array as a fetch-failure fallback; keep it roughly in sync when hand-editing.
- **Metrics**: edit the numbers directly in the HTML (`.metric-val`).
- **Colors / fonts**: all in `css/styles.css` under `:root`.

## Publish pipeline (news + ecosystem)

Published news lives in `data/news.json`; the published ecosystem directory
(accounts per category) lives in `data/ecosystem.json`. Pages fetch these at
load and fall back to their in-code arrays if the fetch fails. A local draft
(admin panel edits, stored in localStorage) always wins on the browser that
made it until it is published.

**Ecosystem**: open ecosystem.html with the admin gate on, press Edit, then
Publish (beside Export JSON). A confirmation lists the per-category account
counts before anything is sent. The endpoint writes `data/ecosystem.json`
(2MB payload cap for this target, because custom avatars can be base64 data
URLs; the news cap stays 512KB). Category metadata (labels, colors, grouping)
stays code-owned in ecosystem.html; only the accounts are published. On
success the local ecosystem draft (`eco_data_v2`) is cleared, because the
published file is now the source of truth. Publishing the ecosystem never
touches `data/news.json`, and the two targets cannot be mixed in one request.

**Publishing**: open a page's news admin panel ("Edit news"), curate the list,
press **Publish**. The first use prompts for the publish key (remembered in
localStorage under `news_publish_key`). The button POSTs the panel's exact
merged list to `/api/publish`, which commits `data/news.json` to the repo; the
site redeploys from that commit in about a minute. On success the page's local
draft is cleared, because the published file is now the source of truth for it.

**Vercel environment variables** (Project Settings, Environment Variables,
server side only, never exposed to the client):
- `ADMIN_PUBLISH_KEY`: any long random string; the same value is what you type
  into the Publish prompt. Generate one with `openssl rand -hex 24`.
- `GITHUB_TOKEN`: a fine-grained GitHub personal access token scoped to this
  repository with Contents read and write permission (github.com, Settings,
  Developer settings, Fine-grained tokens).

Optional overrides: `GITHUB_REPO` (default `Lyskey1/starknet-thesis`) and
`GITHUB_BRANCH` (default `main`).

**Failure modes** (the panel surfaces the server message verbatim):
- `405 method not allowed`: something other than a POST hit the endpoint.
- `500 not configured`: one or both environment variables are missing on
  Vercel. Nothing is committed.
- `401 invalid or missing publish key`: the typed key does not match
  `ADMIN_PUBLISH_KEY`. The stored key is dropped so the next attempt asks
  again. Nothing is committed.
- `400 validation failed: ...`: the payload broke a rule (unknown page key,
  missing url, oversized field, too many entries); the message names the exact
  entry and field. Nothing is committed.
- `409 conflict`: `data/news.json` changed while publishing (concurrent
  publish or manual commit). Retry; the endpoint re-reads the latest version.
- `502 GitHub token was rejected`: `GITHUB_TOKEN` is bad, revoked, or lacks
  Contents write permission on the repo.
- `502 GitHub API rate limit reached`: wait and retry.

## Admin gate

All author affordances (news editors, video editors, the ecosystem edit
cluster, Publish and Copy JSON controls) are gated: a normal reader gets a
page with no admin element in the DOM at all, and none in the served HTML.

- **Turn on**: visit any page with `#admin-on` appended to the URL (for
  example `/quantum#admin-on`). This sets a local flag that persists across
  pages and reloads on that browser. The hash is stripped from the address bar
  immediately.
- **Turn off**: visit any page with `#admin-off`. This clears the flag AND
  deletes the stored publish key, so no secret stays behind on the device.
- On `localhost` / `127.0.0.1` the gate is always on (author preview).

The gate is a visibility control only, NOT a security boundary: anyone could
recreate the admin UI in devtools. Authorization for publishing is enforced
server side by `ADMIN_PUBLISH_KEY`; without that key the publish endpoint
rejects every request.

## Design tokens (css/styles.css → :root)
- `--black #0A0A0A`, `--white #F5F2EC`
- `--orange #F7931A` (Bitcoin accent), `--stark-purple #8B5CF6` (Starknet accent)
- Fonts: Syne (display), DM Mono (labels), DM Sans (body)

## Video assets

Video files are served from the Cloudflare R2 bucket `starknet-thesis-videos`
(public base URL `https://pub-3274162cfa1d48728621d5ec2d0906ad.r2.dev/`), not
from this repo — `videos/` is gitignored. To update a video, upload the new
file to the bucket keeping the same filename (names are case-sensitive).


## Local preview

Internal links are extensionless (`/privacy`, `/digest`, …) to match Vercel's
`cleanUrls` serving. A dumb static server (e.g. `python3 -m http.server`) will
404 those links — preview locally with `npx serve` (clean URLs by default) or
`vercel dev` instead.
