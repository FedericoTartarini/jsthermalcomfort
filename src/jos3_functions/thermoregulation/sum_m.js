import { BODY_NAMES, IDICT } from "../matrix";
import { $map } from "../../supa";

/**
 * Calculate total thermogenesis in each layer [W].
 *
 * @param {number[][]} mbase - Local basal metabolic rate (Mbase) [W].
 * @param {number[]} q_work - Local thermogenesis by work [W].
 * @param {number[]} q_shiv - Local thermogenesis by shivering [W].
 * @param {number[]} q_nst - Local thermogenesis by non-shivering [W].

 * @return {number[][]} q_thermogenesis_core, q_thermogenesis_muscle, q_thermogenesis_fat, q_thermogenesis_skin - Total thermogenesis in core, muscle, fat, skin layers [W].
 */
export function sum_m(mbase, q_work, q_shiv, q_nst) {
  let [
    q_thermogenesis_core,
    q_thermogenesis_muscle,
    q_thermogenesis_fat,
    q_thermogenesis_skin,
  ] = mbase;

  for (let i = 0; i < BODY_NAMES.length; i++) {
    let bn = BODY_NAMES[i];

    if (IDICT[bn]["muscle"] !== null) {
      q_thermogenesis_muscle[i] += q_work[i] + q_shiv[i];
    } else {
      q_thermogenesis_core[i] += q_work[i] + q_shiv[i];
    }
  }

  q_thermogenesis_core = $map(
    [q_thermogenesis_core, q_nst],
    ([q_thermogenesis_core, q_nst]) => q_thermogenesis_core + q_nst,
  );

  return [
    q_thermogenesis_core,
    q_thermogenesis_muscle,
    q_thermogenesis_fat,
    q_thermogenesis_skin,
  ];
}
