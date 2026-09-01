import { round, validateInputs } from "../utilities/utilities.js";
import { attachBins, classifyFromBins } from "./classifierBins.js";
import { attachModelDocs } from "./modelDocs.js";

/**
 * @typedef {object} HumidexResult - a result set containing the humidex and
 * discomfort level.
 * @property {number} humidex - the humdidex given the provided dry bulb
 * air temperature and relative humidity.
 * @property {string} discomfort - a human description of how the weather
 * would be felt by the average person.
 * @public
 */

/** @type {ClassifierBins} */
const HUMIDEX_BINS = {
  edges: [30, 35, 40, 45, 54],
  labels: [
    "Little or no discomfort",
    "Noticeable discomfort",
    "Evident discomfort",
    "Intense discomfort; avoid exertion",
    "Dangerous discomfort",
    "Heat stroke probable",
  ],
  right: true,
};

/**
 * Maps a Humidex value to the discomfort category.
 *
 * @public
 * @param {number} value - Humidex value
 * @returns {string|number}
 * @property {ClassifierBins} bins
 */
export function mapping(value) {
  return classifyFromBins(value, HUMIDEX_BINS);
}

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
 * @property {string} label - Display name (`@docname`)
 * @property {string} description - Leading JSDoc summary
 * @property {ClassifierFn} mapping - Discomfort classifier (`mapping.bins`)
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {object} [options] - configuration options for the function.
 * @param {boolean} [options.round = true] - If true, rounds output value. If
 * false, it does not.
 *
 * @throws {RangeError} when `rh` is outside `[0, 100]`.
 *
 * @returns {HumidexResult} the result given the provided temperature and
 * relative humidity.
 *
 * @example
 * const result = humidex(25, 50);
 * console.log(result); // -> { humidex: 28.2, discomfort: "Little or no discomfort" }
 */
const HUMIDEX_SCHEMA = {
  tdb: { type: "number" },
  rh: { type: "number" },
  round: { type: "boolean", required: false },
};

export function humidex(tdb, rh, options = { round: true }) {
  validateInputs({ tdb, rh, round: options.round }, HUMIDEX_SCHEMA);

  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity must be between 0 and 100%");
  }

  let value =
    tdb +
    (5 / 9) * ((6.112 * 10 ** ((7.5 * tdb) / (237.7 + tdb)) * rh) / 100 - 10);

  if (options.round) {
    value = round(value, 1);
  }

  return { humidex: value, discomfort: mapping(value) };
}

attachModelDocs(
  humidex,
  "Humidex",
  'Calculates the humidex (short for "humidity index"). It has been developed by the Canadian Meteorological service. It was introduced in 1965 and then it was revised by Masterson and Richardson (1979). It aims to describe how hot, humid weather is felt by the average person. The Humidex differs from the heat index in being related to the dew point rather than relative humidity.',
);
attachBins(mapping, HUMIDEX_BINS);
humidex.mapping = mapping;
