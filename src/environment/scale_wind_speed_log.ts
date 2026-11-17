import { notOfType } from "../_internal/errors.ts";
import { round } from "../_internal/round.ts";

/** Dataclass to represent the output of scale_wind_speed_log. */
export interface ScaleWindSpeedLog {
  readonly v_z2: number;
}

/**
 * Scale wind speed from the reference height to a user specified height using the
 * logarithmic wind profile based on surface roughness length [Oke1987](../../docs/references.md#oke1987).
 *
 * The logarithmic wind profile is a semi-empirical relationship that describes how
 * wind speed changes with height above the ground in the surface layer of the
 * atmosphere. This equation assumes neutral atmospheric stability and is valid for
 * heights typically ranging from a few meters to about 100 meters above the ground.
 * It is commonly used in meteorology, wind engineering, and environmental
 * studies to estimate wind speeds at different heights based on a known reference
 * height. The formula is given by:
 *
 * .. math::
 *     v(h) = v_{ref} \times \frac{\ln((h - d)/z0)}{\ln((h_{ref} - d)/z0)}
 *
 * where:
 *
 * - :math:`v(h)` is the wind speed at height :math:`h`
 * - :math:`v_{ref}` is the wind speed at the reference height :math:`h_{ref}` (commonly 10 m)
 * - :math:`h` is the height at which the wind speed is to be estimated
 * - :math:`h_{ref}` is the reference height (10 m)
 * - :math:`z0` is the surface roughness length, which characterizes the roughness of the terrain
 * - :math:`d` is the zero-plane displacement height, which accounts for flow obstruction by vegetation or buildings
 *
 * > [!NOTE]
 * > This function assumes neutral atmospheric stability conditions. For
 * > non-neutral conditions, more complex models such as the Monin-Obukhov
 * > similarity theory should be used.
 * > Moreover, this function does not account for obstacles or complex terrain
 * > effects which may require computational fluid dynamics (CFD) simulations or
 * > measurements.
 * > The profile only describes wind well above the obstacles. Among buildings
 * > or trees, a target height of about 2 m is inside the canopy, where the
 * > logarithmic profile does not apply for any value of ``d``. The function
 * > then gives a rough estimate only, and street-level wind in dense urban
 * > areas needs a canopy-layer model or measurements.
 *
 * @param v_z1 - Wind speed at the reference height z1 (default 10 m), [m/s]
 * @param z2 - Height at which wind speed needs to be scaled, [m]
 * @param z1 - Reference height, [m]. Default is 10.0 m.
 * @param z0 - Surface roughness length, [m]. Default is 0.01 (open terrain). This value
 * accounts for the roughness of the terrain and depends on land use. Values from
 * Table 1 of [Sharples2023](../../docs/references.md#sharples2023), which maps Australian land classes to Davenport
 * roughness classes:
 *
 * - 0.005 m: Inland waterbodies (lakes and dams)
 * - 0.03 m: Irrigated pasture
 * - 0.1 m: Irrigated cropping
 * - 0.25 m: Irrigated sugar
 * - 0.43 m: Closed forest
 * - 1.0 m: Urban areas
 * @param d - Zero-plane displacement height, [m]. Default is 0.0 (no displacement).
 * This value accounts for the height at which the wind speed effectively becomes
 * zero due to obstacles like trees or buildings. For scaling 10 m wind to about
 * 2 m, use 0.0, as recommended in Section 3.3 of [Sharples2023](../../docs/references.md#sharples2023). The report
 * found that its non-zero values lowered the scaled wind speed and smoothed out
 * extremes. Its Table 1 lists 0.5 m for many land classes, including urban areas,
 * but those values were capped at 0.5 m because the target height is only 2 m
 * (Section 2.4). They are not displacement heights of real buildings, which are
 * usually several metres in a city.
 * @param round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 * @returns Dataclass with attribute ``v_z2`` containing the scaled wind speed(s)
 * at the target height z2, [m/s].
 *
 * - `v_z2` - Wind speed at the target height z2, [m/s].
 * @throws `TypeError` If input parameters are not of valid numeric types
 * @throws `RangeError` If any parameter values violate physical constraints
 *
 * @example
 * ```ts
 * import { scale_wind_speed_log } from "jsthermalcomfort/environment";
 *
 * // Scale wind speed to 2m height (default open terrain z0=0.01)
 * scale_wind_speed_log(5.0, 2.0);
 *
 * // Scale wind speed to 2m height over rough terrain
 * scale_wind_speed_log(5.0, 2.0, undefined, 0.1);
 *
 * // Scale multiple wind speeds to different heights
 * [
 *   [3.0, 1.5],
 *   [5.0, 2.5],
 * ].map(([v_z1, z2]) => scale_wind_speed_log(v_z1, z2));
 *
 * // Scale with different surface roughness for each measurement
 * [
 *   [3.0, 1.5, 0.02],
 *   [5.0, 2.5, 0.1],
 * ].map(([v_z1, z2, z0]) => scale_wind_speed_log(v_z1, z2, undefined, z0));
 * ```
 */
export function scale_wind_speed_log(
  v_z1: number,
  z2: number,
  z1 = 10.0,
  z0 = 0.01,
  d = 0.0,
  round_output = true,
): ScaleWindSpeedLog {
  // BaseInputs checks the types in its field order (classes_input.py:112).
  for (const [key, value] of Object.entries({ d, v_z1, z0, z1, z2 })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }

  // Physical/value constraints
  if (v_z1 < 0) {
    throw new RangeError("Wind speed (v_z1) must be non-negative");
  }

  if (z0 <= 0) {
    throw new RangeError(
      "Surface roughness length (z0) must be positive ( > 0 )",
    );
  }

  // Displacement height cannot be negative
  if (d < 0) {
    throw new RangeError("Zero-plane displacement height (d) must be >= 0");
  }

  if (z2 <= 0) {
    throw new RangeError("Target height (z2) must be positive ( > 0 )");
  }

  if (z1 <= 0) {
    throw new RangeError("Reference height (z1) must be positive ( > 0 )");
  }

  if (z2 <= z0) {
    throw new RangeError(
      "Target height (z2) must be greater than surface roughness (z0)",
    );
  }

  if (z1 <= z0) {
    throw new RangeError(
      "Reference height (z1) must be greater than surface roughness (z0)",
    );
  }

  // Ensure log arguments are strictly > 1 i.e., (z - d) > z0
  if (z1 - d <= z0) {
    throw new RangeError(
      "Reference height minus displacement (z1 - d) must be > z0",
    );
  }
  if (z2 - d <= z0) {
    throw new RangeError(
      "Target height minus displacement (z2 - d) must be > z0",
    );
  }

  // Prevent log denominator being zero or extremely close to zero
  const denom = Math.log((z1 - d) / z0);
  if (denom <= 1e-12) {
    throw new RangeError(
      "Logarithmic denominator log((z1 - d)/z0) is zero or numerically unstable",
    );
  }

  if (typeof (round_output as unknown) !== "boolean") {
    throw notOfType("round_output", "a boolean");
  }

  // Use numpy.log to support array inputs/broadcasting
  const numerator = raising(
    v_z1,
    "multiply",
    Math.log(raising(raising(z2, "subtract", d), "divide", z0)),
  );
  let v_z2 = raising(
    numerator,
    "scalar divide",
    Math.log(raising(raising(z1, "subtract", d), "divide", z0)),
  );

  if (round_output) {
    v_z2 = round(v_z2, 2);
  }

  // Return a dataclass instance for consistent API
  return Object.freeze({ v_z2 });
}

/**
 * One subtract, multiply or divide as numpy runs it under `np.errstate(invalid="raise",
 * over="raise")`: NaN from operands that are not NaN, or ±Infinity from finite
 * ones, throws numpy's message (deviation _shared-168).
 */
function raising(
  a: number,
  operation: "subtract" | "multiply" | "divide" | "scalar divide",
  b: number,
): number {
  const result =
    operation === "subtract" ? a - b : operation === "multiply" ? a * b : a / b;
  if (Number.isNaN(result) && !Number.isNaN(a) && !Number.isNaN(b)) {
    throw new RangeError(`invalid value encountered in ${operation}`);
  }
  if (
    !Number.isFinite(result) &&
    !Number.isNaN(result) &&
    Number.isFinite(a) &&
    Number.isFinite(b)
  ) {
    throw new RangeError(`overflow encountered in ${operation}`);
  }
  return result;
}
