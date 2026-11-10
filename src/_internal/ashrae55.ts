import { operative_tmp } from "../environment/operative_tmp.ts";
import { Standard } from "../utilities/options.ts";
import { deepFreeze } from "./modelInfo.ts";
import type { Bound, ModelWarning } from "./modelInfo.ts";
import { _valid_range } from "./validation.ts";

// The counterpart of upstream's `_internal/ashrae55.py`.

/**
 * ASHRAE 55's limits that `_check_ashrae55_compliance` checks, keyed as its
 * keyword arguments: the Table 7.3.4 single-variable limits, and `v_limited`'s.
 * The models that call it reference these from their `*_INFO`.
 */
export const ASHRAE_55_LIMITS = deepFreeze({
  tdb: { min: 10.0, max: 40.0 },
  tr: { min: 10.0, max: 40.0 },
  v: { min: 0.0, max: 2.0 },
  met: { min: 1.0, max: 4.0 },
  clo: { min: 0.0, max: 1.5 },
  v_limited: { min: 0.0, max: 0.2 },
} as const satisfies Record<string, Bound>);

/**
 * The standards `_check_ashrae55_compliance` checks against: upstream's
 * docstring calls it the "ASHRAE 55-2023 input applicability check"
 * (`_internal/ashrae55.py:12`).
 */
export const ASHRAE_55_COMPLIANCE_STANDARDS = deepFreeze([
  Standard.ashrae_55_2023,
] as const);

/**
 * ASHRAE 55's still-air speed, 0.1 m/s: `cooling_effect` calculates the
 * cooling effect only above it and computes the still-air SET at it
 * (`models/cooling_effect.py:35-40, :141, :187`), and `pmv_ppd_ashrae`
 * applies the cooling effect above it (`models/pmv_ppd_ashrae.py:190-199`).
 */
export const ASHRAE_55_STILL_AIR_THRESHOLD = 0.1;

/**
 * The fixed airspeed bounds of the §7.2.1.2 `airspeed_control` rules: `any`
 * at every operative temperature, `cool` when the operative temperature is at
 * or below 23 °C.
 */
const ASHRAE_55_AIRSPEED_NO_CONTROL = deepFreeze({
  any: { max: 0.8 },
  cool: { max: 0.2 },
} as const satisfies Record<string, Bound>);

/**
 * The keyword arguments `_check_ashrae55_compliance` takes. Upstream reads
 * `clo` wherever `met` is given (`_internal/ashrae55.py:98-99` at v4.8.0),
 * and raises `ValueError` where `airspeed_control` is false without `v`,
 * `met` or `clo` (`:39-43`), so the type requires them there.
 */
type Ashrae55Kwargs = {
  readonly tdb: number;
  readonly tr: number;
  readonly v?: number;
  readonly v_limited?: number;
  readonly v_param_name?: string;
} & (
  | {
      readonly met?: undefined;
      readonly clo?: undefined;
      readonly airspeed_control?: true;
    }
  | {
      readonly met: number;
      readonly clo: number;
      readonly airspeed_control?: true;
    }
  | {
      readonly v: number;
      readonly met: number;
      readonly clo: number;
      readonly airspeed_control?: boolean;
    }
);

/**
 * ASHRAE 55-2023 input applicability check.
 *
 * Implements the Table 7.3.4 single-variable limits and the §7.2.1.2
 * `airspeed_control` cross-variable rules. Single-use compliance checks for other
 * standards (ISO 7730, ISO 7933, fan_heatwaves) live inline in the respective model
 * files.
 *
 * `v_param_name` (default `"v"`) controls how the airspeed variable is rendered in
 * the range rows emitted by this function. Callers whose signature names the airspeed
 * argument `vr` should pass `v_param_name="vr"` so the row's key matches the
 * caller's variable name. It does not affect which value is checked.
 *
 * @param kwargs - The values to check, keyed as upstream's keyword arguments.
 * @param warnings - The call's rows.
 * @returns The values in `kwargs`' order (`tdb`, `tr`, then `v`, `met` and
 * `clo`, and `v_limited` where given), each NaN where it broke a limit.
 */
export function _check_ashrae55_compliance(
  kwargs: Ashrae55Kwargs,
  warnings: ModelWarning[],
): number[] {
  const default_kwargs = { airspeed_control: true, v_param_name: "v" };
  const params = { ...default_kwargs, ...kwargs };
  const v_param_name = params.v_param_name;
  const values_to_return: Record<string, number> = {};

  const tdb_valid = _valid_range(
    params.tdb,
    ASHRAE_55_LIMITS.tdb,
    "tdb",
    "input",
    "°C",
    warnings,
  );
  const tr_valid = _valid_range(
    params.tr,
    ASHRAE_55_LIMITS.tr,
    "tr",
    "input",
    "°C",
    warnings,
  );

  values_to_return.tdb = tdb_valid;
  values_to_return.tr = tr_valid;

  let v_valid = NaN;
  if (params.v !== undefined) {
    v_valid = _valid_range(
      params.v,
      ASHRAE_55_LIMITS.v,
      v_param_name,
      "input",
      "m/s",
      warnings,
    );
    values_to_return.v = v_valid;
  }

  // Ashrae55Kwargs gives v, met and clo wherever airspeed_control can be
  // false; the checks on v and met only narrow the types.
  if (
    !params.airspeed_control &&
    params.v !== undefined &&
    params.met !== undefined
  ) {
    const { v, met, clo } = params;
    const exceeding = (bound: Bound) => {
      warnings.push(
        Object.freeze({
          kind: "range",
          key: v_param_name,
          role: "input",
          value: v,
          unit: "m/s",
          bound,
        }),
      );
    };
    const cond1 =
      v > ASHRAE_55_AIRSPEED_NO_CONTROL.any.max && clo < 0.7 && met < 1.3;
    if (cond1) exceeding(ASHRAE_55_AIRSPEED_NO_CONTROL.any);
    v_valid = cond1 ? NaN : v_valid;

    const to = operative_tmp(params.tdb, params.tr, v);
    const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;

    const cond2 = to > 23 && to < 25.5 && v > v_limit && clo < 0.7 && met < 1.3;
    if (cond2) exceeding(Object.freeze({ max: v_limit }));
    v_valid = cond2 ? NaN : v_valid;

    const cond3 =
      to <= 23 &&
      v > ASHRAE_55_AIRSPEED_NO_CONTROL.cool.max &&
      clo < 0.7 &&
      met < 1.3;
    if (cond3) exceeding(ASHRAE_55_AIRSPEED_NO_CONTROL.cool);
    v_valid = cond3 ? NaN : v_valid;

    values_to_return.v = v_valid;
  }

  if (params.met !== undefined) {
    const met_valid = _valid_range(
      params.met,
      ASHRAE_55_LIMITS.met,
      "met",
      "input",
      "met",
      warnings,
    );
    const clo_valid = _valid_range(
      params.clo,
      ASHRAE_55_LIMITS.clo,
      "clo",
      "input",
      "clo",
      warnings,
    );

    values_to_return.met = met_valid;
    values_to_return.clo = clo_valid;
  }

  if (params.v_limited !== undefined) {
    const valid = _valid_range(
      params.v_limited,
      ASHRAE_55_LIMITS.v_limited,
      "v_limited",
      "input",
      "m/s",
      warnings,
    );
    values_to_return.v_limited = valid;
  }

  return Object.values(values_to_return);
}
