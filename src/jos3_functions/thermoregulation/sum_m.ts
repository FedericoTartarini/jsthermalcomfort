import { IDICT } from "../matrix.ts";
import { BODY_NAMES } from "../_body_parts.ts";

/** Total thermogenesis in the core, muscle, fat and skin layers [W]. */
export type SumMResult = [
  q_thermogenesis_core: number[],
  q_thermogenesis_muscle: number[],
  q_thermogenesis_fat: number[],
  q_thermogenesis_skin: number[],
];

// jos3 D8: upstream returns a plain tuple (thermoregulation.py:1397-1402 at
// v4.6.2), an array here, in upstream's order, typed as a labelled tuple.

/**
 * Calculate total thermogenesis in each layer [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1365-1402` at v4.6.2).
 *
 * @param {[number[], number[], number[], number[]]} mbase - Local basal metabolic rate (Mbase) [W], as `local_mbase` returns it. Not changed.
 * @param {number[]} q_work - Local thermogenesis by work [W].
 * @param {number[]} q_shiv - Local thermogenesis by shivering [W].
 * @param {number[]} q_nst - Local thermogenesis by non-shivering [W].
 *
 * @return {[number[], number[], number[], number[]]} Total thermogenesis in core, muscle, fat, skin layers [W].
 */
export function sum_m(
  mbase: readonly (readonly number[])[],
  q_work: readonly number[],
  q_shiv: readonly number[],
  q_nst: readonly number[],
): SumMResult {
  const q_thermogenesis_core = mbase[0].slice();
  const q_thermogenesis_muscle = mbase[1].slice();
  const q_thermogenesis_fat = mbase[2].slice();
  const q_thermogenesis_skin = mbase[3].slice();

  BODY_NAMES.forEach((bn, i) => {
    // If the segment has a muscle layer, muscle thermogenesis increases by the activity.
    if (IDICT[bn].muscle !== null) {
      q_thermogenesis_muscle[i] += q_work[i] + q_shiv[i];
    }
    // In other segments, core thermogenesis increase, instead of muscle.
    else {
      q_thermogenesis_core[i] += q_work[i] + q_shiv[i];
    }
  });
  // Non-shivering thermogenesis occurs in core layers
  const core = q_thermogenesis_core.map((x, i) => x + q_nst[i]);
  return [
    core,
    q_thermogenesis_muscle,
    q_thermogenesis_fat,
    q_thermogenesis_skin,
  ];
}
