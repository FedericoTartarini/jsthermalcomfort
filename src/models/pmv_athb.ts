import { _pmv_ppd_optimized } from "./_pmv_ppd_optimized.ts";
import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { met_to_w_m2 } from "../utilities/met_to_w_m2.ts";

export const PMV_ATHB_INFO = deepFreeze({
  name: "pmv_athb",
  label: "Adaptive thermal heat balance PMV",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    vr: { kind: "numeric", unit: "m/s" },
    rh: { kind: "numeric", unit: "%" },
    met: { kind: "numeric", unit: "met" },
    t_running_mean: { kind: "numeric", unit: "°C" },
    clo: { kind: "numeric", unit: "clo", default: false },
  },
  outputs: {
    athb_pmv: { kind: "numeric", unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type ATHBInputs = InputsOf<typeof PMV_ATHB_INFO>;

/**
 * Dataclass to store the results of the Adaptive Thermal Heat Balance (ATHB)
 * calculation.
 *
 * @interface
 */
export type ATHB = OutputsOf<typeof PMV_ATHB_INFO>;

export function pmv_athb(inputs: ATHBInputs): ATHB {
  // Validate inputs using the ATHBInputs class
  const { tdb, tr, vr, rh, met, t_running_mean, clo } = parseInputs(
    PMV_ATHB_INFO,
    inputs,
  );

  const met_adapted = met - (0.234 * t_running_mean) / 58.2;

  let clo_adapted = clo;
  if (clo_adapted === false) {
    // Adapted clothing insulation level through behavioral adaptation
    clo_adapted = Math.pow(
      10,
      -0.17168 -
        0.000485 * t_running_mean +
        0.08176 * met_adapted -
        0.00527 * t_running_mean * met_adapted,
    );
  }

  const pmv_res = _pmv_ppd_optimized(
    tdb,
    tr,
    vr,
    rh,
    met_adapted,
    clo_adapted,
    0,
  );
  const ts = 0.303 * Math.exp(-0.036 * met_adapted * met_to_w_m2) + 0.028;
  const l_adapted = pmv_res / ts;

  // Predicted thermal sensation vote
  const athb_pmv = round(
    1.484 +
      0.0276 * l_adapted -
      0.9602 * met_adapted -
      0.0342 * t_running_mean +
      0.0002264 * l_adapted * t_running_mean +
      0.018696 * met_adapted * t_running_mean -
      0.0002909 * l_adapted * met_adapted * t_running_mean,
    3,
  );

  return Object.freeze({ athb_pmv, warnings: Object.freeze([]) });
}
