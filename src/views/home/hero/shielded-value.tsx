"use client";

import { useEffect, useState } from "react";

/**
 * SHIELDED VALUE, the privacy page's section 05 TOTAL SHIELDED VALUE cell on
 * the landing's baseline strip: the same backend, the same endpoint
 * (/agg/pool-summary, tvlUsd), the same cache discipline (a cache-busting
 * query on every call, a silent hourly refresh, a one-minute ticker on the
 * relative UPDATED stamp) and the same print format (`$` + the rounded
 * integer with en-US separators).
 *
 * The slot is laid out at full size from the first paint and revealed only
 * when a value has landed, so the strip never shifts; if the backend is
 * unreachable the slot stays invisible. There is no literal fallback.
 */
const API = "https://strk20-dashboard-production.up.railway.app";
const REFRESH_MS = 3600000;
const TICK_MS = 60000;

const stamp = (fetchedAt: number) => {
  const m = Math.floor((Date.now() - fetchedAt) / 60000);
  return m < 1 ? "UPDATED JUST NOW" : m < 60 ? `UPDATED ${m} MIN AGO` : `UPDATED ${Math.floor(m / 60)} HR AGO`;
};

export const ShieldedValue = () => {
  const [value, setValue] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API}/agg/pool-summary?_=${Date.now()}`)
        .then((r) => { if (!r.ok) throw new Error("pool-summary"); return r.json(); })
        .then((s: { tvlUsd?: number }) => {
          if (!alive || typeof s.tvlUsd !== "number") return;
          setValue(s.tvlUsd);
          setFetchedAt(Date.now());
        })
        .catch(() => { /* the slot stays hidden; never a literal */ });
    load();
    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => { alive = false; clearInterval(refresh); clearInterval(tick); };
  }, []);

  const ready = value !== null;
  return (
    <li className="qhx-live" data-ready={ready ? "true" : "false"} aria-hidden={!ready}>
      <b>{ready ? "$" + Math.round(value).toLocaleString("en-US") : "$0,000,000"}</b>
      <span>Shielded value</span>
      <i className="qhx-stamp" aria-live="polite">{ready ? stamp(fetchedAt) : "UPDATED"}</i>
    </li>
  );
};
