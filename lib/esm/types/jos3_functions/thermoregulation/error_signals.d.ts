/**
 * @typedef ErrorSignalsResult
 * @type {object}
 * @property {number} wrms - Warm signal [°C].
 * @property {number} clds - Cold signal [°C].
 */
/**
 * Calculate WRMS and CLDS signals of thermoregulation.
 *
 * @param {math.MathCollection} [err_sk=0] - Difference between set-point and skin temperatures [°C].
 * If the provided value is an array, its length should be 17.
 *
 * @returns {ErrorSignalsResult} an object containing the results of the calculation.
 */
export function error_signals(err_sk?: math.MathCollection): ErrorSignalsResult;
export type ErrorSignalsResult = {
    /**
     * - Warm signal [°C].
     */
    wrms: number;
    /**
     * - Cold signal [°C].
     */
    clds: number;
};
import * as math from "mathjs";
//# sourceMappingURL=error_signals.d.ts.map