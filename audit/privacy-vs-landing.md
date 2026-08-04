# Audit: privacy.html vs index.html (landing as reference)

Date: 2026-08-05. Method: both pages served locally and rendered headless at
1440px and 375px; computed styles sampled per role (hero, section header,
eyebrow, lede, body, cards, closing) on both pages; all page-scoped CSS read
side by side. Evidence cites file:line or computed values from the harness
(format: family weight size/line-height, letter-spacing, color). The landing
is judged as the reference throughout; privacy divergences that follow from
its page role (long-form thesis page) or its page accent are listed in
section E instead of being flagged as defects.

## A. Executive summary

The two pages are siblings, not strangers: they share the nav, footer, CTA
coating, fonts, the 1160px container, the exact section-header type (64px/900
number, 52px/800 title, both pages byte-identical in computed values), the
hero eyebrow and lede treatments, and close variants of the same liquid glass
recipe. The perceived gap comes from a handful of systematic drifts rather
than any wholesale difference: privacy runs a 17px body base against the
landing's 16px; the two pages disagree on the section eyebrow (sentence-case
13px violet vs uppercase 12px tracked emerald); the glass recipes differ in
five small constants (saturate, fill, top-light, lift, easing) that would
cost nothing to unify; the closing blocks use different display scales,
different muted tiers for the same recap role, and privacy's closing lacks
the landing's bloom-and-hairline framing; and privacy's muted-grey palette
has grown to four tiers where the landing uses two. Motion vocabulary is
mostly compatible (both are IO-gated, reduced-motion covered), but hover
transitions differ in duration and easing across every card family. Overall
verdict: coherent at arm's length, visibly drifted at the seams; ten small
changes (section C) close most of it.

## B. Findings table

| ID | Sev | Area | What differs | Evidence (landing vs privacy) | Recommended direction |
|----|-----|------|--------------|-------------------------------|----------------------|
| F1 | HIGH | Section eyebrow | Case, size, tracking and color-weight of the eyebrow under section headers | index.html:192 `.th-pm-eyebrow` 13px, ls .04em, text-transform none ("The three hardest problems...", sentence case); privacy.html:181 12px, ls .3em, uppercase ("THE PROBLEM"). Computed: 13px/ls 0.52px/tt none vs 12px/ls 3.6px/tt uppercase | Pick one convention site-wide; the landing's sentence-case reads as the newer deliberate choice (its comment says "eyebrow kept sentence-case") but privacy matches quantum/btcfi. Decide once, apply everywhere |
| F2 | HIGH | Closing block | Different display scale, different muted tier, missing framing | Landing `.lc-h2` clamp(32,4.6vw,56) = 56px at 1440, lede rgba(245,242,236,.62), section has border-top hairline + 3-blob violet bloom (index.html:371-388). Privacy `.closing .cd` clamp(38,5.6vw,72) = 72px, recap #8b909c (rgb 139,144,156), no bloom, hairline is a separate `.th-pm-div` (privacy.html:893-896, 1815) | Align privacy's closing to the landing pattern: same clamp ceiling range, same lede tier (.62 white), add the accent bloom behind it |
| F3 | MEDIUM | Body base size | Page-wide base font differs | Landing body 16px/1.6 (styles.css body, computed 16px/25.6). Privacy sets `font-size: 17px; line-height: 1.65` at page level (privacy.html:78-79); computed 17px/28.05 everywhere | Either adopt 17px as the long-form standard and note it, or drop privacy to the shared 16px; today it is silent drift |
| F4 | MEDIUM | Glass recipe constants | Same recipe family, five constants differ | Landing `.lg-card` (index.html:230-246): blur(16px) saturate(110%), fill rgba(245,242,236,.035), border .075, top light 44%/.075, hover lift -4px. Privacy `.gx-card` (privacy.html:583-597): saturate(112%), fill .032, border .07, top light 42%/.062, lift -3px | Pick one set of constants (suggest the landing's) and normalize gx-/qg-/lg- to it; the recipes are already structurally identical |
| F5 | MEDIUM | Hover motion | Duration/easing drift across card families | Landing: `.28s cubic-bezier(.2,.7,.2,1)` on all cards (index.html:198,212), sweep .65s. Privacy: `.25s ease` on gx-card (privacy.html:593), `.2s` pcore nodes, `.15s` chips/filters, `.35s` wp-card expand | Standardize on the landing's .28s cubic-bezier for lift/border/glow transitions; keep faster times only for micro-state (chips) |
| F6 | MEDIUM | Muted tier inventory | Privacy uses 4+ grey tiers where the landing uses 2 | Landing: #8b909c and rgba(245,242,236,.62/.78/.82). Privacy adds #C9CFCB (body prose), #9AA3A7 (--muted, cards), #D6DAD6 (forum/tips), plus #8b909c (ledes) | Collapse privacy's greys to a named 3-tier scale (lede grey, prose grey, chrome grey) documented in the page token block |
| F7 | MEDIUM | Specular sweep affordance | Landing glass cards have a diagonal hover sweep; privacy glass has none | index.html:260-264 `.lg-sweep`/::after sweep; no equivalent on privacy gx-card | Either port the sweep to privacy's link-like glass cards or accept as landing-only flourish; today the same material answers hover differently per page |
| F8 | MEDIUM | Scroll reveal | Privacy reveals every section (42 `th-pm-reveal` nodes); the landing has zero scroll-reveal | grep: index.html 0 matches; privacy.html 42 | Fine if reveals are the thesis-page convention (quantum has them too), but the landing hero->sections could adopt the same fade for continuity, or the divergence should be recorded as intentional |
| F9 | LOW | Card title scale | Landing card titles 25px/800 Archivo Expanded; privacy card-level titles 19px/700 (.wave h5, .pcore-node h4) | Computed 25px/800 vs 19px/700 | Acceptable (privacy cards are denser), but a shared "card-title" step in the scale would prevent further drift |
| F10 | LOW | Container side padding | Landing hero/closing use 48px side padding, sections 32px; privacy uses 32px everywhere | index.html:75 `.lh-wrap` padding 0 48px, .lc-close 130px 48px; privacy hero/sections/closing 32px | Harmless; if normalizing, 32px is the majority convention |
| F11 | LOW | Hairline tokens | Two hairline variables for the same job | Landing rules rgba(245,242,236,.12) (`.th-sec-rule`) and --border .09; privacy --th-hair .08, --th-hair-soft .05, --line rgba(255,255,255,.07) | Converge on the shared --border/--line pair when files are next touched |
| F12 | LOW | Stale comments (residue) | Two comments no longer describe the code | privacy.html:383 gridwrap comment says td pseudo-elements "carry the check marks" (glyphs are dots since variant A); privacy.html:450 comment references the removed `.forum-reply` class | Reword both comments next time the file is edited; no behavior impact |
| F13 | LOW | Eyebrow color strength | Landing eyebrow at opacity .9 accent; privacy at opacity .85 | index.html:192 vs privacy.html:181 | Trivial unification with F1 |
| F14 | LOW | Chapter heading tracking | Privacy `.chapter h3` has no negative tracking while every display-size heading on both pages carries -.01/-.02em | Computed ls normal at 31px vs landing display pieces all negative | Add the standard negative tracking at 30px+ sizes |

Notes on checklist item 8 (smells from recent privacy work): the reverted
patterns cleaned up well. No `.pv-duo--intro`, `.rail/.rnode`, champion-bar
(`.champ*`, `.pgrid-champ`) or `.forum-reply` rules remain; every pv-/pcore-/
bnt-/sat- class in CSS has live markup (verified by class-vs-rule cross
count). The only residue is the two stale comments (F12). Known, documented
duplications that are deliberate: the sub-380px nav block mirrored on all
pages (styles.css is off-limits), the chip-glass solid override inside the
gx-card bento cells (no-nested-glass rule), and `.sat-answer p` mirroring
`.chapter p` (commented as mirrored).

## C. "Same look and feel" plan (ordered, highest impact-per-effort first)

1. Unify the section eyebrow (F1 + F13): one case, one size, one tracking
   across landing and privacy (and then quantum/btcfi in a follow-up).
2. Rebuild privacy's closing block on the landing's lc- pattern (F2):
   display clamp ceiling ~56-64px, lede in rgba(245,242,236,.62), accent
   bloom behind, hairline top.
3. Normalize the glass constants (F4): one recipe table (blur, saturate,
   fill, border, top-light, lift) shared by lg-/gx-/qg- tiers.
4. Standardize hover motion (F5): .28s cubic-bezier(.2,.7,.2,1) for all
   card lifts on privacy.
5. Decide the body base (F3): 17px long-form vs 16px shared, and write the
   decision into the page token comment either way.
6. Collapse privacy's muted greys to three named tiers (F6).
7. Port the specular sweep to privacy's interactive glass cards, or log it
   as landing-only (F7).
8. Add negative tracking to `.chapter h3` (F14).
9. Reword the two stale comments (F12).
10. Optional: align container side paddings and hairline tokens when files
    are next open (F10, F11).

## D. Structure map

| # | index.html (landing) | privacy.html | Divergence verdict |
|---|---------------------|--------------|--------------------|
| 1 | Nav (shared styles.css) | Nav (same markup, page accent) | Identical |
| 2 | Hero: eyebrow / 76px uppercase display / display-weight sub / 18px lede. Flow-field canvas bg, ::before low glow, ::after 110px fade into scene | Hero: eyebrow / mono setup line / 46px display + 86px "turn" line / 18px lede / glass chip row. Aurora curtain + scrim + afterglow falloff | Justified: different hero grammars per role; falloff treatments differ in mechanism but both resolve the hard-seam problem; lede/eyebrow computed values identical |
| 3 | Convergence scene (sticky WebGL, desktop-only) | (none) | Justified: landing-only set piece |
| 4 | 3 rubric sections in `.th-sections`: th-pm-head + sentence-case eyebrow + glass card grids, 40px/40px section padding, no dividers | 5 numbered sections `.th-pm-sec`: same th-pm-head + uppercase eyebrow + lede + deep content, 90px top padding (56px on section 01), `.th-pm-div` hairline between sections | Header type identical (justified core). Eyebrow divergence = F1. Rhythm difference (40/40 tight rubrics vs 90+hairline deep sections) is justified by content depth |
| 5 | (landing sections ARE the link cards) | Sections contain the thesis components (bills, walls, table, beams, bento, metrics, law) | Justified: page role |
| 6 | Closing `.lc-close`: hairline top, bloom, 56px display, .62-white lede | Closing `.closing`: th-pm-div hairline, 72px display, #8b909c recap, no bloom | F2: privacy should adopt the landing pattern |
| 7 | (none) | News accordion (shared engine with btcfi/quantum) | Justified: thesis pages carry news |
| 8 | Footer (shared) | Footer (shared) | Identical |

## E. Explicitly fine (do not change)

- Page accent: emerald vs violet, including accent-tinted borders, glows,
  bloom colors, chart palette. This is the per-page accent system working
  as designed.
- Hero grammar: privacy's three-level display (setup / mid / turn) and its
  chip row exist because the page argues a thesis; the landing's single
  uppercase claim fits a router page. The chip glass not existing on the
  landing is fine: the landing hero has no chip row at all.
- Aurora implementations: flow-field canvas (landing) vs curtain shader
  (shared hero pages) are different set pieces by design; both handle the
  bottom falloff.
- Content depth and section count (5 deep sections vs 3 rubric sections),
  scroll length, and the presence of tables/charts/news on privacy only.
- Privacy-only interactive components (comparison table + tooltips, beam
  diagram, bento marquees, status filters, live metrics): they follow the
  site's motion rules (IO-gated, reduced-motion covered, transform/opacity
  animations) and have no landing equivalent to be inconsistent with. Their
  marquee/pulse signatures are calm, linear and slow, which sits fine next
  to the landing's static sections.
- The landing's convergence scene and hover sweep on router cards may stay
  landing-only if F7 is decided that way; a router page may sell harder.
- The 17px base (F3) MAY be ruled intentional for long-form readability;
  the finding is that the decision is unrecorded, not that 17px is wrong.
