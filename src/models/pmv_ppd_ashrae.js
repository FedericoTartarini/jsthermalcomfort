import { pmv_ppd } from "./pmv_ppd.js";
import { validateInputs } from "../utilities/utilities.js";

/**
 * @typedef {Object} PmvPpdAshrae
 * @property {number} pmv - Predicted Mean Vote on the ASHRAE 55 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @public
 */

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
 * @returns {PmvPpdAshrae} PMV and PPD values
 *
 * @example
 * const r = pmv_ppd_ashrae(25, 25, 0.1, 50, 1.2, 0.5);
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 *
 * @public
 * @memberof models
 * @docname PMV/PPD (ASHRAE 55)
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
    },
    PMV_PPD_ASHRAE_SCHEMA,
  );
  return pmv_ppd(tdb, tr, vr, rh, met, clo, wme, "ASHRAE", kwargs);
}
