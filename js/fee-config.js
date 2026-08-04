/* STRK20 flat privacy fee, in USD. Single source of truth for every
   DERIVED revenue figure on the site: strk.html's "Revenue from STRK20"
   stat and chart series, and privacy.html's estimated revenue chart.
   The fee is denominated in STRK but adjusted with STRK price to hold
   near this dollar value, so the dollar figure is the stable term.
   Change it here and every derivation follows; display copy that spells
   the number out (labels reading "~$0.12") still needs a grep. */
window.STRK20_FLAT_FEE_USD = 0.12;
