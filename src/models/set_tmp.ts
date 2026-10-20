import { two_nodes_gagge } from "./two_nodes_gagge.ts";
import { round, validateInputs } from "../utilities/utilities.js";
import { _check_params_object } from "../_internal/validation.ts";
import { _check_ashrae55_compliance } from "../_internal/ashrae55.ts";
import type { ApplicabilityWarning } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>.
/**
 * @typedef {Object} SetTmpResult
 * @property {number} set - Standard effective temperature, [°C].
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type SetTmpResult = {
  set: number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `set_tmp`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface SetTmpParams {
  tdb: number;
  tr: number;
  v: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  body_surface_area?: number;
  p_atm?: number;
  // ADR 0007: upstream's lowercase spellings. Untyped JavaScript may pass
  // them in any case, as upstream accepts.
  position?: "sitting" | "standing" | "standing, forced convection";
  limit_inputs?: boolean;
  round_output?: boolean;
  calculate_ce?: boolean;
}

// The JSDoc below follows upstream's docstring
// (pythermalcomfort/models/set_tmp.py:36-72 at v4.6.2) where the previous one
// differed from it: met and wme are in [met], not [W/(m2)]; the "in [°F] /
// [ft2] / [atm] if units = 'IP'" clauses are gone, as this function has no
// `units` (ADR 0001 as amended); limit_inputs lists the limits and
// round_output takes upstream's text. The result's set is a number, not "in
// array", as upstream's SET documents it (classes_return.py:473-474).
//
// The limits are given as inclusive, where upstream's docstring writes them
// strict ("10 < tdb [°C] < 40", set_tmp.py:69-70): its _valid_range checks
// "Inclusive lower and upper bounds" (_internal/validation.py:22), and so
// does this one (ADR 0013).
/**
 * Calculates the Standard Effective Temperature (SET). The SET is the
 * temperature of a hypothetical isothermal environment at 50% (rh),
 * <0.1 m/s (20 fpm) average air speed (v), and tr = tdb, in which the
 * total heat loss from the skin of an imaginary occupant wearing
 * clothing, standardized for the activity concerned is the same as
 * that from a person in the actual environment with actual clothing
 * and activity level {@link #ref_10|[10]}.
 * @public
 * @memberof models
 * @docname Standard Effective Temperature (SET)
 *
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb Dry bulb air temperature, [°C].
 * @param {number} params.tr Mean radiant temperature, [°C].
 * @param {number} params.v Air speed, [m/s].
 * @param {number} params.rh Relative humidity, [%].
 * @param {number} params.met Metabolic rate, [met].
 * @param {number} params.clo Clothing insulation, [clo].
 * @param {number} [params.wme=0] External work, [met]. Defaults to 0.
 * @param {number} [params.body_surface_area=1.8258] Body surface area, default value 1.8258 [m2].
 * @param {number} [params.p_atm=101325] Atmospheric pressure, default value 101325 [Pa].
 * @param {"sitting" | "standing" | "standing, forced convection"} [params.position="standing"] Select either "sitting" or "standing". Defaults to "standing".
 * @param {boolean} [params.limit_inputs=true] If True, limits the inputs to the standard applicability limits. Defaults to True.
 * By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False returns values regardless of the input values.
 * The limits are 10 ≤ tdb [°C] ≤ 40, 10 ≤ tr [°C] ≤ 40,
 * 0 ≤ v [m/s] ≤ 2, 1 ≤ met [met] ≤ 4, and 0 ≤ clo [clo] ≤ 1.5.
 * @param {boolean} [params.round_output=true] If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param {boolean} [params.calculate_ce=false] select if SET is used to calculate Cooling Effect
 * @returns {SetTmpResult} set containing results for the model
 *
 * @example
 * const set = set_tmp({ tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 }); // returns {set: 24.3, warnings: []}
 */
// A non-finite number throws a TypeError here, where upstream raises
// StopIteration for most and returns NaN for a NaN v (ADR 0001, reason
// three). position is declared here and checked by two_nodes_gagge, with
// upstream's message, as upstream checks it in both SETInputs and
// GaggeTwoNodesInputs. round_output and calculate_ce are declared but not
// validated: upstream does not give them to SETInputs (set_tmp.py:101-113)
// and reads them for their truth value, `if round_output:` (:153) and
// two_nodes_gagge's `if calculate_ce:`. So they are read with JavaScript's
// truth value, which differs from Python's on three values (ADR 0001): NaN is
// true in Python and false here, and an empty array or object is false in
// Python and true here.
const SET_TMP_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  body_surface_area: { type: "number" },
  p_atm: { type: "number" },
  position: {},
  limit_inputs: { type: "boolean" },
  round_output: {},
  calculate_ce: {},
};

export function set_tmp(params: SetTmpParams): SetTmpResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as the removed units (ADR 0008).
  _check_params_object(params, "set_tmp", SET_TMP_SCHEMA);
  const { tdb, tr, v, rh, met, clo } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const {
    wme = 0,
    body_surface_area = 1.8258,
    p_atm = 101325,
    position = "standing",
    limit_inputs = true,
    round_output = true,
    calculate_ce = false,
  } = params;
  validateInputs(
    {
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      limit_inputs,
    },
    SET_TMP_SCHEMA,
  );

  // With calculate_ce, two_nodes_gagge computes standing whatever position
  // is, as upstream's does (two_nodes_gagge.py:130-143).
  let set = two_nodes_gagge({
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atm,
    position,
    calculate_ce,
    round_output: false,
  }).set;

  // The rows are the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). Upstream checks only under
  // limit_inputs; the rows are built on every call, so with the gate off they
  // say what the number was computed despite. The gate reads the rows.
  // Upstream passes no airspeed_control, so the no-control rules never apply.
  const warnings: ApplicabilityWarning[] = [];
  _check_ashrae55_compliance(warnings, {
    tdb,
    tr,
    v_range: { value: v, key: "v" },
    met,
    clo,
  });
  if (limit_inputs && warnings.length > 0) set = NaN;

  // np.around(set_array, 1) (set_tmp.py:153-154): round is half to even.
  if (round_output) set = round(set, 1);

  return { set, warnings };
}
