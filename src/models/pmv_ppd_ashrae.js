import { validateInputs } from "../utilities/utilities.js";
import { attachModelDocs } from "./modelDocs.js";
import { pmv_ppd } from "./pmv_ppd.js";
import { tsv_ashrae } from "./pmv_tsv.js";

/**
 * Open interval used for ASHRAE 55 PMV compliance (`-limit < PMV < limit`).
 * Matches pythermalcomfort `pmv_ppd_ashrae` `compliance`.
 *
 * @typedef {object} ComplianceBounds
 * @property {number} min
 * @property {number} max
 * @property {boolean} open
 */

/**
 * @typedef {Object} PmvPpdAshrae
 * @property {number} pmv - Predicted Mean Vote on the ASHRAE 55 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @property {string|number} tsv - Thermal sensation vote label, or NaN
 * @property {boolean|number} compliance - True when -0.5 < PMV < 0.5, or NaN
 * @public
 */

const PMV_COMPLIANCE_LIMIT = 0.5;

/** @type {ComplianceBounds} */
const ASHRAE_COMPLIANCE_BOUNDS = {
  min: -PMV_COMPLIANCE_LIMIT,
  max: PMV_COMPLIANCE_LIMIT,
  open: true,
};

/**
 * ASHRAE 55 PMV compliance: `-limit < pmv < limit`.
 * Non-finite PMV returns NaN (same as pythermalcomfort when inputs are invalid).
 *
 * @param {number} pmv
 * @returns {boolean|number}
 * @property {ComplianceBounds} bounds
 */
function compliance_ashrae(pmv) {
  if (!Number.isFinite(pmv)) return NaN;
  return pmv > -PMV_COMPLIANCE_LIMIT && pmv < PMV_COMPLIANCE_LIMIT;
}

compliance_ashrae.bounds = ASHRAE_COMPLIANCE_BOUNDS;

/**
 * Calculate PMV and PPD in accordance with ASHRAE 55.
 *
 * Delegates to {@link pmv_ppd} with the standard fixed to `'ASHRAE'`.
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
 * @public
 * @memberof models
 * @docname PMV/PPD (ASHRAE 55)
 *
 * @property {string} label - Display name (`@docname`)
 * @property {string} description - Leading JSDoc summary
 * @property {ClassifierFn} tsv - Thermal-sensation classifier (`tsv.bins`)
 * @property {function(number): (boolean|number)} compliance - ASHRAE 55 compliance; `compliance.bounds` is the open ±0.5 interval
 * @property {number} COMPLIANCE_LIMIT - Absolute PMV magnitude of `compliance.bounds.max`
 *
 * @param {number} tdb - Dry-bulb air temperature [°C] (or [°F] if units = 'IP')
 * @param {number} tr  - Mean radiant temperature [°C] (or [°F] if units = 'IP')
 * @param {number} vr  - Relative air speed [m/s] (or [fps] if units = 'IP')
 * @param {number} rh  - Relative humidity [%]
 * @param {number} met - Metabolic rate [met]
 * @param {number} clo - Clothing insulation [clo]
 * @param {number} [wme=0] - External work [met]
 * @param {Object} [kwargs={}] - Optional overrides
 * @param {'SI'|'IP'} [kwargs.units='SI'] - Unit system
 * @param {boolean}   [kwargs.limit_inputs=true] - Return NaN for out-of-range inputs
 * @param {boolean}   [kwargs.airspeed_control=true] - Occupant controls airspeed
 * @param {boolean}   [kwargs.round_output=true] - Round pmv to 2 decimal places and ppd to 1
 * @returns {PmvPpdAshrae} PMV, PPD, TSV, and ASHRAE compliance
 *
 * @example
 * const r = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 * console.log(r.tsv); // "Neutral"
 * console.log(r.compliance); // true
 */
const PMV_PPD_ASHRAE_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"], required: false },
  limit_inputs: { type: "boolean", required: false },
  airspeed_control: { type: "boolean", required: false },
  round_output: { type: "boolean", required: false },
};

export function pmv_ppd_ashrae(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme = 0,
  kwargs = {},
) {
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      units: kwargs.units?.toUpperCase(),
      limit_inputs: kwargs.limit_inputs,
      airspeed_control: kwargs.airspeed_control,
      round_output: kwargs.round_output,
    },
    PMV_PPD_ASHRAE_SCHEMA,
  );
  const result = pmv_ppd(tdb, tr, vr, rh, met, clo, wme, "ASHRAE", kwargs);
  return {
    ...result,
    tsv: tsv_ashrae(result.pmv),
    compliance: compliance_ashrae(result.pmv),
  };
}

attachModelDocs(
  pmv_ppd_ashrae,
  "PMV/PPD (ASHRAE 55)",
  "Calculate PMV and PPD in accordance with ASHRAE 55.",
);
pmv_ppd_ashrae.tsv = tsv_ashrae;
pmv_ppd_ashrae.compliance = compliance_ashrae;
pmv_ppd_ashrae.COMPLIANCE_LIMIT = ASHRAE_COMPLIANCE_BOUNDS.max;
