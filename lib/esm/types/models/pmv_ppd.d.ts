/**
 * @typedef {Object} Pmv_ppdKwargs
 * @property {'SI'|'IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @property { boolean } limit_inputs - Default is True. By default, if the inputs are outside the standard applicability
 *    limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
 *    the applicability limits of the model.
 *    The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 2, 1 < met [met] < 4, and 0 < clo [clo] < 1.5.
 *    The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
 * @property { boolean } airspeed_control - This only applies if standard = "ASHRAE".
 *    Default is True. By default, it is assumed that the occupant has control over the airspeed.
 *    In this case, the ASHRAE 55 Standard does not impose any airspeed limits.
 *    On the other hand, if the occupant has no control over the airspeed,
 *    the ASHRAE 55 imposes an upper limit for v which varies as a function of
 *    the operative temperature, for more information please consult the Standard.
 * @public
 */
/**
 * @typedef {Object} Pmv_ppdReturns
 * @property { number } pmv - Predicted Mean Vote
 * @property { number } ppd - Predicted Percentage of Dissatisfied occupants, [%]
 * @public
 */
/**
 * Returns Predicted Mean Vote ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} ) and
 * Predicted Percentage of Dissatisfied ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD} )
 * calculated in accordance with main thermal comfort Standards. The PMV is an index that predicts the mean
 * value of the thermal sensation votes (self-reported perceptions) of a large group of people on a
 * sensation scale expressed from –3 to +3 corresponding to the categories:
 * cold, cool, slightly cool, neutral, slightly warm, warm, and hot. {@link #ref_1|[1]}
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the
 * ASHRAE 55 PMV equation, the SET is used to calculate the cooling effect first,
 * this is then subtracted from both the air and mean radiant temperatures, and the
 * differences are used as input to the PMV model, while the airspeed is set to 0.1m/s.
 * Please read more in the Note below.
 *
 * Notes:
 * You can use this function to calculate the {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV}
 * and {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD} in accordance with
 * either the ASHRAE 55 2020 Standard {@link #ref_1|[1]} or the ISO 7730 Standard {@link #ref_2|[2]}.
 *
 * _Addendum C to Standard 55-2020:
 * {@link https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf}
 *
 * This is a version that supports scalar arguments.
 * @see {@link pmv_ppd_array} for a version that supports arrays.
 *
 * @public
 * @memberof models
 * @docname Predicted Mean Vote (PMV) and Predicted Percentage of Dissatisfied (PPD)
 *
 * @param { number } tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param { number } tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param { number } vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function `v_relative` which is in .utilities.js.
 * @param { number } rh - relative humidity, [%]
 * @param { number } met - metabolic rate
 * @param { number } clo - clothing insulation
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 * @param { number } [wme=0] - external work, default is 0
 * @param { "ISO"|"ASHRAE" } [standard="ISO"] - comfort standard used for calculation
 * - If "ISO", then the ISO Equation is used
 * - If "ASHRAE", then the ASHRAE Equation is used
 * Note: While the PMV equation is the same for both the ISO and ASHRAE standards,
 * the ASHRAE Standard Use of the PMV model is limited to air speeds below 0.10m/s (20 fpm).
 * When air speeds exceed 0.10 m/s (20 fpm), the comfort zone boundaries are adjusted based on the SET model.
 * This change was introduced by the `Addendum C to Standard 55-2020`_
 * @param { Pmv_ppdKwargs }kwargs - additional arguments
 *
 * @returns { Pmv_ppdReturns } - Result of pmv and ppd
 *
 * @example
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // Calculate relative air speed
 * const v_r = v_relative(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic(clo, met);
 * const results = pmv_ppd(tdb, tr, v_r, rh, met, clo_d);
 * console.log(results); // Output: { pmv: 0.06, ppd: 5.1 }
 * console.log(results.pmv); // Output: -0.06
 */
export function pmv_ppd(tdb: number, tr: number, vr: number, rh: number, met: number, clo: number, wme?: number, standard?: "ISO" | "ASHRAE", kwargs?: Pmv_ppdKwargs): Pmv_ppdReturns;
/**
 * @typedef {Object} Pmv_ppd_arrayReturns
 * @property { number[] } pmv - Predicted Mean Vote
 * @property { number[] } ppd - Predicted Percentage of Dissatisfied occupants, [%]
 * @public
 */
/**
 * Returns Predicted Mean Vote ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} ) and
 * Predicted Percentage of Dissatisfied ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD} )
 * calculated in accordance with main thermal comfort Standards. The PMV is an index that predicts the mean
 * value of the thermal sensation votes (self-reported perceptions) of a large group of people on a
 * sensation scale expressed from –3 to +3 corresponding to the categories:
 * cold, cool, slightly cool, neutral, slightly warm, warm, and hot. {@link #ref_1|[1]}
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the
 * ASHRAE 55 PMV equation, the SET is used to calculate the cooling effect first,
 * this is then subtracted from both the air and mean radiant temperatures, and the
 * differences are used as input to the PMV model, while the airspeed is set to 0.1m/s.
 * Please read more in the Note below.
 *
 * Notes:
 * You can use this function to calculate the {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV}
 * and {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD} in accordance with
 * either the ASHRAE 55 2020 Standard {@link #ref_1|[1]} or the ISO 7730 Standard {@link #ref_2|[2]}.
 *
 * _Addendum C to Standard 55-2020:
 * {@link https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf|Addendum C to Standard 55-2020}
 *
 * This is a version that supports arrays.
 * @see {@link pmv_ppd} for a version that supports scalar arguments.
 *
 * @public
 * @memberof models
 * @docname Predicted Mean Vote (PMV) and Predicted Percentage of Dissatisfied (PPD) (array version)
 *
 * @param { number[] } tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param { number[] } tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param { number[] } vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function `v_relative` which is in .utilities.js.
 * @param { number[] } rh - relative humidity, [%]
 * @param { number[] } met - metabolic rate, [met]
 * @param { number[] } clo - clothing insulation, [clo]
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 * @param { number[] } wme - external work, default is array of 0
 * @param { "ISO"|"ASHRAE" } [standard="ISO"] - comfort standard used for calculation
 * - If "ISO", then the ISO Equation is used
 * - If "ASHRAE", then the ASHRAE Equation is used
 * Note: While the PMV equation is the same for both the ISO and ASHRAE standards,
 * the ASHRAE Standard Use of the PMV model is limited to air speeds below 0.10m/s (20 fpm).
 * When air speeds exceed 0.10 m/s (20 fpm), the comfort zone boundaries are adjusted based on the SET model.
 * This change was introduced by the `Addendum C to Standard 55-2020`_
 * @param { Pmv_ppdKwargs }kwargs - additional arguments
 *
 * @returns {Pmv_ppd_arrayReturns} - Result of pmv and ppd
 *
 * @example
 * const tdb = [22, 25];
 * const tr = [25, 25];
 * const rh = [50, 50];
 * const v = [0.1, 0.1];
 * const met = [1.4, 1.4];
 * const clo = [0.5, 0.5];
 * // Calculate relative air speed
 * const v_r = v_relative_array(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic_array(clo, met);
 * const arrayResults = pmv_ppd_array(tdb, tr, v_r, rh, met, clo_d);
 * console.log(arrayResults); // Output: { pmv: [-0.47, 0.06], ppd: [9.6, 5.1] }
 * console.log(results.pmv); // Output: [-0.47, 0.06]
 */
export function pmv_ppd_array(tdb: number[], tr: number[], vr: number[], rh: number[], met: number[], clo: number[], wme: number[], standard?: "ISO" | "ASHRAE", kwargs?: Pmv_ppdKwargs): Pmv_ppd_arrayReturns;
/**
 * @param {number} tdb
 * @param {number} tr
 * @param {number} vr
 * @param {number} rh
 * @param {number} met
 * @param {number} clo
 * @param {number} wme
 *
 * @returns {number} _pmv
 */
export function pmv_calculation(tdb: number, tr: number, vr: number, rh: number, met: number, clo: number, wme: number): number;
export type Pmv_ppdKwargs = {
    /**
     * - select the SI (International System of Units) or the IP (Imperial Units) system.
     */
    units: 'SI' | 'IP';
    /**
     * - Default is True. By default, if the inputs are outside the standard applicability
     * limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
     * the applicability limits of the model.
     * The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
     * 0 < vr [m/s] < 2, 1 < met [met] < 4, and 0 < clo [clo] < 1.5.
     * The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
     * 0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
     */
    limit_inputs: boolean;
    /**
     * - This only applies if standard = "ASHRAE".
     * Default is True. By default, it is assumed that the occupant has control over the airspeed.
     * In this case, the ASHRAE 55 Standard does not impose any airspeed limits.
     * On the other hand, if the occupant has no control over the airspeed,
     * the ASHRAE 55 imposes an upper limit for v which varies as a function of
     * the operative temperature, for more information please consult the Standard.
     */
    airspeed_control: boolean;
};
export type Pmv_ppdReturns = {
    /**
     * - Predicted Mean Vote
     */
    pmv: number;
    /**
     * - Predicted Percentage of Dissatisfied occupants, [%]
     */
    ppd: number;
};
export type Pmv_ppd_arrayReturns = {
    /**
     * - Predicted Mean Vote
     */
    pmv: number[];
    /**
     * - Predicted Percentage of Dissatisfied occupants, [%]
     */
    ppd: number[];
};
//# sourceMappingURL=pmv_ppd.d.ts.map