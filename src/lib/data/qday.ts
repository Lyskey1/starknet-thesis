/**
 * The Q-day target, read at build from the one constant the quantum page
 * counts down from (public/js/qday-config.js, QDAY_TARGET_ISO). The FAQ's
 * "around {year}" derives from it; nothing on the landing types the year.
 * Server-only (fs).
 */
import fs from "node:fs";
import path from "node:path";

export const qdayTargetIso = (): string | null => {
  const src = fs.readFileSync(path.join(process.cwd(), "public/js/qday-config.js"), "utf8");
  const m = src.match(/QDAY_TARGET_ISO\s*=\s*'([^']+)'/);
  return m ? m[1] : null;
};

export const qdayYear = (): number | null => {
  const iso = qdayTargetIso();
  if (!iso) return null;
  const y = new Date(iso).getUTCFullYear();
  return Number.isFinite(y) ? y : null;
};
