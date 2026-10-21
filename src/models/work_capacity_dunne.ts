import { validateInputs } from "../utilities/utilities.js";
import { _check_params_object } from "../_internal/validation.ts";
import { WorkIntensity } from "./work_capacity.ts";
import type { WorkCapacity } from "./work_capacity.ts";

/**
 * The params of `work_capacity_dunne`: upstream's keyword parameters, with
 * upstream's default (ADR 0002). Documented on the function's `params`.
 */
export interface WorkCapacityDunneParams {
  wbgt: number;
  // ADR 0007: upstream's lowercase spellings. Untyped JavaScript may pass
  // them in any case, as upstream accepts and computes them.
  work_intensity?: WorkIntensity;
}

// A non-finite wbgt throws a TypeError here (ADR 0001, reason three), where
// upstream, given a work_intensity string it accepts, returns NaN for NaN, 0
// for +inf and 100 for -inf. A boolean, null or array wbgt throws a
// TypeError too (ADR 0005), where upstream, given such a string, returns 100
// for True and False and a numpy array for a list of numbers or booleans,
// and raises a TypeError for None. Given any other work_intensity, upstream
// raises for work_intensity instead (its ValueError for a value outside the
// three, its AttributeError for None or a list with no item outside the
// three), where this function checks wbgt first. work_intensity is declared
// here and checked below, as upstream's WorkCapacityHothapsInputs checks it.
const WORK_CAPACITY_DUNNE_SCHEMA = {
  wbgt: { type: "number" },
  work_intensity: {},
};

const _INTENSITIES: string[] = Object.values(WorkIntensity);

// Upstream's factor_map (work_capacity_dunne.py:60-64 at v4.6.2).
const _FACTORS = {
  [WorkIntensity.HEAVY]: 1,
  [WorkIntensity.MODERATE]: 2,
  [WorkIntensity.LIGHT]: 4,
};

// Upstream's first sentence and its note on work_intensity cite
// [Dunne2013]_, a Sphinx citation (work_capacity_dunne.py:17, :40 at
// v4.6.2); the JSDoc writes each as Dunne et al. (2013), whose full
// reference the third paragraph gives as upstream's does.
/**
 * Estimate work capacity due to heat based on Dunne et al. (2013).
 *
 * Estimates the amount of work that will be done at a given WBGT and
 * intensity of work as a percent. 100% means work is unaffected by heat. 0%
 * means no work is done.
 *
 * This is based upon NIOSH safety standards. See:
 * Dunne JP, Stouffer RJ, John JG. Reductions in labour capacity from heat
 * stress under climate warming. Nature Climate Change. 2013 Jun;3(6):563 6.
 *
 * Heavy intensity work is sometimes labelled as 400 W, but this is only
 * nominal. Moderate work is assumed to be half as much as heavy intensity, and
 * light half as much as moderate.
 *
 * @public
 * @memberof models
 * @docname Work capacity (Dunne et al.)
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.wbgt - Wet bulb globe temperature, [°C].
 * @param {"heavy" | "moderate" | "light"} [params.work_intensity="heavy"] - Which work intensity to use for the calculation, choice of "heavy",
 * "moderate" or "light". Default is "heavy".
 *
 * Note: Dunne et al. (2013) suggests that heavy intensity work is 350-500 kcal/h, moderate
 * is 200-350 kcal/h, and light is less than 100-200 kcal/h.
 *
 * @returns {WorkCapacity} object containing the work capacity as a percent, `capacity`.
 *
 * @example
 * import { work_capacity_dunne, WorkIntensity } from "jsthermalcomfort";
 * const result = work_capacity_dunne({ wbgt: 30, work_intensity: WorkIntensity.MODERATE });
 * console.log(result.capacity); // 53.799113089356695
 */
export function work_capacity_dunne(
  params: WorkCapacityDunneParams,
): WorkCapacity {
  // wbgt and work_intensity are positional upstream; a call written that way
  // fails here, naming the shape it should have (ADR 0002). So does an
  // unknown key (ADR 0008).
  _check_params_object(
    params,
    "work_capacity_dunne",
    WORK_CAPACITY_DUNNE_SCHEMA,
  );
  // Destructuring defaults also apply to a work_intensity passed as undefined.
  const { wbgt, work_intensity = WorkIntensity.HEAVY } = params;
  validateInputs({ wbgt }, WORK_CAPACITY_DUNNE_SCHEMA);

  // As upstream's _validate_str_values (classes_input.py:170-184): it skips
  // None, checks each item of a list, and compares str(item).lower() with the
  // three, so only a string item can pass (upstream raises its ValueError
  // for 1, True, a dict, [None] and [["heavy"]]). A ValueError is an Error
  // here (ADR 0012), with upstream's message.
  const given: unknown = work_intensity;
  const items: unknown[] = Array.isArray(given) ? given : [given];
  if (
    given !== null &&
    !items.every(
      (item) =>
        typeof item === "string" && _INTENSITIES.includes(item.toLowerCase()),
    )
  ) {
    throw new Error(
      "work_intensity must be one of ['heavy', 'moderate', 'light']",
    );
  }
  // Upstream then calls work_intensity.lower() (work_capacity_dunne.py:55),
  // which raises an AttributeError for None or a list; a wrong type raising
  // it is a TypeError here (ADR 0012).
  if (typeof given !== "string") {
    throw new TypeError('Parameter "work_intensity" must be a string');
  }
  const intensity = given.toLowerCase() as WorkIntensity;

  // work_capacity_dunne.py:58, :66, unrounded as upstream. Upstream's ** runs
  // through numpy, whose float64 power calls the C library's pow (numpy
  // 2.5.4: scalarmath.c.src:480-483, npy_math.h:202), so Math.pow (ADR 0009).
  const base = Math.min(
    Math.max(100 - 25 * Math.pow(Math.max(0, wbgt - 25), 2 / 3), 0),
    100,
  );
  const capacity = Math.min(Math.max(base * _FACTORS[intensity], 0), 100);
  return { capacity };
}
