import JOS3Defaults from "../JOS3Defaults.js";
import { error_signals } from "./error_signals.js";
import { bsa_rate } from "../bsa_rate.js";
import * as math from "mathjs";

/**
 * Calculate local metabolic rate by non-shivering [W]
 *
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {boolean} [cold_acclimation=false] - Whether the subject acclimates cold environment or not.
 * @param {boolean} [batpositive=true] - Whether BAT activity is positive or not.
 *
 * @returns {math.MathCollection} q_nst - Local metabolic rate by non-shivering [W].
 */
export function nonshivering(
  err_sk,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
  cold_acclimation = false,
  batpositive = true,
) {
  // NST (Non-Shivering Thermogenesis) model, Asaka, 2016
  let { clds } = error_signals(err_sk);

  // BMI (Body Mass Index)
  let bmi = weight / height ** 2;

  // BAT: brown adipose tissue [SUV]
  let bat = 10 ** (-0.10502 * bmi + 2.7708);

  if (age < 30) {
    bat *= 1.61;
  } else if (age < 40) {
    bat *= 1.0;
  } else {
    bat *= 0.8;
  }

  if (cold_acclimation) {
    bat += 3.46;
  }

  if (!batpositive) {
    // incidence age factor: T.Yoneshiro 2011
    if (age < 30) {
      bat *= 44 / 83;
    } else if (age < 40) {
      bat *= 15 / 38;
    } else if (age < 50) {
      bat *= 7 / 26;
    } else if (age < 60) {
      bat *= 1 / 8;
    } else {
      bat *= 0;
    }
  }

  // NST limit
  let thres = 1.8 * bat + 2.43 + 5.62; // [W]

  let sig_nst = 2.8 * clds; // [W]
  sig_nst = Math.min(sig_nst, thres);

  let nstf = math.matrix([
    0.0, 0.19, 0.0, 0.19, 0.19, 0.215, 0.0, 0.0, 0.215, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ]);

  let bsar = bsa_rate(height, weight, bsa_equation);
  return math.dotMultiply(math.dotMultiply(bsar, nstf), sig_nst);
}
