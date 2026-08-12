/* STRK20 privacy fee, DISPLAY constants only. Fee model, corrected
   2026-08-12 (owner: StarkWare comms on STRK20), superseding the
   2026-08-11 "denominated in STRK" note: the protocol's fee policy is a
   DOLLAR target of about $0.12 per private action, settled in STRK. The
   STRK amount is the floating side, adjusted by the protocol as the STRK
   price moves; the backend's lifetime-revenue feeChanges: 2 is exactly
   those re-peggings. Copy leads with the dollar target and "paid in
   STRK"; no surface states a fixed STRK quantity as the fee. The
   instantaneous spot cost (lifetime-revenue currentFeeUsd, ~$0.14 at the
   time of writing) drifts from the ~$0.12 target between re-peggings, so
   a reader cross-checking the dashboard may see the gap; that is the
   mechanism, not an error. Surfaces showing the live cost (the strk.html
   fee bar legend) label it "today", never as the target. Revenue figures
   do not derive from these constants: both pages read the backend's
   measured protocol-fees series (/agg/tvl-history feesUsd, cross-checked
   against /agg/lifetime-revenue). */
window.STRK20_CURRENT_FEE_STRK = 6;      // floating side, reference seed; live value is lifetime-revenue currentFeeStrk
window.STRK20_CURRENT_FEE_USD_SEED = 0.146; // live spot-cost seed; live value is lifetime-revenue currentFeeUsd
