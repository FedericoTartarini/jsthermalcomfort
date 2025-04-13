/**
 * @typedef {object} HeatIndexResult
 * @property {number} hi - Heat Index, default in [°C] in [°F] if `units` = 'IP'.
 * @public
 */
/**
 * Calculates the Heat Index (HI). It combines air temperature and relative humidity to determine an apparent temperature.
 * The HI equation {@link #ref_12|[12]} is derived by multiple regression analysis in temperature and relative humidity from the first version
 * of Steadman’s (1979) apparent temperature (AT) {@link #ref_13|[13]}.
 *
 * @public
 * @memberof models
 * @docname Heat Index
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} rh Relative humidity, [%].
 * @param {Object} [options] (Optional) Other parameters.
 * @param {boolean} [options.round=true] - If True rounds output value, if False it does not round it.
 * @param {"SI" | "IP"} [options.units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {HeatIndexResult} set containing results for the model
 *
 * @example
 * const hi = heat_index(25, 50); // returns {hi: 25.9}
 *
 * @category Thermophysiological models
 */
export function heat_index(tdb: number, rh: number, options?: {
    round?: boolean;
    units?: "SI" | "IP";
}): HeatIndexResult;
export type HeatIndexResult = {
    /**
     * - Heat Index, default in [°C] in [°F] if `units` = 'IP'.
     */
    hi: number;
};
//# sourceMappingURL=heat_index.d.ts.map