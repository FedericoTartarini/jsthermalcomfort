import JOS3Defaults from "../JOS3Defaults.js";
import { bfb_rate } from "../bfb_rate.js";
import { BODY_NAMES, IDICT } from "../matrix.js";
import * as math from "mathjs";

/**
 * @typedef CrMsFatBloodFlowResult
 * @type {object}
 * @property {math.MathCollection} bf_core - Core blood flow rate [L/h].
 * @property {math.MathCollection} bf_muscle - Muscle blood flow rate [L/h].
 * @property {math.MathCollection} bf_fat - Fat blood flow rate [L/h].
 */

/**
 * Calculate core, muscle and fat blood flow rate [L/h].
 *
 * @param {math.MathCollection} q_work - Heat production by work [W].
 * @param {math.MathCollection} q_shiv - Heat production by shivering [W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose from "dubois","takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - Age [years].
 * @param {number} [ci=2.59] - Cardiac index [L/min/㎡].
 *
 * @returns {CrMsFatBloodFlowResult} - Core, muscle and fat blood flow rate [L/h].
 */
export function cr_ms_fat_blood_flow(
  q_work,
  q_shiv,
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  bsa_equation = JOS3Defaults.bsa_equation,
  age = JOS3Defaults.age,
  ci = JOS3Defaults.cardiac_index,
) {
  // Basal blood flow rate [L/h]
  // core, CBFB
  let bfb_core = math.matrix([
    35.251, 15.24, 89.214, 87.663, 18.686, 1.808, 0.94, 0.217, 1.808, 0.94,
    0.217, 1.406, 0.164, 0.08, 1.406, 0.164, 0.08,
  ]);

  // muscle, MSBFB
  let bfb_muscle = math.matrix([
    0.682, 0.0, 0.0, 0.0, 12.614, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ]);

  // fat, FTBFB
  let bfb_fat = math.matrix([
    0.265, 0.0, 0.0, 0.0, 2.219, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ]);

  let bfbrate = bfb_rate(height, weight, bsa_equation, age, ci);
  let bf_core = math.dotMultiply(bfb_core, bfbrate);
  let bf_muscle = math.dotMultiply(bfb_muscle, bfbrate);
  let bf_fat = math.dotMultiply(bfb_fat, bfbrate);

  for (let i = 0; i < BODY_NAMES.length; i++) {
    let bn = BODY_NAMES[i];

    if (IDICT[bn]["muscle"] !== null) {
      bf_muscle.set(
        [i],
        bf_muscle.get([i]) + (q_work.get([i]) + q_shiv.get([i])) / 1.163,
      );
    } else {
      bf_core.set(
        [i],
        bf_core.get([i]) + (q_work.get([i]) + q_shiv.get([i])) / 1.163,
      );
    }
  }

  return { bf_core, bf_muscle, bf_fat };
}
