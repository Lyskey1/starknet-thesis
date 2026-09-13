/* Admin gate, shared by every page (strk.html carries an inline copy to stay
   self-contained; keep the two in sync).

   This is a VISIBILITY control only, not a security boundary: authorization
   for publishing is enforced server side by ADMIN_PUBLISH_KEY. The gate is ON
   only when the admin_gate_on flag is set, on every host including localhost.
   Visiting any page with #admin-on sets the flag site-wide;
   #admin-off clears it AND deletes the stored publish key, so turning admin
   off on a device leaves no secret behind. The hash is stripped afterwards so
   it does not linger in the address bar or screenshots.

   When the gate is OFF, no admin markup exists anywhere: pages build their
   admin UI with JS only when window.ADMIN_GATE is true, so nothing admin is
   served in the HTML source or present in a reader's DOM. */
(function(){
  'use strict';
  var FLAG = 'admin_gate_on';
  var h = location.hash;
  if (h === '#admin-on' || h === '#admin-off') {
    try {
      if (h === '#admin-on') localStorage.setItem(FLAG, '1');
      else { localStorage.removeItem(FLAG); localStorage.removeItem('news_publish_key'); }
    } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  /* THE GATE IS OPT IN, EVERYWHERE (2026-09-01). It used to switch itself on
     for localhost and 127.0.0.1, which meant every admin affordance (Edit
     news, Edit ecosystem, the draft pills) rendered on top of the design on
     every dev machine, all the time. Now nothing admin appears until you ask
     for it with #admin-on, on any host; #admin-off turns it back off and
     clears the stored publish key. Production is unaffected: it never had the
     gate on by default. */
  var on = false;
  try { on = localStorage.getItem(FLAG) === '1'; } catch (e) {}
  window.ADMIN_GATE = on;
})();
