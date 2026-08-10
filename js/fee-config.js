/* STRK20 privacy fee, DISPLAY constants only. Revenue figures no longer
   derive from any fee constant: both pages read the backend's measured
   protocol-fees series (/agg/tvl-history feesUsd, cross-checked against
   /agg/lifetime-revenue), the same numbers the official dashboard shows.
   These constants exist for product copy that names the fee level, and as
   the seed/fallback where a component prefers the live currentFeeUsd from
   /agg/lifetime-revenue. Verified 2026-08-11 against lifetime-revenue:
   currentFeeStrk 6, currentFeeUsd ~0.146, feeChanges 2 (the level has
   moved before and can move again; copy must not promise flatness). */
window.STRK20_CURRENT_FEE_STRK = 6;
window.STRK20_CURRENT_FEE_USD_SEED = 0.146;
