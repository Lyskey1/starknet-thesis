/* STRK20 flat privacy fee, in USD. Single source of truth for every
   DERIVED revenue figure on the site: strk.html's "Revenue from STRK20"
   stat and chart series, and privacy.html's estimated revenue chart.
   The fee is denominated in STRK but adjusted with STRK price to hold
   near this dollar value, so the dollar figure is the stable term.
   Change it here and every derivation follows; display copy that spells
   the number out (labels reading "~$0.12") still needs a grep. */
window.STRK20_FLAT_FEE_USD = 0.12;

/* Protected assets: the pool's onchain asset universe. Verified 2026-08-10
   by enumerating distinct `token` event keys (Deposit, OpenNoteDeposited,
   OpenNoteCreated, Withdrawal) on the privacy pool contract
   0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
   via scripts/verify-pool-registry.js. A verified constant by design, not
   a page-load RPC call: the list changes a few times a year. Rerun the
   script and update the number when it does.
   The contract outranks both indexers: the STRK20 backend's perToken
   holds 33 of these (missing ZEC, which only ever entered via open
   notes), and the site's previous figure (22) counted balanceUsd > 0,
   which silently dropped unpriced tokens holding real balances.
   Starkscan's 34 agrees with the onchain count.
   STRK20_ASSET_COUNTS is the one place both pages read the pair from:
   the constant, plus the live "with balances" count (perToken
   balanceRaw > 0, token units, so an unpriced token with a real balance
   still counts; if a token later gets priced, neither number shifts). */
window.STRK20_PROTECTED_ASSETS = 34;
window.STRK20_ASSET_COUNTS = function(summary){
  var list = (summary && summary.perToken) || [];
  var withBalances = list.filter(function(t){ return parseFloat(t.balanceRaw || '0') > 0; }).length;
  return { tracked: window.STRK20_PROTECTED_ASSETS, withBalances: withBalances };
};
