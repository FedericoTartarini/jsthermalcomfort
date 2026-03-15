import { pmv_ppd } from "./pmv_ppd.js";

/**
 * @typedef {Object} PmvPpdIso
 * @property {number} pmv - Predicted Mean Vote on the ISO 7730 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @public
 */

/**
 * Calculate PMV and PPD in accordance with ISO 7730.
 *
 * Delegates to {@link pmv_ppd} with the standard fixed to `'ISO'`.
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
 * - -2 < PMV < 2 (result is clamped to NaN outside this range)
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
 * @returns {PmvPpdIso} PMV and PPD values
 *
 * @example
 * const r = pmv_ppd_iso(25, 25, 0.1, 50, 1.2, 0.5);
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 *
 * @public
 * @memberof models
 * @docname PMV/PPD (ISO 7730)
 */
export function pmv_ppd_iso(tdb, tr, vr, rh, met, clo, wme = 0, kwargs = {}) {
  return pmv_ppd(tdb, tr, vr, rh, met, clo, wme, "ISO", kwargs);
}
