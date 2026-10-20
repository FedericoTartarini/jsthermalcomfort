import { bfb_rate } from "../bfb_rate.ts";
import { IDICT } from "../matrix.ts";
import { BODY_NAMES } from "../_body_parts.ts";

/** Core, muscle and fat blood flow rate [L/h]. */
export type CrMsFatBloodFlowResult = [
  bf_core: number[],
  bf_muscle: number[],
  bf_fat: number[],
];

// jos3 D8: upstream returns a plain tuple (thermoregulation.py:1520 at
// v4.6.2), an array here, in upstream's order, typed as a labelled tuple.

/**
 * Calculate core, muscle and fat blood flow rate [L/h]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1405-1520` at v4.6.2).
 *
 * @param {number[]} q_work - Heat production by work [W].
 * @param {number[]} q_shiv - Heat production by shivering [W].
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose from "dubois","takahira", "fujimoto", or "kurazumi".
 * @param {number} age - Age [years].
 * @param {number} ci - Cardiac index [L/min/㎡].
 *
 * @returns {[number[], number[], number[]]} - Core, muscle and fat blood flow rate [L/h].
 */
export function cr_ms_fat_blood_flow(
  q_work: readonly number[],
  q_shiv: readonly number[],
  height: number,
  weight: number,
  bsa_equation: string,
  age: number,
  ci: number,
): CrMsFatBloodFlowResult {
  // Basal blood flow rate [L/h]
  // core, CBFB
  const bfb_core = [
    35.251, 15.24, 89.214, 87.663, 18.686, 1.808, 0.94, 0.217, 1.808, 0.94,
    0.217, 1.406, 0.164, 0.08, 1.406, 0.164, 0.08,
  ];
  // muscle, MSBFB
  const bfb_muscle = [
    0.682, 0.0, 0.0, 0.0, 12.614, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ];
  // fat, FTBFB
  const bfb_fat = [
    0.265, 0.0, 0.0, 0.0, 2.219, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ];

  const bfbrate = bfb_rate(height, weight, bsa_equation, age, ci);
  const bf_core = bfb_core.map((x) => x * bfbrate);
  const bf_muscle = bfb_muscle.map((x) => x * bfbrate);
  const bf_fat = bfb_fat.map((x) => x * bfbrate);

  BODY_NAMES.forEach((bn, i) => {
    // If the segment has a muscle layer, muscle blood flow increases.
    if (IDICT[bn].muscle !== null) {
      bf_muscle[i] += (q_work[i] + q_shiv[i]) / 1.163;
    }
    // In other segments, core blood flow increase, instead of muscle blood flow.
    else {
      bf_core[i] += (q_work[i] + q_shiv[i]) / 1.163;
    }
  });
  return [bf_core, bf_muscle, bf_fat];
}
