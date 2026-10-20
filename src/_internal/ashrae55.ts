import { t_o } from "../psychrometrics/t_o.js";
import { ASHRAE_55_LIMITS, Standard } from "../utilities/utilities.js";
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
 * The bound of upstream's `v_limited` check, 0 to 0.2 m/s inclusive
 * (`ashrae55.py:100-102`): the relative air speed below which the ankle-draft
 * equation applies. Upstream checks it only for a caller that passes
 * `v_limited`, so it is kept apart from `ASHRAE_55_LIMITS`.
 * Frozen, and referenced by identity from the model info of a model that
 * checks it. Not exported from the package root.
 */
export const ASHRAE_55_V_LIMITED = Object.freeze({ min: 0, max: 0.2 });

/** An air speed the helper checks, in m/s, with the key its rows carry. */
interface Ashrae55AirSpeed {
  value: number;
  key: string;
}

/**
 * The quantities `_check_ashrae55_compliance` takes, in SI, keyed as
 * upstream's keyword arguments, except the air speed: upstream's `v` and
 * `v_param_name` are split into `v_range` and `v_no_control`, each with its
 * row key. `met` and `clo` go together, as upstream checks both when `met`
 * is given.
 */
interface Ashrae55Params {
  tdb: number;
  tr: number;
  v_range?: Ashrae55AirSpeed;
  v_no_control?: Ashrae55AirSpeed;
  met?: number;
  clo?: number;
  airspeed_control?: boolean;
  v_limited?: Ashrae55AirSpeed;
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
 * Here the rules apply at clo <= 0.7 and met <= 1.3, and to is weighted as
 * ASHRAE 55 weighs it, where upstream weighs it by ISO 7726: a correction
 * under ADR 0004, given at the branch.
 *
 * Upstream reads one air speed, `v`, for the Table 7.3.4 range and for the
 * no-control rules, and names it `v_param_name` in the warning text of both.
 * Here they are two inputs, each with its own row key: the 0-2 m/s range row
 * reads `v_range`, and the no-control rules read `v_no_control`, both for the
 * three limits and for the operative temperature that chooses between them.
 * They are apart for the correction ADR 0004 records for `pmv_ppd_ashrae`,
 * which checks the no-control rules on the average air speed `v` and leaves
 * the range row on the relative air speed `vr`. Neither defaults to the
 * other: a caller with one speed, as `adaptive_ashrae`, passes it as both.
 *
 * `v_limited` is upstream's second check of an air speed, against
 * `ASHRAE_55_V_LIMITED`. Upstream's warning names it `'v_limited'`, the name
 * of the check; here its row carries the key of the speed checked, as the
 * range row does, so a caller that checks `vr` twice gets two `vr` rows, told
 * apart by their bounds.
 *
 * Each broken limit is one row on `warnings` instead of a `UserWarning`. The
 * operative-temperature bound depends on the call, so it is built and frozen
 * per call; the others are shared frozen objects. `check_standard_compliance`
 * keeps its own copy of these rules for its strings, as upstream's rules
 * stood: it exempts at exactly 0.7 clo or 1.3 met and weighs to by ISO 7726.
 *
 * The rows come in upstream's order: tdb, tr, the range speed, the airspeed
 * rules, met and clo, then `v_limited`.
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
  const { tdb, tr, v_range, v_no_control, met, clo, v_limited } = params;
  const { airspeed_control = true } = params;

  _valid_range(warnings, "tdb", "input", tdb, ASHRAE_55_LIMITS.tdb);
  _valid_range(warnings, "tr", "input", tr, ASHRAE_55_LIMITS.tr);
  if (v_range !== undefined) {
    const { key, value } = v_range;
    _valid_range(warnings, key, "input", value, ASHRAE_55_LIMITS.vr);
  }

  if (
    !airspeed_control &&
    v_no_control !== undefined &&
    met !== undefined &&
    clo !== undefined &&
    !(clo > 0.7 || met > 1.3)
  ) {
    const { key, value: v } = v_no_control;
    // Upper bounds only, and the operative-temperature one moves with the
    // call, so they are pushed as broken rather than through _valid_range.
    const pushAirspeedRow = (bound: Readonly<{ max: number }>) =>
      warnings.push({ key, role: "input", value: v, bound });
    // A correction of what upstream returns, under ADR 0004, raised upstream as
    // pythermalcomfort #487, in three sub-rules: the limits apply at exactly
    // 0.7 clo and 1.3 met, exempt only above either (ASHRAE 55-2023 §5.3.4.2);
    // they read the speed the caller passes as v_no_control, which
    // pmv_ppd_ashrae fills with the average air speed v (§3); and the operative
    // temperature that chooses between them weighs tdb and tr by that speed as
    // ASHRAE 55 does (Appendix A), not by ISO 7726. The deployed CBE tool
    // checks its air speed input `d.vel` (d47d22e) and exempts only above 0.7
    // clo or 1.3 met (be91523); upstream exempts at both values, passes vr and
    // weighs by ISO 7726 since d6786f3, which closed its #32. Two sub-rules
    // differ from §5.3.4.2 and are left, as the consumer's decision 79 leaves
    // them: the exemption covers all three limits, and the 0.8 m/s limit caps
    // the curve where the curve exceeds it.
    const to = t_o(tdb, tr, v, Standard.ashrae_55_2023);
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

  if (v_limited !== undefined) {
    const { key, value } = v_limited;
    _valid_range(warnings, key, "input", value, ASHRAE_55_V_LIMITED);
  }
}
