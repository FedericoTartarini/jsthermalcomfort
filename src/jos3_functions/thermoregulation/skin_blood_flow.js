import { $array, $map } from "../../supa.js";
import JOS3Defaults from "../JOS3Defaults.js";
import { error_signals } from "./error_signals.js";
import { bfb_rate } from "../bfb_rate.js";

/**
 * Calculate skin blood flow rate (bf_skin) [L/h].
 * @param {number[]} err_cr, err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {number} [ci=2.59] - Cardiac index [L/min/㎡].
 * @returns {number[]} bf_skin - Skin blood flow rate [L/h].
 */
export function skin_blood_flow(
  err_cr,
  err_sk,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
  ci = JOS3Defaults.cardiac_index,
) {
  let { wrms, clds } = error_signals(err_sk);

  let bfb_sk = [
    1.754, 0.325, 1.967, 1.475, 2.272, 0.91, 0.508, 1.114, 0.91, 0.508, 1.114,
    1.456, 0.651, 0.934, 1.456, 0.651, 0.934,
  ];

  let skin_dilat = [
    0.0692, 0.0992, 0.058, 0.0679, 0.0707, 0.04, 0.0373, 0.0632, 0.04, 0.0373,
    0.0632, 0.0736, 0.0411, 0.0623, 0.0736, 0.0411, 0.0623,
  ];

  let skin_stric = [
    0.0213, 0.0213, 0.0638, 0.0638, 0.0638, 0.0213, 0.0213, 0.1489, 0.0213,
    0.0213, 0.1489, 0.0213, 0.0213, 0.1489, 0.0213, 0.0213, 0.1489,
  ];

  let sig_dilat = 100.5 * err_cr[0] + 6.4 * (wrms - clds);
  sig_dilat = sig_dilat > 0 ? sig_dilat : 0;

  let sig_stric = -10.8 * err_cr[0] + -10.8 * (wrms - clds);
  sig_stric = sig_stric > 0 ? sig_stric : 0;

  let sd_stric = $array(17, 1);
  let sd_dilat =
    age < 60
      ? $array(17, 1)
      : [
          0.91, 0.91, 0.47, 0.47, 0.31, 0.47, 0.47, 0.47, 0.47, 0.47, 0.47,
          0.31, 0.31, 0.31, 0.31, 0.31, 0.31,
        ];

  let bf_skin = $map(
    [skin_dilat, sd_dilat, skin_stric, sd_stric, bfb_sk, err_sk],
    ([skin_dilat, sd_dilat, skin_stric, sd_stric, bfb_sk, err_sk]) =>
      ((1 + skin_dilat * sd_dilat * sig_dilat) /
        (1 + skin_stric * sd_stric * sig_stric)) *
      bfb_sk *
      2 ** (err_sk / 6),
  );

  let bfb = bfb_rate(height, weight, bsa_equation, age, ci);
  return bf_skin.map((bf_skin) => bf_skin * bfb);
}
