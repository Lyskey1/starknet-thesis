"use client";

import { useEffect } from "react";

/**
 * Drives the Three Problems selector on the shared engine (2026-09-08).
 *
 * The tiles and the panel are quantum's Head Start component: the markup is
 * rendered on the server, the engine is the static pages' own
 * public/js/selector-panel.js (initQw + thMorph over public/js/selector-rove.js,
 * thRove), loaded here once and pointed at the rail. Everything the landing
 * adds on top is host behavior the brief asks for, never a change to the
 * component:
 *   - the quantum tile's thumbnail is a STATIC CLONE of the panel's vault
 *     drawing, ids stripped, exactly as quantum builds its own;
 *   - a 7s auto-advance with a progress indicator on the lit tile (the rail's
 *     --hst-prog custom property, 0 to 1), paused while the pointer or focus
 *     is on the rail or the document is hidden, stopped for good after any
 *     user interaction (pointer, key, or a deep link), and never started under
 *     prefers-reduced-motion;
 *   - deep links #problems-privacy / #problems-quantum / #problems-btcfi
 *     select their tile (the tile carries the id, so the native anchor scroll
 *     lands the section under the nav through scroll-margin-top);
 *   - a `problems:select` event on the rail, so each pillar's live object
 *     mounts only while its panel is the one shown;
 *   - the perishable-claims stale flag: a claim whose break date has passed
 *     is marked data-stale so a lapsed check is visible in the DOM.
 */
const PERIOD_MS = 7000;
const KEYS = ["privacy", "quantum", "btcfi"] as const;

const loadScript = (src: string, ready: () => boolean) =>
  new Promise<void>((resolve, reject) => {
    if (ready()) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(src));
    document.head.appendChild(s);
  });

export const ProblemsEngine = ({ rootId }: { rootId: string }) => {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    let cancelled = false;
    let raf = 0;
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn, opts);
      cleanups.push(() => el.removeEventListener(type, fn, opts));
    };

    /* perishable claims: flag what is past its break date */
    document.querySelectorAll<HTMLElement>("[data-breaks]").forEach((el) => {
      const breaks = Date.parse((el.getAttribute("data-breaks") || "") + "T00:00:00Z");
      if (breaks && Date.now() >= breaks) el.setAttribute("data-stale", "true");
    });

    loadScript("/js/selector-rove.js", () => typeof window.thRove === "function")
      .then(() => loadScript("/js/selector-panel.js", () => typeof window.initQw === "function"))
      .then(() => {
        if (cancelled || !window.initQw) return;
        const peds = Array.from(root.querySelectorAll<HTMLButtonElement>(".qw-ped"));
        const announce = (i: number) => root.dispatchEvent(new CustomEvent("problems:select", { detail: { index: i } }));

        /* the vault tile thumbnails the panel's own drawing, as quantum does */
        root.querySelectorAll<HTMLElement>("[data-hst-clone]").forEach((host) => {
          if (host.firstChild) return;
          const src = document.getElementById(host.getAttribute("data-hst-clone") || "");
          if (!src) return;
          const c = src.cloneNode(true) as Element;
          ["id", "role", "aria-label", "aria-hidden"].forEach((a) => c.removeAttribute(a));
          c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
          host.appendChild(c);
        });

        const api = window.initQw(root, (k: number) => { stopAuto(); announce(k); });
        if (!api) return;

        /* auto-advance */
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        let auto = !reduced;
        let paused = false;
        let acc = 0;
        let last = performance.now();
        const setProg = (v: number) => root.style.setProperty("--hst-prog", v.toFixed(4));
        const rail = root as HTMLElement;
        function stopAuto() {
          if (!auto) return;
          auto = false;
          cancelAnimationFrame(raf);
          rail.classList.remove("is-auto");
          rail.classList.add("is-manual");
          rail.style.removeProperty("--hst-prog");
        }
        function frame(now: number) {
          if (!auto) return;
          const dt = now - last;
          last = now;
          if (!paused && !document.hidden) {
            acc += dt;
            if (acc >= PERIOD_MS) {
              acc = 0;
              const next = (api!.shown() + 1) % peds.length;
              api!.select(next);
              announce(next);
            }
            setProg(acc / PERIOD_MS);
          }
          raf = requestAnimationFrame(frame);
        }
        if (auto) {
          root.classList.add("is-auto");
          raf = requestAnimationFrame(frame);
        } else {
          root.classList.add("is-manual");
        }
        on(root, "pointerenter", () => { paused = true; });
        on(root, "pointerleave", () => { paused = false; });
        on(root, "focusin", () => { paused = true; });
        on(root, "focusout", () => { paused = false; });
        on(root, "pointerdown", () => stopAuto());
        on(root, "keydown", () => stopAuto());
        on(root, "touchstart", () => stopAuto(), { passive: true });

        /* deep links on the tiles */
        const land = () => {
          const m = /^#problems-(privacy|quantum|btcfi)$/.exec(location.hash || "");
          if (!m) return;
          const i = KEYS.indexOf(m[1] as (typeof KEYS)[number]);
          if (i < 0) return;
          stopAuto();
          if (api.shown() !== i) { api.select(i, true); }
          announce(i);
        };
        on(window, "hashchange", land);
        land();
        announce(api.shown());
      })
      .catch((e) => console.error("[problems] the selector engine failed to load", e));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, [rootId]);

  return null;
};
