import { validateInputs } from "../utilities/utilities.js";

const WORK_CAPACITY_NIOSH_SCHEMA = {
  wbgt: { type: "number" },
  met: { type: "number", min: 0, max: 2500 },
};

/**
 * Estimates work capacity affected by heat using NIOSH standards as described by
 * Bröde et al. (2018).
 * A capacity of 100% means work is unaffected by heat; 0% means no work is done.
 *
 * Accepts scalar inputs. For multiple readings, use Array.map() over this function.
 * The result is not rounded. At the assumed resting metabolic rate of 117 W,
 * capacity is NaN when WBGT equals the resting limit. At 0 W, capacity is 0%
 * for every WBGT.
 *
 * @public
 * @memberof models
 * @docname Work capacity (NIOSH)
 *
 * @param {number} wbgt - Wet bulb globe temperature, [°C].
 * @param {number} met - Metabolic heat production, [W], between 0 and 2500 inclusive. This is watts, not metabolic equivalents (met).
 * @returns {{capacity: number}} Work capacity, [%], clipped to [0, 100], or NaN at the resting-limit singularity.
 * @throws {TypeError} If either input is not a finite scalar number.
 * @throws {RangeError} If metabolic heat production is outside [0, 2500] W.
 *
 * @example
 * import { work_capacity_niosh } from "jsthermalcomfort";
 * const result = work_capacity_niosh(30, 300);
 * console.log(result.capacity); // 62.003258471944356
 */
export function work_capacity_niosh(wbgt, met) {
  validateInputs({ wbgt, met }, WORK_CAPACITY_NIOSH_SCHEMA);

  const met_rest = 117;
  const wbgt_lim = 56.7 - 11.5 * Math.log10(met);
  const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(met_rest);
  const capacity = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100;

  return { capacity: Math.min(100, Math.max(0, capacity)) };
}
