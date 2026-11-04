import { notOfType } from "../_internal/errors.ts";
import { pythonRound } from "../_internal/round.ts";
import { pythonSum } from "../_internal/pythonSum.ts";
import { units_converter } from "../utilities/units_converter.ts";

// FIXME: find how to write math notation inside JSDocs

/**
 * Estimates the running mean temperature also known as prevailing mean outdoor temperature
 *
 * @public
 * @memberof environment
 * @docname Running mean outdoor temperature
 *
 * @param {number[]} temp_array - array containing the mean daily temperature in descending order (i.e. from
 * newest/yestedayr to oldest) :math:`[t_{day-1}, t_{day-2}, ... , t_{day-n}]`,
 * Where :math:`t_{day-1}` is yesterday's daily mean temperature. The EN
 * 16798-1 2019 {@link #ref_3|[3]} states that n should be equal to 7
 *
 * @param {number} [alpha=0.8] - constant between 0 and 1. The EN 16798-1 2019 {@link #ref_3|[3]} recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggest that a slow-response running mean (alpha = 0.9)
 * could be more appropriate for climates in which synoptic-scale (day-to-day)
 * temperature dynamics are relatively minor, sich as the humid tropics.
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} running mean outdoor temperature
 */
export function running_mean_outdoor_temperature(
  temp_array,
  alpha = 0.8,
  units = "SI",
) {
  if (!Array.isArray(temp_array)) throw notOfType("temp_array", "an array");
  for (const tdb of temp_array) {
    if (typeof tdb !== "number") {
      throw notOfType("temp_array", "an array of numbers");
    }
  }
  if (typeof alpha !== "number") throw notOfType("alpha", "a number");
  if (typeof units !== "string") throw notOfType("units", "a string");
  units = units.toUpperCase();
  if (units === "IP")
    temp_array = temp_array.map((tdb) => units_converter("IP", { tdb }).tdb);

  const coeff = temp_array.map((_tdb, ix) => Math.pow(alpha, ix));
  // Python's sum and division message depend on which items are ints, an
  // integral number read as one (decisions 271, 331, 332) and the IP path's
  // conversion returning floats.
  const isInt = (x) => Number.isInteger(x) && !Object.is(x, -0);
  const coeffInt = coeff.map(() => isInt(alpha));
  const productInt = temp_array.map(
    (tdb) => isInt(alpha) && units !== "IP" && isInt(tdb),
  );
  const summ_t_rm = pythonSum(
    temp_array.map((tdb, ix) => coeff[ix] * tdb),
    productInt,
  );
  const summ_coeff = pythonSum(coeff, coeffInt);
  // Python raises ZeroDivisionError here, a RangeError (ADR 0022).
  if (summ_coeff === 0) {
    throw new RangeError(
      // Both sums are ints when every weighted temperature is, whose int alpha
      // makes every weight one too.
      productInt.every(Boolean) ? "division by zero" : "float division by zero",
    );
  }
  let t_rm = summ_t_rm / summ_coeff;
  if (units === "IP") t_rm = units_converter("SI", { tmp: t_rm }).tmp;

  return pythonRound(t_rm, 1);
}
