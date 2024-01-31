import JOS3Defaults from "../JOS3Defaults.js";
import * as math from "mathjs";

/**
 * Fixes hc values to fit two-node-model's values.
 */
export function fixed_hc(hc, v) {
  const local_bsa_sum = math.sum(JOS3Defaults.local_bsa);

  let mean_hc =
    math.sum(math.dotMultiply(hc, JOS3Defaults.local_bsa)) / local_bsa_sum;

  let mean_va =
    math.sum(math.dotMultiply(v, JOS3Defaults.local_bsa)) / local_bsa_sum;

  let mean_hc_whole = Math.max(3, 8.600001 * mean_va ** 0.53);
  return math.dotDivide(math.dotMultiply(hc, mean_hc_whole), mean_hc)
}
