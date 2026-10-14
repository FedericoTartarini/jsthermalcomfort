import { round, validateInputs } from "../utilities/utilities.js";

/**
 * @typedef {object} HumidexResult - a result set containing the humidex and
 * discomfort level.
 * @property {number} humidex - the humidex given the provided dry bulb
 * air temperature and relative humidity.
 * @property {string} discomfort - a human description of how the weather
 * would be felt by the average person.
 * @public
 */

/**
 * Calculates the humidex (short for "humidity index"). It has been
 * developed by the Canadian Meteorological service. It was introduced in 1965
 * and then it was revised by Masterson and Richardson (1979) {@link #ref_14|[14]}. It aims
 * to describe how hot, humid weather is felt by the average person. The
 * Humidex differs from the heat index in being related to the dew point
 * rather than relative humidity {@link #ref_15|[15]}.
 *
 * Relative humidity outside [0, 100] is physically invalid and throws a
 * `RangeError`.
 *
 * @public
 * @memberof models
 * @docname Humidex
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {object} [options] - configuration options for the function.
 * @param {"rana" | "masterson"} [options.model="rana"] - Humidex model.
 * "rana" uses the Rana et al. (2013) formula; "masterson" uses the
 * Masterson and Richardson (1979) formula with dew point temperature.
 * @param {boolean} [options.round = true] - If true, rounds output value. If
 * false, it does not.
 *
 * @throws {RangeError} when `rh` is outside `[0, 100]` or `options.model`
 * is neither `"rana"` nor `"masterson"`.
 *
 * @returns {HumidexResult} the result given the provided temperature and
 * relative humidity.
 *
 * @example
 * const result = humidex(25, 50);
 * console.log(result); // -> { humidex: 28.2, discomfort: "Little or no discomfort" }
 *
 * @example
 * const result = humidex(31, 55, { model: "masterson" });
 * console.log(result); // -> { humidex: 39.3, discomfort: "Evident discomfort" }
 */

const HUMIDEX_SCHEMA = {
  tdb: { type: "number" },
  rh: { type: "number" },
  round: { type: "boolean" },
};

export function humidex(tdb, rh, options = {}) {
  const { model = "rana", round: roundOutput = true } = options;

  validateInputs({ tdb, rh, round: roundOutput }, HUMIDEX_SCHEMA);

  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity must be between 0 and 100%");
  }

  if (model !== "rana" && model !== "masterson") {
    throw new RangeError(
      "Invalid model. The model must be either 'rana' or 'masterson'",
    );
  }

  let hi;

  if (model === "masterson") {
    const saturationPressure = 6.112 * Math.exp((17.62 * tdb) / (243.12 + tdb));
    const vaporPressure = (rh / 100) * saturationPressure;
    const logPressureRatio = Math.log(vaporPressure / 6.112);
    const dewPoint = (243.12 * logPressureRatio) / (17.62 - logPressureRatio);

    hi =
      tdb +
      (5 / 9) *
        (6.11 * Math.exp(5417.753 * (1 / 273.15 - 1 / (dewPoint + 273.15))) -
          10);
  } else {
    hi =
      tdb +
      (5 / 9) * ((6.112 * 10 ** ((7.5 * tdb) / (237.7 + tdb)) * rh) / 100 - 10);
  }

  if (roundOutput) {
    hi = round(hi, 1);
  }

  let stress_category = "Heat stroke probable";

  if (hi <= 30) {
    stress_category = "Little or no discomfort";
  } else if (hi <= 35) {
    stress_category = "Noticeable discomfort";
  } else if (hi <= 40) {
    stress_category = "Evident discomfort";
  } else if (hi <= 45) {
    stress_category = "Intense discomfort; avoid exertion";
  } else if (hi <= 54) {
    stress_category = "Dangerous discomfort";
  }

  return { humidex: hi, discomfort: stress_category };
}
