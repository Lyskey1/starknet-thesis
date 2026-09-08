/**
 * The live sources the hero's baseline band reads, each the very endpoint,
 * field and print format its thesis page uses (2026-09-08):
 *
 *   SHIELDED VALUE  privacy.html section 05, TOTAL SHIELDED VALUE:
 *                   STRK20 backend /agg/pool-summary, tvlUsd, printed as
 *                   `$` + the rounded integer with en-US separators.
 *   STRK STAKED     strk.html section 04, STRK staked: the Endur network
 *                   overview, total_stake / 1e18, with the strk page's own
 *                   fallback (starknet_call get_total_stake on the staking
 *                   contract across its three RPCs), printed with abbr().
 *   APP REVENUE     strk.html's dashboard metric, "App revenue · 365D SUM":
 *                   chain-level app revenue for Starknet from growthepie
 *                   (CC BY 4.0), the dashboard's own selector, cache key and
 *                   window rule, imported from public/js/app-revenue.js. It
 *                   is already a trailing-365-day sum, so nothing here
 *                   annualizes it. This is NOT the STRK20 pool's protocol
 *                   revenue, which is a different and much smaller figure;
 *                   the label on this site means the chain's apps.
 *
 * Every call carries a cache-busting query as the pages do; the pages
 * refresh hourly and tick their UPDATED stamp every minute. The formatters
 * are the pages' functions character for character.
 */
import { appRevenue365, GROWTHEPIE_APP_REVENUE, GROWTHEPIE_CREDIT, WINDOW_DAYS } from "../../../public/js/app-revenue.js";

/* the selector's own constants, so a label and a credit can name them */
export { GROWTHEPIE_APP_REVENUE, GROWTHEPIE_CREDIT, WINDOW_DAYS };

export const STRK20_API = "https://strk20-dashboard-production.up.railway.app";
export const ENDUR_OVERVIEW = "https://api.dashboard.endur.fi/api/query/network/overview";
export const STARKNET_RPCS = [
  "https://rpc.starknet.lava.build",
  "https://api.cartridge.gg/x/starknet/mainnet",
  "https://1rpc.io/starknet",
];
export const STAKING_CONTRACT = "0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7";
export const SEL_GET_TOTAL_STAKE = "0x226ffc5db8f68325947f4c4fcbea7117624ed26d4a1354693f63de203c453c8";

export const REFRESH_MS = 3600000;
export const TICK_MS = 60000;

const bust = (url: string) => url + (url.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();

const getJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(bust(url));
  if (!r.ok) throw new Error(url);
  return r.json() as Promise<T>;
};

/** privacy.html fmtUsd */
export function fmtUsd(v: number) {
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + "K";
  return "$" + Math.round(v).toLocaleString("en-US");
}

/** strk.html abbr */
export function abbr(v: number) {
  v = Math.abs(v);
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return Math.round(v).toString();
}

/** privacy.html tickUpdated wording, from the oldest provenance */
export function updatedStamp(oldest: number) {
  const m = Math.floor((Date.now() - oldest) / 60000);
  return m < 1 ? "UPDATED JUST NOW" : m < 60 ? "UPDATED " + m + " MIN AGO" : "UPDATED " + Math.floor(m / 60) + " HR AGO";
}

export const fetchShieldedValue = async (): Promise<number> => {
  const s = await getJson<{ tvlUsd?: number }>(`${STRK20_API}/agg/pool-summary`);
  if (typeof s.tvlUsd !== "number") throw new Error("tvlUsd missing");
  return s.tvlUsd;
};

const rpcTotalStake = async (i = 0): Promise<number> => {
  if (i >= STARKNET_RPCS.length) throw new Error("every rpc failed");
  try {
    const r = await fetch(STARKNET_RPCS[i], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "starknet_call",
        params: [{ contract_address: STAKING_CONTRACT, entry_point_selector: SEL_GET_TOTAL_STAKE, calldata: [] }, "latest"],
      }),
    });
    const d = (await r.json()) as { result?: string[] };
    const v = parseInt((d.result || [])[0] || "", 16) / 1e18;
    if (!isFinite(v) || v <= 0) throw new Error("bad stake");
    return v;
  } catch {
    return rpcTotalStake(i + 1);
  }
};

export const fetchStrkStaked = async (): Promise<number> => {
  try {
    const d = await getJson<{ total_stake?: string }>(ENDUR_OVERVIEW);
    const strk = parseFloat(d.total_stake || "") / 1e18;
    if (!isFinite(strk) || strk <= 0) throw new Error("bad endur");
    return strk;
  } catch {
    return rpcTotalStake();
  }
};

/**
 * APP REVENUE: the strk dashboard's 365D SUM, straight from its selector.
 * Already a trailing-365-day figure; there is nothing to annualize.
 */
export const fetchAppRevenue = async () => appRevenue365();
