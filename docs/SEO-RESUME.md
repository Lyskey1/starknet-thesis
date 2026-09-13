# SEO work, paused 2026-09-02 ~00:35, resume 05:00

Branch `vesper`. Six parallel audits ran (technical, schema, content,
sitemap, performance, visual). Scores at audit time: Technical 72/100,
E-E-A-T 41/100, Content 55/100, AI citation readiness 54/100.

## DONE and committed

| commit | what |
|---|---|
| 1cf1a7a | security headers, 404 metadata split, one h1 on landing, real sitemap lastmod, llms.txt dashes |
| dffd9cd | footer tap targets to 24px on all 7 routes |
| a043e73 | ecosystem prerendered (the only Critical): 179 to 913 visible words, 0 to 1 h1, 0 to 126 entries in raw HTML |
| 1f9e607 | intrinsic width/height on 72 imgs |
| 48b91ff | role=img plus aria-label on the three informative canvases |

Also landed inside those: schema agent added JSON-LD to ecosystem and
digest (both previously had none), fixed an Organization logo that returned
404, and corrected og:image dimensions declared 900x600 for a genuinely
1200x630 asset.

## STILL OPEN, in the order I would do them

### 1. AWAITING OWNER DECISION, do not action without asking
`public/llms.txt` line 3 tells AI crawlers the site is "Written by Lyskey,
a StarkWare communications employee, in a personal capacity". No
human-visible page says this; the footer says only "not affiliated with or
endorsed by StarkWare". On YMYL financial content that asymmetry is the
single heaviest E-E-A-T trust deduction. Fixing it is a one line footer
change plus worksFor on the Person node in the JSON-LD. It is a disclosure
about the owner's own affiliation, so it is their call, not ours.

### 2. HIGH: dateModified contradicts the sitemap
public/privacy.html, quantum.html, btcfi.html all hardcode
"datePublished":"2026-07-21","dateModified":"2026-07-21" in their JSON-LD,
while sitemap.xml now carries real 2026-09-01/02 timestamps for the same
URLs. Two machine freshness signals in direct conflict. Generate
dateModified from the same git-date source that scripts now use for
sitemap lastmod.

### 3. HIGH: no visible dates anywhere, on 7 of 7 pages
No page shows a reader when it was published or updated. For YMYL finance
that is a first order trust question. Render "Published X, Updated Y" under
each h1 from the same source as item 2.

### 4. HIGH: the citation markup is dead code
data-src / data-checked / data-perishable / data-says exist on 9 elements
(btcfi 4, quantum 4, strk 1) and NOTHING reads them: no CSS rule, no
script, in public/css, public/js or src. They render nothing and are not
anchors, so they are neither reader visible nor crawlable. The data is
already authored, it needs a renderer: a visible superscript link to
data-src plus a "Checked <date>" line, or a per page Sources section.
Note privacy.html is the longest and most claim dense page at 3,123 words
and carries ZERO of these attributes.

### 5. MEDIUM: heading level skips on every page
h2 to h4 on all six static pages plus the landing, and h2 to h5 once on
privacy ("One pool for all assets"). The Thesis/Signals/Follow/Connect
footer block emits h4 directly under an h2; fixing that one shared footer
clears six of the eight skips. Footer markup is inline in each static page
and in src/views/home/sections/site-footer.tsx.

### 6. MEDIUM: text below 8px on quantum and strk
quantum.html:1101 .vtCwho and :1105 .vtCtag are 5.8px; :1066 .vtNote and
:2047 .rcLab 7.5px; :797 .qw-label 8px. strk.html:783 .mk 8px, :861
.badge 8.5px. Design idiom, but 5.8px is unreadable at 390px.

### 7. MEDIUM: routes match case insensitively
/PRIVACY and /PrIvAcY each serve 200 rather than redirecting, so they are
soft duplicates. WARNING: `sensitive: true` on the rewrite objects is NOT
valid in Next 16.2.0. I tried it, tsc accepted it, the runtime rejected it
with "Invalid rewrites found" and the dev server would not boot. This needs
middleware, not a rewrite field.

### 8. MEDIUM: strk trust markup
strk.html carries the most price sensitive content (price, market cap,
unlock schedule, yields) with only a WebApplication node: no author, no
dates, no Dataset describing provenance. Add Person and Organization plus a
Dataset per metric group with creator/dateModified/isBasedOn, and a visible
"Data sources and methodology" block. llms.txt already lists the sources.

### 9. MEDIUM: hardcoded numbers that will rot
strk.html "10 votes held as of 20 July 2026" is static and already six
weeks stale. digest.html hero says "231 Weekly roundups" and "35 Monthly
recaps" as static text while data/recap.json holds 246 entries. Compute
both from the JSON in the build scripts.

### 10. LOW
- src/utils/is-bot.ts exports isBot and nothing imports it. Dead code.
- strk.html has a 10x46 anchor with no accessible name near the governance
  proposal row (:1612-1616), failing both link-name and the 24px minimum.
- src/lib/site.ts: og:site_name on the landing is the full page title; the
  six static pages correctly use the short "Starknet Thesis".
- Landing canonical has no trailing slash while sitemap and static JSON-LD
  do. Cosmetic, same URL under RFC 3986, but noisy in Search Console.
- ecosystem.html has 2 zero-dimension placeholder imgs (#emAvImg, :826).

## DO NOT DO
The content audit recommended FAQPage schema on quantum and privacy. The
SEO skill's hard rule restricts FAQ schema to government and healthcare
sites. Adding it here risks a structured data penalty for no gain. Left
deliberately undone.

## Standing constraints for whoever resumes
- NEVER em or en dashes, anywhere, including code comments and JSON values.
  Regex character classes that MATCH dashes are the only exception.
- Real Chrome for anything visual: Playwright channel "chrome",
  headless false. Headless Chromium uses SwiftShader and misrenders the
  WebGL scenes, and src/utils/is-bot.ts classifies headlesschrome as a bot.
- `npm run build` must stay green. It aborts if a section heading lacks an
  id, so give every emitted heading an id.
- Anchor every index search when editing these HTML files. Unanchored
  index() calls have previously duplicated whole sections in this repo.
- Verify by measurement, not assumption. Several audit claims turned out to
  be wrong when checked, including the CLS one in item note below.

## Corrections to the audit worth carrying forward
- The technical audit called btcfi's 42 lazy images the likely CLS culprit.
  Checked: nearly all are already pinned by CSS (aspect-ratio, fixed boxes,
  absolute insets) and contribute zero shift. If CLS is bad, look elsewhere.
- assets/scott-aaronson.jpg is actually a WebP file with a .jpg extension.
- strk.html has a pre-existing duplicate id "cR" (an SVG gradient), present
  before any of this work.

---

# QUEUED UI WORK, captured 2026-09-02 ~01:45

Four structural rebuilds the owner asked for that are NOT started. Each is a
markup plus CSS rebuild, not a tweak. Reference screenshots are in the chat
history; the layouts are described here so the work does not depend on them.

## U1. Digest "The latest issues" to a card grid
File: `public/digest.html` section `#wk`, CSS in `public/css/stride.css`
lines 119 onward, engine in `public/js/strk-stride.js` lines 20 to 21.

WHAT IT IS NOW, and this matters: `.wk` is a 400vh scroll-driven 3D card
deck. `.wk-pin` is sticky, `.wk-card` is position absolute at left/top 50%
with `perspective:1900px` on `.wk-stage`, and cards are transformed through
on scroll. A screenshot mid-scroll therefore shows cards overlapping, which
looks like a bug and is not one. I measured 4 overlapping pairs and
confirmed they are by design before concluding anything.

TARGET: the btcfi ecosystem grid, `.mstc` cards in
`public/btcfi.html`: bordered cards in a grid under group labels, each with
a logo tile, a category chip, a name, and a mono link strip.

TRAPS: `id="wk"` IS a committed search-index anchor, so it must survive.
Retire the deck code in `strk-stride.js` rather than leaving it observing
elements that no longer exist. All six entries, their hrefs and the "The
full archive" link must survive.

## U2. Digest "About the digest" band to the reference full-stack layout
File: `public/digest.html`, the `.dgx-*` band carrying "Every week the
ecosystem ships...". Currently a huge two-tone statement with inline accent
icon tiles, then a 2x2 grid of Monthly/Weekly/Research/Everything rows, then
a "Go to the archive" pill.

TARGET: centred headline at the top, generous empty space, a dotted rule,
then a 4-column row running nearly to the viewport edge. Each column: small
icon tile, name, arrow button right-aligned, then a description, then a
large dark illustration panel. Side padding about 1.46 percent of viewport
(28px on a 1920 frame), the same inset already applied to privacy's law
section, see `.th-pm-sec--law` in `public/privacy.html`. Owner said 3D
elements are welcome.

## U3. STRK "where STRK is put to work" to the ecosystem card grid
File: `public/strk.html`. Same target layout as U1, for avnu, Troves and
Opus specifically.

## U4. Quantum Aaronson block to a testimonial layout
File: `public/quantum.html` around the `.th-adv` block, after
`#and-to-get-this-roadmap-right`.

TARGET: a large centred quote with a small rounded avatar inline at the
start of the first line, then an attribution row beneath it (name and role
in mono), centred in a section that owns a viewport, over faint grid lines.
The existing photo `assets/scott-aaronson.jpg` becomes the inline avatar.
Note that file is actually a WebP despite its .jpg extension, confirmed by
its RIFF/WEBP magic bytes; it decodes fine, just do not assume JPEG.

## Standing constraints apply to all four
Same as the SEO section above: no em or en dashes, real Chrome for visual
verification, `npm run build` must stay green, every emitted heading needs
an id, and ANCHOR EVERY SEARCH. A search from position zero has already
matched the wrong section once tonight, because `public/quantum.html` has
two articles with `data-ch="0"` in different sections; the assertion caught
it before anything was written.
