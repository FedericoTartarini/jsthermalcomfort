/**
 * @typedef {object} HumidexResult - a result set containing the humidex and
 * discomfort level.
 * @property {number} humidex - the humdidex given the provided dry bulb
 * air temperature and relative humidity.
 * @property {string} discomfort - a human description of how the weather
 * would be felt by the average person.
 * @public
 */
/**
 * Calculates the humidex (short for "humidity index"). It has been
 * developed by the Canadian Meteorological service. It was introduced in 1965
 * and then it was revised by Masterson and Richardson (1979) {@link #ref_14|[14]}. It aims
 * to describe how hot, humid weather is felt by the average person. The
 * Humidex differs from the heat index in being related to the dew point
 * rather than relative humidity {@link #ref_15|[15]}.
 *
 * @public
 * @memberof models
 * @docname Humidex
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {object} [options] - configuration options for the function.
 * @param {boolean} [options.round = true] - If true, rounds output value. If
 * false, it does not.
 *
 * @returns {HumidexResult} the result given the provided temperature and
 * relative humidity.
 *
 * @example
 * const result = humidex(25, 50);
 * console.log(result); // -> { humidex: 28.2, discomfort: "Little or no discomfort" }
 */
export function humidex(tdb: number, rh: number, options?: {
    round?: boolean;
}): HumidexResult;
/**
 * - a result set containing the humidex and
 * discomfort level.
 */
export type HumidexResult = {
    /**
     * - the humdidex given the provided dry bulb
     * air temperature and relative humidity.
     */
    humidex: number;
    /**
     * - a human description of how the weather
     * would be felt by the average person.
     */
    discomfort: string;
};
//# sourceMappingURL=humidex.d.ts.map