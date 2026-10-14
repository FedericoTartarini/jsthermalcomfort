import { classifyFromBins } from "./classifierBins.js";
import { HEAT_INDEX_STRESS_CATEGORY_BINS } from "./heat_index.js";

/**
 * @typedef {number | NumericArray[]} NumericArray
 * @public
 */
/**
 * @typedef {string | number | CategoryArray[]} CategoryArray
 * @public
 */

/**
 * Calculates the Schoen (2005) heat index using the Magnus dew point formula
 * from WMO (2024), matching pythermalcomfort. Categories use the unrounded HI:
 * <=27: no risk, <=32: caution, <=41: extreme caution, <=54: danger,
 * <=1000: extreme danger; larger values and NaN have no category (NaN).
 * Scalars and rectangular nested arrays support NumPy-style broadcasting.
 * Invalid types throw TypeError; invalid humidity or array shapes throw RangeError.
 *
 * @public
 * @memberof models
 * @docname Heat Index (Schoen)
 * @param {number | NumericArray[]} tdb Dry bulb air temperature [°C].
 * @param {number | NumericArray[]} rh Relative humidity [0–100%].
 * @param {boolean} [round_output=true] Round HI to one decimal, using ties-to-even.
 * @returns {{hi: NumericArray, stress_category: CategoryArray}} Heat index and stress category with the broadcast input shape.
 * @example
 * const result = heat_index_schoen(29, 50); // {hi: 30, stress_category: "caution"}
 */
export function heat_index_schoen(tdb, rh, round_output = true) {
  if (typeof round_output !== "boolean") {
    throw new TypeError("round_output must be a boolean");
  }
  const tShape = inputShape(tdb, "tdb");
  const rShape = inputShape(rh, "rh");
  const rank = Math.max(tShape.length, rShape.length);
  const tDims = Array(rank - tShape.length)
    .fill(1)
    .concat(tShape);
  const rDims = Array(rank - rShape.length)
    .fill(1)
    .concat(rShape);
  const shape = tDims.map((n, i) => {
    const m = rDims[i];
    if (n !== m && n !== 1 && m !== 1) {
      throw new RangeError("tdb and rh cannot be broadcast together");
    }
    return n === 1 ? m : n;
  });

  function valueAt(value, dims, indices) {
    for (let i = rank - dims.length; i < rank; i++) {
      value = value[dims[i - (rank - dims.length)] === 1 ? 0 : indices[i]];
    }
    return Number(value);
  }

  function calculate(indices) {
    const t = valueAt(tdb, tShape, indices);
    const humidity = valueAt(rh, rShape, indices);
    // Do not use t_dp: its legacy coefficients and early rounding differ from Python.
    const e = (humidity / 100) * 6.112 * Math.exp((17.62 * t) / (243.12 + t));
    const log = Math.log(e / 6.112);
    const dew = (243.12 * log) / (17.62 - log);
    const hi =
      t - 1.0799 * Math.exp(0.03755 * t) * (1 - Math.exp(0.0801 * (dew - 14)));
    const stress_category = classifyFromBins(
      hi,
      HEAT_INDEX_STRESS_CATEGORY_BINS,
    );
    return { hi: round_output ? roundEven(hi) : hi, stress_category };
  }

  function build(indices) {
    if (indices.length === rank) return calculate(indices);
    const children = Array.from({ length: shape[indices.length] }, (_, i) =>
      build([...indices, i]),
    );
    return {
      hi: children.map((x) => x.hi),
      stress_category: children.map((x) => x.stress_category),
    };
  }
  return build([]);
}

function inputShape(value, name) {
  if (!Array.isArray(value)) {
    // Python numeric inputs also accept booleans as 0/1.
    if (typeof value !== "number" && typeof value !== "boolean") {
      throw new TypeError(`${name} must contain numbers`);
    }
    if (name === "rh" && (Number(value) < 0 || Number(value) > 100)) {
      throw new RangeError("rh must be between 0 and 100%");
    }
    return [];
  }
  const shapes = Array.from(value, (x) => inputShape(x, name));
  const child = shapes[0] ?? [];
  if (
    shapes.some(
      (x) => x.length !== child.length || x.some((n, i) => n !== child[i]),
    )
  ) {
    throw new RangeError(`${name} must be a rectangular array`);
  }
  return [value.length, ...child];
}

function roundEven(value) {
  const scaled = value * 10;
  const floor = Math.floor(scaled);
  const rounded =
    scaled - floor === 0.5
      ? floor % 2 === 0
        ? floor
        : floor + 1
      : Math.round(scaled);
  return rounded / 10;
}
