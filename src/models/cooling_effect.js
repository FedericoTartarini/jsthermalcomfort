import {
  round,
  units_converter,
  validateInputs,
} from "../utilities/utilities.js";
import { set_tmp } from "./set_tmp.js";

const COOLING_EFFECT_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"] },
};

/**
 * @typedef {number | boolean | CoolingEffectInput[]} CoolingEffectInput
 * @public
 */
/**
 * @typedef {number | CoolingEffectOutput[]} CoolingEffectOutput
 * @public
 */

/**
 * @typedef {object} CoolingEffectResult
 * @property {CoolingEffectOutput} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'. Preserves the broadcast input shape.
 * @public
 */
/**
 * Returns the value of the Cooling Effect ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} )
 * calculated in compliance with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 * The {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} of the elevated air speed
 * is the value that, when subtracted equally from both the average air temperature and the mean radiant temperature,
 * the same {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} under still air
 * as in the first {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} calculation
 * under elevated air speed. The cooling effect is calculated only for air speed higher than 0.1 m/s.
 *
 * Numeric inputs accept finite scalars or rectangular arrays. Arrays broadcast
 * along trailing dimensions as in NumPy; each dimension must match or be 1.
 * Booleans are treated as 0/1. Empty arrays are not supported, matching Python's
 * vectorized implementation. Non-finite values retain the JS API's validation.
 *
 * @public
 * @memberof models
 * @docname Cooling Effect (CE)
 * @param {CoolingEffectInput} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {CoolingEffectInput} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {CoolingEffectInput} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of individual body parts.
 * vr can be calculated using the function `v_relative` which is in .utilities.js.
 *
 * @param {CoolingEffectInput} rh - relative humidity, [%]
 * @param {CoolingEffectInput} met - metabolic rate, [met]
 * @param {CoolingEffectInput} clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 *
 * @param {CoolingEffectInput} [wme=0] - external work
 * @param {'SI'|'IP'} [units= "SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @returns {CoolingEffectResult} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 *
 * @example
 * const CE = cooling_effect(25, 25, 0.3, 50, 1.2, 0.5);
 * console.log(CE); // Output: {ce: 1.68}
 *
 * // For users who want to use the IP system
 * const CE_IP = cooling_effect(77, 77, 1.64, 50, 1, 0.6, 0, "IP");
 * console.log(CE_IP); // Output: {ce: 3.95}
 *
 * const batch = cooling_effect(25, 25, [0.1, 0.3, 0.5], 50, 1.2, 0.5);
 * console.log(batch); // Output: {ce: [0, 1.68, 2.62]}
 */
/**
 * @overload
 * @param {number | boolean} tdb
 * @param {number | boolean} tr
 * @param {number | boolean} vr
 * @param {number | boolean} rh
 * @param {number | boolean} met
 * @param {number | boolean} clo
 * @param {number | boolean} [wme]
 * @param {string} [units]
 * @returns {{ce: number}}
 */
/**
 * @overload
 * @param {CoolingEffectInput} tdb
 * @param {CoolingEffectInput} tr
 * @param {CoolingEffectInput} vr
 * @param {CoolingEffectInput} rh
 * @param {CoolingEffectInput} met
 * @param {CoolingEffectInput} clo
 * @param {CoolingEffectInput} [wme]
 * @param {string} [units]
 * @returns {CoolingEffectResult}
 */
export function cooling_effect(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme = 0,
  units = "SI",
) {
  if (typeof units !== "string") {
    throw new TypeError('Parameter "units" must be a string');
  }
  units = units.toUpperCase();
  validateInputs({ units }, { units: COOLING_EFFECT_SCHEMA.units });
  const inputs = { tdb, tr, vr, rh, met, clo, wme };
  const shapeOf = (value, name) => {
    if (!Array.isArray(value)) {
      validateInputs(
        { [name]: typeof value === "boolean" ? Number(value) : value },
        { [name]: COOLING_EFFECT_SCHEMA[name] },
      );
      return [];
    }
    if (value.length === 0)
      throw new RangeError("Empty arrays are not supported");
    const shapes = Array.from(value, (item) => shapeOf(item, name));
    if (shapes.some((shape) => shape.join() !== shapes[0].join())) {
      throw new RangeError(`${name} must be a rectangular array`);
    }
    return [value.length, ...shapes[0]];
  };
  const values = Object.values(inputs);
  const shapes = Object.entries(inputs).map(([name, value]) =>
    shapeOf(value, name),
  );
  const rank = Math.max(...shapes.map((shape) => shape.length));
  const outputShape = Array(rank).fill(1);
  for (const shape of shapes) {
    shape.forEach((size, i) => {
      const axis = rank - shape.length + i;
      if (outputShape[axis] !== 1 && size !== 1 && outputShape[axis] !== size) {
        throw new RangeError("Input shapes cannot be broadcast together");
      }
      outputShape[axis] = Math.max(outputShape[axis], size);
    });
  }
  const calculate = (indices) => {
    if (indices.length < rank) {
      return Array.from({ length: outputShape[indices.length] }, (_, i) =>
        calculate([...indices, i]),
      );
    }
    const args = values.map((value, j) => {
      shapes[j].forEach((size, i) => {
        value = value[size === 1 ? 0 : indices[rank - shapes[j].length + i]];
      });
      return Number(value);
    });
    return coolingEffectScalar(...args, units);
  };
  return { ce: calculate([]) };
}

function coolingEffectScalar(tdb, tr, vr, rh, met, clo, wme, units) {
  if (units === "IP") {
    const result = units_converter({ tdb, tr, vr }, "IP");
    tdb = result.tdb;
    tr = result.tr;
    vr = result.vr;
  }

  if (vr <= 0.1) {
    return 0;
  }

  const still_air_threshold = 0.1;

  const initial_set_tmp = set_tmp(
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    undefined,
    undefined,
    undefined,
    undefined,
    false,
    {
      round: false,
      calculate_ce: true,
    },
  ).set;

  function func(x) {
    return (
      set_tmp(
        tdb - x,
        tr - x,
        still_air_threshold,
        rh,
        met,
        clo,
        wme,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        {
          round: false,
          calculate_ce: true,
        },
      ).set - initial_set_tmp
    );
  }

  let ce;
  try {
    // Find a root of a function in a bracketing interval
    ce = brent(func, 0, 40);
  } catch (error) {
    ce = 0;
  }

  if (ce === 0) {
    console.warn(
      `Assuming cooling effect = 0 since it could not be calculated for this set of inputs tdb=${tdb}, tr=${tr}, rh=${rh}, vr=${vr}, clo=${clo}, met=${met}`,
    );
  }

  if (units === "IP") {
    ce = (ce / 1.8) * 3.28;
  }

  ce = round(ce, 2);

  return ce;
}

// https://gist.github.com/ryanspradlin/18c1010b7dd2d875284933d018c5c908
// Derived from: https://en.wikipedia.org/wiki/Brent%27s_method#Algorithm
// Brent's method is a hybrid root-finding algorithm that combines the
// faster/less-reliable inverse quadradic interpolation and secant methods with
// the slower/more-reliable bisection method.
export function brent(
  f,
  lowerBound,
  upperBound,
  tolerance = 1e-6,
  maxIterations = 100,
) {
  let a = lowerBound;
  let b = upperBound;
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    // Root is not bracketed.
    throw new Error(`Root is not bracketed: [${fa}, ${fb}].`);
  }

  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }

  let c = a;
  let fc = fa;
  let s = 0;
  let d = 0;
  let mflag = true;
  for (let i = 0; i < maxIterations; i++) {
    // Check if we have succeeded...
    if (fb === 0 || Math.abs(b - a) <= tolerance) {
      // Root found!
      return b;
    }

    // Try to use fast/less-reliable methods first...
    if (fa !== fc && fb !== fc) {
      // Inverse quadratic interpolation.
      s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb));
    } else {
      // Secant method.
      s = b - fb * ((b - a) / (fb - fa));
    }

    // If necessary, fallback to slow/more-reliable method...
    if (
      (s - (3 * a + b) / 4) * (s - b) >= 0 ||
      (mflag && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
      (!mflag && Math.abs(s - b) >= Math.abs(c - d) / 2) ||
      (mflag && Math.abs(b - c) < Math.abs(tolerance)) ||
      (!mflag && Math.abs(c - d) < Math.abs(tolerance))
    ) {
      // Bisection method.
      s = (a + b) / 2;
      mflag = true;
    } else {
      mflag = false;
    }

    d = c;
    c = b;
    fc = fb;

    const fs = f(s);
    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
  }

  // Could not achieve required tolerance within iteration limit.
  throw new Error(
    "Could not achieve required tolerance within iteration limit.",
  );
}
