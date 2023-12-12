import { pmv, pmv_array } from "./pmv.js";
import { round } from "../utilities/utilities.js";
/**
 * @typedef {Object} A_pmvKwargs
 * @property {'SI'|'IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @property { boolean } limit_inputs - Default is True. By default, if the inputs are outside the standard applicability
 *    limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
 *    the applicability limits of the model.
 *
 *    The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
 * @public
 */
/**
 * Returns Adaptive Predicted Mean Vote (aPMV) {@link #ref_25|[25]}.
 * This index was developed by Yao, R. et al. (2009). The model takes into account factors
 * such as culture, climate, social, psychological and behavioral adaptations, which have
 * an impact on the senses used to detect thermal comfort. This model uses an adaptive
 * coefficient (λ) representing the adaptive factors that affect the sense of thermal comfort.
 *
 * This is a version that supports scalar arguments.
 * @see {@link a_pmv_array} for a version that supports arrays.
 *
 * @public
 * @memberof models
 * @docname Adaptive Predicted Mean Vote (aPMV)
 *
 * @param {number} tdb - Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - Mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} vr - Relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 *   Note: vr is the relative air speed caused by body movement and not the air
 *   speed measured by the air speed sensor. The relative air speed is the sum of the
 *   average air speed measured by the sensor plus the activity-generated air speed
 *   (Vag). Where Vag is the activity-generated air speed caused by motion of
 *   individual body parts. vr can be calculated using the function v_relative in utilities.js.
 * @param {number} rh - Relative humidity, [%]
 * @param {number} met - Metabolic rate, [met]
 * @param {number} clo - Clothing insulation, [clo]
 *
 *   Note: The activity as well as the air speed modify the insulation characteristics
 *   of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 *   the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 *   for the effect of the body movement for met equal or higher than 1.2 met using
 *   the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 *   can be calculated using the function clo_dynamic in utilities.js.
 * @param {number} a_coefficient - Adaptive coefficient
 * @param {number} [wme=0] - External work
 * @param {A_pmvKwargs} kwargs - additional arguments
 *
 * @returns {number} pmv - Predicted Mean Vote
 *
 * @example
 * const tdb = 24,
 * const tr = 30,
 * const vr = 0.22,
 * const rh = 50,
 * const met = 1.4,
 * const clo = 0.5,
 * const a_coefficient = 0.293,
 * const wme = undefined,
 *
 * const result = a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme);
 * console.log(result) //output 0.48
 */
export function a_pmv(tdb, tr, vr, rh, met, clo, a_coefficient, wme = 0, kwargs = {}) {
    const default_kwargs = {
        units: "SI",
        limit_inputs: true,
    };
    kwargs = Object.assign(default_kwargs, kwargs);
    const _pmv = pmv(tdb, tr, vr, rh, met, clo, wme, "ISO", kwargs);
    return round(_pmv / (1 + a_coefficient * _pmv), 2);
}
/**
 * Returns Adaptive Predicted Mean Vote (aPMV) {@link #ref_25|[25]}.
 * This index was developed by Yao, R. et al. (2009). The model takes into account factors
 * such as culture, climate, social, psychological and behavioral adaptations, which have
 * an impact on the senses used to detect thermal comfort. This model uses an adaptive
 * coefficient (λ) representing the adaptive factors that affect the sense of thermal comfort.
 *
 * This is a version that supports arrays.
 * @see {@link a_pmv} for a version that supports scalar arguments.
 *
 * @public
 * @memberof models
 * @docname Adaptive Predicted Mean Vote (aPMV) (array version)
 *
 * @param {number[]} tdb - Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - Mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} vr - Relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 *   Note: vr is the relative air speed caused by body movement and not the air
 *   speed measured by the air speed sensor. The relative air speed is the sum of the
 *   average air speed measured by the sensor plus the activity-generated air speed
 *   (Vag). Where Vag is the activity-generated air speed caused by motion of
 *   individual body parts. vr can be calculated using the function v_relative_array in utilities.js.
 * @param {number[]} rh - Relative humidity, [%]
 * @param {number[]} met - Metabolic rate, [met]
 * @param {number[]} clo - Clothing insulation, [clo]
 *
 *   Note: The activity as well as the air speed modify the insulation characteristics
 *   of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 *   the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 *   for the effect of the body movement for met equal or higher than 1.2 met using
 *   the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 *   can be calculated using the function clo_dynamic_array in utilities.js.
 * @param {number[]} a_coefficient - Adaptive coefficient
 * @param {number[]} wme - External work, default is array of 0
 * @param {A_pmvKwargs} kwargs - additional arguments
 *
 * @returns {number[]} pmv - Predicted Mean Vote
 *
 * @example
 * const tdb = [24, 30],
 * const tr = [30, 30],
 * const vr = [0.22, 0.22],
 * const rh = [50, 50],
 * const met = [1.4, 1.4],
 * const clo = [0.5, 0.5],
 * const a_coefficient = [0.293, 0.293],
 * const wme = undefined,
 *
 * const result = a_pmv_array(tdb, tr, vr, rh, met, clo, a_coefficient, wme);
 * console.log(result) //output [0.48, 1.09]
 */
export function a_pmv_array(tdb, tr, vr, rh, met, clo, a_coefficient, wme, kwargs = {}) {
    const default_kwargs = {
        units: "SI",
        limit_inputs: true,
    };
    kwargs = Object.assign(default_kwargs, kwargs);
    const _pmv = pmv_array(tdb, tr, vr, rh, met, clo, wme, "ISO", kwargs);
    return _pmv.map((_pmvValue, i) => round(_pmvValue / (1 + a_coefficient[i] * _pmvValue), 2));
}
