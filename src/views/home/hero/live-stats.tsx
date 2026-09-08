"use client";

import { useEffect, useState } from "react";

import {
  abbr,
  fetchAppRevenue,
  fetchShieldedValue,
  fetchStrkStaked,
  fmtUsd,
  REFRESH_MS,
  TICK_MS,
  updatedStamp,
} from "@/lib/data/live-sources";

/**
 * The baseline band: three LIVE numbers and one UPDATED stamp, the stamp
 * reporting the OLDEST of the three fetches (the privacy page's rule, so a
 * partially failed refresh can never claim freshness). Each slot is laid
 * out at full size from the first paint and revealed only once its value
 * has landed; a source that fails stays invisible. There is no literal
 * fallback anywhere on this band. The stamp rides the component's own label
 * slot (.qhx-cdlab, the strip's top padding band, where quantum carries its
 * deadline label).
 */
interface Live { value: number; at: number }
type Key = "shielded" | "staked" | "revenue";

const SOURCES: Record<Key, () => Promise<number>> = {
  shielded: fetchShieldedValue,
  staked: fetchStrkStaked,
  revenue: fetchAppRevenue,
};

const PRINT: Record<Key, (v: number) => string> = {
  shielded: (v) => "$" + Math.round(v).toLocaleString("en-US"),
  staked: (v) => abbr(v) + " STRK",
  revenue: (v) => fmtUsd(v),
};

const LABEL: Record<Key, string> = { shielded: "Shielded value", staked: "STRK staked", revenue: "App revenue" };
const KEYS: Key[] = ["shielded", "staked", "revenue"];

export const LiveStats = () => {
  const [live, setLive] = useState<Partial<Record<Key, Live>>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      KEYS.forEach((key) =>
        SOURCES[key]()
          .then((value) => { if (alive) setLive((prev) => ({ ...prev, [key]: { value, at: Date.now() } })); })
          .catch(() => { /* the slot stays hidden; never a literal */ }),
      );
    load();
    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => { alive = false; clearInterval(refresh); clearInterval(tick); };
  }, []);

  const landed = KEYS.map((k) => live[k]).filter((x): x is Live => Boolean(x));
  const oldest = landed.length ? Math.min(...landed.map((x) => x.at)) : 0;

  return (
    <>
      <p className="qhx-cdlab qhx-live" data-ready={landed.length ? "true" : "false"} aria-live="polite">
        Live <span aria-hidden="true">/</span> <b>{oldest ? updatedStamp(oldest) : "UPDATED"}</b>
      </p>
      <ul className="qhx-stats">
        {KEYS.map((key) => {
          const entry = live[key];
          return (
            <li key={key} className="qhx-live" data-ready={entry ? "true" : "false"} aria-hidden={!entry}>
              <b>{entry ? PRINT[key](entry.value) : "$0,000,000"}</b>
              <span>{LABEL[key]}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
};
