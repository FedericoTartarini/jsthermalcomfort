import { pmv_ppd, PMV_THERMAL_SENSATION_VOTE_BINS_ISO } from "./pmv_ppd.ts";
import type { PmvPpdParams } from "./pmv_ppd.ts";
import {
  validateInputs,
  ISO_7730_LIMITS,
  Standard,
} from "../utilities/utilities.js";
import { deepFreeze } from "./modelDocs.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// PmvPpdIso to <Model>Result, the name every converted model's result has.
/**
 * @typedef {Object} PmvPpdIsoResult
 * @property {number} pmv - Predicted Mean Vote on the ISO 7730 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @property {string|number} tsv - Thermal Sensation Vote category, or NaN if pmv is NaN. Uses left-inclusive bins (pythermalcomfort#382).
 * @property {import("./modelDocs.ts").ApplicabilityWarning[]} warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type PmvPpdIsoResult = {
  pmv: number;
  ppd: number;
  tsv: string | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `pmv_ppd_iso`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002), `standard` narrowed to
 * the two ISO 7730 editions upstream accepts. `airspeed_control` and
 * `suppress_warnings` are left out, as upstream's `pmv_ppd_iso` has neither:
 * both only act under ASHRAE 55. Documented on the function's `params`.
 */
export interface PmvPpdIsoParams extends Omit<
  PmvPpdParams,
  "standard" | "airspeed_control" | "suppress_warnings"
> {
  standard?: typeof Standard.iso_7730_2005 | typeof Standard.iso_7730_2025;
}

/**
 * Model metadata for PMV / PPD (ISO 7730).
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * @public
 */
export const PMV_PPD_ISO_INFO: ModelInfo = deepFreeze({
  name: "pmv_ppd_iso",
  label: "PMV / PPD (ISO 7730)",
  description: "Predicted Mean Vote and Predicted Percentage Dissatisfied.",
  standards: [Standard.iso_7730_2025, Standard.iso_7730_2005],
  inputs: {
    tdb: { unit: "°C", applicability: ISO_7730_LIMITS.tdb },
    tr: { unit: "°C", applicability: ISO_7730_LIMITS.tr },
    vr: { unit: "m/s", applicability: ISO_7730_LIMITS.vr },
    met: { unit: "met", applicability: ISO_7730_LIMITS.met },
    clo: { unit: "clo", applicability: ISO_7730_LIMITS.clo },
    rh: { unit: "%" },
    wme: { unit: "met" },
  },
  outputs: {
    pmv: { unit: null, applicability: ISO_7730_LIMITS.pmv },
    ppd: { unit: "%" },
    tsv: { unit: null, classifier: PMV_THERMAL_SENSATION_VOTE_BINS_ISO },
  },
  derived: {
    // Computed from tdb and rh, not supplied by the caller. Exposed so a
    // front end can explain why a warm, humid combination that looks inside
    // every input limit still returns NaN.
    pa: { unit: "Pa", applicability: ISO_7730_LIMITS.pa },
  },
});

// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const PMV_PPD_ISO_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  // Upstream raises a ValueError for any `model=` but the two ISO 7730
  // editions; the shared PMV module would also accept ASHRAE 55 and compute
  // ASHRAE's equation.
  standard: { enum: [Standard.iso_7730_2005, Standard.iso_7730_2025] },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  round_output: { type: "boolean" },
};

/**
 * Calculate PMV and PPD in accordance with ISO 7730.
 *
 * Delegates to the shared PMV module with the standard validated as one of the
 * two ISO 7730 editions.
 * The ISO equation uses Fanger's original PMV formulation without the
 * ASHRAE cooling-effect adjustment.
 *
 * ISO 7730 applies stricter input limits than ASHRAE 55. When
 * `limit_inputs` is true (the default), inputs outside the following
 * ranges cause the function to return NaN:
 * - 10 < tdb [°C] < 30
 * - 10 < tr  [°C] < 40
 * -  0 < vr  [m/s] < 1
 * - 0.8 < met [met] < 4
 * -  0 < clo [clo] < 2
 * -  0 < pa  [Pa] < 2700
 * - -2 < PMV < 2 (result is clamped to NaN outside this range)
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 *    `airspeed_control` and `suppress_warnings` are omitted: they only apply to
 *    the ASHRAE standard.
 * @param {number} params.tdb - Dry-bulb air temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.tr  - Mean radiant temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.vr  - Relative air speed [m/s] (or [fps] if units = 'IP')
 * @param {number} params.rh  - Relative humidity [%]
 * @param {number} params.met - Metabolic rate [met]
 * @param {number} params.clo - Clothing insulation [clo]
 * @param {number} [params.wme=0] - External work [met]
 * @param {"7730-2005"|"7730-2025"} [params.standard="7730-2025"] - which edition of ISO 7730
 *    the calculation is being performed against. Accepts `"7730-2005"` or
 *    `"7730-2025"`.
 *
 *    **The two editions specify identical equations and applicability limits**,
 *    so this argument does not change the result. It exists so a caller can
 *    record which edition they are working to, and so the library can confirm
 *    it implements it — passing an unsupported edition throws rather than
 *    silently computing something else. It also gives a future divergence
 *    somewhere to live.
 *
 *    Mirrors the `model` argument on `pythermalcomfort`'s `pmv_ppd_iso`,
 *    including the default.
 * @param {'SI'|'IP'} [params.units='SI'] - Unit system
 * @param {boolean}   [params.limit_inputs=true] - Return NaN for out-of-range inputs
 * @param {boolean}   [params.round_output=true] - Round pmv to 2 decimal places and ppd to 1
 * @returns {PmvPpdIsoResult} PMV and PPD values
 *
 * @example
 * const r = pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 *
 * @public
 * @memberof models
 * @docname PMV/PPD (ISO 7730)
 */
export function pmv_ppd_iso(params: PmvPpdIsoParams): PmvPpdIsoResult {
  // The quantities and the standard were positional before v2 (ADR 0002); a
  // call still written that way fails here, naming the shape it should have.
  _check_params_object(params, "pmv_ppd_iso");
  const { tdb, tr, vr, rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const {
    wme = 0,
    standard = Standard.iso_7730_2025,
    units = "SI",
    limit_inputs = true,
    round_output = true,
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
      round_output,
    },
    PMV_PPD_ISO_SCHEMA,
  );
  // The keys are named rather than spread, so an ASHRAE-only switch passed
  // from untyped JavaScript never reaches the shared module.
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
    round_output,
  });
}
