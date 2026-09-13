/**
 * The two fee readouts on the landing, derived at build time from the
 * files the thesis pages themselves derive them from. Server-only: it reads
 * the repository with fs, the same way scripts/build-privacy-matrix.js does.
 *
 * PRIVATE TRANSFER FEE: public/js/fee-config.js holds the protocol's dollar
 * TARGET per private action (STRK20_TARGET_FEE_USD). The privacy page's
 * Foundations row 03 and hero strip read it at runtime and the build stamps
 * it into every [data-fee-target]; the regex and the formatting below are
 * that build step's, character for character.
 *
 * POST-QUANTUM ACCOUNT FEE: tools/record-gen.js is the source of truth for
 * the Falcon-512 record card in quantum's Head Start tab 03 (the INVOKE v3
 * in block 12156522, actual_fee 0x1aba6437b7129348 FRI = 1.925961981 STRK,
 * shown to two decimals). The card's SVG is generated from that constant;
 * the landing reads the same constant. No dollar figure, per the source's
 * own note: the USD value moves with the STRK price and would disagree with
 * the announcement being cited.
 */
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** `~$0.12`, as the privacy page prints it (build stamp: `'~' + '$' + fee.toFixed(2)`). */
export const privateTransferFee = (): string | null => {
  const m = read("public/js/fee-config.js").match(/STRK20_TARGET_FEE_USD\s*=\s*([\d.]+)/);
  if (!m) return null;
  return "~$" + Number(m[1]).toFixed(2);
};

/** `1.93`, the recorded mainnet fee of the Falcon-512 account transaction, in STRK. */
export const postQuantumAccountFeeStrk = (): string | null => {
  const m = read("tools/record-gen.js").match(/feeStrk:\s*'([\d.]+)'/);
  return m ? m[1] : null;
};
