"use client";

import { useEffect, useRef } from "react";

import { VAULT_SVG } from "@/generated/vault-svg";

/**
 * The quantum pillar's object: the vault drawing from /quantum's Head Start
 * tab 02, lifted verbatim at build time (scripts/build-vault-svg.js, from the
 * one copy in public/quantum.html; tools/vault-gen.js is the geometry's
 * source of truth) and styled by the same sheet, public/css/th-vault.css.
 *
 * Quantum's demo throws the bolts on a click; here the device is a looping
 * object: the .vt-on choreography (card out, bolts thrown, gauge swept,
 * lattice woven) plays, holds, resets and plays again, gated on visibility.
 * Under prefers-reduced-motion it rests in its secured end state and nothing
 * moves; the sheet's own kill switch already zeroes every transition.
 */
const ON_AT_MS = 900;
const OFF_AT_MS = 6400;
const PERIOD_MS = 8200;

export const VaultDevice = () => {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const svg = el?.querySelector("svg");
    if (!el || !svg) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg.classList.add("vt-on");
      return;
    }
    let visible = false;
    let raf = 0;
    let t0 = 0;
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const t = (now - t0) % PERIOD_MS;
      svg.classList.toggle("vt-on", t >= ON_AT_MS && t < OFF_AT_MS);
      raf = requestAnimationFrame(frame);
    };
    const update = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) { t0 = 0; svg.classList.remove("vt-on"); raf = requestAnimationFrame(frame); }
    };
    const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; update(); }, { threshold: 0 });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={host}
      className="th-vt lp-vault"
      role="img"
      aria-label="Line drawing of a vault holding BTC, ETH and STRK tokens on a plinth marked Starknet; one transaction swaps its signature verifier from ECDSA to Falcon-512 and seals the shell."
      dangerouslySetInnerHTML={{ __html: VAULT_SVG }}
    />
  );
};
