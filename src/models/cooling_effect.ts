import {
  round,
  units_converter,
  validateInputs,
} from "../utilities/utilities.js";
import { set_tmp } from "./set_tmp.js";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not.
/**
 * @typedef {object} CoolingEffectResult
 * @property {number} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 * @public
 */
export type CoolingEffectResult = {
  ce: number;
};

/**
 * The params of `cooling_effect`: upstream's keyword parameters, quantities
 * and switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface CoolingEffectParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  units?: "SI" | "IP";
  suppress_warnings?: boolean;
}

/**
 * Returns the value of the Cooling Effect ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} )
 * calculated in compliance with the ASHRAE 55 2020 Standard {@link #ref_1|[1]}.
 * The {@link https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect|CE} of the elevated air speed
 * is the value that, when subtracted equally from both the average air temperature and the mean radiant temperature,
 * the same {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} under still air
 * as in the first {@link https://en.wikipedia.org/wiki/Thermal_comfort#Standard_effective_temperature|SET} calculation
 * under elevated air speed. The cooling effect is calculated only for air speed higher than 0.1 m/s.
 *
 * @public
 * @memberof models
 * @docname Cooling Effect (CE)
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} params.tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} params.vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of individual body parts.
 * vr can be calculated using the function `v_relative` which is in .utilities.js.
 *
 * @param {number} params.rh - relative humidity, [%]
 * @param {number} params.met - metabolic rate, [met]
 * @param {number} params.clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 *
 * @param {number} [params.wme=0] - external work
 * @param {'SI'|'IP'} [params.units= "SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [params.suppress_warnings=false] - If true, writes nothing to the console when the cooling effect cannot be calculated and is assumed to be 0.
 * @returns {CoolingEffectResult} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 *
 * @example
 * const CE = cooling_effect({ tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(CE); // Output: {ce: 1.68}
 *
 * // For users who want to use the IP system
 * const CE_IP = cooling_effect({ tdb: 77, tr: 77, vr: 1.64, rh: 50, met: 1, clo: 0.6, units: "IP" });
 * console.log(CE_IP); // Output: {ce: 3.95}
 */
// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const COOLING_EFFECT_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"] },
  suppress_warnings: { type: "boolean" },
};

export function cooling_effect(
  params: CoolingEffectParams,
): CoolingEffectResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  if (typeof params !== "object" || params === null) {
    throw new TypeError(
      `cooling_effect takes one params object, got ${String(params)}`,
    );
  }
  let { tdb, tr, vr } = params;
  const { rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const { wme = 0, units = "SI", suppress_warnings = false } = params;
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      units: units.toUpperCase(),
      suppress_warnings,
    },
    COOLING_EFFECT_SCHEMA,
  );

  if (units.toLowerCase() === "ip") {
    const result = units_converter({ tdb, tr, vr }, "IP");
    tdb = result.tdb;
    tr = result.tr;
    vr = result.vr;
  }

  if (vr <= 0.1) {
    return { ce: 0 };
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

  function func(x: number): number {
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
    // Only the not-bracketed failure falls back to 0, as upstream catches only
    // the ValueError brentq raises for it; anything else propagates.
    if (!(error instanceof RootNotBracketedError)) throw error;
    ce = 0;
  }

  // pythermalcomfort raises a Python warning here, which its callers silence
  // with the warnings module; JavaScript has no such facility, so
  // suppress_warnings is the port of it rather than a new behaviour.
  if (ce === 0 && !suppress_warnings) {
    console.warn("Cooling effect could not be calculated. Returning 0.");
  }

  if (units.toLowerCase() === "ip") {
    ce = (ce / 1.8) * 3.28;
  }

  ce = round(ce, 2);

  return { ce: ce };
}

// Brent's one recoverable failure, a class of its own so that cooling_effect
// can catch it and nothing else, as upstream catches brentq's ValueError.
class RootNotBracketedError extends Error {
  name = "RootNotBracketedError";
}

// https://gist.github.com/ryanspradlin/18c1010b7dd2d875284933d018c5c908
// Derived from: https://en.wikipedia.org/wiki/Brent%27s_method#Algorithm
// Brent's method is a hybrid root-finding algorithm that combines the
// faster/less-reliable inverse quadradic interpolation and secant methods with
// the slower/more-reliable bisection method.
export function brent(
  f: (x: number) => number,
  lowerBound: number,
  upperBound: number,
  tolerance = 1e-6,
  maxIterations = 100,
): number {
  let a = lowerBound;
  let b = upperBound;
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    // Root is not bracketed.
    throw new RootNotBracketedError(`Root is not bracketed: [${fa}, ${fb}].`);
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
