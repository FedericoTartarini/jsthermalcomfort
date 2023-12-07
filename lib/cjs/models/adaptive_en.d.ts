/**
 * @typedef {object} AdaptiveEnResult - a result set containing the results for {@link #adative_en|adaptive_en}
 * @property {number} tmp_cmf - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F]
 * @property {boolean} acceptability_cat_i - If the indoor conditions comply with comfort category I
 * @property {boolean} acceptability_cat_ii - If the indoor conditions comply with comfort category II
 * @property {boolean} acceptability_cat_iii - If the indoor conditions comply with comfort category III
 * @property {number} tmp_cmf_cat_i_up - Upper acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_ii_up - Upper acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_iii_up - Upper acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_i_low - Lower acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_ii_low - Lower acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number} tmp_cmf_cat_iii_low - Lower acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @public
 */
/**
 * Determines the adaptive thermal comfort based on EN 16798-1 2019 {@link #ref_3|[3]}
 *
 * Note: You can use this function to calculate if your conditions are within the EN
 * adaptive thermal comfort region. Calculations with comply with the EN 16798-1 2019 {@link #ref_3|[3]}.
 *
 * @see {@link adaptive_en_array} for a version that supports array arguments
 *
 * @public
 * @memberof models
 * @docname Adaptive EN
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 *
 * @param {number} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: Indoor operative temperature correction is applicable for buildings equipped
 * with fans or personal systems providing building occupants with personal
 * control over air speed at occupant level.
 * For operative temperatures above 25°C the comfort zone upper limit can be
 * increased by 1.2 °C (0.6 < v < 0.9 m/s), 1.8 °C (0.9 < v < 1.2 m/s), 2.2 °C (v > 1.2 m/s)
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * @returns {AdaptiveEnResult} result set
 *
 * @example
 * const results = adaptive_en(25, 25, 20, 0.1);
 * console.log(results); // {tmp_cmf: 25.4, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 * console.log(results.acceptability_cat_i); // true
 * // The conditions you entered are considered to comply with Category I
 *
 * @example
 * // for users who wants to use the IP system
 * const results = adaptive_en(77, 77, 68, 0.3, 'IP');
 * console.log(results); // {tmp_cmf: 77.7, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 *
 * @example
 * const results = adaptive_en(25, 25, 9, 0.1);
 * console.log(results); // {tmp_cmf: NaN, acceptability_cat_i: true, acceptability_cat_ii: true, ... }
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is between 10 °C and 30 °C
 */
export function adaptive_en(tdb: number, tr: number, t_running_mean: number, v: number, units?: "IP" | "SI", limit_inputs?: boolean): AdaptiveEnResult;
/**
 * @typedef {object} AdaptiveEnArrayResult - a result set containing the results for {@link #adative_en_array|adaptive_en_array}
 * @property {number[]} tmp_cmf - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F]
 * @property {boolean[]} acceptability_cat_i - If the indoor conditions comply with comfort category I
 * @property {boolean[]} acceptability_cat_ii - If the indoor conditions comply with comfort category II
 * @property {boolean[]} acceptability_cat_iii - If the indoor conditions comply with comfort category III
 * @property {number[]} tmp_cmf_cat_i_up - Upper acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_ii_up - Upper acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_iii_up - Upper acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_i_low - Lower acceptable comfort temperature for category I, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_ii_low - Lower acceptable comfort temperature for category II, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_cat_iii_low - Lower acceptable comfort temperature for category III, default in [°C] or in [°F]
 * @public
 */
/**
 * Determines the adaptive thermal comfort based on EN 16798-1 2019 {@link #ref_3|[3]}
 *
 * Note: You can use this function to calculate if your conditions are within the EN
 * adaptive thermal comfort region. Calculations with comply with the EN 16798-1 2019 {@link #ref_3|[3]}.
 *
 * @public
 * @memberof models
 * @docname Adaptive EN (array version)
 *
 * @see {@link adaptive_en} for a version that supports scalar arguments
 *
 * @param {number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 *
 * @param {number[]} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: Indoor operative temperature correction is applicable for buildings equipped
 * with fans or personal systems providing building occupants with personal
 * control over air speed at occupant level.
 * For operative temperatures above 25°C the comfort zone upper limit can be
 * increased by 1.2 °C (0.6 < v < 0.9 m/s), 1.8 °C (0.9 < v < 1.2 m/s), 2.2 °C (v> 1.2 m/s)
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * @returns {AdaptiveEnArrayResult} result set
 *
 * @example
 * const results = adaptive_en([25,25], [25,25], [20,9], [0.1,0.1]);
 * console.log(results); // {tmp_cmf: [25.4, NaN], acceptability_cat_i: [true, true], acceptability_cat_ii: [true, true], ... }
 * console.log(results.acceptability_cat_i); // [true, true]
 * // The conditions you entered are considered to comply with Category I
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is between 10 °C and 30 °C
 */
export function adaptive_en_array(tdb: number[], tr: number[], t_running_mean: number[], v: number[], units?: "IP" | "SI", limit_inputs?: boolean): AdaptiveEnArrayResult;
/**
 *
 * @param {number} v
 * @param {number} to
 * @returns {number}
 */
export function get_ce(v: number, to: number): number;
/**
 * - a result set containing the results for {@link  #adative_en|adaptive_en}
 */
export type AdaptiveEnResult = {
    /**
     * - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F]
     */
    tmp_cmf: number;
    /**
     * - If the indoor conditions comply with comfort category I
     */
    acceptability_cat_i: boolean;
    /**
     * - If the indoor conditions comply with comfort category II
     */
    acceptability_cat_ii: boolean;
    /**
     * - If the indoor conditions comply with comfort category III
     */
    acceptability_cat_iii: boolean;
    /**
     * - Upper acceptable comfort temperature for category I, default in [°C] or in [°F]
     */
    tmp_cmf_cat_i_up: number;
    /**
     * - Upper acceptable comfort temperature for category II, default in [°C] or in [°F]
     */
    tmp_cmf_cat_ii_up: number;
    /**
     * - Upper acceptable comfort temperature for category III, default in [°C] or in [°F]
     */
    tmp_cmf_cat_iii_up: number;
    /**
     * - Lower acceptable comfort temperature for category I, default in [°C] or in [°F]
     */
    tmp_cmf_cat_i_low: number;
    /**
     * - Lower acceptable comfort temperature for category II, default in [°C] or in [°F]
     */
    tmp_cmf_cat_ii_low: number;
    /**
     * - Lower acceptable comfort temperature for category III, default in [°C] or in [°F]
     */
    tmp_cmf_cat_iii_low: number;
};
/**
 * - a result set containing the results for {@link  #adative_en_array|adaptive_en_array}
 */
export type AdaptiveEnArrayResult = {
    /**
     * - Comfort temperature at that specific running mean temperature, default in [°C] or in [°F]
     */
    tmp_cmf: number[];
    /**
     * - If the indoor conditions comply with comfort category I
     */
    acceptability_cat_i: boolean[];
    /**
     * - If the indoor conditions comply with comfort category II
     */
    acceptability_cat_ii: boolean[];
    /**
     * - If the indoor conditions comply with comfort category III
     */
    acceptability_cat_iii: boolean[];
    /**
     * - Upper acceptable comfort temperature for category I, default in [°C] or in [°F]
     */
    tmp_cmf_cat_i_up: number[];
    /**
     * - Upper acceptable comfort temperature for category II, default in [°C] or in [°F]
     */
    tmp_cmf_cat_ii_up: number[];
    /**
     * - Upper acceptable comfort temperature for category III, default in [°C] or in [°F]
     */
    tmp_cmf_cat_iii_up: number[];
    /**
     * - Lower acceptable comfort temperature for category I, default in [°C] or in [°F]
     */
    tmp_cmf_cat_i_low: number[];
    /**
     * - Lower acceptable comfort temperature for category II, default in [°C] or in [°F]
     */
    tmp_cmf_cat_ii_low: number[];
    /**
     * - Lower acceptable comfort temperature for category III, default in [°C] or in [°F]
     */
    tmp_cmf_cat_iii_low: number[];
};
//# sourceMappingURL=adaptive_en.d.ts.map