import { Default } from "./Default.ts";
import { BODY_NAMES } from "./_body_parts.ts";
import type { JOS3BodyParts } from "./_body_parts.ts";
import { key_error, py_type_name } from "../_internal/numpy.ts";

/** What `to_array_body_parts` takes: a number, 17 numbers, or one per body part. */
export type JOS3BodyPartsInput =
  | number
  | readonly number[]
  | Readonly<JOS3BodyParts<number>>;

// Was JOS3.js's private _to17array; upstream's public
// construction.to_array_body_parts (construction.py:63-95 at v4.6.2), with
// its messages. A ValueError that is not about a range is an Error
// (ADR 0012).
/**
 * Create an array of shape (17,) with the given input.
 *
 * @param {JOS3BodyPartsInput} inp - The value(s) to use when creating the
 * 17-element array: a number, an array of 17 numbers in body part order, or
 * an object keyed by the 17 body part names.
 *
 * @returns {number[]} An array of 17 values, a copy of an array given.
 *
 * @throws {Error} If the input type is not supported or if the input array
 * is not of length 17, as upstream raises a ValueError; and for an object
 * that lacks a body part, as upstream raises a KeyError (its class is the
 * open question in ticket 25's Comments).
 */
export function to_array_body_parts(inp: JOS3BodyPartsInput): number[] {
  // isinstance(inp, int | float): a bool is an int in Python
  if (typeof inp === "number" || typeof inp === "boolean") {
    return new Array<number>(Default.num_body_parts).fill(Number(inp));
  }
  if (Array.isArray(inp)) {
    // np.asarray(inp).shape == (17,): a nested array has another shape
    if (
      inp.length === Default.num_body_parts &&
      !inp.some((x) => Array.isArray(x))
    ) {
      return inp.slice();
    }
    throw new Error(
      `The input list or ndarray is not of length ${Default.num_body_parts}`,
    );
  }
  if (typeof inp === "object" && inp !== null) {
    const parts = inp as Readonly<Record<string, number>>;
    return BODY_NAMES.map((key) => {
      if (!Object.prototype.hasOwnProperty.call(parts, key)) {
        throw key_error(key);
      }
      return parts[key];
    });
  }
  throw new Error(
    `Unsupported input type: <class '${py_type_name(inp)}'>. Supported types: int, float, list, dict, ndarray`,
  );
}
