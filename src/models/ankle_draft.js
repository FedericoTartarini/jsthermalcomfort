import { units_converter } from "../utilities/utilities.js";
import { pmv_ppd_ashrae } from "./pmv_ppd_ashrae.js";
import { pmv_calculation } from "./pmv_ppd.js";

// ASHRAE 55-2023 bounds, in the same order as the numeric arguments.
const APPLICABILITY = [[10, 40], [10, 40], [0, 2], null, [1, 4], [0, 1.5]];

/**
 * Numeric scalars or rectangular arrays; booleans are treated as 0/1.
 * @typedef {number|boolean|AnkleDraftInput[]} AnkleDraftInput
 * @public
 */

/**
 * @typedef {number|AnkleDraftValue[]} AnkleDraftValue
 * @public
 */

/**
 * @typedef {boolean|number|AnkleDraftAcceptability[]} AnkleDraftAcceptability
 * @public
 */

/**
 * @typedef {Object} AnkleDraftRet
 * @property {AnkleDraftValue} ppd_ad - Predicted percentage dissatisfied with ankle draft [%], or NaN outside applicability limits.
 * @property {AnkleDraftAcceptability} acceptability - Whether rounded ppd_ad is at most 20%, or NaN outside applicability limits.
 * @public
 */

/**
 * Calculates dissatisfaction with ankle draft at 0.1 m above the floor {@link #ref_23|[23]}.
 * Supports scalars and rectangular arrays with NumPy-style broadcasting.
 * Uses ASHRAE 55-2023 PMV, rounded to two decimals, and rounds ppd_ad to one decimal.
 *
 * With limit_inputs enabled, applicability bounds are inclusive: tdb and tr
 * 10–40 °C, vr 0–2 m/s, met 1–4 met, and clo 0–1.5 clo. Invalid elements
 * emit a warning and return NaN for both outputs. As in Python, the separate ankle-draft airspeed
 * check throws only when every supplied vr is outside 0–0.2 m/s; mixed arrays
 * still use the general 0–2 m/s bound for element-wise masking.
 *
 * @public
 * @memberof models
 * @docname Ankle draft
 * @param {number|boolean|AnkleDraftInput[]} tdb - Dry bulb air temperature [°C], or [°F] in IP.
 * @param {number|boolean|AnkleDraftInput[]} tr - Mean radiant temperature [°C], or [°F] in IP.
 * @param {number|boolean|AnkleDraftInput[]} vr - Relative air speed [m/s], or [fps] in IP.
 * @param {number|boolean|AnkleDraftInput[]} rh - Relative humidity [%].
 * @param {number|boolean|AnkleDraftInput[]} met - Metabolic rate [met].
 * @param {number|boolean|AnkleDraftInput[]} clo - Clothing insulation [clo].
 * @param {number|boolean|AnkleDraftInput[]} v_ankle - Air speed at ankle height [m/s], or [fps] in IP.
 * @param {"IP"|"SI"} [units="SI"] - Unit system (case-insensitive).
 * @param {boolean} [limit_inputs=true] - Apply the model's applicability checks.
 * @returns {AnkleDraftRet} Ankle draft dissatisfaction and acceptability.
 * @example
 * ankle_draft(25, 25, 0.2, 50, 1.2, 0.5, 0.3);
 * // { ppd_ad: 18.5, acceptability: true }
 */
export function ankle_draft(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  v_ankle,
  units = "SI",
  limit_inputs = true,
) {
  if (typeof units !== "string") throw new TypeError("units must be a string");
  units = units.toUpperCase();
  if (units !== "SI" && units !== "IP") {
    throw new RangeError("units must be SI or IP");
  }
  if (typeof limit_inputs !== "boolean") {
    throw new TypeError("limit_inputs must be a boolean");
  }
  const inputs = [tdb, tr, vr, rh, met, clo, v_ankle];
  const names = ["tdb", "tr", "vr", "rh", "met", "clo", "v_ankle"];
  const shapes = inputs.map((value, i) => input_shape(value, names[i]));
  const rank = Math.max(...shapes.map((shape) => shape.length));
  const shape = Array.from({ length: rank }, (_, axis) => {
    let size = 1;
    for (const inputShape of shapes) {
      const next = inputShape[axis - rank + inputShape.length] ?? 1;
      if (size !== next && size !== 1 && next !== 1) {
        throw new RangeError("inputs must have broadcast-compatible shapes");
      }
      if (size === 1) size = next;
    }
    return size;
  });
  // Python's PMV/cooling-effect vectorization rejects empty environmental
  // arrays. An empty v_ankle array is allowed after a non-empty PMV evaluation.
  if (shapes.slice(0, 6).some((inputShape) => inputShape.includes(0))) {
    throw new RangeError("PMV cannot be evaluated on empty input arrays");
  }

  // Python checks the supplied vr array, not the broadcast result. In particular,
  // this must not become an element-wise exception for mixed airspeed arrays.
  const speeds = Array.isArray(vr) ? vr.flat(Infinity) : [vr];
  if (limit_inputs) {
    for (let i = 0; i < APPLICABILITY.length; i++) {
      const bounds = APPLICABILITY[i];
      if (!bounds) continue;
      const values = Array.isArray(inputs[i])
        ? inputs[i].flat(Infinity)
        : [inputs[i]];
      const si = values.map((value) => {
        const numeric = Number(value);
        if (units !== "IP") return numeric;
        if (i < 2) return (numeric - 32) / 1.8;
        return i === 2 ? numeric / 3.281 : numeric;
      });
      warn_outside_range(si, names[i], bounds);
    }
    warn_outside_range(
      speeds.map((value) => Number(value) / (units === "IP" ? 3.281 : 1)),
      "v_limited",
      [0, 0.2],
    );
  }
  if (
    limit_inputs &&
    !speeds.some((value) => {
      const speed = Number(value) / (units === "IP" ? 3.281 : 1);
      return speed >= 0 && speed <= 0.2;
    })
  ) {
    throw new RangeError(
      "This equation is only applicable for air speed lower than 0.2 m/s",
    );
  }

  /** @param {number[]} indices @returns {AnkleDraftRet} */
  function evaluate(indices) {
    if (indices.length === rank) {
      const values = inputs.map((value, i) => {
        const inputShape = shapes[i];
        for (let axis = 0; axis < inputShape.length; axis++) {
          const index =
            inputShape[axis] === 1
              ? 0
              : indices[rank - inputShape.length + axis];
          if (Array.isArray(value)) value = value[index];
        }
        return Number(value);
      });
      return calculate(values, units, limit_inputs);
    }
    const children = Array.from({ length: shape[indices.length] }, (_, i) =>
      evaluate([...indices, i]),
    );
    return {
      ppd_ad: children.map((child) => child.ppd_ad),
      acceptability: children.map((child) => child.acceptability),
    };
  }
  return evaluate([]);
}

/**
 * @param {number|boolean|AnkleDraftInput[]} value
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
 * @param {number[]} values
 * @param {string} units
 * @param {boolean} limit_inputs
 * @returns {AnkleDraftRet}
 */
function calculate([tdb, tr, vr, rh, met, clo, v_ankle], units, limit_inputs) {
  if (units === "IP") {
    ({
      tdb,
      tr,
      vr,
      vel: v_ankle,
    } = units_converter({
      tdb,
      tr,
      vr,
      vel: v_ankle,
    }));
  }
  const values = [tdb, tr, vr, rh, met, clo];
  const valid = APPLICABILITY.every(
    (bounds, i) =>
      !bounds || (values[i] >= bounds[0] && values[i] <= bounds[1]),
  );
  if (limit_inputs && !valid) return { ppd_ad: NaN, acceptability: NaN };

  // The public scalar wrapper rejects non-finite inputs, whereas Python passes
  // them through its numerical kernel (NaN vr still permits natural convection).
  const rawPmv = values.every(Number.isFinite)
    ? pmv_ppd_ashrae(tdb, tr, vr, rh, met, clo, 0, {
        limit_inputs: false,
        round_output: false,
      }).pmv
    : pmv_calculation(tdb, tr, vr, rh, met, clo, 0);
  const tsv = round_even(rawPmv, 100);
  const exponent = Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv);
  const ppd_ad = round_even((exponent / (1 + exponent)) * 100, 10);
  return { ppd_ad, acceptability: ppd_ad <= 20 };
}

/** @param {number} value @param {number} factor @returns {number} */
function round_even(value, factor) {
  const scaled = value * factor;
  const lower = Math.floor(scaled);
  // np.around uses ties-to-even rather than Math.round's ties-to-positive-infinity.
  const rounded =
    scaled - lower === 0.5
      ? lower % 2 === 0
        ? lower
        : lower + 1
      : Math.round(scaled);
  return rounded / factor;
}

/**
 * Warn once per supplied parameter, rather than once per broadcast element.
 * @param {number[]} values
 * @param {string} name
 * @param {number[]} bounds
 */
function warn_outside_range(values, name, [min, max]) {
  const indices = [];
  const invalid = [];
  values.forEach((value, index) => {
    if (value < min || value > max) {
      indices.push(index);
      invalid.push(value);
    }
  });
  if (invalid.length) {
    console.warn(
      `'${name}' has values [${invalid.join(", ")}] at indices [${indices.join(", ")}] outside the applicability limits [${min}, ${max}].`,
    );
  }
}
