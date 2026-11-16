import { notOfType } from "../_internal/errors.ts";
import { pythonRound } from "../_internal/round.ts";
import { pythonSum } from "../_internal/pythonSum.ts";
import { Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

/**
 * Estimate the running mean temperature also known as prevailing mean outdoor
 * temperature.
 *
 * @param temp_array - array containing the mean daily temperature in descending order (i.e. from
 * newest/yesterday to oldest) :math:`[t_{day-1}, t_{day-2}, ... ,
 * t_{day-n}]`.
 * Where :math:`t_{day-1}` is yesterday's daily mean temperature. The EN
 * 16798-1 2019 [16798EN2019](../../docs/references.md#16798en2019) states that n should be equal to 7
 * @param alpha - constant between 0 and 1. The EN 16798-1 2019 [16798EN2019](../../docs/references.md#16798en2019) recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggests that a slow-response running mean (alpha =
 * 0.9) could be more appropriate for climates in which synoptic-scale (day-to-
 * day) temperature dynamics are relatively minor, such as the humid tropics.
 * @param units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @returns running mean outdoor temperature
 *
 * @example
 * ```ts
 * import { running_mean_outdoor_temperature } from "jsthermalcomfort/environment";
 *
 * let temp_array = [22.0, 20.5, 19.0, 21.0, 18.5, 17.0, 16.5]; // daily mean temperatures
 * let t_rm = running_mean_outdoor_temperature(temp_array, 0.8, "SI");
 *
 * // Calculate the running mean outdoor temperature using the previous 7 days from an array of daily mean temperatures
 * temp_array = [22.0, 20.5, 19.0, 21.0, 18.5, 17.0, 16.5, 15.0, 14.5]; // daily mean temperatures
 * const days_to_consider = 7;
 * const results: number[] = [];
 * for (let i = 0; i < temp_array.length - days_to_consider + 1; i++) {
 *   const subset = temp_array.slice(i, i + days_to_consider);
 *   console.log(`Subset for days ${i + 1} to ${i + days_to_consider}: ${subset}`);
 *   t_rm = running_mean_outdoor_temperature(subset, 0.8, "SI");
 *   console.log(`Days ${i + 1} to ${i + days_to_consider}: t_rm = ${t_rm}`);
 *   results.push(t_rm);
 * }
 * ```
 *
 * Calculate the running mean outdoor temperature from hourly data:
 *
 * ```ts
 * import { running_mean_outdoor_temperature } from "jsthermalcomfort/environment";
 *
 * // Step 1: Create hourly dry bulb temperature (tdb) data
 * // for 10 days starting from January 1, 2025. We simulate hourly data with
 * // a base temperature of 20°C plus sinusoidal daily variation and some noise.
 * const normal = (sd: number) =>
 *   sd * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
 * const hourly = Array.from({ length: 10 * 24 }, (_, i) => ({
 *   date: new Date(Date.UTC(2025, 0, 1, i)),
 *   // Simulate tdb with daily cycle: 20°C base + 10°C amplitude sinusoidal + noise
 *   t_out: 20 + 10 * Math.sin(2 * Math.PI * ((i % 24) / 24)) + normal(2),
 * }));
 *
 * // Step 2: Resample the hourly data to daily mean temperatures
 * // This gives us the average temperature for each day.
 * const daily = Array.from({ length: 10 }, (_, day) => ({
 *   t_out: hourly.slice(day * 24, day * 24 + 24).reduce((sum, hour) => sum + hour.t_out, 0) / 24,
 *   running_mean: NaN,
 * }));
 *
 * // Step 3: Calculate the running mean outdoor temperature for each day
 * // using the previous 7 days' daily means. The function requires the array
 * // in descending order (newest to oldest). For the first 7 days, there is
 * // insufficient data (less than 7 days), so they remain NaN.
 * for (let i = 7; i < daily.length; i++) {
 *   // Get the previous 7 days' means (from i-7 to i-1), reverse to newest first
 *   const prev_7_days = daily.slice(i - 7, i).map((day) => day.t_out).reverse();
 *   // Calculate the running mean and assign to the current day
 *   daily[i].running_mean = running_mean_outdoor_temperature(prev_7_days, 0.8, "SI");
 * }
 *
 * const hourly_with_running_mean = hourly.map((hour, i) => ({
 *   ...hour,
 *   running_mean: daily[Math.floor(i / 24)].running_mean,
 * }));
 * ```
 */
export function running_mean_outdoor_temperature(
  temp_array: readonly number[],
  alpha = 0.8,
  units: (typeof Units)[keyof typeof Units] = Units.SI,
): number {
  // Array.isArray would narrow temp_array itself to any[].
  const array: unknown = temp_array;
  if (!Array.isArray(array)) throw notOfType("temp_array", "an array");
  for (const tdb of array as unknown[]) {
    if (typeof tdb !== "number") {
      throw notOfType("temp_array", "an array of numbers");
    }
  }
  if (typeof (alpha as unknown) !== "number") {
    throw notOfType("alpha", "a number");
  }
  if (typeof (units as unknown) !== "string") {
    throw notOfType("units", "a string");
  }
  const units_upper = units.toUpperCase();
  if (units_upper === Units.IP) {
    temp_array = temp_array.map(
      (temp) => units_converter(Units.IP, { tdb: temp }).tdb,
    );
  }

  const coeff = temp_array.map((_x, ix) => Math.pow(alpha, ix));
  // Python's sum and division message depend on which items are ints, an
  // integral number read as one (decisions 271, 331, 332) and the IP path's
  // conversion returning floats.
  const isInt = (x: number) => Number.isInteger(x) && !Object.is(x, -0);
  const coeff_int = coeff.map(() => isInt(alpha));
  const product_int = temp_array.map(
    (tdb) => isInt(alpha) && units_upper !== Units.IP && isInt(tdb),
  );
  const summ_t_rm = pythonSum(
    temp_array.map((tdb, ix) => (coeff[ix] ?? NaN) * tdb),
    product_int,
  );
  const summ_coeff = pythonSum(coeff, coeff_int);
  // Python raises ZeroDivisionError here, a RangeError (ADR 0022).
  if (summ_coeff === 0) {
    throw new RangeError(
      // Both sums are ints when every weighted temperature is, whose int alpha
      // makes every weight one too.
      product_int.every(Boolean)
        ? "division by zero"
        : "float division by zero",
    );
  }
  let t_rm = summ_t_rm / summ_coeff;

  if (units_upper === Units.IP) {
    t_rm = units_converter(Units.SI, { tmp: t_rm }).tmp;
  }

  return pythonRound(t_rm, 1);
}
