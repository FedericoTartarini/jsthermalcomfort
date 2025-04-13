/**
 * @typedef {Object} SetTmpResult
 * @property {number} set - Standard effective temperature in array, [°C]
 * @public
 */
/**
 * @typedef {Object} SetTmpKwargs - a keywords argument set containing the additional arguments for Standard Effective Temperature calculation
 * @property {boolean} [round=true] - round the result of the SET
 * @property {boolean} [calculate_ce=false] - select if SET is used to calculate Cooling Effect
 * @public
 */
/**
 * @typedef {Object} SetTmpKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 */
/**
 * Calculates the Standard Effective Temperature (SET). The SET is the
 * temperature of a hypothetical isothermal environment at 50% (rh),
 * <0.1 m/s (20 fpm) average air speed (v), and tr = tdb, in which the
 * total heat loss from the skin of an imaginary occupant wearing
 * clothing, standardized for the activity concerned is the same as
 * that from a person in the actual environment with actual clothing
 * and activity level {@link #ref_10|[10]}.
 * @public
 * @memberof models
 * @docname Standard Effective Temperature (SET)
 *
 * @see {@link set_tmp_array} for a version that supports arrays
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} tr Mean radiant temperature, default in [°C]
 * @param {number} v Air speed, default in [m/s]
 * @param {number} rh Relative humidity, [%].
 * @param {number} met Metabolic rate, [W/(m2)]
 * @param {number} clo Clothing insulation, [clo]
 * @param {number} [wme=0] External work, [W/(m2)] default 0
 * @param {number} [body_surface_area] Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number} [p_atm] Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} [body_position="standing"] Select either “sitting” or “standing”
 * @param {"SI" | "IP"} [units="SI"] Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] By default, if the inputs are outsude the following limits the function returns nan. If False returns values regardless of the input values.
 * @param {SetTmpKwargs} [kwargs]
 * @returns {SetTmpResult} set containing results for the model
 *
 * @example
 * const set = set_tmp(25, 25, 0.1, 50, 1.2, 0.5); // returns {set: 24.3}
 */
export function set_tmp(tdb: number, tr: number, v: number, rh: number, met: number, clo: number, wme?: number, body_surface_area?: number, p_atm?: number, body_position?: "standing" | "sitting", units?: "SI" | "IP", limit_inputs?: boolean, kwargs?: SetTmpKwargs): SetTmpResult;
/**
 * @typedef {Object} SetTmpArrayKwargs - a keywords argument set containing the additional arguments for SET array calculation
 * @property {boolean} [round=true] - round the result of the SET
 * @property {boolean} [calculate_ce=false] - select if SET array is used to calculate Cooling Effect
 * @public
 */
/**
 * @typedef {Object} SetTmpArrayKwargsRequired
 * @property {boolean} round
 * @property {boolean} calculate_ce
 */
/**
 *
 * Calculates the SET when the input parameters are arrays. The SET is the
 * temperature of a hypothetical isothermal environment at 50% (rh),
 * <0.1 m/s (20 fpm) average air speed (v), and tr = tdb, in which the
 * total heat loss from the skin of an imaginary occupant wearing
 * clothing, standardized for the activity concerned is the same as
 * that from a person in the actual environment with actual clothing
 * and activity level {@link #ref_10|[10]}.
 * @public
 * @memberof models
 * @docname Standard Effective Temperature (SET) (array version)
 *
 * @see {@link set_tmp} for a version that supports scalar arguments
 *
 * @param {number[]} tdbArray Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number[]} trArray Mean radiant temperature, default in [°C]
 * @param {number[]} vArray Air speed, default in [m/s]
 * @param {number[]} rhArray Relative humidity, [%].
 * @param {number[]} metArray Metabolic rate, [W/(m2)]
 * @param {number[]} cloArray Clothing insulation, [clo]
 * @param {number[]} [wmeArray] External work, [W/(m2)] default 0
 * @param {number[]} [bodySurfaceArray] Body surface area, default value 1.8258 [m2] in [ft2] if units = ‘IP’
 * @param {number[]} [pAtmArray] Atmospheric pressure, default value 101325 [Pa] in [atm] if units = ‘IP’
 * @param {"standing" | "sitting"} bodyPositionArray Select either “sitting” or “standing”
 * @param {"SI" | "IP"} [units="SI"] Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [limit_inputs=true] By default, if the inputs are outsude the following limits the function returns nan. If False returns values regardless of the input values.
 * @param {SetTmpKwargs} [kwargs]
 * @returns {number[]} SET Array – Standard effective temperature in array, [°C]
 *
 * @example
 * const set = set_tmp_array([25, 25], [25, 25], [0.1, 0.1], [50, 50], [1.2, 1.2], [0.5, 0.5]); // returns [24.3, 24.3]
 */
export function set_tmp_array(tdbArray: number[], trArray: number[], vArray: number[], rhArray: number[], metArray: number[], cloArray: number[], wmeArray?: number[], bodySurfaceArray?: number[], pAtmArray?: number[], bodyPositionArray: "standing" | "sitting", units?: "SI" | "IP", limit_inputs?: boolean, kwargs?: SetTmpKwargs): number[];
export type SetTmpResult = {
    /**
     * - Standard effective temperature in array, [°C]
     */
    set: number;
};
/**
 * - a keywords argument set containing the additional arguments for Standard Effective Temperature calculation
 */
export type SetTmpKwargs = {
    /**
     * - round the result of the SET
     */
    round?: boolean;
    /**
     * - select if SET is used to calculate Cooling Effect
     */
    calculate_ce?: boolean;
};
export type SetTmpKwargsRequired = {
    round: boolean;
    calculate_ce: boolean;
};
/**
 * - a keywords argument set containing the additional arguments for SET array calculation
 */
export type SetTmpArrayKwargs = {
    /**
     * - round the result of the SET
     */
    round?: boolean;
    /**
     * - select if SET array is used to calculate Cooling Effect
     */
    calculate_ce?: boolean;
};
export type SetTmpArrayKwargsRequired = {
    round: boolean;
    calculate_ce: boolean;
};
//# sourceMappingURL=set_tmp.d.ts.map