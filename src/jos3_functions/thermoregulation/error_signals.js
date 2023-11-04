import { $array, $map, $max, $min, $sum } from "../../supa.js";

/**
 * Calculate WRMS and CLDS signals of thermoregulation.
 *
 * @param {number[]} [err_sk=0] - Difference between set-point and skin temperatures [°C].
 * If array, its length should be 17.
 *
 * @returns {Object} Contains two arrays: `wrms` - Warm signal [°C]; `clds` - Cold signal [°C].
 */
export function error_signals(err_sk = $array(17, 0)) {
  let receptor = [
    0.0549, 0.0146, 0.1492, 0.1321, 0.2122, 0.0227, 0.0117, 0.0923, 0.0227,
    0.0117, 0.0923, 0.0501, 0.0251, 0.0167, 0.0501, 0.0251, 0.0167,
  ];

  let wrm = $max(err_sk, 0);
  wrm = $map([wrm, receptor], ([wrm, receptor]) => wrm * receptor);

  let cld = $min(err_sk, 0);
  cld = $map([cld, receptor], ([cld, receptor]) => -cld * receptor);

  return { wrms: $sum(wrm), clds: $sum(cld) };
}
