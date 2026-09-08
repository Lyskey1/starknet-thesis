"use client";

import { useEffect } from "react";

/**
 * The page background: the SAME animated backdrop /quantum and /privacy run
 * (public/js/eco-backdrop.js, the flame domain-warp wash in the accent over
 * the dark base plus a drift of motes), imported from that file, not
 * re-created. Mounted once at page level: the module inserts one fixed
 * canvas as the body's first child, behind every section (landing.css
 * carries the three layer rules the static pages take from eco-stage.css).
 *
 * The module owns its gating: one draw call per frame on the compositor's
 * fixed layer, no work while the document is hidden, a single frame under
 * prefers-reduced-motion. The host flag tells the module not to self-run on
 * import; this component calls mount and disposes on unmount.
 */
export const PageBackdrop = () => {
  useEffect(() => {
    let dispose: (() => void) | null = null;
    let cancelled = false;
    (window as typeof window & { ECO_BACKDROP_MANUAL?: boolean }).ECO_BACKDROP_MANUAL = true;
    import("../../../public/js/eco-backdrop.js")
      .then(({ mountBackdrop }) => {
        if (cancelled) return;
        dispose = mountBackdrop().dispose;
      })
      .catch((e) => console.error("[backdrop] failed to mount", e));
    return () => {
      cancelled = true;
      if (dispose) dispose();
    };
  }, []);
  return null;
};
