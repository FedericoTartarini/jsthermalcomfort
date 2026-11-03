import { adaptive_cooling_effect } from "../_internal/adaptive_cooling_effect.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _as_flag, _valid_range } from "../_internal/validation.ts";
import { operative_tmp } from "../environment/operative_tmp.ts";
import { Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

const SLOPE = 0.31;
const INTERCEPT = 17.8;

export const ADAPTIVE_ASHRAE_INFO = deepFreeze({
  name: "adaptive_ashrae",
  label: "Adaptive (ASHRAE 55)",
  standards: ASHRAE_55_COMPLIANCE_STANDARDS,
  inputs: {
    tdb: {
      kind: "numeric",
      unit: "°C",
      applicability: ASHRAE_55_LIMITS.tdb,
    },
    tr: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    t_running_mean: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 10.0, max: 33.5 },
    },
    v: { kind: "numeric", unit: "m/s", applicability: ASHRAE_55_LIMITS.v },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    tmp_cmf: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_80_low: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_80_up: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_90_low: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_90_up: { kind: "numeric", nullable: true, unit: "°C" },
    acceptability_80: { kind: "flag", nullable: true, unit: null },
    acceptability_90: { kind: "flag", nullable: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type ASHRAEInputs = InputsOf<typeof ADAPTIVE_ASHRAE_INFO>;

/**
 * A dataclass to store the results of the adaptive thermal comfort model based on
 * ASHRAE 55.
 *
 * @interface
 */
export type AdaptiveASHRAE = OutputsOf<typeof ADAPTIVE_ASHRAE_INFO>;

/**
 * Calculate the adaptive thermal comfort based on ASHRAE 55.
 *
 * The adaptive
 * model relates indoor design temperatures or acceptable temperature ranges
 * to outdoor meteorological or climatological parameters. The adaptive model
 * can only be used in occupant-controlled naturally conditioned spaces that
 * meet all the following criteria:
 *
 * * There is no mechanical cooling or heating system in operation.
 * * Occupants have a metabolic rate between 1.0 and 1.5 met.
 * * Occupants are free to adapt their clothing within a range as wide as 0.5 and 1.0 clo.
 * * The prevailing mean (running mean) outdoor temperature is between 10 and 33.5 °C.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.t_running_mean - Running mean temperature, default in [°C] or [°F] if `units` = 'IP'.
 *
 * > [!NOTE]
 * > The running mean temperature can be calculated using the function `running_mean_outdoor_temperature`.
 *
 * @param inputs.v - Air speed, default in [m/s] or [fps] if `units` = 'IP'.
 * @param inputs.units - Units system, 'SI' or 'IP'. Defaults to 'SI'.
 * @param inputs.limit_inputs - If True, returns nan for inputs outside standard limits. Defaults to True.
 *
 * > [!NOTE]
 * > ASHRAE 55 2020 limits: 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40, 0 <= v [m/s] <= 2, 10 <= t_running_mean [°C] <= 33.5.
 *
 * @param inputs.round_output - If True, rounds the five reported temperatures to one decimal place, after the
 * conversion to °F when ``units='IP'``. The comfort bounds and the acceptability
 * flags are always calculated from unrounded values, so ``round_output`` never
 * changes ``acceptability_80`` or ``acceptability_90``. Defaults to True.
 *
 * @returns A dataclass containing the results. See {@link AdaptiveASHRAE} for more details.
 *
 * - `tmp_cmf` - Comfort temperature at a specific running mean temperature, default in [°C] or [°F].
 * - `tmp_cmf_80_low` - Lower acceptable comfort temperature for 80% occupants, default in [°C] or [°F].
 * - `tmp_cmf_80_up` - Upper acceptable comfort temperature for 80% occupants, default in [°C] or [°F].
 * - `tmp_cmf_90_low` - Lower acceptable comfort temperature for 90% occupants, default in [°C] or [°F].
 * - `tmp_cmf_90_up` - Upper acceptable comfort temperature for 90% occupants, default in [°C] or [°F].
 * - `acceptability_80` - 1.0 if the operative temperature is acceptable for 80% of occupants, 0.0 if
 *   not, and NaN where the inputs are outside the applicability limits.
 * - `acceptability_90` - 1.0 if the operative temperature is acceptable for 90% of occupants, 0.0 if
 *   not, and NaN where the inputs are outside the applicability limits.
 *
 * @example
 * ```ts
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 *
 * let results = adaptive_ashrae({ tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 });
 * console.log(results);
 * // { tmp_cmf: 24, tmp_cmf_80_low: 20.5, tmp_cmf_80_up: 27.5, tmp_cmf_90_low: 21.5, tmp_cmf_90_up: 26.5, acceptability_80: true, acceptability_90: true, warnings: [] }
 *
 * console.log(results.acceptability_80); // or use console.log(results["acceptability_80"])
 * // true
 * // The conditions you entered are considered to be comfortable for 80% of the occupants.
 *
 * const results_list = [25, 26].map((tdb) =>
 *   adaptive_ashrae({ tdb, tr: 25, t_running_mean: 20, v: 0.1 }),
 * );
 * console.log(results_list.map((result) => result.tmp_cmf)); // [24, 24]
 * console.log(results_list.map((result) => result.acceptability_80)); // [true, true]
 *
 * // For users who want to use the IP system
 * results = adaptive_ashrae({ tdb: 77, tr: 77, t_running_mean: 68, v: 0.3, units: "IP" });
 * console.log(results);
 * // { tmp_cmf: 75.2, tmp_cmf_80_low: 68.9, tmp_cmf_80_up: 81.5, tmp_cmf_90_low: 70.7, tmp_cmf_90_up: 79.7, acceptability_80: true, acceptability_90: true, warnings: [] }
 *
 * adaptive_ashrae({ tdb: 25, tr: 25, t_running_mean: 9, v: 0.1 });
 * // { tmp_cmf: NaN, ... acceptability_90: null, warnings: [...] }
 * // The adaptive thermal comfort model can only be used if the running mean temperature is higher than 10°C.
 * ```
 */
export function adaptive_ashrae(inputs: ASHRAEInputs): AdaptiveASHRAE {
  // Validate inputs using the ASHRAEInputs class
  let { tdb, tr, t_running_mean, v, units, limit_inputs, round_output } =
    parseInputs(ADAPTIVE_ASHRAE_INFO, inputs);

  const standard = "ashrae";

  if (units.toUpperCase() === Units.IP) {
    ({
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    } = units_converter(Units.IP, {
      tdb,
      tr,
      tmp_running_mean: t_running_mean,
      v,
    }));
  }

  const to = operative_tmp(tdb, tr, v, standard);

  const ce = adaptive_cooling_effect(v, to);

  let t_cmf = SLOPE * t_running_mean + INTERCEPT;

  const warnings: ModelWarning[] = [];
  const [tdb_valid, tr_valid, v_valid] = _check_ashrae55_compliance(
    { tdb, tr, v },
    warnings,
  );
  const trm_valid = _valid_range(
    t_running_mean,
    ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.applicability,
    "t_running_mean",
    "input",
    ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.unit,
    warnings,
  );
  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(trm_valid)
  );
  t_cmf = limit_inputs && !all_valid ? NaN : t_cmf;

  let tmp_cmf_80_low = t_cmf - 3.5;
  let tmp_cmf_90_low = t_cmf - 2.5;
  let tmp_cmf_80_up = t_cmf + 3.5 + ce;
  let tmp_cmf_90_up = t_cmf + 2.5 + ce;

  // NaN where the inputs are outside the applicability limits (t_cmf is NaN) or
  // where an input is NaN. The cooling effect treats a NaN v as still air, so v is
  // checked directly.
  const valid = !(
    Number.isNaN(t_cmf) ||
    Number.isNaN(to) ||
    Number.isNaN(ce) ||
    Number.isNaN(v)
  );
  const acceptability_80 = _as_flag(
    tmp_cmf_80_low <= to && to <= tmp_cmf_80_up,
    valid,
  );
  const acceptability_90 = _as_flag(
    tmp_cmf_90_low <= to && to <= tmp_cmf_90_up,
    valid,
  );

  if (units.toUpperCase() === Units.IP) {
    ({
      tmp_cmf: t_cmf,
      tmp_cmf_80_low,
      tmp_cmf_80_up,
      tmp_cmf_90_low,
      tmp_cmf_90_up,
    } = units_converter(Units.SI, {
      tmp_cmf: t_cmf,
      tmp_cmf_80_low,
      tmp_cmf_80_up,
      tmp_cmf_90_low,
      tmp_cmf_90_up,
    }));
  }

  // round only the reported temperatures, so round_output never changes acceptability
  if (round_output) {
    t_cmf = round(t_cmf, 1);
    tmp_cmf_80_low = round(tmp_cmf_80_low, 1);
    tmp_cmf_80_up = round(tmp_cmf_80_up, 1);
    tmp_cmf_90_low = round(tmp_cmf_90_low, 1);
    tmp_cmf_90_up = round(tmp_cmf_90_up, 1);
  }

  return buildOutputs(
    ADAPTIVE_ASHRAE_INFO,
    {
      tmp_cmf: t_cmf,
      tmp_cmf_80_low,
      tmp_cmf_80_up,
      tmp_cmf_90_low,
      tmp_cmf_90_up,
      acceptability_80,
      acceptability_90,
    },
    warnings,
  );
}
