import { adaptive_cooling_effect } from "../_internal/adaptive_cooling_effect.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _valid_range } from "../_internal/validation.ts";
import { operative_tmp } from "../environment/operative_tmp.ts";
import { Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

const SLOPE = 0.33;
const INTERCEPT = 18.8;

export const ADAPTIVE_EN_INFO = deepFreeze({
  name: "adaptive_en",
  label: "Adaptive (EN 16798-1)",
  standards: [],
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
    tmp_cmf: { kind: "numeric", unit: "°C" },
    acceptability_cat_i: { kind: "bool", unit: null },
    acceptability_cat_ii: { kind: "bool", unit: null },
    acceptability_cat_iii: { kind: "bool", unit: null },
    tmp_cmf_cat_i_up: { kind: "numeric", unit: "°C" },
    tmp_cmf_cat_ii_up: { kind: "numeric", unit: "°C" },
    tmp_cmf_cat_iii_up: { kind: "numeric", unit: "°C" },
    tmp_cmf_cat_i_low: { kind: "numeric", unit: "°C" },
    tmp_cmf_cat_ii_low: { kind: "numeric", unit: "°C" },
    tmp_cmf_cat_iii_low: { kind: "numeric", unit: "°C" },
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

  const acceptability_i = t_cmf_i_lower <= to && to <= t_cmf_i_upper;
  const acceptability_ii = t_cmf_ii_lower <= to && to <= t_cmf_ii_upper;
  const acceptability_iii = t_cmf_iii_lower <= to && to <= t_cmf_iii_upper;

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

  return Object.freeze({
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
    warnings: Object.freeze(warnings),
  });
}
