/**
 * @typedef {object} WbgtResult
 * @property {number} wbgt - Wet Bulb Globe Temperature Index, [°C]
 * @public
 */
/**
 * Calculates the Wet Bulb Globe Temperature (WBGT) index calculated in
 * compliance with the ISO 7243 {@link #ref_11|[11]}. The WBGT is a heat stress index that
 * measures the thermal environment to which a person is exposed. In most
 * situations, this index is simple to calculate. It should be used as a
 * screening tool to determine whether heat stress is present. The PHS model
 * allows a more accurate estimation of stress. PHS can be calculated using
 * the function `jsthermalcomfort.models.phs`.
 *
 * The WBGT determines the impact of heat on a person throughout the course of
 * a working day (up to 8 h). It does not apply to very brief heat exposures.
 * It pertains to the evaluation of male and female people who are fit for work
 * in both indoor and outdoor occupational environments, as well as other sorts
 * of surroundings {@link #ref_11|[11]}.
 *
 * The WBGT is defined as a function of only twb and tg if the person is not
 * exposed to direct radiant heat from the sun. When a person is exposed to
 * direct radiant heat, tdb must also be specified.
 *
 * @public
 * @memberof models
 * @docname Wet Bulb Globe Temperature Index (WBGT)
 *
 * @param {number} twb - natural (no forced air flow) wet bulb temperature, [°C]
 * @param {number} tg - globe temperature, [°C]
 * @param {object} [options] - configuration options for the function.
 * @param {boolean} [options.round = true] - If true rounds output value. If
 * false it does not round it.
 * @param {number} [options.tdb = undefined] - Dry bulb air temperature, [°C].
 * This value is needed as input if the person is exposed to direct solar
 * radiation.
 * @param {boolean} [options.with_solar_load = false] - If the globe sensor is
 * exposed to direct solar radiation. If this is set to true without also
 * setting `options.tdb` then an error will be thrown.
 *
 * @returns {WbgtResult} set containing results for the model
 *
 * @example
 * const result = wbgt(25, 32);
 * console.log(result); // -> {"wbgt": 27.1}
 *
 * @example
 * const result = wbgt(25, 32, { tdb: 20, with_solar_radiation: true });
 * console.log(result); // -> {"wbgt": 25.9}
 */
export function wbgt(twb: number, tg: number, options?: {
    round?: boolean;
    tdb?: number;
    with_solar_load?: boolean;
}): WbgtResult;
export type WbgtResult = {
    /**
     * - Wet Bulb Globe Temperature Index, [°C]
     */
    wbgt: number;
};
//# sourceMappingURL=wbgt.d.ts.map