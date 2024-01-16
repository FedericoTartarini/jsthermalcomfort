import JOS3Defaults from "../JOS3Defaults.js";
import { error_signals } from "./error_signals.js";
import { bsa_rate } from "../bsa_rate.js";
import * as math from "mathjs";

export let PRE_SHIV = 0;

/**
 * Sets the value of PRE_SHIV.
 *
 * @param {number} value - the value to set PRE_SHIV to
 */
export function set_pre_shiv(value) {
  PRE_SHIV = value;
}

/**
 * Calculate local thermogenesis by shivering [W].
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} t_core - Core and skin temperatures [°C].
 * @param {math.MathCollection} t_skin - Core and skin temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {string} [sex="male"] - Choose male or female.
 * @param {number} [dtime=60] - Interval of analysis time.
 * @param {object} options - Additional options.
 *
 * @returns {math.MathCollection} q_shiv - Local thermogenesis by shivering [W].
 */
export function shivering(
  err_cr,
  err_sk,
  t_core,
  t_skin,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
  sex = JOS3Defaults.sex,
  dtime = 60,
  options = {},
) {
  // Integrated error signal in the warm and cold receptors
  let { clds } = error_signals(err_sk);

  // Distribution coefficient of thermogenesis by shivering
  let shivf = math.matrix([
    0.0339, 0.0436, 0.27394, 0.24102, 0.38754, 0.00243, 0.00137, 0.0002,
    0.00243, 0.00137, 0.0002, 0.0039, 0.00175, 0.00035, 0.0039, 0.00175,
    0.00035,
  ]);

  // Integrated error signal of shivering
  let sig_shiv = 24.36 * clds * -err_cr.get([0]);
  sig_shiv = Math.max(sig_shiv, 0);

  if (options["shivering_threshold"]) {
    // Asaka, 2016
    // Threshold of starting shivering
    let tskm =
      math.sum(math.dotMultiply(t_skin, JOS3Defaults.local_bsa)) /
      math.sum(JOS3Defaults.local_bsa);

    let thres;

    if (tskm < 31) {
      thres = 36.6;
    } else {
      thres = sex === "male" ? -0.2436 * tskm + 44.1 : -0.225 * tskm + 43.05;
    }

    // Second threshold of starting shivering
    if (thres < t_core.get([0])) {
      sig_shiv = 0;
    }
  }

  if (options["limit_dshiv/dt"]) {
    let dshiv = sig_shiv - PRE_SHIV;
    let limit_dshiv =
      options["limit_dshiv/dt"] === true
        ? 0.0077 * dtime
        : options["limit_dshiv/dt"] * dtime;

    if (dshiv > limit_dshiv) {
      sig_shiv = limit_dshiv + PRE_SHIV;
    } else if (dshiv < -limit_dshiv) {
      sig_shiv = -limit_dshiv + PRE_SHIV;
    }
  }

  PRE_SHIV = sig_shiv;

  // Signal sd_shiv by aging
  let sd_shiv;
  if (age < 30) {
    sd_shiv = math.ones(17);
  } else if (age < 40) {
    sd_shiv = math.multiply(math.ones(17), 0.97514);
  } else if (age < 50) {
    sd_shiv = math.multiply(math.ones(17), 0.95028);
  } else if (age < 60) {
    sd_shiv = math.multiply(math.ones(17), 0.92818);
  } else if (age < 70) {
    sd_shiv = math.multiply(math.ones(17), 0.90055);
  } else if (age < 80) {
    sd_shiv = math.multiply(math.ones(17), 0.86188);
  } else {
    sd_shiv = math.multiply(math.ones(17), 0.82597);
  }

  // Ratio of body surface area to the standard body [-]
  let bsar = bsa_rate(height, weight, bsa_equation);

  // Local thermogenesis by shivering [W]
  let q_shiv = math.dotMultiply(
    math.dotMultiply(math.dotMultiply(shivf, bsar), sd_shiv),
    sig_shiv,
  );
  let x = q_shiv + 1;
  return q_shiv;
}
