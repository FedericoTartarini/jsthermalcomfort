import { Default } from "../Default.ts";
import { error_signals } from "./error_signals.ts";
import { bfb_rate } from "../bfb_rate.ts";
import { ewa, full, py_max } from "../_numpy.ts";
import type { NumOrArray } from "../_numpy.ts";

/**
 * Calculate skin blood flow rate (bf_skin) [L/h]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:678-827` at v4.6.2).
 *
 * @param {number[]} err_cr - Difference between set-point and body temperatures [°C]; only the first value is read.
 * @param {number | number[]} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} age - age [years].
 * @param {number} ci - Cardiac index [L/min/㎡].
 *
 * @returns {number[]} bf_skin - Skin blood flow rate [L/h].
 */
export function skin_blood_flow(
  err_cr: readonly number[],
  err_sk: NumOrArray,
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
  ci: number,
): number[] {
  const { wrms, clds } = error_signals(err_sk);

  // BFBsk
  const bfb_sk = [
    1.754, 0.325, 1.967, 1.475, 2.272, 0.91, 0.508, 1.114, 0.91, 0.508, 1.114,
    1.456, 0.651, 0.934, 1.456, 0.651, 0.934,
  ];
  // SKIND
  const skin_dilat = [
    0.0692, 0.0992, 0.058, 0.0679, 0.0707, 0.04, 0.0373, 0.0632, 0.04, 0.0373,
    0.0632, 0.0736, 0.0411, 0.0623, 0.0736, 0.0411, 0.0623,
  ];
  // SKINC
  const skin_stric = [
    0.0213, 0.0213, 0.0638, 0.0638, 0.0638, 0.0213, 0.0213, 0.1489, 0.0213,
    0.0213, 0.1489, 0.0213, 0.0213, 0.1489, 0.0213, 0.0213, 0.1489,
  ];

  let sig_dilat = 100.5 * err_cr[0] + 6.4 * (wrms - clds);
  let sig_stric = -10.8 * err_cr[0] + -10.8 * (wrms - clds);
  sig_dilat = py_max(sig_dilat, 0);
  sig_stric = py_max(sig_stric, 0);

  // Signal decrement by aging
  const sd_dilat =
    age < 60
      ? full(Default.num_body_parts, 1)
      : [
          0.91, 0.91, 0.47, 0.47, 0.31, 0.47, 0.47, 0.47, 0.47, 0.47, 0.47,
          0.31, 0.31, 0.31, 0.31, 0.31, 0.31,
        ];
  const sd_stric = full(Default.num_body_parts, 1);

  // Skin blood flow [L/h]
  const bf_skin = ewa(
    (dil, sdd, str, sds, b, e) =>
      ((1 + dil * sdd * sig_dilat) / (1 + str * sds * sig_stric)) *
      b *
      2 ** (e / 6),
    skin_dilat,
    sd_dilat,
    skin_stric,
    sd_stric,
    bfb_sk,
    err_sk,
  );
  // Basal blood flow rate to the standard body [-]
  const bfbrate = bfb_rate(height, weight, bsa_equation, age, ci);
  return bf_skin.map((x) => x * bfbrate);
}
