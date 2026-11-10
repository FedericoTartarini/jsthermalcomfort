import { adaptive_cooling_effect } from "../_internal/adaptive_cooling_effect.ts";
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
import { Standard, Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

const SLOPE = 0.33;
const INTERCEPT = 18.8;

export const ADAPTIVE_EN_INFO = deepFreeze({
  name: "adaptive_en",
  label: "Adaptive (EN 16798-1)",
  standards: [Standard.en_16798_1_2019],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    tr: { kind: "numeric", unit: "°C" },
    t_running_mean: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 10.0, max: 30.0 },
    },
    v: { kind: "numeric", unit: "m/s" },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    tmp_cmf: { kind: "numeric", nullable: true, unit: "°C" },
    acceptability_cat_i: { kind: "flag", nullable: true, unit: null },
    acceptability_cat_ii: { kind: "flag", nullable: true, unit: null },
    acceptability_cat_iii: { kind: "flag", nullable: true, unit: null },
    tmp_cmf_cat_i_up: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_cat_ii_up: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_cat_iii_up: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_cat_i_low: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_cat_ii_low: { kind: "numeric", nullable: true, unit: "°C" },
    tmp_cmf_cat_iii_low: { kind: "numeric", nullable: true, unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type ENInputs = InputsOf<typeof ADAPTIVE_EN_INFO>;

/**
 * Dataclass to store the results of the adaptive thermal comfort calculation based
 * on EN 16798-1 2019.
 *
 * @interface
 */
export type AdaptiveEN = OutputsOf<typeof ADAPTIVE_EN_INFO>;

/**
 * Calculate the adaptive thermal comfort based on EN 16798-1 2019 [16798EN2019](../../docs/references.md#16798en2019).
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
 *
 * > [!NOTE]
 * > Indoor operative temperature correction is applicable for buildings equipped
 * > with fans or personal systems providing building occupants with personal
 * > control over air speed at occupant level.
 * > For operative temperatures at or above 25°C the comfort zone upper limit can be
 * > increased by 1.2 °C (0.6 <= v < 0.9 m/s), 1.8 °C (0.9 <= v < 1.2 m/s), 2.2 °C (v
 * > \>= 1.2 m/s).
 *
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param inputs.limit_inputs - If True, returns NaN for inputs outside the standard applicability limits.
 * The applicability limits are 10 <= t_running_mean [°C] <= 30.
 * @param inputs.round_output - If True, rounds the returned comfort temperature and category bounds to one decimal
 * place in the output unit (rounding is applied after any IP unit conversion).
 * If False, returns the unrounded values.
 *
 * @returns A dataclass containing the results. See {@link AdaptiveEN} for more details.
 *
 * - `tmp_cmf` - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F].
 * - `acceptability_cat_i` - 1.0 if the indoor conditions comply with comfort category I, 0.0 if not, and
 *   NaN where the inputs are outside the applicability limits.
 * - `acceptability_cat_ii` - 1.0 if the indoor conditions comply with comfort category II, 0.0 if not, and
 *   NaN where the inputs are outside the applicability limits.
 * - `acceptability_cat_iii` - 1.0 if the indoor conditions comply with comfort category III, 0.0 if not, and
 *   NaN where the inputs are outside the applicability limits.
 * - `tmp_cmf_cat_i_up` - Upper acceptable comfort temperature for category I, default in [°C] or in [°F].
 * - `tmp_cmf_cat_ii_up` - Upper acceptable comfort temperature for category II, default in [°C] or in [°F].
 * - `tmp_cmf_cat_iii_up` - Upper acceptable comfort temperature for category III, default in [°C] or in [°F].
 * - `tmp_cmf_cat_i_low` - Lower acceptable comfort temperature for category I, default in [°C] or in [°F].
 * - `tmp_cmf_cat_ii_low` - Lower acceptable comfort temperature for category II, default in [°C] or in [°F].
 * - `tmp_cmf_cat_iii_low` - Lower acceptable comfort temperature for category III, default in [°C] or in [°F].
 *
 * @example
 * ```ts
 * import { adaptive_en } from "jsthermalcomfort/models";
 *
 * let results = adaptive_en({ tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 });
 * console.log(results);
 * // { tmp_cmf: 25.4, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 *
 * console.log(results.acceptability_cat_i); // or console.log(results["acceptability_cat_i"])
 * // true
 * // The conditions you entered are considered to comply with Category I
 *
 * // For users who want to use the IP system, units: "IP" or "ip" are both valid
 * results = adaptive_en({ tdb: 77, tr: 77, t_running_mean: 68, v: 0.3, units: "IP" });
 * console.log(results);
 * // { tmp_cmf: 77.7, acceptability_cat_i: true, ... }
 *
 * results = adaptive_en({ tdb: 25, tr: 25, t_running_mean: 9, v: 0.1 });
 * console.log(results);
 * // { tmp_cmf: NaN, acceptability_cat_i: null, ... }
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is between 10 °C and 30 °C.
 * ```
 */
export function adaptive_en(inputs: ENInputs): AdaptiveEN {
  // Validate inputs using the ENInputs class
  let { tdb, tr, t_running_mean, v, units, limit_inputs, round_output } =
    parseInputs(ADAPTIVE_EN_INFO, inputs);

  const standard = "iso";

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
  const trm_valid = _valid_range(
    t_running_mean,
    ADAPTIVE_EN_INFO.inputs.t_running_mean.applicability,
    "t_running_mean",
    "input",
    ADAPTIVE_EN_INFO.inputs.t_running_mean.unit,
    warnings,
  );
  const all_valid = !Number.isNaN(trm_valid);
  t_cmf = limit_inputs && !all_valid ? NaN : t_cmf;

  let t_cmf_i_lower = t_cmf - 3.0;
  let t_cmf_ii_lower = t_cmf - 4.0;
  let t_cmf_iii_lower = t_cmf - 5.0;
  let t_cmf_i_upper = t_cmf + 2.0 + ce;
  let t_cmf_ii_upper = t_cmf + 3.0 + ce;
  let t_cmf_iii_upper = t_cmf + 4.0 + ce;

  // NaN where the inputs are outside the applicability limits (t_cmf is NaN) or
  // where a NaN input makes the operative temperature or cooling effect NaN
  const valid = !(Number.isNaN(t_cmf) || Number.isNaN(to) || Number.isNaN(ce));
  const acceptability_i = _as_flag(
    t_cmf_i_lower <= to && to <= t_cmf_i_upper,
    valid,
  );
  const acceptability_ii = _as_flag(
    t_cmf_ii_lower <= to && to <= t_cmf_ii_upper,
    valid,
  );
  const acceptability_iii = _as_flag(
    t_cmf_iii_lower <= to && to <= t_cmf_iii_upper,
    valid,
  );

  if (units.toUpperCase() === Units.IP) {
    ({
      tmp_cmf: t_cmf,
      tmp_cmf_cat_i_up: t_cmf_i_upper,
      tmp_cmf_cat_ii_up: t_cmf_ii_upper,
      tmp_cmf_cat_iii_up: t_cmf_iii_upper,
    } = units_converter(Units.SI, {
      tmp_cmf: t_cmf,
      tmp_cmf_cat_i_up: t_cmf_i_upper,
      tmp_cmf_cat_ii_up: t_cmf_ii_upper,
      tmp_cmf_cat_iii_up: t_cmf_iii_upper,
    }));
    ({
      tmp_cmf_cat_i_low: t_cmf_i_lower,
      tmp_cmf_cat_ii_low: t_cmf_ii_lower,
      tmp_cmf_cat_iii_low: t_cmf_iii_lower,
    } = units_converter(Units.SI, {
      tmp_cmf_cat_i_low: t_cmf_i_lower,
      tmp_cmf_cat_ii_low: t_cmf_ii_lower,
      tmp_cmf_cat_iii_low: t_cmf_iii_lower,
    }));
  }

  if (round_output) {
    t_cmf = round(t_cmf, 1);
    t_cmf_i_lower = round(t_cmf_i_lower, 1);
    t_cmf_ii_lower = round(t_cmf_ii_lower, 1);
    t_cmf_iii_lower = round(t_cmf_iii_lower, 1);
    t_cmf_i_upper = round(t_cmf_i_upper, 1);
    t_cmf_ii_upper = round(t_cmf_ii_upper, 1);
    t_cmf_iii_upper = round(t_cmf_iii_upper, 1);
  }

  return buildOutputs(
    ADAPTIVE_EN_INFO,
    {
      tmp_cmf: t_cmf,
      acceptability_cat_i: acceptability_i,
      acceptability_cat_ii: acceptability_ii,
      acceptability_cat_iii: acceptability_iii,
      tmp_cmf_cat_i_up: t_cmf_i_upper,
      tmp_cmf_cat_ii_up: t_cmf_ii_upper,
      tmp_cmf_cat_iii_up: t_cmf_iii_upper,
      tmp_cmf_cat_i_low: t_cmf_i_lower,
      tmp_cmf_cat_ii_low: t_cmf_ii_lower,
      tmp_cmf_cat_iii_low: t_cmf_iii_lower,
    },
    warnings,
  );
}
