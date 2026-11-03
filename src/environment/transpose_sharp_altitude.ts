import { notOfType } from "../_internal/errors.ts";

/** Transpose the solar altitude and solar azimuth angles. */
export function transpose_sharp_altitude(
  sharp: number,
  altitude: number,
): readonly [number, number] {
  if (typeof (sharp as unknown) !== "number") {
    throw notOfType("sharp", "a number");
  }
  if (typeof (altitude as unknown) !== "number") {
    throw notOfType("altitude", "a number");
  }
  const altitude_new =
    Math.asin(
      Math.sin(Math.abs(sharp - 90) * (Math.PI / 180)) *
        Math.cos(altitude * (Math.PI / 180)),
    ) *
    (180 / Math.PI);
  sharp =
    Math.atan(
      Math.sin(sharp * (Math.PI / 180)) *
        Math.tan((90 - altitude) * (Math.PI / 180)),
    ) *
    (180 / Math.PI);
  const sol_altitude = altitude_new;
  return Object.freeze([sharp, sol_altitude] as const);
}
