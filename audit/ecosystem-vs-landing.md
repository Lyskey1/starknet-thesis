# Audit: ecosystem.html vs index.html (landing as reference)

Date: 2026-08-05. Same method and format as audit/privacy-vs-landing.md:
both pages served locally, rendered headless at 1440px and 375px, computed
styles sampled per role on both pages, all page-scoped CSS and the render
JS read side by side. privacy.html (post coherence pass) is used as the
secondary reference for how a thesis-family page conforms. Evidence cites
selectors/file:line or computed values (family weight size, ls, color).
Intentional divergences from the page's directory role, its coral accent,
and the recently specced landscape hero and constellations are in section
E, not the findings table.

## A. Executive summary

Ecosystem is in far better shape than privacy was before its pass: the
recent rebrand and hero work landed the big levers on canon. The hero is
computed-identical to the landing's scale (76px/800 uppercase display,
12px/2.88px mono eyebrow, 18px/300/.62 lede), the section headers hit the
exact thesis grammar (64px/900 accent number, 52px/800 title, computed
byte-equal to the landing), body base is 16px, cards ride the unified
.28s hover signature, and zero orange-violet gradients render anywhere.
What remains is second-order drift: the page still runs its own container
metrics (1100px/48px vs the site's 1160px/32px), a wide spread of muted
white-alpha tiers where the landing runs two, mono-typed card metadata at
a size the landing never uses, one glass surface (the closing CTA block)
still on pre-unification constants, filter pills at a .2s transition, a
missing reduced-motion rule for card lifts, and a tail of inert
gradient-era plumbing (inline --pa/--pa2/--glow custom props and accent2
data fields that no CSS consumes anymore). Ten small items close the gap;
none are structural.

## B. Findings table

| ID | Sev | Area | What differs | Evidence (landing vs ecosystem) | Recommended direction |
|----|-----|------|--------------|--------------------------------|----------------------|
| E1 | MEDIUM | Container metrics | Page-wide content column and side padding differ from the site convention | Landing `.th-sections` computed maxW 1160px, 32px side padding (privacy identical). Ecosystem `.eco-section`/`.eco-group-duo` computed maxW 1100px, 48px side padding (ecosystem.html:242,181) | Move the directory containers to 1160/32 next time the file is open; pure find-replace |
| E2 | MEDIUM | Muted tiers | Ecosystem still runs 6+ white-alpha text tiers where the landing runs two | Landing: #8b909c + rgba(245,242,236,.62) (plus .78 prose). Ecosystem: .3 (pill group labels), .35 (was group tag, still count text), .4, .45 (handle, desc, cat count), .5 (pill resting), .62 (cat subs) | Collapse to the landing set: chrome/labels to #8b909c, resting pill text to .62 or #8b909c, keep .62 for ledes |
| E3 | MEDIUM | Closing CTA glass recipe | `.cta-block.ecg-glass` still carries the pre-unification constants instead of the shared card-glass vars | ecosystem.html ecg-glass: fill rgba(245,242,236,.032), border .07, blur(16px) saturate(112%) vs css/glass-cards.css canon (.035 / .075 / saturate 110%) consumed by lg-/gx- | Point it at var(--card-glass-*) like the other card tiers |
| E4 | MEDIUM | Reduced-motion gap | Card hover lift has no reduced-motion rule on this page | Landing kills lift/sweep under rm (index.html:302-306); privacy kills gx transitions; ecosystem's 3 rm blocks cover marquee, orbiters and pulse but not `.eco-card:hover { translateY(-4px) }` | Add `.eco-card:hover { transform: none }` (and the playful tilt) under prefers-reduced-motion |
| E5 | LOW | Filter pill motion | Pills transition at .2s, not the unified hover signature | Computed `.eco-pill` transition 0.2s vs the site's var(--hover-dur)/.28s cubic-bezier on cards/CTAs sitewide | Switch the pill transition to the shared vars |
| E6 | LOW | Card metadata typography | Descriptions and handles are IBM Plex Mono 12px at .45 alpha; the landing types card body copy in Inter | Computed `.eco-desc` IBM Plex Mono 400 12px rgba(245,242,236,.45) vs landing `.th-card p` Inter 14.5px #8b909c | Either accept as directory chrome (dense grids read fine in mono) and record it, or move descriptions to Inter 13px muted; decide once |
| E7 | LOW | Card surface details | Radius and border width off canon by one step | `.eco-card` radius 12px border --border(.09) vs landing card 14px border .075 (cards are deliberately non-glass, see E-list) | Align radius to 14 and border to var(--card-glass-border) when touching the file |
| E8 | LOW | Constellation tooltip | Orbit tooltip is mono 11px; the site tooltip (privacy tipbox) is sans 12.5px on the same surface colors | `.eco-orb-tip` IBM Plex Mono 11px vs privacy `.tipbox` Inter 12.5px, same #10161A bg + accent-line border | Acceptable for @handles (mono reads as a handle), but note or align the size |
| E9 | LOW | Inert gradient-era plumbing | The old per-category color pipe still ships, unused by any CSS | renderPills injects `--pa/--pa2` inline; sectionHTML injects `--accent2/--glow` (grep: `var(--glow)` 0 uses); `hexToRgba` only feeds --glow; modal fallbacks still default to violet #8B5CF6; accent2 rides data/meta/cleanData | Strip the inline injections and dead helper on a cleanup pass; keep accent2 in DATA only if a future per-category use is planned, else drop from cleanData too |
| E10 | LOW | Bar glass saturate | The sticky sub-nav bar tier runs saturate(115%) vs the card tier's 110% | `.eco-subnav` blur(12px) saturate(115%) rgba(8,9,12,.9) (own documented contrast rationale) vs --card-glass-sat 110% | Fine as a distinct bar tier; if normalizing, 110-112% reads identically at bar opacity |
| E11 | LOW | Anchor default color | `.eco-card` (an `<a>`) computes the UA default link blue on the element itself; every visible child overrides it | Computed color rgb(0,0,238) on `.eco-card`, invisible in practice | Set `color: inherit` on the card for hygiene |
| E12 | LOW | Hero lede measure | 560px max vs the landing's 620px | `.eco-hero .hero-subtitle` maxW 560px vs `.lh-lead` 620px | Trivial; align if touching |

Checklist item 8 (residue) beyond E9: no orphan classes remain from the
old hero (hero-scroll/curtain markup and page CSS fully gone; the shared
styles.css rules still serve other pages); no stale gradient comments
survive; group-head counts were removed at the render, not hidden; the
empty-column fallback is verified sound: the duo grid is opt-in
(.has-orbit is added only after a stage renders), and an adversarial
localStorage draft with unmatchable handles was tested to produce
full-width stacked headers with zero blank columns.

## C. "Same look and feel" plan (ordered, impact/effort)

1. Containers to 1160/32 (E1): one constant swap, aligns every section
   edge with the rest of the site.
2. Collapse the muted tiers (E2) to the landing's two (plus .78 prose
   where needed).
3. Point ecg-glass at the shared card-glass vars (E3).
4. Add the reduced-motion card rule (E4) and move pills to the shared
   hover vars (E5).
5. Decide the card-metadata typography question (E6) once, record it.
6. Cleanup pass for the inert color pipe (E9) plus card hygiene
   (E7, E11, E12).
7. Optional: tooltip size (E8) and bar saturate (E10) if pixel-perfect
   uniformity is wanted.

## D. Structure map

| # | index.html (landing) | ecosystem.html | Divergence verdict |
|---|---------------------|----------------|--------------------|
| 1 | Nav (shared) | Nav (shared, coral accent) | Identical |
| 2 | Hero: eyebrow / 76px uppercase display / display sub / 18px lede; flow-field canvas; fade into scene | Hero: same eyebrow/display/lede specs (computed equal); landscape SVG scene w/ rim-lit ridges + scrim falloff (no hard seam); left-aligned; 2 mono underlined anchor CTAs | Justified: specced set piece; type specs conform; CTA treatment is new vocabulary, see E-list |
| 3 | Convergence scene | Project-name marquee band (data-driven, IO-gated, rm-wrapped, hidden <981) | Justified: each page's own below-hero set piece |
| 4 | 3 rubric sections, th-pm-head grammar, glass card grids | Sticky filter sub-nav (bar glass, scroll-spy) + 2 group duos (constellation left/right + th-pm-grammar header) + category sections with account card grids | Justified by directory role; header type conforms exactly (64/900 + 52/800); duo is the specced exception and degrades to stacked full-width |
| 5 | Closing `.lc-close` (hairline, bloom, display, lede) | Glass CTA block ("Don't want to follow them one by one?") + divider + footer; no lc-style closing | Partly justified (a directory ends on a conversion block); the block's recipe should still ride the shared constants (E3). If a display-scale closing is ever wanted, use the landing grammar |
| 6 | Footer (shared) | Footer (shared) | Identical |

## E. Explicitly fine (do not change)

- Page accent coral everywhere via `--eco-accent`/`--accent`; per-category
  accent fields remain in DATA for the publish pipeline but no longer
  drive visuals.
- The directory role: sticky category/gang filter sub-nav with scroll-spy,
  count pills per category, dense auto-fill account card grids, EDIT
  affordance + publish pipeline, 127 accounts.
- Account cards are deliberately NOT glass: over a hundred
  backdrop-filter surfaces would break the site's own performance rules;
  the opaque #0B0D13 card is the correct tier here.
- The landscape hero composition, the underlined mono CTA pair, and the
  marquee band: user-specced set pieces; their internal type conforms to
  the site specs (verified computed-equal for eyebrow/display/lede).
- The two constellation duo headers: specced exception to the stacked
  header convention; their internal header specs conform exactly, they
  alternate sides deliberately, are IO-gated, reduced-motion safe
  (static distributed angles), mobile-inert, and fall back to full-width
  stacked headers whenever a section has no flagged entries.
- The sub-nav bar glass with its measured-contrast rationale (E10 noted
  only for optional normalization).
- Avatars, verified marks (#1D9BF0 is X's semantic color), X icons, and
  the embedded-avatar fallback chain.
- (2026-08-05, E10 resolved KEEP) The sub-nav bar glass stays at
  saturate(115%): its in-file rationale is sticky legibility over varied
  content, quoted: "liquid glass, sticky-bar variant: a real backdrop
  blur (the 127 colored avatar cards scroll beneath this bar) over a
  deliberately heavy scrim. The scrim is not optional: [...] holding
  4.5:1 over a pure-white avatar passing beneath needs the blended
  backdrop at or under roughly rgb(40), measured, not estimated." A
  measured contrast constraint outranks constant uniformity.
- The hero eyebrow at 12px/.24em uppercase: that IS the site's hero
  eyebrow spec (landing identical); the 13px/0.04em spec applies to
  section eyebrows, of which ecosystem has none.
