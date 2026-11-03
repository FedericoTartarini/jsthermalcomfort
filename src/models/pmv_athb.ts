import { _pmv_ppd_optimized } from "./_pmv_ppd_optimized.ts";
import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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
    athb_pmv: { kind: "numeric", nullable: true, unit: null },
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

/**
 * Return the PMV value calculated with the Adaptive Thermal Heat Balance Framework
 * [Schweiker2022](../../docs/references.md#schweiker2022). The adaptive thermal heat balance (ATHB) framework introduced a
 * method to account for the three adaptive principles, namely physiological,
 * behavioral, and psychological adaptation, individually within existing heat balance
 * models. The objective is a predictive model of thermal sensation applicable during
 * the design stage or in international standards without knowing characteristics of
 * future occupants.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, in [°C].
 * @param inputs.tr - Mean radiant temperature, in [°C].
 * @param inputs.vr - Relative air speed, in [m/s].
 *
 * > [!NOTE]
 * > vr is the relative air speed caused by body movement and not the air
 * > speed measured by the air speed sensor. The relative air speed is the sum of the
 * > average air speed measured by the sensor plus the activity-generated air speed
 * > (Vag). Where Vag is the activity-generated air speed caused by motion of
 * > individual body parts. vr can be calculated using the function
 * > `v_relative`.
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, in [clo]. If `clo` is set to False, the clothing insulation
 * value will be calculated using the equation provided in the paper. Defaults to False.
 * @param inputs.t_running_mean - Running mean temperature, in [°C].
 *
 * > [!NOTE]
 * > The running mean temperature can be calculated using the function
 * > `running_mean_outdoor_temperature`.
 *
 * @returns Dataclass containing the results of the ATHB calculation. See {@link ATHB} for more details.
 *
 * - `athb_pmv` - Predicted Mean Vote calculated with the Adaptive Thermal Heat Balance framework.
 *
 * @example
 * ```ts
 * import { pmv_athb } from "jsthermalcomfort/models";
 *
 * // calculate the predicted mean vote (PMV) using the Adaptive Thermal Heat Balance model
 * const results = pmv_athb({
 *   tdb: 25,
 *   tr: 25,
 *   vr: 0.1,
 *   rh: 50,
 *   met: 1.2,
 *   t_running_mean: 20,
 * });
 * console.log(results.athb_pmv); // returns the PMV value
 *
 * // for multiple points
 * const points = [
 *   { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, t_running_mean: 20 },
 *   { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, t_running_mean: 20 },
 *   { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, t_running_mean: 20 },
 * ].map((inputs) => pmv_athb(inputs));
 * console.log(points.map((result) => result.athb_pmv));
 * ```
 */
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

  return buildOutputs(PMV_ATHB_INFO, { athb_pmv }, []);
}
