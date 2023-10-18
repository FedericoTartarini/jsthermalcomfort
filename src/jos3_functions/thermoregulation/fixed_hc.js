import { $average, $reduce } from "../../supa";
import JOS3Defaults from "../JOS3Defaults";

/**
 * Fixes hc values to fit two-node-model's values.
 */
export function fixed_hc(hc, v) {
  let mean_hc = $average(hc, JOS3Defaults.local_bsa);
  let mean_va = $average(v, JOS3Defaults.local_bsa);

  let mean_hc_whole = Math.max(3, 8.600001 * mean_va ** 0.53);
  return hc.map((x) => (x * mean_hc_whole) / mean_hc);
}
