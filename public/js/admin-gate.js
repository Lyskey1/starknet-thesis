/* Admin gate, shared by every page (strk.html carries an inline copy to stay
   self-contained; keep the two in sync).

   This is a VISIBILITY control only, not a security boundary: authorization
   for publishing is enforced server side by ADMIN_PUBLISH_KEY. The gate is ON
   when the origin is localhost or 127.0.0.1, or when the admin_gate_on flag
   is set. Visiting any page with #admin-on sets the flag site-wide;
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
  var on = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!on) { try { on = localStorage.getItem(FLAG) === '1'; } catch (e) {} }
  window.ADMIN_GATE = on;
})();
