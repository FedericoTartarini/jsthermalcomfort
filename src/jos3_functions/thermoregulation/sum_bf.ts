import { np_sum } from "../_numpy.ts";

/**
 * Sum the total blood flow in various body parts
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:1523-1554` at v4.6.2).
 *
 * @param {number[]} bf_core - Blood flow rate in the core region [L/h].
 * @param {number[]} bf_muscle - Blood flow rate in the muscle region [L/h].
 * @param {number[]} bf_fat - Blood flow rate in the fat region [L/h].
 * @param {number[]} bf_skin - Blood flow rate in the skin region [L/h].
 * @param {number} bf_ava_hand - AVA blood flow rate in one hand [L/h].
 * @param {number} bf_ava_foot - AVA blood flow rate in one foot [L/h].
 *
 * @returns {number} co - Cardiac output (the sum of the whole blood flow rate) [L/h].
 */
export function sum_bf(
  bf_core: readonly number[],
  bf_muscle: readonly number[],
  bf_fat: readonly number[],
  bf_skin: readonly number[],
  bf_ava_hand: number,
  bf_ava_foot: number,
): number {
  // Cardiac output (CO)
  let co = 0;
  co += np_sum(bf_core);
  co += np_sum(bf_muscle);
  co += np_sum(bf_fat);
  co += np_sum(bf_skin);
  co += 2 * bf_ava_hand;
  co += 2 * bf_ava_foot;
  return co;
}
