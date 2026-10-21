import { np_sum } from "../../_internal/numpy.ts";

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
  co += sum(bf_core);
  co += sum(bf_muscle);
  co += sum(bf_fat);
  co += sum(bf_skin);
  co += 2 * bf_ava_hand;
  co += 2 * bf_ava_foot;
  return co;
}

// `bf.sum()` as upstream calls it. `np_sum` reads a string as NaN, so a
// string throws first, as upstream raises (ADR 0012 as amended 2026-10-21):
// a string in place of an array raises Python's AttributeError, a TypeError
// here; a string element raises the TypeError numpy gives for an object array
// (pythermalcomfort 4.6.2;
// `.scratch/v2-models/wave-2/batch1-followup/implementer/d25_up.py`, `.out`).
function sum(bf: readonly number[]): number {
  if (typeof (bf as unknown) === "string") {
    throw new TypeError("'str' object has no attribute 'sum'");
  }
  if ((bf as readonly unknown[]).some((x) => typeof x === "string")) {
    throw new TypeError("unsupported operand type(s) for +: 'float' and 'str'");
  }
  return np_sum(bf);
}
