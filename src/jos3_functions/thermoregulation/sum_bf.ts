import { np_sum, py_type_name } from "../../_internal/numpy.ts";

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
  co += sum(bf_core, true);
  co += sum(bf_muscle, false);
  co += sum(bf_fat, false);
  co += sum(bf_skin, false);
  co += 2 * bf_ava_hand;
  co += 2 * bf_ava_foot;
  return co;
}

// `bf.sum()` as upstream calls it. `np_sum` reads a non-numeric element as
// NaN or a number, so such an input throws first, as upstream raises (ADR
// 0012 as amended 2026-10-21): a string in place of an array raises Python's
// AttributeError, a TypeError here; an array with an element that is not a
// number or a boolean raises the TypeError numpy gives for an object array,
// which adds the elements left to right from element 0 with Python's `+`
// (pythermalcomfort 4.6.2;
// `.scratch/v2-models/wave-2/batch1-followup/implementer/d25_up.py`,
// `.scratch/v2-models/wave-2/batch1-followup/p1/p1_up.py`, `.out`). A sum
// that is not a number (an array with no number in it) raises at upstream's
// `co += ...`, where `co` is the int 0 before bf_core's sum and a numpy
// float64 after it; for a string sum numpy raises a UFuncTypeError, a
// TypeError subclass, and the message here is Python's for a float, as ADR
// 0012 makes the class the contract
// (`.scratch/v2-models/wave-2/batch1-followup/p1/p1_residual_up.py`, `.out`).
// A list sum after bf_core goes to `np_sum`, where upstream broadcasts it to
// an array: an open point in ticket 25. Any other value goes to `np_sum` as
// before.
function sum(bf: readonly number[], first: boolean): number {
  if (typeof (bf as unknown) === "string") {
    throw new TypeError("'str' object has no attribute 'sum'");
  }
  const elements = bf as readonly unknown[];
  if (Array.isArray(elements) && !elements.every(is_numeric)) {
    const total = elements.reduce(py_add);
    if (first) {
      throw new TypeError(
        `unsupported operand type(s) for +=: 'int' and '${py_type_name(total)}'`,
      );
    }
    if (!Array.isArray(total)) {
      throw new TypeError(
        `unsupported operand type(s) for +: 'float' and '${py_type_name(total)}'`,
      );
    }
  }
  return np_sum(bf);
}

function is_numeric(x: unknown): x is number | boolean {
  return typeof x === "number" || typeof x === "boolean";
}

// Python's `a + b` for the values an element can be. A number is named
// "float": a JS number has no int/float distinction (ADR 0001's first reason),
// and ADR 0001 as amended 2026-10-21 (D21) compares a JS number with the
// equivalent Python float.
function py_add(a: unknown, b: unknown): unknown {
  if (is_numeric(a) && is_numeric(b)) return Number(a) + Number(b);
  if (typeof a === "string" && typeof b === "string") return a + b;
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  const name = (x: unknown) =>
    typeof x === "number" ? "float" : py_type_name(x);
  if (typeof a === "string" || Array.isArray(a)) {
    throw new TypeError(
      `can only concatenate ${name(a)} (not "${name(b)}") to ${name(a)}`,
    );
  }
  throw new TypeError(
    `unsupported operand type(s) for +: '${name(a)}' and '${name(b)}'`,
  );
}
