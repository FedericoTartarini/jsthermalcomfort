import { Default } from "../Default.ts";
import { bfb_rate } from "../bfb_rate.ts";
import { np_average, py_max, py_min } from "../../_internal/numpy.ts";
import type { NumOrArray } from "../../_internal/numpy.ts";

/** AVA blood flow rate at hand and at foot [L/h]. */
export type AvaBloodFlowResult = [bf_ava_hand: number, bf_ava_foot: number];

// wave 2 D8: upstream returns a plain tuple (thermoregulation.py:890 at
// v4.6.2), an array here, in upstream's order, typed as a labelled tuple.

/**
 * Calculate areteriovenous anastmoses (AVA) blood flow rate [L/h] based on
 * Takemori's model, 1995
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:830-890` at v4.6.2).
 *
 * @param {number[]} err_cr - Difference between set-point and body temperatures [°C]; values 2 to 4 (chest, back, pelvis) are read.
 * @param {number[]} err_sk - Difference between set-point and body temperatures [°C], 17 values.
 * @param {number} height - Body height [m]
 * @param {number} weight - Body weight [kg]
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi"
 * @param {number} age - age [years]
 * @param {number} ci - Cardiac index [L/min/m2]
 *
 * @returns {[number, number]} AVA blood flow rate at hand and foot [L/h]
 *
 * @throws {TypeError} If err_cr has fewer than 5 values or err_sk is not
 * 17, as numpy's average raises.
 */
export function ava_blood_flow(
  err_cr: readonly number[],
  err_sk: NumOrArray,
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
  ci: number,
): AvaBloodFlowResult {
  // Cal. mean error body core temp.
  const cap_bcr = [10.2975, 9.3935, 4.488]; // Thermal capacity at chest, back and pelvis
  const err_bcr = np_average(err_cr.slice(2, 5), cap_bcr);

  // Cal. mean error skin temp.
  const err_msk = np_average(err_sk, Default.local_bsa);

  // Openness of AVA [-]
  let sig_ava_hand =
    0.265 * (err_msk + 0.43) + 0.953 * (err_bcr + 0.1905) + 0.9126;
  let sig_ava_foot =
    0.265 * (err_msk - 0.997) + 0.953 * (err_bcr + 0.0095) + 0.9126;

  sig_ava_hand = py_min(sig_ava_hand, 1);
  sig_ava_hand = py_max(sig_ava_hand, 0);
  sig_ava_foot = py_min(sig_ava_foot, 1);
  sig_ava_foot = py_max(sig_ava_foot, 0);

  // Basal blood flow rate to the standard body [-]
  const bfbrate = bfb_rate(height, weight, bsa_equation, age, ci);
  // AVA blood flow rate [L/h]
  const bf_ava_hand = 1.71 * bfbrate * sig_ava_hand; // Hand
  const bf_ava_foot = 2.16 * bfbrate * sig_ava_foot; // Foot
  return [bf_ava_hand, bf_ava_foot];
}
