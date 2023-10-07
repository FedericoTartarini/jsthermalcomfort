/**
 * @typedef {object} AdaptiveAshraeResult
 * @property {number} tmp_cmf - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
 * @property {number} tmp_cmf_80_low - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_80_up - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_90_low - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {number} tmp_cmf_90_up - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {boolean} acceptability_80 - Acceptability for 80% occupants
 * @property {boolean} acceptability_90 - Acceptability for 90% occupants
 * @public
 */
/**
 * Determines the adaptive thermal comfort based on ASHRAE 55. The adaptive
 * model relates indoor design temperatures or acceptable temperature ranges
 * to outdoor meteorological or climatological parameters. The adaptive model
 * can only be used in occupant-controlled naturally conditioned spaces that
 * meet all the following criteria:
 *
 * - There is no mechianical cooling or heating system in operation
 * - Occupants have a metabolic rate between 1.0 and 1.5 met
 * - Occupants are free to adapt their clothing within a range as wide as 0.5 and 1.0 clo
 * - The prevailing mean (runnin mean) outdoor temperature is between 10 and 33.5 °C
 *
 * @see {@link adaptive_ashrae_array} for a version that supports array arguments
 *
 * @public
 * @memberof models
 * @docname Adaptive ASHRAE
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * @returns {AdaptiveAshraeResult} set containing results for the model
 *
 * The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 * 0 < vr [m/s] < 2, 10 < t running mean [°C] < 33.5
 *
 * You can use this function to calculate if your conditions are within the `adaptive thermal comfort region`.
 * Calculations with comply with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae(25, 25, 20, 0.1);
 * console.log(results);
 * // {tmp_cmf: 24.0, tmp_cmf_80_low: 20.5, tmp_cmf_80_up: 27.5,
 * //   tmp_cmf_90_low: 21.5, tmp_cmf_90_up: 26.5, acceptability_80: true,
 * //   acceptability_90: true}
 * console.log(results.acceptability_80);
 * // true
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * // For users who want to use the IP system
 * const results = adaptive_ashrae(77, 77, 68, 0.3, 'IP');
 * console.log(results);
 * // {tmp_cmf: 75.2, tmp_cmf_80_low: 68.9, tmp_cmf_80_up: 81.5,
 * //  tmp_cmf_90_low: 70.7, tmp_cmf_90_up: 79.7, acceptability_80: true,
 * //  acceptability_90: true}
 *
 * @example
 * import { adaptive_ashrae } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae(25, 25, 9, 0.1);
 * console.log(results);
 * // {tmp_cmf: NaN, tmp_cmf_80_low: NaN, ...}
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is higher than 10°C
 */
export function adaptive_ashrae(tdb: number, tr: number, t_running_mean: number, v: number, units?: "SI" | "IP", limit_inputs?: boolean): AdaptiveAshraeResult;
/**
 * @typedef {object} AdaptiveAshraeArrayResult
 * @property {number[]} tmp_cmf - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_80_low - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_80_up - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_90_low - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {number[]} tmp_cmf_90_up - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
 * @property {boolean[]} acceptability_80 - Acceptability for 80% occupants
 * @property {boolean[]} acceptability_90 - Acceptability for 90% occupants
 * @public
 */
/**
 * Determines the adaptive thermal comfort based on ASHRAE 55. The adaptive
 * model relates indoor design temperatures or acceptable temperature ranges
 * to outdoor meteorological or climatological parameters. The adaptive model
 * can only be used in occupant-controlled naturally conditioned spaces that
 * meet all the following criteria:
 *
 * - There is no mechianical cooling or heating system in operation
 * - Occupants have a metabolic rate between 1.0 and 1.5 met
 * - Occupants are free to adapt their clothing within a range as wide as 0.5 and 1.0 clo
 * - The prevailing mean (runnin mean) outdoor temperature is between 10 and 33.5 °C
 *
 * @see {@link adaptive_ashrae} for a version that supports scalar arguments
 *
 * @public
 * @memberof models
 * @docname Adaptive ASHRAE (array version)
 *
 * @param {number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} t_running_mean - running mean temperature, default in [°C] in [°C] in [°F] if `units` = 'IP'
 * The running mean temperature can be calculated using the function {@link #running_mean_outdoor_temperature|running_mean_outdoor_temperature}
 * @param {number[]} v - air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {"SI" | "IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} limit_inputs - By default, if the inputs are outsude the standard applicability limits the
 * function returns nan. If False returns pmv and ppd values even if input values are
 * outside the applicability limits of the model.
 *
 * @returns {AdaptiveAshraeArrayResult} set containing results for the model
 *
 * The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 * 0 < vr [m/s] < 2, 10 < t running mean [°C] < 33.5
 *
 * You can use this function to calculate if your conditions are within the `adaptive thermal comfort region`.
 * Calculations with comply with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 *
 * @example
 * import { adaptive_ashrae_array } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae_array([25], [25], [20], [0.1]);
 * console.log(results);
 * // {tmp_cmf: [24.0], tmp_cmf_80_low: [20.5], tmp_cmf_80_up: [27.5],
 * //   tmp_cmf_90_low: [21.5], tmp_cmf_90_up: [26.5], acceptability_80: [true],
 * //   acceptability_90: [true]}
 * console.log(results.acceptability_80);
 * // [true]
 *
 * @example
 * import { adaptive_ashrae_array } from "jsthermalcomfort/models";
 * // For users who want to use the IP system
 * const results = adaptive_ashrae_array([77], [77], [68], [0.3], 'IP');
 * console.log(results);
 * // {tmp_cmf: [75.2], tmp_cmf_80_low: [68.9], tmp_cmf_80_up: [81.5],
 * //  tmp_cmf_90_low: [70.7], tmp_cmf_90_up: [79.7], acceptability_80: [true],
 * //  acceptability_90: [true]}
 *
 * @example
 * import { adaptive_ashrae_array } from "jsthermalcomfort/models";
 * const results = adaptive_ashrae_array([25], [25], [9], [0.1]);
 * console.log(results);
 * // {tmp_cmf: [NaN], tmp_cmf_80_low: [NaN], ...}
 * // The adaptive thermal comfort model can only be used
 * // if the running mean temperature is higher than 10°C
 */
export function adaptive_ashrae_array(tdb: number[], tr: number[], t_running_mean: number[], v: number[], units?: "SI" | "IP", limit_inputs?: boolean): AdaptiveAshraeArrayResult;
export type AdaptiveAshraeResult = {
    /**
     * - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
     */
    tmp_cmf: number;
    /**
     * - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_80_low: number;
    /**
     * - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_80_up: number;
    /**
     * - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_90_low: number;
    /**
     * - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_90_up: number;
    /**
     * - Acceptability for 80% occupants
     */
    acceptability_80: boolean;
    /**
     * - Acceptability for 90% occupants
     */
    acceptability_90: boolean;
};
export type AdaptiveAshraeArrayResult = {
    /**
     * - Comfort temperature a that specific running mean temperature, default in [°C] or in [°F]
     */
    tmp_cmf: number[];
    /**
     * - Lower acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_80_low: number[];
    /**
     * - Upper acceptable comfort temperature for 80% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_80_up: number[];
    /**
     * - Lower acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_90_low: number[];
    /**
     * - Upper acceptable comfort temperature for 90% occupants, default in [°C] or in [°F]
     */
    tmp_cmf_90_up: number[];
    /**
     * - Acceptability for 80% occupants
     */
    acceptability_80: boolean[];
    /**
     * - Acceptability for 90% occupants
     */
    acceptability_90: boolean[];
};
//# sourceMappingURL=adaptive_ashrae.d.ts.map