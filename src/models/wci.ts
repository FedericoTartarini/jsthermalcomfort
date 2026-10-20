import { round, validateInputs } from "../utilities/utilities.js";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// The result of wc, `{ wci }`, typed as every converted model's result is
// named, <Model>Result. A type alias, as a JSDoc typedef emits, so the result
// stays assignable to Record<string, unknown>. The field and its text are
// upstream's WCI (pythermalcomfort/classes_return.py:736-745 at v4.6.2).
/**
 * @typedef {Object} WciResult
 * @property {number} wci - Wind Chill Index, [W/m^2].
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke; always empty, as upstream bounds nothing. See `ApplicabilityWarning`.
 * @public
 */
export type WciResult = {
  wci: number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `wci`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface WciParams {
  tdb: number;
  v: number;
  round_output?: boolean;
}

/**
 * Model metadata for the wind chill index.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `standards` is empty: upstream follows the ASHRAE 2017 Handbook
 * Fundamentals, chapter 9 (wci.py:14 at v4.6.2), which no `Standard` member
 * names. Neither input has an applicability: upstream bounds nothing
 * (wci.py:59-76), so there is no `_LIMITS`, no `limit_inputs`, as upstream
 * has none, and the `warnings` rows are always empty. They are returned all
 * the same, as every main model returns them.
 *
 * @public
 */
export const WCI_INFO: ModelInfo = deepFreeze({
  name: "wci",
  label: "Wind Chill Index (WCI)",
  description:
    "Rate of heat loss by radiation and convection from a cylinder at a surface temperature of 33 °C, as a function of the air temperature and the wind speed (Siple and Passel 1945).",
  standards: [],
  inputs: {
    tdb: { unit: "°C" },
    v: { unit: "m/s" },
  },
  outputs: {
    wci: { unit: "W/m²" },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three).
// Upstream returns NaN or an infinity for it: wci(tdb=nan, v=0.1) is nan and
// wci(tdb=-inf, v=0.1) is inf. A boolean quantity, which upstream reads as 0
// or 1 (wci(tdb=True, v=0.1) is 502.9), and a null one throw a TypeError too:
// quantities are numbers (ADR 0005). round_output is validated, as upstream
// gives it to WCIInputs (wci.py:59-63), which raises a TypeError for a
// non-boolean (classes_input.py:79, :123-129).
const WCI_SCHEMA = {
  tdb: { type: "number" },
  v: { type: "number" },
  round_output: { type: "boolean" },
};

// The docstring's list example (wci.py:54-55 at v4.6.2) is written as one
// call per element, as quantities are numbers (ADR 0005).
/**
 * Calculates the Wind Chill Index (WCI) in accordance with the ASHRAE 2017 Handbook Fundamentals - Chapter 9 {@link #ref_18|[18]}.
 *
 * The wind chill index (WCI) is an empirical index based on cooling measurements taken on a cylindrical flask partially
 * filled with water in Antarctica (Siple and Passel 1945). For a surface temperature of 33°C, the index describes the
 * rate of heat loss from the cylinder via radiation and convection as a function of ambient temperature and wind velocity.
 *
 * This formulation has been met with some valid criticism. WCI is unlikely to be an accurate measure of heat loss from
 * exposed flesh, which differs from plastic in terms of curvature, roughness, and radiation exchange qualities, and is
 * always below 33°C in a cold environment. Furthermore, the equation’s values peak at 90 km/h and then decline as velocity
 * increases. Nonetheless, this score reliably represents the combined effects of temperature and wind on subjective discomfort
 * for velocities below 80 km/h {@link #ref_18|[18]}.
 *
 * @public
 * @memberof models
 * @docname Wind chill index
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, [°C].
 * @param {number} params.v - Wind speed 10m above ground level, [m/s].
 * @param {boolean} [params.round_output=true] - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns {WciResult} object with the Wind Chill Index
 *
 * @example
 * const result = wci({ tdb: -5, v: 5.5 });
 * console.log(result.wci); // 1255.2
 *
 * const results = [wci({ tdb: -5, v: 5.5 }), wci({ tdb: -10, v: 10 })];
 * console.log(results.map((r) => r.wci)); // [1255.2, 1603.9]
 */
export function wci(params: WciParams): WciResult {
  // tdb and v were positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as the old round option (ADR 0008).
  _check_params_object(params, "wci", WCI_SCHEMA);
  const { tdb, v } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const { round_output = true } = params;
  validateInputs({ tdb, v, round_output }, WCI_SCHEMA);

  // ADR 0009: upstream's v**0.5 runs on np.asarray(v). numpy computes a
  // float array's power 0.5 as sqrt (fast_scalar_power,
  // numpy/_core/src/multiarray/number.c:366-367 at numpy 2.5.4), and an
  // integer array's through np.power (:381-384, :409-410), which gave
  // sqrt's value for every integer from 0 to 1,000,000 on macOS arm64; so
  // Math.sqrt.
  let _wci = (10.45 + 10 * Math.sqrt(v) - v) * (33 - tdb);

  // the factor 1.163 is used to convert to W/m^2
  _wci = _wci * 1.163;

  if (round_output) {
    // np.around(_wci, 1) (wci.py:73-74): round is half to even.
    _wci = round(_wci, 1);
  }

  return { wci: _wci, warnings: [] };
}
