import { pmv_ppd, PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE } from "./pmv_ppd.ts";
import type { PmvPpdParams } from "./pmv_ppd.ts";
import {
  validateInputs,
  ASHRAE_55_LIMITS,
  Standard,
} from "../utilities/utilities.js";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// PmvPpdAshrae to <Model>Result, the name every converted model's result has.
/**
 * @typedef {Object} PmvPpdAshraeResult
 * @property {number} pmv - Predicted Mean Vote on the ASHRAE 55 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @property {string|number} tsv - Thermal Sensation Vote category, or NaN if pmv is NaN. Uses right-inclusive bins (pythermalcomfort#382).
 * @property {boolean|number} compliance - True if -0.5 < pmv < 0.5 (`PMV_COMPLIANCE_INTERVAL_ASHRAE`), read from the unrounded pmv; NaN when `limit_inputs` returns NaN for the inputs.
 * @property {import("./modelDocs.ts").ApplicabilityWarning[]} warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type PmvPpdAshraeResult = {
  pmv: number;
  ppd: number;
  tsv: string | number;
  compliance: boolean | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `pmv_ppd_ashrae`: upstream's keyword parameters, quantities
 * and switches alike, with upstream's defaults (ADR 0002), `standard` narrowed
 * to the one ASHRAE 55 version upstream accepts. Documented on the function's
 * `params`.
 */
export interface PmvPpdAshraeParams extends Omit<PmvPpdParams, "standard"> {
  standard?: typeof Standard.ashrae_55_2023;
}

/**
 * Model metadata for PMV / PPD (ASHRAE 55).
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * No `derived` row and no `pmv` applicability: ASHRAE 55 bounds neither
 * vapour pressure nor the PMV output, and `pmv_ppd` gates both under ISO 7730
 * only (the `pa` and `pmv` bounds of its ISO 7730 rules).
 * The airspeed limits that apply when the occupant cannot control the
 * airspeed depend on the call (operative temperature, met and clo), so they
 * have no fixed `Bound` here; a call that breaks one reports it in
 * `warnings` with a bound built for that call.
 *
 * @public
 */
export const PMV_PPD_ASHRAE_INFO: ModelInfo = deepFreeze({
  name: "pmv_ppd_ashrae",
  label: "PMV / PPD (ASHRAE 55)",
  description:
    "Predicted Mean Vote and Predicted Percentage Dissatisfied, with the ASHRAE 55 cooling effect of elevated air speed.",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: { unit: "m/s", applicability: ASHRAE_55_LIMITS.vr },
    met: { unit: "met", applicability: ASHRAE_55_LIMITS.met },
    clo: { unit: "clo", applicability: ASHRAE_55_LIMITS.clo },
    rh: { unit: "%" },
    wme: { unit: "met" },
  },
  outputs: {
    pmv: { unit: null },
    ppd: { unit: "%" },
    tsv: { unit: null, classifier: PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE },
    compliance: { unit: null },
  },
});

/**
 * Calculate PMV and PPD in accordance with ASHRAE 55.
 *
 * Delegates to the shared PMV module with the standard validated as `'55-2023'`.
 * The ASHRAE equation applies a cooling effect (via SET) before computing
 * PMV — this lowers the result compared to the raw ISO equation when
 * elevated air speed is present.
 *
 * Valid ASHRAE 55 input ranges (when `limit_inputs` is true):
 * - 10 < tdb [°C] < 40
 * - 10 < tr  [°C] < 40
 * -  0 < vr  [m/s] < 2
 * -  1 < met [met] < 4
 * -  0 < clo [clo] < 1.5
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry-bulb air temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.tr  - Mean radiant temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.vr  - Relative air speed [m/s] (or [fps] if units = 'IP')
 * @param {number} params.rh  - Relative humidity [%]
 * @param {number} params.met - Metabolic rate [met]
 * @param {number} params.clo - Clothing insulation [clo]
 * @param {number} [params.wme=0] - External work [met]
 * @param {'55-2023'} [params.standard='55-2023'] - Version of the ASHRAE 55 Standard; any other value throws
 * @param {'SI'|'IP'} [params.units='SI'] - Unit system
 * @param {boolean}   [params.limit_inputs=true] - Return NaN for out-of-range inputs
 * @param {boolean}   [params.airspeed_control=true] - Occupant controls airspeed
 * @param {boolean}   [params.round_output=true] - Round pmv to 2 decimal places and ppd to 1
 * @param {boolean}   [params.suppress_warnings=false] - Write nothing to the console when the cooling effect cannot be calculated and is assumed to be 0; the returned `warnings` are unaffected
 * @returns {PmvPpdAshraeResult} PMV and PPD values
 *
 * @example
 * const r = pmv_ppd_ashrae({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 * console.log(r.compliance); // true
 *
 * @public
 * @memberof models
 * @docname PMV/PPD (ASHRAE 55)
 */
// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const PMV_PPD_ASHRAE_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  // Upstream raises a ValueError for any `model=` but "55-2023"; the shared
  // PMV module would also accept an ISO 7730 standard and compute ISO's
  // equation.
  standard: { enum: [Standard.ashrae_55_2023] },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  airspeed_control: { type: "boolean" },
  round_output: { type: "boolean" },
  suppress_warnings: { type: "boolean" },
};

export function pmv_ppd_ashrae(params: PmvPpdAshraeParams): PmvPpdAshraeResult {
  // The quantities were positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  _check_params_object(params, "pmv_ppd_ashrae");
  const { tdb, tr, vr, rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  // suppress_warnings has no pythermalcomfort counterpart: it stands in for
  // Python's warnings filter, which JavaScript lacks (see cooling_effect).
  const {
    wme = 0,
    standard = Standard.ashrae_55_2023,
    units = "SI",
    limit_inputs = true,
    airspeed_control = true,
    round_output = true,
    suppress_warnings = false,
  } = params;
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard,
      units: units.toUpperCase(),
      limit_inputs,
      airspeed_control,
      round_output,
      suppress_warnings,
    },
    PMV_PPD_ASHRAE_SCHEMA,
  );
  // pmv_ppd returns compliance under ASHRAE 55, the one standard validated
  // above. The warnings rows it returns are filled whatever limit_inputs is,
  // where upstream warns only when it gates: a caller that shows an
  // out-of-range pmv can still say which bounds the inputs broke.
  return pmv_ppd({
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    standard,
    units,
    limit_inputs,
    airspeed_control,
    round_output,
    suppress_warnings,
  }) as PmvPpdAshraeResult;
}
