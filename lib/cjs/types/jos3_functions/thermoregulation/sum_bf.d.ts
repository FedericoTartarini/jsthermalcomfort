/**
 * Sum the total blood flow in various body parts.
 *
 * @param {math.MathCollection} bf_core - Blood flow rate in the core region [L/h].
 * @param {math.MathCollection} bf_muscle - Blood flow rate in the muscle region [L/h].
 * @param {math.MathCollection} bf_fat - Blood flow rate in the fat region [L/h].
 * @param {math.MathCollection} bf_skin - Blood flow rate in the skin region [L/h].
 * @param {number} bf_ava_hand - AVA blood flow rate in one hand [L/h].
 * @param {number} bf_ava_foot - AVA blood flow rate in one foot [L/h].
 *
 * @returns {number} co - Cardiac output (the sum of the whole blood flow rate) [L/h].
 */
export function sum_bf(bf_core: math.MathCollection, bf_muscle: math.MathCollection, bf_fat: math.MathCollection, bf_skin: math.MathCollection, bf_ava_hand: number, bf_ava_foot: number): number;
import * as math from "mathjs";
//# sourceMappingURL=sum_bf.d.ts.map