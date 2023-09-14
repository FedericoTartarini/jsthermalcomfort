import { round } from "../utilities/utilities";

/**
 * @typedef {Object} VerTmpGradReturnType - a result set containing the predicted precentage of dissatisfied and the acceptability
 * @property {number} ppd_vg – Predicted Percentage of Dissatisfied occupants with vertical temperature gradient, [%]
 * @property {boolean} acceptability – The ASHRAE 55 2020 standard defines that the value of air speed at the ankle level 
 * is acceptable if PPD_ad is lower or equal than 5 %
 * @public
 */

/**
 * Calculates the percentage of thermally dissatisfied people with a vertical temperature gradient between feet and head [1]. 
 * This equation is only applicable for vr < 0.2 m/s (40 fps).
 *
 * @public
 * @memberof models
 * @docname Vertical air temperature gradient
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if "units" = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} vr Relative air speed, default in [m/s] in [fps] if "units" = "IP"
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} vertical_tmp_grad Vertical temperature gradient between the feet and the head, default in [°C/m] in [°F/ft] if units = ‘IP’
 * @param {"SI" | "IP"} units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} Heat Index, default in [°C] in [°F] if `units` = 'IP'.
 *
 * @example
 * const hi = vertical_tmp_grad_ppd(25, 25, 0.1, 50, 1.2, 0.5, 7); // returns {'ppd_vg': 12.6, 'acceptability': false}
 *
 * @category Thermophysiological models
 */
export function vertical_tmp_grad_ppd(tdb, tr, vr, rh, met, clo, vertical_tmp_grad, units) {

}
