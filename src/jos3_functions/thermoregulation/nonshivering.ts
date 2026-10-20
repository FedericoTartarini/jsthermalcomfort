import { error_signals } from "./error_signals.ts";
import { bsa_rate } from "../bsa_rate.ts";
import { py_min } from "../_numpy.ts";
import type { NumOrArray } from "../_numpy.ts";

/**
 * Calculate local metabolic rate by non-shivering [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1260-1362` at v4.6.2).
 *
 * @param {number | number[]} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} age - age [years].
 * @param {boolean} [cold_acclimation=false] - Whether the subject acclimates cold environment or not.
 * @param {boolean} [batpositive=true] - Whether BAT activity is positive or not.
 *
 * @returns {number[]} q_nst - Local metabolic rate by non-shivering [W].
 */
export function nonshivering(
  err_sk: NumOrArray,
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
  cold_acclimation: boolean = false,
  batpositive: boolean = true,
): number[] {
  // NST (Non-Shivering Thermogenesis) model, Asaka, 2016
  const { clds } = error_signals(err_sk);

  // BMI (Body Mass Index)
  const bmi = weight / height ** 2;

  // BAT: brown adipose tissue [SUV]
  let bat = 10 ** (-0.10502 * bmi + 2.7708);

  // age factor
  if (age < 30) {
    bat *= 1.61;
  } else if (age < 40) {
    bat *= 1.0;
  } else {
    // age >= 40
    bat *= 0.8;
  }

  if (cold_acclimation) {
    bat += 3.46;
  }

  if (!batpositive) {
    // incidence age factor: T.Yoneshiro 2011
    if (age < 30) {
      // age = 20s or younger
      bat *= 44 / 83;
    } else if (age < 40) {
      // age = 30s
      bat *= 15 / 38;
    } else if (age < 50) {
      // age = 40s
      bat *= 7 / 26;
    } else if (age < 60) {
      // age = 50s
      bat *= 1 / 8;
    } else {
      // age > 60
      bat *= 0;
    }
  }

  // NST limit
  const thres = 1.8 * bat + 2.43 + 5.62; // [W]

  let sig_nst = 2.8 * clds; // [W]
  sig_nst = py_min(sig_nst, thres);

  // Distribution coefficient of thermogenesis by non-shivering
  const nstf = [
    0.0, 0.19, 0.0, 0.19, 0.19, 0.215, 0.0, 0.0, 0.215, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ];

  // Ratio of body surface area to the standard body [-]
  const bsar = bsa_rate(height, weight, bsa_equation);

  // Local thermogenesis by non-shivering [W]
  return nstf.map((n) => bsar * n * sig_nst);
}
