"use client";

import { useEffect, useState } from "react";

import { DERIVED } from "@/data/perishable";
import {
  abbr,
  fetchAppRevenue,
  fetchShieldedValue,
  fetchStrkStaked,
  fmtUsd,
  REFRESH_MS,
  TICK_MS,
  updatedStamp,
  WINDOW_DAYS,
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
 *
 * APP REVENUE is annualized (public/js/revenue-series.js), so its label
 * says so and names the window when the series is short. It renders as a
 * derived claim: the series it comes from and a note that it is a run-rate,
 * not realized revenue, ride the element as data attributes from
 * src/data/perishable.ts.
 */
interface Live { value: number; at: number; label: string; days?: number }
type Key = "shielded" | "staked" | "revenue";

const KEYS: Key[] = ["shielded", "staked", "revenue"];
const runRate = DERIVED["app-revenue-run-rate"];

/* each source hands back the printed value and its own label, so the
   component never decides what a number means */
const READ: Record<Key, () => Promise<Omit<Live, "at">>> = {
  shielded: async () => ({
    value: await fetchShieldedValue(),
    label: "Shielded value",
  }),
  staked: async () => ({
    value: await fetchStrkStaked(),
    label: "STRK staked",
  }),
  revenue: async () => {
    const rate = await fetchAppRevenue();
    return {
      value: rate.usd,
      days: rate.days,
      /* a full window says only "annualized"; a short one names its length,
         because the reader is owed the denominator */
      label: rate.days >= WINDOW_DAYS ? "App revenue, annualized" : `App revenue, annualized from ${rate.days}d`,
    };
  },
};

const PRINT: Record<Key, (v: number) => string> = {
  shielded: (v) => "$" + Math.round(v).toLocaleString("en-US"),
  staked: (v) => abbr(v) + " STRK",
  revenue: (v) => fmtUsd(v),
};

const PLACEHOLDER: Record<Key, string> = {
  shielded: "$0,000,000",
  staked: "0.00B STRK",
  revenue: "$0.0K",
};

export const LiveStats = () => {
  const [live, setLive] = useState<Partial<Record<Key, Live>>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      KEYS.forEach((key) =>
        READ[key]()
          .then((stat) => { if (alive) setLive((prev) => ({ ...prev, [key]: { ...stat, at: Date.now() } })); })
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
          const derived = key === "revenue";
          return (
            <li
              key={key}
              className="qhx-live"
              data-ready={entry ? "true" : "false"}
              aria-hidden={!entry}
              {...(derived
                ? {
                    "data-derived": "run-rate",
                    "data-src": runRate.src,
                    "data-checked": runRate.checked,
                    "data-note": runRate.note,
                    title: runRate.note,
                  }
                : {})}
            >
              <b>{entry ? PRINT[key](entry.value) : PLACEHOLDER[key]}</b>
              <span>{entry ? entry.label : PLACEHOLDER[key]}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
};
