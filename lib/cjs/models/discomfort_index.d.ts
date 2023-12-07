/**
 * @typedef {Object} DiscomfortIndexReturnType - a result set containing the discomfort index and the classification of the
 * thermal comfort conditions
 * @property {number} di – Discomfort Index(DI)
 * @property {string} discomfort_condition Classification of the thermal comfort conditions according to the discomfort index
 * @public
 */
/**
 * Calculates the Discomfort Index (DI). The index is essentially an effective temperature based on air temperature and humidity.
 * The discomfort index is usuallly divided in 6 dicomfort categories and it only applies to warm environments. {@link #ref_24|[24]}
 *
 * - class 1 - DI < 21 °C - No discomfort
 * - class 2 - 21 <= DI < 24 °C - Less than 50% feels discomfort
 * - class 3 - 24 <= DI < 27 °C - More than 50% feels discomfort
 * - class 4 - 27 <= DI < 29 °C - Most of the population feels discomfort
 * - class 5 - 29 <= DI < 32 °C - Everyone feels severe stress
 * - class 6 - DI >= 32 °C - State of medical emergency
 *
 * @see {@link discomfort_index_array} for a version that supports arrays
 *
 * @public
 * @memberof models
 * @docname Discomfort Index (DI)
 *
 * @param {number} tdb - air temperature [C]
 * @param {number} rh - relative humidity [%]
 *
 * @returns {DiscomfortIndexReturnType} object with results of DI
 * @example
 * const DI = discomfort_index(25, 50); // returns { di: 22.1, discomfort_condition: 'Less than 50% feels discomfort' }
 */
export function discomfort_index(tdb: number, rh: number): DiscomfortIndexReturnType;
/**
 * @typedef {Object} DiscomfortIndexArrayReturnType - a result set containing an array of discomfort index and an array
 * of classification of the thermal comfort conditions
 * @property {number[]} di – Discomfort Index(DI) Array
 * @property {string[]} discomfort_condition Classification of the thermal comfort conditions in array
 * @public
 */
/**
 * Calculates the Discomfort Index (DI). The index is essentially an effective temperature based on air temperature and humidity.
 * The discomfort index is usuallly divided in 6 dicomfort categories and it only applies to warm environments. {@link #ref_24|[24]}
 *
 * - class 1 - DI < 21 °C - No discomfort
 * - class 2 - 21 <= DI < 24 °C - Less than 50% feels discomfort
 * - class 3 - 24 <= DI < 27 °C - More than 50% feels discomfort
 * - class 4 - 27 <= DI < 29 °C - Most of the population feels discomfort
 * - class 5 - 29 <= DI < 32 °C - Everyone feels severe stress
 * - class 6 - DI >= 32 °C - State of medical emergency
 *
 * @see {@link discomfort_index} for a version that supports scalar arguments
 *
 * @public
 * @memberof models
 * @docname Discomfort Index (DI) (array version)
 *
 * @param {number[]} tdb - air temperature [C]
 * @param {number[]} rh - relative humidity [%]
 *
 * @returns {DiscomfortIndexArrayReturnType} object with results of DI
 */
export function discomfort_index_array(tdb: number[], rh: number[]): DiscomfortIndexArrayReturnType;
/**
 * - a result set containing the discomfort index and the classification of the
 * thermal comfort conditions
 */
export type DiscomfortIndexReturnType = {
    /**
     * – Discomfort Index(DI)
     */
    di: number;
    /**
     * Classification of the thermal comfort conditions according to the discomfort index
     */
    discomfort_condition: string;
};
/**
 * - a result set containing an array of discomfort index and an array
 * of classification of the thermal comfort conditions
 */
export type DiscomfortIndexArrayReturnType = {
    /**
     * – Discomfort Index(DI) Array
     */
    di: number[];
    /**
     * Classification of the thermal comfort conditions in array
     */
    discomfort_condition: string[];
};
//# sourceMappingURL=discomfort_index.d.ts.map