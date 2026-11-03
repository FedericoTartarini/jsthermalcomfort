import {
  _MODEL_2023,
  _phs_optimized_scalar,
  _POSTURE_STANDING,
  PHS_INFO,
} from "./phs.ts";
import { brentq } from "../_internal/brentq.ts";
import { parseInputs } from "../_internal/define.ts";
import { notOfType } from "../_internal/errors.ts";
import { floatRepr } from "../_internal/floatRepr.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { pythonRound } from "../_internal/round.ts";
import { met_to_w_m2 } from "../utilities/met_to_w_m2.ts";
import { Standard } from "../utilities/options.ts";

// Fixed PHS inputs used by the threshold solvers. These mirror the values that
// ``phs()`` would use when called with ``posture="standing"``, ``acclimatized=100``,
// ``i_mst=0.4`` and the default ISO 7933:2023 model, so the private scalar kernel can be
// called directly without the validation and parallel array dispatch overhead of
// ``phs()``. ``test_phs_scalar_matches_public_phs`` guards against drift.
const _PHS_FIXED_INPUTS = deepFreeze({
  drink: PHS_INFO.inputs.drink.default,
  acclimatized: 100,
  weight: PHS_INFO.inputs.weight.default,
  i_mst: 0.4,
  a_p: PHS_INFO.inputs.a_p.default,
  height: PHS_INFO.inputs.height.default,
  walk_sp: PHS_INFO.inputs.walk_sp.default,
  theta: PHS_INFO.inputs.theta.default,
  f_r: PHS_INFO.inputs.f_r.default,
  t_sk: PHS_INFO.inputs.t_sk.default,
  t_cr: PHS_INFO.inputs.t_cr.default,
  t_re: PHS_INFO.inputs.t_re.default,
  t_cr_eq: PHS_INFO.inputs.t_cr_eq.default,
  t_sk_t_cr_wg: PHS_INFO.inputs.t_sk_t_cr_wg.default,
  evap_load_wm2_min: PHS_INFO.inputs.evap_load_wm2_min.default,
  sweat_rate_watt: PHS_INFO.inputs.sweat_rate_watt.default,
  model_code: _MODEL_2023,
});
export const _PHS_IDX_T_CR = 2;
export const _PHS_IDX_SWEAT_LOSS_G = 7;

/** Class to hold sport values. */
export class _SportsValues {
  readonly clo: number;
  readonly met: number;
  readonly vr: number;
  readonly duration: number;

  constructor(clo: number, met: number, vr: number, duration: number) {
    this.clo = clo;
    this.met = met;
    this.vr = vr;
    this.duration = duration;

    if (typeof this.clo !== "number") throw notOfType("clo", "a number");
    if (typeof this.met !== "number") throw notOfType("met", "a number");
    if (typeof this.vr !== "number") throw notOfType("vr", "a number");
    if (!Number.isInteger(this.duration))
      throw notOfType("duration", "an integer");

    if (this.clo <= 0) {
      const msg = `clo must be a positive number > 0, got ${this.clo}`;
      throw new RangeError(msg);
    }
    if (this.met <= 0) {
      const msg = `met must be a positive number > 0, got ${this.met}`;
      throw new RangeError(msg);
    }
    if (this.vr <= 0) {
      const msg = `vr must be a positive number > 0, got ${this.vr}`;
      throw new RangeError(msg);
    }
    if (this.duration < 0) {
      const msg = `duration must be a non-negative integer >= 0, got ${this.duration}`;
      throw new RangeError(msg);
    }
  }
}

/**
 * Namespace of predefined sport values.
 *
 * Use attributes like `Sports.RUNNING` to obtain a `_SportsValues` instance. This
 * class uses a frozen dataclass decorator to prevent modification of the namespace.
 * Attributes are class-level constants, not instance fields.
 */
export const Sports = deepFreeze({
  ABSEILING: new _SportsValues(0.6, 6.0, 0.5, 120),
  ARCHERY: new _SportsValues(0.75, 4.5, 0.5, 180),
  AUSTRALIAN_FOOTBALL: new _SportsValues(0.47, 7.5, 0.75, 45),
  BASEBALL: new _SportsValues(0.7, 6.0, 0.75, 120),
  BASKETBALL: new _SportsValues(0.37, 7.5, 0.75, 45),
  BOWLS: new _SportsValues(0.5, 5.0, 0.5, 180),
  CANOEING: new _SportsValues(0.6, 7.5, 2.0, 60),
  CRICKET: new _SportsValues(0.7, 6.0, 0.75, 120),
  CROQUET: new _SportsValues(0.7, 4.5, 0.5, 90),
  CYCLING: new _SportsValues(0.4, 7.0, 3.0, 60),
  EQUESTRIAN: new _SportsValues(0.9, 7.4, 3.0, 60),
  FIELD_ATHLETICS: new _SportsValues(0.3, 7.0, 1.0, 60),
  FIELD_HOCKEY: new _SportsValues(0.6, 7.4, 0.75, 45),
  FISHING: new _SportsValues(0.9, 4.0, 0.5, 180),
  GOLF: new _SportsValues(0.5, 5.0, 0.5, 180),
  HORSEBACK: new _SportsValues(0.9, 7.4, 3.0, 60),
  KAYAKING: new _SportsValues(0.6, 7.5, 2.0, 60),
  RUNNING: new _SportsValues(0.37, 7.5, 2.0, 60),
  MTB: new _SportsValues(0.55, 7.5, 3.0, 60),
  NETBALL: new _SportsValues(0.37, 7.5, 0.75, 45),
  OZTAG: new _SportsValues(0.4, 7.5, 0.75, 45),
  PICKLEBALL: new _SportsValues(0.4, 6.5, 0.5, 60),
  CLIMBING: new _SportsValues(0.6, 7.5, 1.0, 45),
  ROWING: new _SportsValues(0.4, 7.5, 2.0, 60),
  RUGBY_LEAGUE: new _SportsValues(0.47, 7.5, 0.75, 45),
  RUGBY_UNION: new _SportsValues(0.47, 7.5, 0.75, 45),
  SAILING: new _SportsValues(1.0, 6.5, 2.0, 180),
  SHOOTING: new _SportsValues(0.6, 5.0, 0.5, 120),
  SOCCER: new _SportsValues(0.47, 7.5, 1.0, 45),
  SOFTBALL: new _SportsValues(0.9, 6.1, 1.0, 120),
  TENNIS: new _SportsValues(0.4, 7.0, 0.75, 60),
  TOUCH: new _SportsValues(0.4, 7.5, 0.75, 45),
  VOLLEYBALL: new _SportsValues(0.37, 6.8, 0.75, 60),
  WALKING: new _SportsValues(0.5, 5.0, 0.5, 180),
});

export const SPORTS_HEAT_STRESS_RISK_INFO = deepFreeze({
  name: "sports_heat_stress_risk",
  label: "Sports heat stress risk",
  standards: [Standard.iso_7933_2023],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    vr: { kind: "numeric", unit: "m/s" },
    sport: {
      kind: "instance",
      of: _SportsValues,
      message:
        "sport must be a _SportsValues instance from the Sports dataclass.",
    },
  },
  outputs: {
    risk_level_interpolated: { kind: "numeric", unit: null },
    t_medium: { kind: "numeric", unit: "°C" },
    t_high: { kind: "numeric", unit: "°C" },
    t_extreme: { kind: "numeric", unit: "°C" },
    recommendation: { kind: "label", unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type SportsHeatStressInputs = InputsOf<
  typeof SPORTS_HEAT_STRESS_RISK_INFO
>;

/**
 * Dataclass to represent the Sports Heat Stress Risk calculation results.
 *
 * @interface
 */
export type SportsHeatStressRisk = OutputsOf<
  typeof SPORTS_HEAT_STRESS_RISK_INFO
>;

/**
 * Calculate sports heat stress risk levels based on environmental conditions and
 * sport-specific parameters.
 *
 * This function assesses heat stress risk for athletes during outdoor sports by
 * combining environmental conditions with sport-specific metabolic rates and clothing
 * insulation. It uses the Predicted Heat Strain (PHS) model to determine threshold
 * temperatures for different risk categories (Low, Medium, High, Extreme). The method
 * is based on the Sports Medicine Australia heat policy framework [SportsHeatStress2025](../../docs/references.md#sportsheatstress2025),
 * with detailed guidelines [SportsHeatPolicy2025](../../docs/references.md#sportsheatpolicy2025) and an online implementation available
 * at the Sports Heat Tool [SportsHeatTool](../../docs/references.md#sportsheattool).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature [°C].
 * @param inputs.tr - Mean radiant temperature [°C].
 * @param inputs.rh - Relative humidity [%].
 * @param inputs.vr - Relative air speed [m/s]. If the input `vr`
 * is lower than the minimum relative air speed defined for the selected
 * sport (`sport.vr`), then `sport.vr` will be used for the calculation.
 * @param inputs.sport - Sport-specific activity dataclass with fields `clo` (clothing insulation),
 * `met` (metabolic rate), `vr` (minimum relative air speed),
 * and `duration` (activity duration). Use one of the predefined entries from
 * the {@link Sports} class, e.g., `Sports.RUNNING`, `Sports.SOCCER`,
 * `Sports.TENNIS`, etc.
 *
 * @returns A dataclass containing the heat stress risk assessment results.
 * See {@link SportsHeatStressRisk} for
 * more details. To access individual values, use the corresponding attributes
 * of the returned instance, e.g., `result.risk_level_interpolated`.
 *
 * - `risk_level_interpolated` - Interpolated risk level (1.0-4.9), [dimensionless].
 *   Risk levels: 1-<2 = low, 2-<3 = moderate, 3-<4 = high,
 *   4-4.9 = extreme.
 * - `t_medium` - Temperature threshold for medium risk level, [°C].
 * - `t_high` - Temperature threshold for high risk level, [°C].
 * - `t_extreme` - Temperature threshold for extreme risk level, [°C].
 * - `recommendation` - Heat stress management recommendations for the calculated risk level.
 *
 * @throws `RangeError` If the risk level could not be determined due to NaN thresholds or if the internal
 * solver fails to produce thresholds that allow a risk determination.
 * @throws `TypeError` If sport is not a valid _SportsValues instance.
 *
 * @example
 * ```ts
 * import { sports_heat_stress_risk, Sports } from "jsthermalcomfort/models";
 *
 * // Example 1: Single condition for running
 * const result = sports_heat_stress_risk({
 *   tdb: 35,
 *   tr: 35,
 *   rh: 40,
 *   vr: 2.0,
 *   sport: Sports.RUNNING,
 * });
 * console.log(result.risk_level_interpolated); // 2.1 (Medium risk)
 * console.log(result.t_medium); // 34.5 (Temperature threshold for medium risk)
 * console.log(result.t_high); // 39 (Temperature threshold for high risk)
 * console.log(result.t_extreme); // 41.6 (Temperature threshold for extreme risk)
 * console.log(result.recommendation); // "Increase frequency and/or duration of rest breaks"
 *
 * // Example 2: Array inputs for multiple conditions
 * const results = [
 *   { tdb: 30, tr: 30, rh: 50, vr: 1.0 },
 *   { tdb: 35, tr: 35, rh: 50, vr: 1.0 },
 *   { tdb: 40, tr: 40, rh: 50, vr: 1.5 },
 * ].map((inputs) => sports_heat_stress_risk({ ...inputs, sport: Sports.SOCCER }));
 * console.log(results.map((r) => r.risk_level_interpolated)); // Array of risk levels
 *
 * // Example 3: vr clamping — input vr (0.5 m/s) is below Sports.RUNNING.vr
 * // (2.0 m/s), so the calculation uses sport.vr=2.0 m/s as the effective wind speed.
 * const result_clamped = sports_heat_stress_risk({
 *   tdb: 35,
 *   tr: 35,
 *   rh: 40,
 *   vr: 0.5,
 *   sport: Sports.RUNNING,
 * });
 * // Because vr is clamped to 2.0 m/s (same as Example 1), the output matches:
 * console.log(result_clamped.risk_level_interpolated); // same as Example 1
 * console.log(result_clamped.t_medium); // same as Example 1
 *
 * // Example 4: Different sports
 * const result_tennis = sports_heat_stress_risk({
 *   tdb: 33,
 *   tr: 70,
 *   rh: 60,
 *   vr: 0.75,
 *   sport: Sports.TENNIS,
 * });
 * const result_cycling = sports_heat_stress_risk({
 *   tdb: 33,
 *   tr: 70,
 *   rh: 60,
 *   vr: 3.0,
 *   sport: Sports.CYCLING,
 * });
 * ```
 */
export function sports_heat_stress_risk(
  inputs: SportsHeatStressInputs,
): SportsHeatStressRisk {
  // Validate inputs using the input dataclass
  const { tdb, tr, rh, vr, sport } = parseInputs(
    SPORTS_HEAT_STRESS_RISK_INFO,
    inputs,
  );
  // Validate relative humidity range
  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity (rh) must be between 0 and 100%.");
  }

  // Validate air speed is non-negative
  if (vr < 0) {
    throw new RangeError("Relative air speed (vr) must be non-negative.");
  }

  const vr_effective = Math.max(vr, sport.vr);

  const warnings: ModelWarning[] = [];
  const [risk_levels, t_mediums, t_highs, t_extremes, recommendations] =
    _calc_risk_single_value(tdb, tr, rh, vr_effective, sport, warnings);

  return buildOutputs(
    SPORTS_HEAT_STRESS_RISK_INFO,
    {
      risk_level_interpolated: risk_levels,
      t_medium: t_mediums,
      t_high: t_highs,
      t_extreme: t_extremes,
      recommendation: recommendations,
    },
    warnings,
  );
}

/**
 * Run the PHS scalar kernel for a single condition.
 *
 * Equivalent to `phs(..., posture="standing", acclimatized=100, i_mst=0.4,
 * limit_inputs=False, round_output=False)` but skips input validation and the
 * parallel array wrapper, which dominate the runtime for a single condition. Used
 * by the `brentq` objectives in `_calc_risk_single_value`, which call PHS many
 * times per condition.
 *
 * @param tdb - Dry bulb air temperature, [°C].
 * @param tr - Mean radiant temperature, [°C].
 * @param rh - Relative humidity, [%].
 * @param vr - Relative air speed, [m/s].
 * @param sport - Sport-specific parameters; `met`, `clo` and `duration` are used.
 *
 * @returns The raw 11-element tuple returned by `_phs_optimized_scalar`. Index with
 * `_PHS_IDX_T_CR` / `_PHS_IDX_SWEAT_LOSS_G`.
 */
export function _phs_scalar(
  tdb: number,
  tr: number,
  rh: number,
  vr: number,
  sport: _SportsValues,
): ReturnType<typeof _phs_optimized_scalar> {
  const p_a = (0.6105 * Math.exp((17.27 * tdb) / (tdb + 237.3)) * rh) / 100;
  return _phs_optimized_scalar(
    tdb,
    tr,
    vr,
    p_a,
    sport.met * met_to_w_m2,
    sport.clo,
    _POSTURE_STANDING,
    _PHS_FIXED_INPUTS.drink,
    _PHS_FIXED_INPUTS.acclimatized,
    _PHS_FIXED_INPUTS.weight,
    0.0,
    _PHS_FIXED_INPUTS.i_mst,
    _PHS_FIXED_INPUTS.a_p,
    _PHS_FIXED_INPUTS.height,
    _PHS_FIXED_INPUTS.walk_sp,
    _PHS_FIXED_INPUTS.theta,
    sport.duration,
    _PHS_FIXED_INPUTS.f_r,
    _PHS_FIXED_INPUTS.t_sk,
    _PHS_FIXED_INPUTS.t_cr,
    _PHS_FIXED_INPUTS.t_re,
    _PHS_FIXED_INPUTS.t_cr_eq,
    _PHS_FIXED_INPUTS.t_sk_t_cr_wg,
    _PHS_FIXED_INPUTS.evap_load_wm2_min,
    _PHS_FIXED_INPUTS.sweat_rate_watt,
    _PHS_FIXED_INPUTS.model_code,
  );
}

/**
 * Calculate the risk level and threshold temperatures for a single set of inputs.
 *
 * @param tdb - Dry bulb air temperature, [°C].
 * @param tr - Mean radiant temperature, [°C].
 * @param rh - Relative humidity, [%].
 * @param vr - Relative air speed, [m/s].
 * @param sport - Sport-specific parameters (clo, met, vr, duration).
 *
 * @returns Tuple containing (risk_level_interpolated, t_medium, t_high, t_extreme, recommendation).
 */
export function _calc_risk_single_value(
  tdb: number,
  tr: number,
  rh: number,
  vr: number,
  sport: _SportsValues,
  warnings: ModelWarning[],
): readonly [number, number, number, number, string] {
  // set the max and min thresholds for the risk levels
  const sweat_loss_g = 850; // 850 g per 45 minutes

  const max_t_low = 34.5; // maximum tdb for low risk
  const max_t_medium = 39; // maximum tdb for medium risk
  const max_t_high = 43.5; // maximum tdb for high risk
  // risk 4.9 is reached exactly 5°C above the humidity-dependent extreme threshold
  const t_upper_extreme_delta = 5.0;
  const min_t_low = 21; // minimum tdb for low risk
  const min_t_medium = 23; // minimum tdb for medium risk
  const min_t_high = 25; // minimum tdb for high risk
  const min_t_extreme = 26; // minimum tdb for extreme risk

  const t_cr_extreme = 40; // core temperature for extreme risk

  if (tdb < min_t_medium) {
    // Low risk - use default thresholds and risk level 1
    return [
      1.0,
      min_t_medium,
      min_t_high,
      min_t_extreme,
      _get_recommendation(1.0),
    ];
  }

  function calculate_threshold_water_loss(x: number): number {
    const sl = _phs_scalar(x, tr, rh, vr, sport)[_PHS_IDX_SWEAT_LOSS_G];
    // Python raises ZeroDivisionError here (deviation sports_heat_stress_risk-14).
    if (sport.duration === 0) throw new RangeError("float division by zero");
    return (sl / sport.duration) * 45.0 - sweat_loss_g;
  }

  let t_medium: number | undefined;
  for (const [min_t, max_t] of [
    [0, 36],
    [20, 50],
  ] as const) {
    try {
      t_medium = brentq(calculate_threshold_water_loss, min_t, max_t);
      break;
    } catch (error) {
      // scipy's ValueError is brentq's RangeError (deviation _shared-45), and a ZeroDivisionError is not one.
      if (
        !(error instanceof RangeError) ||
        error.message.includes("division by zero")
      )
        throw error;
      continue;
    }
  }
  if (t_medium === undefined) {
    const msg =
      `Solver did not find a solution for low-medium threshold for tdb=${floatRepr(tdb)} and rh=${floatRepr(rh)}: ` +
      `all bracket ranges failed. Setting t_medium to max threshold of ${floatRepr(max_t_low)}°C.`;
    warnings.push(Object.freeze({ kind: "notice", message: msg }));
    t_medium = max_t_low;
  }

  function calculate_threshold_core(x: number): number {
    const tcr = _phs_scalar(x, tr, rh, vr, sport)[_PHS_IDX_T_CR];
    return tcr - t_cr_extreme;
  }

  let t_extreme: number | undefined;
  for (const [min_t, max_t] of [
    [0, 36],
    [20, 50],
  ] as const) {
    try {
      t_extreme = brentq(calculate_threshold_core, min_t, max_t);
      break;
    } catch (error) {
      // scipy's ValueError is brentq's RangeError (deviation _shared-45), and a ZeroDivisionError is not one.
      if (
        !(error instanceof RangeError) ||
        error.message.includes("division by zero")
      )
        throw error;
      continue;
    }
  }
  if (t_extreme === undefined) {
    const msg =
      `Solver did not find a solution for high-extreme threshold for tdb=${floatRepr(tdb)} and rh=${floatRepr(rh)}: ` +
      `all bracket ranges failed. Setting t_extreme to max threshold of ${floatRepr(max_t_high)}°C.`;
    warnings.push(Object.freeze({ kind: "notice", message: msg }));
    t_extreme = max_t_high;
  }

  // calculate t_high as the average of t_medium and t_extreme
  let t_high = !(Number.isNaN(t_medium) || Number.isNaN(t_extreme))
    ? (t_medium + t_extreme) / 2
    : NaN;

  // check if the thresholds are within the min and max limits defined above
  if (t_medium > max_t_low) {
    t_medium = max_t_low;
  }
  if (t_high > max_t_medium) {
    t_high = max_t_medium;
  }
  if (t_extreme > max_t_high) {
    t_extreme = max_t_high;
  }

  // cap the thresholds to the minimum values defined above
  if (t_extreme < min_t_extreme) {
    t_extreme = min_t_extreme;
  }
  if (t_high < min_t_high) {
    t_high = min_t_high;
  }
  if (t_medium < min_t_medium) {
    t_medium = min_t_medium;
  }

  const extreme_entry_t = Math.min(pythonRound(t_extreme, 1), max_t_high);
  let risk_level_interpolated = NaN;
  // calculate the risk level with one decimal place
  if (min_t_low <= tdb && tdb < t_medium) {
    risk_level_interpolated =
      1.0 + (tdb - min_t_medium) / (t_medium - min_t_medium);
  } else if (t_medium <= tdb && tdb < t_high) {
    risk_level_interpolated = 2.0 + (tdb - t_medium) / (t_high - t_medium);
  } else if (t_high <= tdb && tdb < extreme_entry_t) {
    risk_level_interpolated = 3.0 + (tdb - t_high) / (extreme_entry_t - t_high);
  } else if (tdb >= extreme_entry_t) {
    // Scale to [4.0, 4.9] so risk reaches 4.9 exactly at extreme_entry_t + t_upper_extreme_delta.
    // Without the 0.9 factor the formula would hit 4.9 already at +4.5°C (90% of the range).
    risk_level_interpolated =
      4.0 + ((tdb - extreme_entry_t) / t_upper_extreme_delta) * 0.9;
  }

  if (Number.isNaN(risk_level_interpolated)) {
    throw new RangeError(
      "Risk level could not be determined due to NaN thresholds.",
    );
  }

  // Truncate to one decimal place toward negative infinity.
  // The 1e-9 epsilon guards against float representation of 4.9 (e.g. 4.8999…) flooring to 4.8.
  const risk_level_floor = Math.min(
    Math.floor((risk_level_interpolated + 1e-9) * 10.0) / 10.0,
    4.9,
  );

  // Generate recommendation based on the FLOORED risk level for consistency
  const recommendation = _get_recommendation(risk_level_floor);

  return [
    risk_level_floor,
    pythonRound(t_medium, 1),
    pythonRound(t_high, 1),
    pythonRound(t_extreme, 1),
    recommendation,
  ];
}

/**
 * Get heat stress management recommendations based on risk level.
 *
 * @param risk_level - Interpolated risk level (1.0-4.9).
 *
 * @returns Evidence-based recommendation text for managing heat stress at the given
 * risk level.
 */
function _get_recommendation(risk_level: number): string {
  if (risk_level < 2.0) {
    return "Increase hydration & modify clothing";
  } else if (risk_level < 3.0) {
    return "Increase frequency and/or duration of rest breaks";
  } else if (risk_level < 4.0) {
    return "Apply active cooling strategies";
  } else {
    return "Consider suspending play";
  }
}
