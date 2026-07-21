# Starknet Thesis — Website

A multi-page static site presenting the Starknet × Bitcoin thesis (quantum resistance, privacy, BTCFi, STRK, recaps, ecosystem). Pure HTML/CSS/JS — no build step, no framework.

## Pages
- `index.html` — overview / landing
- `quantum.html` — Page 01, Quantum resistance ✅
- `privacy.html` — Page 02, Privacy (placeholder)
- `btcfi.html` — Page 03, BTCFi ✅
- `strk.html` — Page 04, STRK utilities (placeholder)
- `digest.html` — Page 05, Digest
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
- **Tweets / news**: each page has a `// ====== EDIT HERE ======` block in its inline `<script>` — add entries to the `tweets` array.
- **Metrics**: edit the numbers directly in the HTML (`.metric-val`).
- **Colors / fonts**: all in `css/styles.css` under `:root`.

## Design tokens (css/styles.css → :root)
- `--black #0A0A0A`, `--white #F5F2EC`
- `--orange #F7931A` (Bitcoin accent), `--stark-purple #8B5CF6` (Starknet accent)
- Fonts: Syne (display), DM Mono (labels), DM Sans (body)
