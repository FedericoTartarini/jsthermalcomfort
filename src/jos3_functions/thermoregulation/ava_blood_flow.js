import { $average } from "../../supa";
import JOS3Defaults from "../JOS3Defaults";
import { bfb_rate } from "../bfb_rate";

/**
 * Calculate areteriovenous anastmoses (AVA) blood flow rate [L/h] based on
 * Takemori's model, 1995.
 *
 * @param {number[]} err_cr - Difference between set-point and body temperatures [°C].
 * @param {number[]} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m]
 * @param {number} [weight=74.43] - Body weight [kg]
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi"
 * @param {number} [age=20] - age [years]
 * @param {number} [ci=2.59] - Cardiac index [L/min/m2]
 * @returns {[number, number]}  bf_ava_hand, bf_ava_foot : AVA blood flow rate at hand and foot [L/h]
 *
 */
export function ava_blood_flow(
  err_cr,
  err_sk,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
  ci = JOS3Defaults.cardiac_index,
) {
  // Cal. mean error body core temp.
  let cap_bcr = [10.2975, 9.3935, 4.488];
  let err_bcr = $average(err_cr.slice(2, 5), cap_bcr);

  // Cal. mean error skin temp.
  let err_msk = $average(err_sk, JOS3Defaults.local_bsa);

  // Openness of AVA [-]
  let sig_ava_hand =
    0.265 * (err_msk + 0.43) + 0.953 * (err_bcr + 0.1905) + 0.9126;
  let sig_ava_foot =
    0.265 * (err_msk - 0.997) + 0.953 * (err_bcr + 0.0095) + 0.9126;

  sig_ava_hand = Math.min(sig_ava_hand, 1);
  sig_ava_hand = Math.max(sig_ava_hand, 0);
  sig_ava_foot = Math.min(sig_ava_foot, 1);
  sig_ava_foot = Math.max(sig_ava_foot, 0);

  // Basal blood flow rate to the standard body [-]
  let bfbrate = bfb_rate(height, weight, bsa_equation, age, ci);

  // AVA blood flow rate [L/h]
  let bf_ava_hand = 1.71 * bfbrate * sig_ava_hand;
  let bf_ava_foot = 2.16 * bfbrate * sig_ava_foot;

  return { bf_ava_hand, bf_ava_foot };
}
