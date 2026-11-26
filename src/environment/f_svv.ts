import { notOfType } from "../_internal/errors.ts";

/**
 * Calculate the sky-vault view fraction.
 *
 * @param w - width of the window, [m]
 * @param h - height of the window, [m]
 * @param d - distance between the occupant and the window, [m]
 * @returns sky-vault view fraction ranges between 0 and 1
 */
export function f_svv(w: number, h: number, d: number): number {
  for (const [key, value] of Object.entries({ w, h, d })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (d === 0) {
    // Python's message for h / (2 * d), an integral number read as an int (deviation _shared-146, deviation _shared-151).
    const isInt = (x: number) => Number.isInteger(x) && !Object.is(x, -0);
    throw new RangeError(
      isInt(h) && isInt(d) ? "division by zero" : "float division by zero",
    );
  }
  return (
    (Math.atan(h / (2 * d)) *
      (180 / Math.PI) *
      (Math.atan(w / (2 * d)) * (180 / Math.PI))) /
    16200
  );
}
