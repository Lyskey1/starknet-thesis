/* STARKNET DUAL-TOKEN STAKING, the protocol's fixed share (2026-09-08).

   Starknet's staking is dual-token: STRK and BTC stake together, and the
   split between them is a PROTOCOL CONSTANT, not a reading of how much of
   each is staked today. Sourced verbatim from Starknet's own 2025 year in
   review: "launching a dual-token consensus model where STRK represents 75%
   and BTC 25% of the network's total security weight"
   (https://www.starknet.io/blog/starknet-2025-year-in-review/, read
   2026-08-23). BTC stakers correspondingly take a fixed 25% share of staking
   rewards.

   It lived as a typed "75" and "25" in two pages' markup. Both now read it
   from here and stamp it into [data-stake-share] elements, so the number
   cannot drift between /btcfi and /strk, and so nothing on either page
   states the split as a figure nobody can trace. The live AMOUNTS staked are
   a different thing entirely and come from the staking protocol's own
   endpoint; they must never be presented as the source of this ratio. */
/* ENDUR'S DESTINATIONS, one place. The staking figures on /btcfi and /strk
   come from Endur's network-overview API, and the site credits and links
   Endur in four different spots; before this they were four inline strings.
   Two named constants now, plus the liquid-staking product the strk page's
   "Where to get STRK" chip already pointed at, which is a DIFFERENT surface
   (app.endur.fi) from the dashboard: kept as its own constant rather than
   collapsed, because nothing here can verify the two are the same page.
   Stamped onto [data-stake-link="dashboard"|"stake"|"liquid"] elements; the
   markup carries the same href as its no-JS value, so a reader without JS
   still gets a working link. */
window.ENDUR_DASHBOARD_URL = 'https://dashboard.endur.fi/';
window.ENDUR_STAKE_URL = 'https://dashboard.endur.fi/stake';
window.ENDUR_LIQUID_STAKE_URL = 'https://app.endur.fi/strk';

window.STARKNET_STAKE_SHARE = {
  strk: 75,
  btc: 25,
  src: 'https://www.starknet.io/blog/starknet-2025-year-in-review/',
  checked: '2026-08-23'
};

/* Stamp every [data-stake-share="strk"|"btc"] with its percentage. The
   markup ships the same figure as its no-JS content, the way this site's
   other stamped values do. */
(function(){
  var S = window.STARKNET_STAKE_SHARE;
  function paint(){
    [].forEach.call(document.querySelectorAll('[data-stake-share]'), function(el){
      var k = el.getAttribute('data-stake-share');
      if (S[k] == null) return;
      var pct = S[k] + '%';
      el.textContent = el.hasAttribute('data-stake-share-bare') ? String(S[k]) : pct;
      if (!el.hasAttribute('data-src')) {
        el.setAttribute('data-src', S.src);
        el.setAttribute('data-checked', S.checked);
      }
    });
  }
  /* the strk page loads this deferred, so readyState is already past
     'loading' when it runs; btcfi loads it in the head, before the markup
     exists. Paint on whichever signal has not passed yet. */
  var LINKS = {
    dashboard: window.ENDUR_DASHBOARD_URL,
    stake: window.ENDUR_STAKE_URL,
    liquid: window.ENDUR_LIQUID_STAKE_URL
  };
  function paintLinks(){
    [].forEach.call(document.querySelectorAll('[data-stake-link]'), function(a){
      var url = LINKS[a.getAttribute('data-stake-link')];
      if (url) a.setAttribute('href', url);
    });
  }
  function run(){ paint(); paintLinks(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  addEventListener('load', run);
})();
