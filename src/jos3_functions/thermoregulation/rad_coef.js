import JOS3Defaults from "../JOS3Defaults.js";
import * as math from "mathjs";

/**
 * Calculate radiative heat transfer coefficient (hr) [W/(m2*K)]
 *
 * @param {string} posture - Select posture from standing, sitting, lying, sedentary or supine. Default is "standing".
 *
 * @returns {math.Matrix} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 */
export function rad_coef(posture = JOS3Defaults.posture) {
  const valid_postures = [
    "standing",
    "sitting",
    "lying",
    "sedentary",
    "supine",
  ];

  if (!valid_postures.includes(posture)) {
    let postures = valid_postures.join(", ");
    throw new Error(`Invalid posture ${posture}. Must be one of ${postures}.`);
  }

  switch (posture) {
    case "standing":
      // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
      return math.matrix([
        4.89, 4.89, 4.32, 4.09, 4.32, 4.55, 4.43, 4.21, 4.55, 4.43, 4.21, 4.77,
        5.34, 6.14, 4.77, 5.34, 6.14,
      ]);
    case "sitting":
    case "sedentary":
      // Ichihara et al., 1997, https://doi.org/10.3130/aija.62.45_5
      return math.matrix([
        4.96, 4.96, 3.99, 4.64, 4.21, 4.96, 4.21, 4.74, 4.96, 4.21, 4.74, 4.1,
        4.74, 6.36, 4.1, 4.74, 6.36,
      ]);
    case "lying":
    case "supine":
      // Kurazumi et al., 2008, https://doi.org/10.20718/jjpa.13.1_17
      return math.matrix([
        5.475, 5.475, 3.463, 3.463, 3.463, 4.249, 4.835, 4.119, 4.249, 4.835,
        4.119, 4.44, 5.547, 6.085, 4.44, 5.547, 6.085,
      ]);
  }
}
