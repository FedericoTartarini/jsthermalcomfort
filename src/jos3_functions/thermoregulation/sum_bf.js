/**
 * Sum the total blood flow in various body parts.
 *
 * @param {number[]} bf_core - Blood flow rate in the core region [L/h].
 * @param {number[]} bf_muscle - Blood flow rate in the muscle region [L/h].
 * @param {number[]} bf_fat - Blood flow rate in the fat region [L/h].
 * @param {number[]} bf_skin - Blood flow rate in the skin region [L/h].
 * @param {number} bf_ava_hand - AVA blood flow rate in one hand [L/h].
 * @param {number} bf_ava_foot - AVA blood flow rate in one foot [L/h].
 *
 * @returns {float} co - Cardiac output (the sum of the whole blood flow rate) [L/h].
 */
export function sum_bf(
  bf_core,
  bf_muscle,
  bf_fat,
  bf_skin,
  bf_ava_hand,
  bf_ava_foot,
) {
  let co = 0;
  co += bf_core.reduce((t, c) => t + c, 0);
  co += bf_muscle.reduce((t, c) => t + c, 0);
  co += bf_fat.reduce((t, c) => t + c, 0);
  co += bf_skin.reduce((t, c) => t + c, 0);
  co += 2 * bf_ava_hand;
  co += 2 * bf_ava_foot;
  return co;
}
