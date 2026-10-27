import { operative_tmp } from "../environment/operative_tmp.ts";
import { deepFreeze } from "./modelDocs.ts";
import type { ApplicabilityWarning, Bound, ModelWarning } from "./modelDocs.ts";
import { _legacy_valid_range, _valid_range } from "./validation.ts";

// The counterpart of upstream's `_internal/ashrae55.py`. The old form the
// models not yet migrated call, `_legacy_check_ashrae55_compliance`, sits at
// the end of the file until the contract ticket removes it.

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
 * The fixed airspeed bounds of the §7.2.1.2 `airspeed_control` rules: `any`
 * at every operative temperature, `cool` when the operative temperature is at
 * or below 23 °C.
 */
export const ASHRAE_55_AIRSPEED_NO_CONTROL = deepFreeze({
  any: { max: 0.8 },
  cool: { max: 0.2 },
} as const satisfies Record<string, Bound>);

/** The keyword arguments `_check_ashrae55_compliance` takes. */
interface Ashrae55Kwargs {
  readonly tdb: number;
  readonly tr: number;
  readonly v?: number;
  readonly met?: number;
  readonly clo?: number;
  readonly v_limited?: number;
  readonly airspeed_control?: boolean;
  readonly v_param_name?: string;
}

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

  if (params.v !== undefined) {
    const v_valid = _valid_range(
      params.v,
      ASHRAE_55_LIMITS.v,
      v_param_name,
      "input",
      "m/s",
      warnings,
    );
    values_to_return.v = v_valid;
  }

  // Upstream reads v, met and clo here unguarded; every caller that turns
  // airspeed_control off passes all three.
  if (
    !params.airspeed_control &&
    params.v !== undefined &&
    params.met !== undefined &&
    params.clo !== undefined
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
    let v_valid = values_to_return.v ?? v;

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

  // Upstream checks clo whenever met is given; every caller passes both or
  // neither.
  if (params.met !== undefined && params.clo !== undefined) {
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

/**
 * The quantities `_legacy_check_ashrae55_compliance` takes, in SI, keyed as
 * upstream's keyword arguments.
 */
interface Ashrae55Params {
  tdb: number;
  tr: number;
  v?: number;
  met?: number;
  clo?: number;
  airspeed_control?: boolean;
  v_param_name?: string;
}

/**
 * The old form of {@link _check_ashrae55_compliance}, which the models not yet
 * migrated call: it pushes {@link ApplicabilityWarning} rows onto `warnings`,
 * in the same order and with the same bounds, and the caller's gate reads the
 * rows. `v_limited` is left out, as no caller passes it.
 *
 * @param warnings - the call's rows, appended to
 * @param params - the quantities to check, in SI
 */
export function _legacy_check_ashrae55_compliance(
  warnings: ApplicabilityWarning[],
  params: Ashrae55Params,
): void {
  const { tdb, tr, v, met, clo } = params;
  const { airspeed_control = true, v_param_name = "v" } = params;

  _legacy_valid_range(warnings, "tdb", "input", tdb, ASHRAE_55_LIMITS.tdb);
  _legacy_valid_range(warnings, "tr", "input", tr, ASHRAE_55_LIMITS.tr);
  if (v !== undefined) {
    _legacy_valid_range(warnings, v_param_name, "input", v, ASHRAE_55_LIMITS.v);
  }

  if (
    !airspeed_control &&
    v !== undefined &&
    met !== undefined &&
    clo !== undefined &&
    clo < 0.7 &&
    met < 1.3
  ) {
    const pushAirspeedRow = (bound: Readonly<{ max: number }>) =>
      warnings.push({ key: v_param_name, role: "input", value: v, bound });
    const to = operative_tmp(tdb, tr, v);
    const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;
    if (v > ASHRAE_55_AIRSPEED_NO_CONTROL.any.max)
      pushAirspeedRow(ASHRAE_55_AIRSPEED_NO_CONTROL.any);
    if (to > 23 && to < 25.5 && v > v_limit)
      pushAirspeedRow(Object.freeze({ max: v_limit }));
    if (to <= 23 && v > ASHRAE_55_AIRSPEED_NO_CONTROL.cool.max)
      pushAirspeedRow(ASHRAE_55_AIRSPEED_NO_CONTROL.cool);
  }

  if (met !== undefined && clo !== undefined) {
    _legacy_valid_range(warnings, "met", "input", met, ASHRAE_55_LIMITS.met);
    _legacy_valid_range(warnings, "clo", "input", clo, ASHRAE_55_LIMITS.clo);
  }
}
