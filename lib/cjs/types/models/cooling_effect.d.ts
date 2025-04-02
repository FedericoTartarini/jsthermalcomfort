/**
 * @typedef {object} CoolingEffectResult
 * @property {number} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 * @public
 */
/**
 * Returns the value of the Cooling Effect ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} )
 * calculated in compliance with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 * The {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} of the elevated air speed
 * is the value that, when subtracted equally from both the average air temperature and the mean radiant temperature,
 * the same {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} under still air
 * as in the first {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} calculation
 * under elevated air speed. The cooling effect is calculated only for air speed higher than 0.1 m/s.
 *
 * @public
 * @memberof models
 * @docname Cooling Effect (CE)
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of individual body parts.
 * vr can be calculated using the function `v_relative` which is in .utilities.js.
 *
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [met]
 * @param {number} clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 *
 * @param {number} [wme=0] - external work
 * @param {'SI'|'IP'} [units= "SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @returns {CoolingEffectResult} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 *
 * @example
 * const CE = cooling_effect(25, 25, 0.3, 50, 1.2, 0.5);
 * console.log(CE); // Output: {ce: 1.64}
 *
 * // For users who want to use the IP system
 * const CE_IP = cooling_effect(77, 77, 1.64, 50, 1, 0.6, "IP");
 * console.log(CE_IP); // Output: {ce: 3.74}
 */
export function cooling_effect(tdb: number, tr: number, vr: number, rh: number, met: number, clo: number, wme?: number, units?: 'SI' | 'IP'): CoolingEffectResult;
export function brent(f: any, lowerBound: any, upperBound: any, tolerance?: number, maxIterations?: number): any;
export type CoolingEffectResult = {
    /**
     * - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
     */
    ce: number;
};
//# sourceMappingURL=cooling_effect.d.ts.map