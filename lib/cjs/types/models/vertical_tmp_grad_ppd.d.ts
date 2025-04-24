/**
 * @typedef {Object} VerTmpGradReturnType - a result set containing the predicted precentage of dissatisfied and the acceptability
 * @property {number} ppd_vg Predicted Percentage of Dissatisfied occupants with vertical temperature gradient, [%]
 * @property {boolean} acceptability The ASHRAE 55 2020 standard defines that the value of air speed at the ankle level
 * is acceptable if PPD_ad is lower or equal than 5 %
 * @public
 */
/**
 * Calculates the percentage of thermally dissatisfied people with a vertical temperature gradient between feet and head {@link #ref_1|[1]} .
 * This equation is only applicable for vr < 0.2 m/s (40 fps).
 *
 * @public
 * @memberof models
 * @docname Vertical air temperature gradient
 *
 * @param {number} tdb dry bulb air temperature, default in [°C] in [°F] if "units" = 'IP'.
 *
 * Note: The air temperature is the average value over two heights: 0.6 m (24 in.) and 1.1 m (43 in.) for seated occupants and 1.1 m
 * (43 in.) and 1.7 m (67 in.) for standing occupants.
 * @param {number} tr mean radiant temperature, default in [°C] in [°F] if "units" = 'IP'.
 * @param {number} vr relative air speed, default in [m/s] in [fps] if "units" = "IP"
 *
 * Note: vr is the relative air speed caused by body movement and not the air speed measured by the air speed sensor.
 * The relative air speed is the sum of the average air speed measured by the sensor plus the activity-generated air speed (Vag).
 * Where Vag is the activity-generated air speed caused by motion of individual body parts. vr can be calculated using the function
 * pythermalcomfort.utilities.v_relative().
 * @param {number} rh relative humidity, [%].
 * @param {number} met metabolic rate, [met]
 * @param {number} clo clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics of the clothing and the adjacent air layer.
 * Consequently the ISO 7730 states that the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects for the effect of
 * the body movement for met equal or higher than 1.2 met using the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation,
 * clo, can be calculated using the function pythermalcomfort.utilities.clo_dynamic().
 * @param {number} vertical_tmp_grad vertical temperature gradient between the feet and the head, default in [°C/m] in [°F/ft] if units = ‘IP’
 * @param {"SI" | "IP"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {VerTmpGradReturnType} Object with results of the PPD with vertical temprature gradient.
 *
 * @example
 * const result = vertical_tmp_grad_ppd(25, 25, 0.1, 50, 1.2, 0.5, 7); // returns {'ppd_vg': 12.6, 'acceptability': false}
 */
export function vertical_tmp_grad_ppd(tdb: number, tr: number, vr: number, rh: number, met: number, clo: number, vertical_tmp_grad: number, units?: "SI" | "IP"): VerTmpGradReturnType;
/**
 * - a result set containing the predicted precentage of dissatisfied and the acceptability
 */
export type VerTmpGradReturnType = {
    /**
     * Predicted Percentage of Dissatisfied occupants with vertical temperature gradient, [%]
     */
    ppd_vg: number;
    /**
     * The ASHRAE 55 2020 standard defines that the value of air speed at the ankle level
     * is acceptable if PPD_ad is lower or equal than 5 %
     */
    acceptability: boolean;
};
//# sourceMappingURL=vertical_tmp_grad_ppd.d.ts.map