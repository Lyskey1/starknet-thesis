# Audit: digest.html vs index.html (landing as reference)

Date: 2026-08-05. Same method and format as the privacy and ecosystem
audits: landing and digest served locally, rendered headless at 1440px and
375px, computed styles sampled per role on both pages, page CSS, shared
styles.css rules the page consumes, and the build pipeline read alongside.
privacy.html and ecosystem.html (post coherence passes) are secondary
references. Evidence cites selectors/file:line or computed values.
Digest's feed/archive role, its salmon accent, and the landscape hero
grammar it shares with ecosystem are treated as intentional (section E).

## A. Executive summary

Digest's new hero is fully on canon: computed byte-equal to the landing's
hero specs (76px/800 uppercase display, 12px/2.88px mono eyebrow,
18px/300/.62 lede at 620px) and byte-identical to ecosystem's landscape
implementation after prefix normalization, except three small marquee-band
deltas. The hero CTAs verify against the locked chip-glass recipe exactly
(fill .07, blur 12/saturate 112, page-accent border, 99px, .28s). The rest
of the page has NOT had a coherence pass and it shows, with one structural
wrinkle: most of the feed's styling (recap cards, badges, tabs, the global
section wrapper) lives in css/styles.css, so fixes must be page-scoped
overrides per the site's own rule. The concrete gaps: the section eyebrow
still runs the pre-coherence spec (12px/.3em uppercase), the feed header
drops the number from the header grammar, the feed sits in the global
48px-padded uncapped section instead of 1160/32, muted tiers are off the
two-tier spec (.55/.4 alphas), the filter tabs ride the chart-toggle
vocabulary rather than the site pill language (and their active state
ignores the page accent), and the weekly badge hardcodes a violet that
reads off-palette on a salmon page. Roughly eight items close the gap.

## B. Findings table

| ID | Sev | Area | What differs | Evidence (landing vs digest) | Recommended direction |
|----|-----|------|--------------|------------------------------|----------------------|
| D1 | MEDIUM | Section eyebrow | Digest still runs the pre-coherence eyebrow spec | Canon (landing index.html:192, privacy/ecosystem post-pass): 13px, .04em, sentence case, opacity .9. Digest `.th-pm-eyebrow` (digest.html:136): 12px, .3em, uppercase ("THE NEWSLETTER") | Adopt the landing spec, same one-rule change privacy got |
| D2 | MEDIUM | Header grammar | Feed header is marker + title with NO number | Landing/privacy/ecosystem: marker + 64px/900 accent number + 52px/800 title. Digest (digest.html:188): `th-pm-marker` + `th-pm-title` only | Add the number span (01) or record the single-section page as an accepted numberless variant; decide once |
| D3 | MEDIUM | Container metrics | Feed sits in the global section (48px sides, no max-width cap) | Landing `.th-sections` 1160px/32px (privacy/ecosystem aligned). Digest feed: bare `<section>` inheriting styles.css `section { padding: 120px 48px }`, computed grid maxW none | Root value lives in css/styles.css: give the feed a page-scoped 1160/32 container div instead of editing the shared rule |
| D4 | MEDIUM | Muted tiers | Feed microcopy runs .55/.4 white-alpha tiers | Two-tier spec: #8b909c + rgba(245,242,236,.62). Digest computed: `.recap-excerpt` .55 (14px), `.recap-date` and `.recap-count` .4 (11px mono) — rules in styles.css:1489-1496 | Page-scoped overrides to #8b909c (chrome) per the ecosystem pass mapping |
| D5 | MEDIUM | Filter tabs | Tabs use the chart-toggle vocabulary, not the site pill language; active state ignores the page accent | Digest `.toggle-btn` (styles.css:641-657): radius 2px, .2s, active = bg .06 + white. Ecosystem's equivalent filters: 40px pills, coral border + accent fill active, .28s | Page-scoped restyle of the tabs to the pill vocabulary with accent active (behavior untouched), or record chart-toggle as digest's accepted tab component; currently the two directory-ish pages disagree |
| D6 | MEDIUM | Category badges | Mixed color system: monthly rides the accent alias, weekly hardcodes violet, research is neutral | styles.css:1477-1479: `.recap-cat.monthly { color: var(--orange) }` (alias = page accent), `.recap-cat.weekly { color: #C4B5FD; border rgba(139,92,246,...) }` (hardcoded violet), `.recap-cat.research` neutral white .7. On the salmon page the weekly badge reads off-palette | Decide the scheme once: either all semantic fixed colors or all accent-tinted; page-scoped override for weekly if aligning |
| D7 | LOW | Entry card surface | Radius and hover timing off canon | `.recap-card` (styles.css:1448): radius 12px, transition .2s, bg rgba(255,255,255,.01) vs canon 14px / .28s signature / #0B0D13-family fill | Page-scoped bump to 14px + var(--hover-dur)/var(--hover-ease) when touching the page |
| D8 | LOW | Twins drift vs ecosystem hero | The mirrored landscape blocks have already micro-drifted | Unified diff after prefix normalization: marquee duration 60s (digest) vs 70s (ecosystem); item selector `a, span` + hover accent (digest, its items are links) vs `span` only (ecosystem); ecosystem carries explanatory comments digest lacks. Everything else byte-identical (scene, scrim, CTAs, breakpoints) | Duplication is keep-in-sync by declared convention, not factored: normalize the duration (pick one), port the a/span rule to ecosystem harmlessly, and copy the comments; or factor to a shared file if a third page ever adopts the hero |
| D9 | LOW | Card excerpt size | 14px vs the landing card copy's 14.5px | Computed `.recap-excerpt` 14px vs `.th-card p` 14.5px | Fold into the D4 override |
| D10 | LOW | Closing block | Digest ends on a plain subscribe `.cta-block`, neither the landing's lc- closing grammar nor ecosystem's glass CTA block | Landing: hairline + bloom + display + lede. Ecosystem: `.ecg-glass` block on shared card-glass vars. Digest: unstyled-surface `.cta-block` (border .09, no glass), section padding 80/48 | Role-justified as a conversion endpoint, but it should at least ride the shared card-glass vars like ecosystem's; a display-scale closing is optional |
| D11 | LOW | Anchor default color | `.recap-card` computes UA link-blue on the element itself (invisible, children override) | Computed color rgb(0,0,238); same hygiene issue ecosystem fixed (E11) | Page-scoped `color: inherit` |

Checklist item 8 (residue): clean. The pre-landscape hero left nothing
behind (no `hero-scroll`/`btn-primary` remnants in the hero; the
`.btn-primary` uses that remain are the legitimate shared component in the
bottom subscribe block and the JS "Read on Substack" empty-state). The
deleted runtime band builder was fully replaced by static markup plus a
thin IO/filter-wiring script, no traces. No orphan classes, no stale
comments found. Build hygiene is sound: all hand edits live outside the
STATIC-DIGEST markers, and `npm run build` twice produces byte-identical
digest.html with this report present (exit 0).

## C. "Same look and feel" plan (ordered, impact/effort)

1. Eyebrow to the landing spec (D1): one rule.
2. Feed container to 1160/32 via a page-scoped wrapper (D3).
3. Muted tiers to the two-tier spec (D4 + D9): a few page overrides.
4. Filter tabs decision (D5): pill vocabulary with accent active, or
   record chart-toggle as accepted; align with ecosystem either way.
5. Badge color scheme decision (D6), with a weekly override if aligning.
6. Header number (D2): add or record the variant.
7. Card surface polish (D7 + D11).
8. Twins re-sync with ecosystem's hero block (D8).
9. Optional: closing CTA block onto the shared glass vars (D10).

## D. Structure map

| # | index.html (landing) | digest.html | Divergence verdict |
|---|---------------------|-------------|--------------------|
| 1 | Nav (shared) | Nav (shared, salmon accent) | Identical |
| 2 | Hero: eyebrow / display / lede; flow-field canvas; fade | Landscape hero (ecosystem twin): same computed type specs, salmon scene, glass CTA pair (subscribe + read-latest) | Justified: shared landscape grammar; specs conform; see D8 for twin drift |
| 3 | Convergence scene | Content-types marquee band (static markup, typed filter links, THESIS label) | Justified: page's own below-hero band |
| 4 | 3 rubric sections, marker+number+title grammar, glass cards | One feed section: marker+title (no number, D2), old-spec eyebrow (D1), chart-toggle tabs (D5), build-generated + hydrated recap card grid, load-more | Feed role justified; grammar details flagged |
| 5 | Closing lc- block (hairline, bloom, display, lede) | Subscribe `.cta-block` section | Partly justified (conversion endpoint); surface should join the shared glass vars (D10) |
| 6 | Footer (shared) | Footer (shared) | Identical |

## E. Explicitly fine (do not change)

- Page accent salmon (`body.page-recap`) everywhere, including the scene
  tint, CTA borders/glow, and marquee hover color — all via the accent
  variables, verified zero hardcoding in the new hero.
- The feed/archive role: filter tabs' behavior, build-generated static
  block + client hydration, load-more, external entry links, the
  subscribe flow (same target as ever, no analytics event by design).
- The landscape hero grammar shared with ecosystem, including its scene
  layers, scrim falloff, hidden-below-981px marquee, and the glass CTA
  pair on the locked chip recipe (verified exact: fill .07, blur 12 /
  saturate 112, 99px radius, .28s signature, page-accent terms via the
  --chip-accent-rgb fallback).
- The content-types marquee band with THESIS as a non-interactive label
  (no distinct on-page target; deliberate, documented in the band
  comment).
- Entry cards remain non-glass: a hydrated archive grid is the same
  many-surfaces case as ecosystem's directory; opaque cards are correct.
- Cover images from Substack's CDN and the category classifier living in
  both the build script and the client (documented keep-in-sync pair).

## F. Coherence pass closure (verified 2026-08-06)

All eleven findings are closed. Method: digest, landing and ecosystem
served locally and rendered in headless Chrome at 1440x900 and 375x812,
computed styles sampled per role through a sized-iframe harness (an
explicitly sized frame is required below roughly 500px, where the headless
window floor otherwise reports a false layout width), plus real pointer
hover probes and a prefix-normalized text diff of the twin hero blocks.
Values below are computed, not authored.

| ID | Decision taken | Verified evidence (computed) |
|----|----------------|------------------------------|
| D1 | Adopted the landing section-eyebrow spec | 13px, letter-spacing 0.52px, text-transform none, opacity 0.9, IBM Plex Mono, accent color. Byte-equal to the landing's `.th-pm-eyebrow` at both widths |
| D2 | Number added; the numberless variant was NOT adopted | `.th-pm-num` 64px/900/accent, line-height 64px; title 52px/800/-0.78px. Mobile 48px/38px. All three equal to the landing |
| D3 | Page-scoped container, shared rule untouched | `section.dg-feed` max-width 1160px, padding 120px 32px, measured box 1160.0px at 1440; 80px 24px at 375. Equal to the landing's `.th-sections` |
| D4 + D9 | Both muted tiers normalized | `.recap-excerpt` rgb(139,144,156) at 14.5px, exactly the landing's `.th-card p`; `.recap-date` and `.recap-count` on the same chrome tier |
| D5 | Pill vocabulary with accent active state; chart-toggle vocabulary rejected | Pill 40px radius, 11px/0.66px uppercase, 7px 14px, 0.28s on the shared curve; active = accent text, accent border, accent fill 0.12, accent glow 0.22. Hover probe: border steps to rgba(245,242,236,0.25) |
| D6 | Accent-tinted scheme chosen; the hardcoded violet is gone | monthly = full accent, weekly = accent at 0.8 / 0.28 / 0.07, research = neutral. Zero non-accent chroma remains in the badge set |
| D7 | Full non-glass card tier adopted, matching ecosystem's `.eco-card` | Base: #0B0D13 fill, border rgba(245,242,236,0.075), radius 14px. Hover: translateY(-4px), accent border, rgba(255,255,255,0.03), accent glow 0 10px 30px at 0.22. Byte-identical to `.eco-card` at both states, modulo the page accent (salmon vs coral). Cards stay non-glass by design |
| D8 | Duration normalized to ecosystem's 70s, link rule and comments ported both ways | Prefix-normalized unified diff of the two hero blocks (87 lines each): identical, zero hunks. Marquee animation computes 70s on both; hidden and animation-none at 375 as specced |
| D10 | SUPERSEDED 2026-08-06: the closing block is now a twin of ecosystem's, not of the landing's `.lc-close`. See section G | Section: 88px/48px/120px, no border-top, centered (max-width 1100px, margin 0 auto). Panel fills the 1004px content box, radius 0, padding 80px 48px, centered, card-glass fill/border + specular insets + top-light `::after`. Heading 48px/52.8px/800; lede 16px/400 at rgba(245,242,236,0.5)/520px. Every value equal to ecosystem's closing block at 1440 and 375; the two differ only in copy, the action, and the page accent |
| D11 | Page-scoped `color: inherit` | `.recap-card` computes rgb(245,242,236); the UA link-blue is gone |

Cross-checks run alongside:

- Horizontal overflow at 375: clean on digest, ecosystem and the landing.
  Every out-of-viewport box on all three pages is clipped by an ancestor
  with a non-visible overflow-x, and `documentElement.scrollWidth` equals
  the viewport on each. The landing's `body.scrollWidth` of 397px is that
  same clipped scene machinery, not a real scroll.
- Hero specs unchanged by the pass and still on canon: 76px/800 uppercase
  display, 18px/300 lede at 0.62 and 620px, CTA chips at fill 0.07, blur
  12 / saturate 112, 99px radius, 0.28s.
- Build hygiene: `npm run build` produces a byte-identical digest.html on
  consecutive runs with this report present. The search index is
  deterministic apart from its `built` timestamp, which is the only field
  that differs between runs.

## G. Closing block and footer hairline (2026-08-06)

Two layout defects were reported in the closing/footer area and fixed.
Both were introduced by the D10 change in section F; ecosystem's closing
block is the reference.

### G1. Closing block off-center by 170px

Root cause: `.dg-close` set `margin: 40px 0 0`. The shared `section` rule
(css/styles.css:305) supplies `max-width: 1100px; margin: 0 auto`, so a
margin shorthand on the page-scoped override silently dropped the
horizontal `auto` and pinned the 1100px section to x=0. Measured before:
section left=0 right=1100, center offset -170px; the 820px panel inherited
the same -170px shift. Ecosystem's equivalent section measured left=170
right=1270, offset 0.

What D10 missed: it treated the closing block as a twin of the landing's
`.lc-close` (820px cap, 16px radius, 130/140 padding, 56px display
heading, .62 lede at 640px) while the panel it was overriding is the
shared `.cta-block` that ecosystem's closing block also uses. The result
matched neither reference, and the margin shorthand broke centering.

Fix: the section carries no margin shorthand and no border-top, and its
padding matches ecosystem's computed 88px/48px/120px. The panel drops the
820px cap, the 16px radius and the h2/p type overrides, so both twins ride
the shared `.cta-block` base, and it gains ecosystem's specular inset
shadow and top-light `::after`. The panel's own bloom (base
`.cta-block::before`) is the light source on both, retinted here off the
page accent instead of the base rule's hardcoded violet; the section-level
`.dg-close-bloom` that D10 added is removed, since ecosystem has no
section-level bloom. Verified identical on every geometry field at 1440
and 375: section 1100/left 170/88-48-120, panel 1004/left 218/80-48/radius
0/text-align center, h2 48px/52.8px/800, lede 16px/400/0.5 at 520px,
box-shadow string length equal. Mobile matches too (section 375/0,
padding 88-24-80, panel 327/left 24, h2 28px). The only computed
differences are the copy, the action, and the accent tint in the mobile
solid fill.

### G2. Two stacked hairlines

Sources, both marking the same feed/closing boundary 41px apart:

1. `.section-divider` (digest.html:297, pre-existing, full-bleed 1px)
2. `.dg-close { border-top: 1px solid var(--border) }` (added by D10)

Measured before at 1440: divider at y=6550.5 spanning 1440px, then a
1100px-wide left-aligned line at y=6590.5. At 375 both were 375px wide, so
the pair read as an unambiguous double rule. The second is the redundant
one and was removed; `.section-divider` remains as the single feed/closing
marker.

A separate check of the content/footer boundary found the site canon:
`footer.site-footer { border-top }` (css/styles.css, shared) is the single
content/footer hairline on index, digest, privacy, quantum, btcfi and
strk. Ecosystem was the only page of the seven that also placed a
`.section-divider` immediately before the footer, which rendered a second
full-bleed line 41px above the footer rule. That divider is removed, so
ecosystem now shows exactly one hairline at the bottom, matching the other
six pages.

Post-fix hairline census, full-bleed lines from 1600px above the footer
down to the footer rule:

| Page | 1440 | 375 |
|------|------|-----|
| digest | divider y=6550.5 (feed/closing, 631px above the footer), footer rule y=7181.4 | divider y=9356, footer rule y=10037.3 |
| ecosystem | footer rule y=8057.1 only | footer rule y=15930.2 only |

Exactly one hairline separates content from footer on both pages, and no
two lines are stacked. Digest keeps its feed/closing divider, which
ecosystem has no equivalent for: it terminates a long archive feed and
sits 631px clear of the footer rule, so it does not read as a stacked
pair. Flagged as a deliberate retained difference rather than silently
removed.

Also verified: `npm run build` twice, exit 0 both runs, digest.html
byte-identical (the search index differs only in its `built` timestamp);
subscribe action unchanged (href, target="_blank", rel="noopener", no
umami attribute, matching ecosystem's Follow here button and the
no-analytics-event decision in section E) and hit-tested as the topmost
element at its center on both pages, with a real click opening the
Substack subscribe URL; no horizontal overflow at 375 on either page; no
stale references to the removed bloom; console clean on digest. Ecosystem
logs one pre-existing unrelated 404 for a missing avatar file
(assets/avatars/LootSurvivor.jpg), which the embedded-avatar fallback
chain covers.
