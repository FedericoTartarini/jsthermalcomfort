import { round } from "../utilities/utilities.js";
import { BODY_NAMES } from "./_body_parts.ts";
import type { JOS3BodyPartName, JOS3BodyParts } from "./_body_parts.ts";

// New: upstream's construction.pass_values_to_jos3_body_parts
// (construction.py:780-790 at v4.6.2), which builds each body-part field of
// JOS3's output.
/**
 * Rounds the values and names them by body part, as upstream's
 * `JOS3BodyParts`. The values are paired with `body_parts` in order, as
 * many as both have, as Python's `zip` does; a body part left unpaired holds
 * `null`. The rounding is numpy's `np.round`, half to even.
 *
 * @param {readonly number[]} values - the values
 * @param {number} [round_digits=2] - the decimals to round to
 * @param {JOS3BodyPartName[] | null} [body_parts=null] - the body parts the
 * values belong to, in their order; all 17 when null
 * @returns {JOS3BodyParts} one value per body part, `null` where none
 */
export function pass_values_to_jos3_body_parts(
  values: readonly number[],
  round_digits: number = 2,
  body_parts: readonly JOS3BodyPartName[] | null = null,
): JOS3BodyParts {
  const names = body_parts ?? BODY_NAMES;
  const out = Object.fromEntries(
    BODY_NAMES.map((name) => [name, null]),
  ) as JOS3BodyParts;
  const n = Math.min(names.length, values.length);
  for (let i = 0; i < n; i++) {
    out[names[i]] = round(values[i], round_digits);
  }
  return out;
}
