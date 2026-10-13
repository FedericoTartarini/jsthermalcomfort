import {
  round,
  units_converter,
  validateInputs,
} from "../utilities/utilities.js";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type { ModelInfo } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so documentation.js
// keeps naming it from the typedef line.
/**
 * @typedef {object} CloToutResult
 * @property {number} clo_tout - Representative clothing insulation Icl, [clo]
 * @public
 */
export type CloToutResult = {
  clo_tout: number;
};

/**
 * The params of `clo_tout`: upstream's keyword parameters with upstream's
 * default (ADR 0002). Documented on the function's `params`.
 *
 * No `round_output`: upstream has none and always rounds to two decimals, so
 * a switch would be a parameter upstream's callers do not have.
 */
export interface CloToutParams {
  tout: number;
  units?: "SI" | "IP";
}

/**
 * Model metadata for the clothing prediction from the outdoor air
 * temperature at 06:00.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `tout` has no applicability: upstream bounds nothing, and the formula
 * saturates at 1 clo below -5 °C and at 0.46 clo from 26 °C. With no gate
 * there is no `limit_inputs`, as upstream has none, and nothing to report,
 * so the result has no `warnings` field.
 *
 * @public
 */
export const CLO_TOUT_INFO: ModelInfo = deepFreeze({
  name: "clo_tout",
  label: "Clothing prediction",
  description:
    "Representative clothing insulation predicted from the outdoor air temperature at 06:00 (Schiavon and Lee 2013).",
  standards: [],
  inputs: {
    tout: { unit: "°C" },
  },
  outputs: {
    clo_tout: { unit: "clo" },
  },
});

// The Note departs from upstream's docstring, which says ASHRAE 55 2020
// accepts "this equation in mechanically conditioned buildings": the item
// Addendum f to 55-2020 prints names Figure 5-1 and says nothing about
// mechanically conditioned buildings, and the figure itself was not seen.
/**
 * Representative clothing insulation Icl as a function of outdoor air
 * temperature at 06:00 a.m {@link #ref_4|[4]}.
 *
 * Note: ASHRAE 55-2020 {@link #ref_1|[1]}, as revised by its Addendum f (2021), permits using
 * its Figure 5-1 to determine the clothing insulation Icl of a representative
 * occupant for a day as a function of the outdoor air temperature at
 * 06:00 a.m. (Section 5.2.2.2 (f)).
 *
 * @public
 * @memberof models
 * @docname Clothing prediction
 *
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tout - outdoor air temperature at 06:00 a.m., default in
 * [°C] in [°F] if `units` = 'IP'
 * @param {("IP" | "SI")} [params.units="SI"] - select the SI (International System of Units)
 * or the IP (Imperial Units) system.
 *
 * @returns {CloToutResult} set containing results for the model
 */
// A non-finite number throws a TypeError here (ADR 0001, reason three).
// Upstream returns a number for it: 0.46 for NaN and +Infinity, 1 for
// -Infinity, since NaN fails every comparison in its np.where chain.
const CLO_TOUT_SCHEMA = {
  tout: { type: "number" },
  units: { enum: ["SI", "IP"] },
};

export function clo_tout(params: CloToutParams): CloToutResult {
  // tout and units were positional before v2 (ADR 0002); a call still
  // written that way fails here, naming the shape it should have.
  _check_params_object(params, "clo_tout");
  // Destructuring defaults also apply to a units passed as undefined.
  const { tout, units = "SI" } = params;
  validateInputs({ tout, units: units.toUpperCase() }, CLO_TOUT_SCHEMA);
  const ip = units.toUpperCase() === "IP";
  const t = ip ? units_converter({ tmp: tout }).tmp : tout;

  let clo = t < 26 ? 10 ** (-0.1635 - 0.0066 * t) : 0.46;
  clo = t < 5 ? 0.818 - 0.0364 * t : clo;
  clo = t < -5 ? 1 : clo;
  clo = round(clo, 2);

  return { clo_tout: clo };
}
