/* Types for revenue-series.js, for the Next bundle's benefit. */
export interface RevenueDay {
  date: string;
  feesUsd?: number;
}

export interface DailyRevenue {
  date: string;
  usd: number;
  cumUsd: number;
  first: boolean;
}

export interface RunRate {
  /** The annualized run-rate in USD. Not realized revenue. */
  usd: number;
  /** The summed daily revenue of the window. */
  sum: number;
  /** How many complete days the window actually held. */
  days: number;
  from: string;
  to: string;
}

export const WINDOW_DAYS: number;
export const YEAR_DAYS: number;
export function dailyRevenue(days: RevenueDay[] | undefined): DailyRevenue[];
export function cumulativeRevenue(days: RevenueDay[] | undefined): number | null;
export function annualizedRevenue(
  days: RevenueDay[] | undefined,
  opts?: { today?: string; windowDays?: number },
): RunRate | null;
