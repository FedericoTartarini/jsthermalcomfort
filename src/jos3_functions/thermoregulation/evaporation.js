import JOS3Defaults from "../JOS3Defaults.js";
import { error_signals } from "./error_signals.js";
import { bsa_rate } from "../bsa_rate.js";
import * as math from "mathjs";

/**
 * Calculates the Antoine equation for a given temperature value.
 *
 * @param {number} x - The temperature value in Kelvin.
 * @returns {number} - The vapor pressure calculated using the Antoine equation.
 */
export const antoine = (x) => Math.E ** (16.6536 - 4030.183 / (x + 235));

/**
 * @typedef EvaporationResult
 * @type {object}
 * @property {math.MathCollection} wet - Local skin wettedness [-].
 * @property {math.MathCollection} e_sk - Evaporative heat loss at the skin by sweating and diffuse [W].
 * @property {math.MathCollection} e_max - Maximum evaporative heat loss at the skin [W].
 * @property {math.MathCollection} e_sweat - Evaporative heat loss at the skin by only sweating [W].
 */

/**
 * Calculate evaporative heat loss.
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} t_skin - Skin temperatures [°C].
 * @param {math.MathCollection} tdb - Air temperatures at local body segments [°C].
 * @param {math.MathCollection} rh - Relative humidity at local body segments [%].
 * @param {math.MathCollection} ret - Total evaporative thermal resistances [m2.K/W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 *
 * @returns {EvaporationResult} an object containing the results of the calculation.
 */
export function evaporation(
  err_cr,
  err_sk,
  t_skin,
  tdb,
  rh,
  ret,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
) {
  let { wrms, clds } = error_signals(err_sk);
  let bsar = bsa_rate(height, weight, bsa_equation);
  let bsa = JOS3Defaults.local_bsa.map((local_bsa) => local_bsa * bsar);

  let p_a = math.dotDivide(math.dotMultiply(tdb.map(antoine), rh), 100);
  let p_sk_s = t_skin.map(antoine);

  let e_max = math.dotMultiply(
    math.dotDivide(math.subtract(p_sk_s, p_a), ret),
    bsa,
  );

  e_max = e_max.map((e_max) => (e_max === 0 ? 0.001 : e_max));

  let skin_sweat = [
    0.064, 0.017, 0.146, 0.129, 0.206, 0.051, 0.026, 0.0155, 0.051, 0.026,
    0.0155, 0.073, 0.036, 0.0175, 0.073, 0.036, 0.0175,
  ];

  let sig_sweat = 371.2 * err_cr[0] + 33.64 * (wrms - clds);
  sig_sweat = sig_sweat > 0 ? sig_sweat : 0;
  sig_sweat *= bsar;

  let sd_sweat =
    age < 60
      ? math.ones(17)
      : math.matrix([
          0.69, 0.69, 0.59, 0.52, 0.4, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.4,
          0.4, 0.4, 0.4, 0.4, 0.4,
        ]);

  let e_sweat = math.multiply(
    skin_sweat,
    sig_sweat,
    sd_sweat,
    math.dotPow(2, math.divide(err_sk, 10)),
  );

  let wet = math.add(0.06, math.multiply(0.94, math.dotDivide(e_sweat, e_max)));
  wet = wet.map((n) => (n > 1 ? 1 : n));

  let e_sk = math.dotMultiply(wet, e_max);

  e_sweat = math.dotMultiply(
    math.divide(math.subtract(wet, 0.06), 0.94),
    e_max,
  );

  return { wet, e_sk, e_max, e_sweat };
}
