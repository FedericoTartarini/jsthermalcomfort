import { Default } from "../Default.ts";
import { basal_met } from "./basal_met.ts";
import type { JOS3BmrEquation } from "./basal_met.ts";

/** Local basal metabolic rate [W] of the core, muscle, fat and skin layers. */
export type LocalMbaseResult = [
  mbase_cr: number[],
  mbase_ms: number[],
  mbase_fat: number[],
  mbase_sk: number[],
];

// jos3 D8: upstream returns a plain tuple (thermoregulation.py:1081 at
// v4.6.2), an array here, in upstream's order, typed as a labelled tuple.
/**
 * Calculate local basal metabolic rate [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:961-1081` at v4.6.2).
 *
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {number} [age=20] - Age [years].
 * @param {string} [sex='male'] - Sex (male or female).
 * @param {JOS3BmrEquation} [bmr_equation='harris-benedict'] - BMR equation to use (harris-benedict, harris-benedict_origin, japanese or ganpule).
 *
 * @returns {[number[], number[], number[], number[]]} mbase - Local basal metabolic rate (Mbase) [W] of the core, muscle, fat and skin layers.
 */
export function local_mbase(
  height: number = Default.height,
  weight: number = Default.weight,
  age: number = Default.age,
  sex: string = Default.sex,
  bmr_equation: JOS3BmrEquation = Default.bmr_equation as JOS3BmrEquation,
): LocalMbaseResult {
  const mbase_all = basal_met(height, weight, age, sex, bmr_equation);
  // Distribution coefficient of basal metabolic rate
  const mbf_cr = [
    0.19551, 0.00324, 0.28689, 0.25677, 0.09509, 0.01435, 0.00409, 0.00106,
    0.01435, 0.00409, 0.00106, 0.01557, 0.00422, 0.0025, 0.01557, 0.00422,
    0.0025,
  ];
  const mbf_ms = [
    0.00252, 0.0, 0.0, 0.0, 0.04804, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0,
  ];
  const mbf_fat = [
    0.00127, 0.0, 0.0, 0.0, 0.0095, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ];
  const mbf_sk = [
    0.00152, 0.00033, 0.00211, 0.00187, 0.003, 0.00059, 0.00031, 0.00059,
    0.00059, 0.00031, 0.00059, 0.00144, 0.00027, 0.00118, 0.00144, 0.00027,
    0.00118,
  ];

  const mbase_cr = mbf_cr.map((x) => x * mbase_all);
  const mbase_ms = mbf_ms.map((x) => x * mbase_all);
  const mbase_fat = mbf_fat.map((x) => x * mbase_all);
  const mbase_sk = mbf_sk.map((x) => x * mbase_all);
  return [mbase_cr, mbase_ms, mbase_fat, mbase_sk];
}
