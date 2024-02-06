import JOS3Defaults from "../JOS3Defaults.js";

/**
 * Calculate basal metabolic rate [W].
 *
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {number} [age=20] - Age [years].
 * @param {string} [sex="male"] - Choose male or female.
 * @param {string} [bmr_equation="harris-benedict"] - Choose harris-benedict or ganpule.
 *
 * @returns {number} Basal metabolic rate [W].
 */
export function basal_met(
  height = JOS3Defaults.height,
  weight = JOS3Defaults.weight,
  age = JOS3Defaults.age,
  sex = JOS3Defaults.sex,
  bmr_equation = JOS3Defaults.bmr_equation,
) {
  const valid_equations = [
    "harris-benedict",
    "harris-benedict_origin",
    "japanese",
    "ganpule",
  ];

  if (!valid_equations.includes(bmr_equation)) {
    throw new Error(
      `Invalid BMR equation. Must be one of ${valid_equations.join(", ")}`,
    );
  }

  let bmr;

  switch (bmr_equation) {
    case "harris-benedict":
      bmr =
        sex === "male"
          ? 88.362 + 13.397 * weight + 500.3 * height - 5.677 * age
          : 447.593 + 9.247 * weight + 479.9 * height - 4.33 * age;
      break;
    case "harris-benedict_origin":
      bmr =
        sex === "male"
          ? 66.473 + 13.7516 * weight + 500.33 * height - 6.755 * age
          : 655.0955 + 9.5634 * weight + 184.96 * height - 4.6756 * age;
      break;
    case "japanese":
    case "ganpule":
      // Ganpule et al., 2007, https://doi.org/10.1038/sj.ejcn.1602645
      bmr =
        sex === "male"
          ? 0.0481 * weight + 2.34 * height - 0.0138 * age - 0.4235
          : 0.0481 * weight + 2.34 * height - 0.0138 * age - 0.9708;

      bmr *= 1000 / 4.186;
      break;
  }

  return bmr * 0.048; // [kcal/day] to [W]
}
