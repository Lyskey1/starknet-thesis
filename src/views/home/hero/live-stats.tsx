"use client";

import { useEffect, useState } from "react";

import { PERISHABLE } from "@/data/perishable";
import {
  abbr,
  fetchAppRevenue,
  fetchShieldedValue,
  fetchStrkStaked,
  REFRESH_MS,
  TICK_MS,
  GROWTHEPIE_CREDIT,
  relativeStamp,
  WINDOW_DAYS,
} from "@/lib/data/live-sources";

/**
 * The baseline band: three LIVE numbers, and nothing else. Each slot is laid
 * out at full size from the first paint and revealed only once its value
 * has landed; a source that fails stays invisible. There is no literal
 * fallback anywhere on this band.
 *
 * FRESHNESS (2026-09-10): the printed "Live / UPDATED n HR AGO" line is gone
 * from the band. The stamp still exists and still reports the OLDEST of the
 * three fetches (the privacy page's rule, so a partially failed refresh can
 * never claim freshness); it rides the band's own title attribute, refreshed
 * by the same minute tick that drove the removed line. Nothing else moved:
 * .qhx-cdlab was absolutely positioned in the strip's top padding band, so
 * dropping it changes no geometry.
 *
 * APP REVENUE is the strk dashboard's own metric, "App revenue · 365D SUM":
 * chain-level app revenue for Starknet from growthepie, the trailing 365
 * days, through the dashboard's selector (public/js/app-revenue.js). Its
 * label names the window, and it renders as a registered claim carrying the
 * endpoint and the check date from src/data/perishable.ts. The band has no
 * room for a visible source line, so growthepie's credit rides the element's
 * title and a visually hidden note; the dashboard keeps its visible credit
 * on the chart's source line.
 */
interface Live { value: number; at: number; label: string }
type Key = "shielded" | "staked" | "revenue";

const KEYS: Key[] = ["shielded", "staked", "revenue"];
const appRev = PERISHABLE["app-revenue-365d"];
const CREDIT = `Chain-level app revenue for Starknet, trailing ${WINDOW_DAYS} days. Source: ${GROWTHEPIE_CREDIT.name} (${GROWTHEPIE_CREDIT.licence}).`;

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
  revenue: async () => ({
    value: (await fetchAppRevenue()).usd,
    /* the dashboard's wording, "App revenue - 365D SUM", on two lines */
    label: appRev.text,
  }),
};

/* each figure prints exactly as its own page prints it: the pool's shielded
   value in full (privacy section 05), the stake and the app revenue through
   the strk dashboard's abbr(), so the dashboard's header and this band read
   the same string. The privacy page's compact formatter would round the same
   number to a whole million and the two would disagree on sight. */
const PRINT: Record<Key, (v: number) => string> = {
  shielded: (v) => "$" + Math.round(v).toLocaleString("en-US"),
  staked: (v) => abbr(v) + " STRK",
  revenue: (v) => "$" + abbr(v),
};

const PLACEHOLDER: Record<Key, string> = {
  shielded: "$0,000,000",
  staked: "0.00B STRK",
  revenue: "$00.0M",
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
    <ul className="qhx-stats" aria-live="polite" {...(oldest ? { title: `Updated ${relativeStamp(oldest)}` } : {})}>
      {KEYS.map((key) => {
        const entry = live[key];
        const credited = key === "revenue";
        return (
          <li
            key={key}
            className="qhx-live"
            data-ready={entry ? "true" : "false"}
            aria-hidden={!entry}
            {...(credited
              ? {
                  "data-perishable": "third-party",
                  "data-src": appRev.src,
                  "data-checked": appRev.checked,
                  "data-says": appRev.says,
                  title: CREDIT,
                }
              : {})}
          >
            <b>{entry ? PRINT[key](entry.value) : PLACEHOLDER[key]}</b>
            <span>{entry ? entry.label : PLACEHOLDER[key]}</span>
            {credited && <span className="lp-vh">{CREDIT}</span>}
          </li>
        );
      })}
    </ul>
  );
};
