import { py_type_name } from "../../_internal/numpy.ts";

// The postures upstream's natural_convection and rad_coef accept, in the
// order their message lists them (thermoregulation.py:131-139, :323-333 at
// v4.6.2). Private.
export const VALID_POSTURES = [
  "standing",
  "sitting",
  "lying",
  "sedentary",
  "supine",
] as const;

/** A posture the convection and radiation coefficients accept. */
export type JOS3Posture = (typeof VALID_POSTURES)[number];

/**
 * `posture.lower()`, as upstream compares it: upstream lowers the posture
 * before each comparison, so any case is accepted. A non-string raises an
 * AttributeError upstream, a TypeError here (ADR 0012).
 *
 * @param {unknown} posture - the caller's posture
 * @returns {string} the posture, lower-cased
 */
export function lower_posture(posture: unknown): string {
  if (typeof posture !== "string") {
    throw new TypeError(
      `'${py_type_name(posture)}' object has no attribute 'lower'`,
    );
  }
  return posture.toLowerCase();
}

/**
 * Upstream's ValueError for a posture it does not know, an Error here
 * (ADR 0012), with upstream's message, which names the posture as given.
 *
 * @param {string} posture - the caller's posture
 * @returns {Error} the error to throw
 */
export function invalid_posture(posture: string): Error {
  const valid = VALID_POSTURES.map((p) => `'${p}'`).join(", ");
  return new Error(`Invalid posture '${posture}'. Must be one of [${valid}].`);
}
