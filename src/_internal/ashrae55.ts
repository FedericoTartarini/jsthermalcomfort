import { t_o } from "../psychrometrics/t_o.js";
import { ASHRAE_55_LIMITS } from "../utilities/utilities.js";
import { _valid_range } from "./validation.ts";
import type { ApplicabilityWarning } from "../models/modelDocs.ts";

/**
 * The fixed airspeed bounds of the `airspeed_control` rules: `any` at every
 * operative temperature, `cool` when to <= 23 °C.
 */
const ASHRAE_55_AIRSPEED_NO_CONTROL = Object.freeze({
  any: Object.freeze({ max: 0.8 }),
  cool: Object.freeze({ max: 0.2 }),
});

/**
 * The quantities `_check_ashrae55_compliance` takes, in SI, keyed as
 * upstream's keyword arguments. `met` and `clo` go together, as upstream
 * checks both when `met` is given.
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
 * Upstream's `_check_ashrae55_compliance` (`pythermalcomfort/_internal/ashrae55.py`):
 * the ASHRAE 55-2023 Table 7.3.4 limits on `tdb`, `tr`, `v`, `met` and `clo`,
 * from `ASHRAE_55_LIMITS` by identity, and the §7.2.1.2 rules that apply when
 * the occupant cannot control the airspeed and wears little (clo < 0.7) while
 * barely active (met < 1.3):
 *
 * - v above 0.8 m/s, at any operative temperature;
 * - v above 50.49 - 4.4047 to + 0.096425 to² when 23 < to < 25.5 °C;
 * - v above 0.2 m/s when to <= 23 °C.
 *
 * Each broken limit is one row on `warnings` instead of a `UserWarning`. The
 * airspeed rows are keyed `v_param_name` (default `"v"`), as upstream names
 * the variable in its warning text. The operative-temperature bound depends on
 * the call, so it is built and frozen per call; the others are shared frozen
 * objects. `check_standard_compliance` keeps its own copy of these rules for
 * its strings, so a change to one belongs in both.
 *
 * The rows come in upstream's order: tdb, tr, v, the airspeed rules, then
 * met and clo. Upstream's `v_limited` branch is left out: no caller here
 * passes it.
 *
 * Private: not exported from the package root.
 *
 * @param {ApplicabilityWarning[]} warnings - the call's rows, appended to
 * @param {Ashrae55Params} params - the quantities to check, in SI
 */
export function _check_ashrae55_compliance(
  warnings: ApplicabilityWarning[],
  params: Ashrae55Params,
): void {
  const { tdb, tr, v, met, clo } = params;
  const { airspeed_control = true, v_param_name = "v" } = params;

  _valid_range(warnings, "tdb", "input", tdb, ASHRAE_55_LIMITS.tdb);
  _valid_range(warnings, "tr", "input", tr, ASHRAE_55_LIMITS.tr);
  if (v !== undefined) {
    _valid_range(warnings, v_param_name, "input", v, ASHRAE_55_LIMITS.vr);
  }

  if (
    !airspeed_control &&
    v !== undefined &&
    met !== undefined &&
    clo !== undefined &&
    clo < 0.7 &&
    met < 1.3
  ) {
    // Upper bounds only, and the operative-temperature one moves with the
    // call, so they are pushed as broken rather than through _valid_range.
    const pushAirspeedRow = (bound: Readonly<{ max: number }>) =>
      warnings.push({ key: v_param_name, role: "input", value: v, bound });
    const to = t_o(tdb, tr, v);
    const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;
    if (v > ASHRAE_55_AIRSPEED_NO_CONTROL.any.max)
      pushAirspeedRow(ASHRAE_55_AIRSPEED_NO_CONTROL.any);
    if (to > 23 && to < 25.5 && v > v_limit)
      pushAirspeedRow(Object.freeze({ max: v_limit }));
    if (to <= 23 && v > ASHRAE_55_AIRSPEED_NO_CONTROL.cool.max)
      pushAirspeedRow(ASHRAE_55_AIRSPEED_NO_CONTROL.cool);
  }

  // Upstream checks met and clo when met is given (`"met" in params`) and
  // then reads clo unguarded. Requiring both is the same for every caller,
  // which passes both or neither, and lets TypeScript narrow clo.
  if (met !== undefined && clo !== undefined) {
    _valid_range(warnings, "met", "input", met, ASHRAE_55_LIMITS.met);
    _valid_range(warnings, "clo", "input", clo, ASHRAE_55_LIMITS.clo);
  }
}
