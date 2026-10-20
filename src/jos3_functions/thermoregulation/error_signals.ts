import { ewa, np_sum } from "../_numpy.ts";
import type { NumOrArray } from "../_numpy.ts";

/**
 * @typedef ErrorSignalsResult
 * @type {object}
 * @property {number} wrms - Warm signal [°C].
 * @property {number} clds - Cold signal [°C].
 */
export type ErrorSignalsResult = { wrms: number; clds: number };

/**
 * Calculate WRMS and CLDS signals of thermoregulation
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:491-536` at v4.6.2).
 *
 * @param {number | number[]} [err_sk=0] - Difference between set-point and skin temperatures [°C].
 * If the provided value is an array, its length should be 17.
 *
 * @returns {ErrorSignalsResult} an object containing the results of the calculation.
 *
 * @throws {Error} If err_sk is an array of another length, as numpy's
 * broadcasting raises a ValueError.
 */
export function error_signals(err_sk: NumOrArray = 0.0): ErrorSignalsResult {
  // SKINR (Distribution coefficients of thermal receptor) [-]
  const receptor = [
    0.0549, 0.0146, 0.1492, 0.1321, 0.2122, 0.0227, 0.0117, 0.0923, 0.0227,
    0.0117, 0.0923, 0.0501, 0.0251, 0.0167, 0.0501, 0.0251, 0.0167,
  ];

  // wrms signal: np.maximum(err_sk, 0) * receptor. Math.max returns what
  // np.maximum does for a NaN (NaN) and for -0.0 against 0 (0.0).
  const wrm = ewa((e, r) => Math.max(e, 0) * r, err_sk, receptor);
  const wrms = np_sum(wrm);

  // clds signal: np.minimum(err_sk, 0) * -receptor
  const cld = ewa((e, r) => Math.min(e, 0) * -r, err_sk, receptor);
  const clds = np_sum(cld);
  return { wrms, clds };
}
