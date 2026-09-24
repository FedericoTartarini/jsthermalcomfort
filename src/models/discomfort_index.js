import { classifyFromBins } from "./classifierBins.js";

const DI_BINS = {
  edges: [21, 24, 27, 29, 32, 99],
  labels: [
    "No discomfort",
    "Less than 50% feels discomfort",
    "More than 50% feels discomfort",
    "Most of the population feels discomfort",
    "Everyone feels severe stress",
    "State of medical emergency",
  ],
  right: false,
};

/**
 * Numeric scalars or rectangular arrays; booleans are treated as 0/1.
 * @typedef {number|boolean|DiscomfortIndexInput[]} DiscomfortIndexInput
 * @public
 */

/**
 * @typedef {number|DiscomfortIndexValue[]} DiscomfortIndexValue
 * @public
 */

/**
 * @typedef {string|number|DiscomfortIndexCondition[]} DiscomfortIndexCondition
 * @public
 */

/**
 * @typedef {Object} DiscomfortIndexReturnType
 * @property {DiscomfortIndexValue} di - Discomfort Index [°C].
 * @property {DiscomfortIndexCondition} discomfort_condition - Discomfort category, or NaN if unmapped.
 * @public
 */

/**
 * Calculates the Discomfort Index (DI). The index is essentially an effective temperature based on air temperature and humidity.
 * The discomfort index is usually divided into 6 discomfort categories and it only applies to warm environments. {@link #ref_24|[24]}
 *
 * - class 1 - DI < 21 °C - No discomfort
 * - class 2 - 21 <= DI < 24 °C - Less than 50% feels discomfort
 * - class 3 - 24 <= DI < 27 °C - More than 50% feels discomfort
 * - class 4 - 27 <= DI < 29 °C - Most of the population feels discomfort
 * - class 5 - 29 <= DI < 32 °C - Everyone feels severe stress
 * - class 6 - DI >= 32 °C - State of medical emergency
 *
 * Supports scalars and rectangular arrays with NumPy-style broadcasting.
 * DI is rounded to one decimal; classification uses the unrounded value.
 * DI >= 99 or NaN returns a NaN classification.
 *
 * @public
 * @memberof models
 * @docname Discomfort Index (DI)
 *
 * @param {number|boolean|DiscomfortIndexInput[]} tdb - dry bulb air temperature [°C]
 * @param {number|boolean|DiscomfortIndexInput[]} rh - relative humidity [%]
 * @returns {DiscomfortIndexReturnType} object with results of DI
 * @example
 * discomfort_index(25, 50); // { di: 22.1, discomfort_condition: 'Less than 50% feels discomfort' }
 * @example
 * discomfort_index([25, 30], [50, 60]);
 * // { di: [22.1, 26.6], discomfort_condition: ['Less than 50% feels discomfort', 'More than 50% feels discomfort'] }
 */
export function discomfort_index(tdb, rh) {
  const tShape = input_shape(tdb, "tdb");
  const rShape = input_shape(rh, "rh");
  const rank = Math.max(tShape.length, rShape.length);
  const shape = Array.from({ length: rank }, (_, axis) => {
    const t = tShape[axis - rank + tShape.length] ?? 1;
    const r = rShape[axis - rank + rShape.length] ?? 1;
    if (t !== r && t !== 1 && r !== 1) {
      throw new RangeError("tdb and rh must have broadcast-compatible shapes");
    }
    return t === 1 ? r : t;
  });

  /**
   * @param {number[]} indices
   * @returns {DiscomfortIndexReturnType}
   */
  function evaluate(indices) {
    if (indices.length === rank) {
      return calculate_result(
        broadcast_value(tdb, tShape, indices),
        broadcast_value(rh, rShape, indices),
      );
    }
    const children = Array.from({ length: shape[indices.length] }, (_, i) =>
      evaluate([...indices, i]),
    );
    return {
      di: children.map((child) => child.di),
      discomfort_condition: children.map((child) => child.discomfort_condition),
    };
  }
  return evaluate([]);
}

/**
 * Validate input and return its array shape.
 * @param {DiscomfortIndexInput} value
 * @param {string} name
 * @returns {number[]}
 */
function input_shape(value, name) {
  if (!Array.isArray(value)) {
    if (typeof value !== "number" && typeof value !== "boolean") {
      throw new TypeError(`${name} must contain only numbers or booleans`);
    }
    return [];
  }
  if (value.length === 0) return [0];
  const children = Array.from(value, (child) => input_shape(child, name));
  const first = children[0];
  if (
    children.some(
      (child) =>
        child.length !== first.length ||
        child.some((size, i) => size !== first[i]),
    )
  ) {
    throw new RangeError(`${name} must be a rectangular array`);
  }
  return [value.length, ...first];
}

/**
 * @param {DiscomfortIndexInput} value
 * @param {number[]} shape
 * @param {number[]} indices
 * @returns {number}
 */
function broadcast_value(value, shape, indices) {
  for (let axis = 0; axis < shape.length; axis++) {
    const index =
      shape[axis] === 1 ? 0 : indices[indices.length - shape.length + axis];
    if (Array.isArray(value)) value = value[index];
  }
  return Number(value);
}

/**
 * @param {number} tdb
 * @param {number} rh
 */
function calculate_result(tdb, rh) {
  const di = calculate_di(tdb, rh);
  const scaled = di * 10;
  const lower = Math.floor(scaled);
  // np.around rounds exact ties to the nearest even digit.
  const rounded =
    scaled - lower === 0.5
      ? lower % 2 === 0
        ? lower
        : lower + 1
      : Math.round(scaled);
  return {
    di: rounded === 0 && (di < 0 || Object.is(di, -0)) ? -0 : rounded / 10,
    discomfort_condition: classifyFromBins(di, DI_BINS),
  };
}

/**
 * @param {number} tdb - dry bulb air temperature [°C]
 * @param {number} rh - relative humidity [%]
 * @returns {number} Discomfort Index (DI)
 */
function calculate_di(tdb, rh) {
  return tdb - 0.55 * (1 - 0.01 * rh) * (tdb - 14.5);
}
