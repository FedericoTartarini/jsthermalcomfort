import { py_max, require_numeric } from "../_numpy.ts";

/** An equation `basal_met` accepts. */
export type JOS3BmrEquation =
  | "harris-benedict"
  | "harris-benedict_origin"
  | "japanese"
  | "ganpule";

// Upstream sets a 68 W floor on the result (thermoregulation.py:954-956 at
// v4.6.2), which this lacked, and raises with its message for an unknown
// equation (:939-950).
/**
 * Calculate basal metabolic rate [W]
 * (`pythermalcomfort/jos3_functions/thermoregulation.py:893-958` at v4.6.2),
 * at least 68 W.
 *
 * @param {number} height - Body height [m].
 * @param {number} weight - Body weight [kg].
 * @param {number} age - Age [years].
 * @param {string} sex - Choose male or female; any value but "male" computes as female, as upstream compares it exactly.
 * @param {JOS3BmrEquation} bmr_equation - Choose harris-benedict, harris-benedict_origin, japanese or ganpule.
 *
 * @returns {number} Basal metabolic rate [W].
 *
 * @throws {Error} For another equation, as upstream raises a ValueError (ADR 0012).
 */
export function basal_met(
  height: number,
  weight: number,
  age: number,
  sex: string,
  bmr_equation: JOS3BmrEquation,
): number {
  const valid_equations = [
    "harris-benedict",
    "harris-benedict_origin",
    "japanese",
    "ganpule",
  ];
  if (!valid_equations.includes(bmr_equation)) {
    throw new Error(
      `Invalid equation: '${bmr_equation}'. Must be one of [${valid_equations.map((e) => `'${e}'`).join(", ")}].`,
    );
  }
  // Upstream multiplies the weight first; a value that is not a number
  // raises there.
  require_numeric(weight, "*", "arithmetic");
  require_numeric(height, "*", "arithmetic");
  require_numeric(age, "*", "arithmetic");

  let bmr: number;
  if (bmr_equation === "harris-benedict") {
    bmr =
      sex === "male"
        ? 88.362 + 13.397 * weight + 500.3 * height - 5.677 * age
        : 447.593 + 9.247 * weight + 479.9 * height - 4.33 * age;
  } else if (bmr_equation === "harris-benedict_origin") {
    bmr =
      sex === "male"
        ? 66.473 + 13.7516 * weight + 500.33 * height - 6.755 * age
        : 655.0955 + 9.5634 * weight + 184.96 * height - 4.6756 * age;
  } else {
    // "japanese" or "ganpule"
    // Ganpule et al., 2007, https://doi.org/10.1038/sj.ejcn.1602645
    bmr =
      sex === "male"
        ? 0.0481 * weight + 2.34 * height - 0.0138 * age - 0.4235
        : 0.0481 * weight + 2.34 * height - 0.0138 * age - 0.9708;
    bmr *= 1000 / 4.186;
  }

  bmr *= 0.048; // [kcal/day] to [W]

  // Set minimum BMR value in W
  const min_bmr_in_w = 68;
  return py_max(bmr, min_bmr_in_w);
}
