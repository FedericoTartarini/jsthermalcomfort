import { units_converter } from "../utilities/utilities.js";
//import set_tmp

/**
 * Returns the value of the Cooling Effect (`CE`) calculated in compliance
 * with the ASHRAE 55 2020 Standard [1]. The `CE` of the elevated air speed
 * is the value that, when subtracted equally from both the average air
 * temperature and the mean radiant temperature, yields the same `SET` under
 * still air as in the first `SET` calculation under elevated air speed. The
 * cooling effect is calculated only for air speed higher than 0.1 m/s.
 *
 * @see CE: https://en.wikipedia.org/wiki/Thermal_comfort#Cooling_Effect
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function `.utilities.v_relative`.
 *
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [met]
 * @param {number} clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected [2]. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `.utilities.clo_dynamic`.
 *
 * @param {number} wme - external work, [met], default 0
 * @param {'SI','IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @returns {number} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 *
 * @example
 * // Example in JavaScript:
 * // const CE = cooling_effect(25, 25, 0.3, 50, 1.2, 0.5);
 * // console.log(CE); // Output: 1.64
 *
 * // For users who want to use the IP system
 * // const CE = cooling_effect(77, 77, 1.64, 50, 1, 0.6, "IP");
 * // console.log(CE); // Output: 3.74
 *
 * @throws {Error} If the cooling effect could not be calculated
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
  if (units.toLowerCase() === "ip") {
    // Convert inputs to SI units
    ({ tdb, tr, vr } = units_converter({ tdb, tr, vr }, "IP"));
  }

  if (vr <= 0.1) {
    return 0;
  }

  const still_air_threshold = 0.1;

  const initial_set_tmp = set_tmp(
    tdb,
    tr,
    still_air_threshold,
    rh,
    met,
    clo,
    wme,
    //will be modified after see set_tmp function
    false, // round
    true, // calculate_ce
    false, // limit_inputs
  );

  function functionToOptimize(x) {
    return (
      set_tmp(
        tdb - x,
        tr - x,
        still_air_threshold,
        rh,
        met,
        clo,
        wme,
        //will be modified after see set_tmp function
        false, // round
        true, // calculate_ce
        false, // limit_inputs
      ) - initial_set_tmp
    );
  }

  // Implement Brent method
  function optimizeBrent(f, a, b, tol = 1e-6) {
    let fa = f(a);
    let fb = f(b);

    if (fa * fb >= 0) {
      console.error(
        "The function values at endpoints must have opposite signs.",
      );
      return null;
    }

    let c = a;
    let fc = fa;
    let d = b - a;
    let e = d;

    while (true) {
      if (Math.abs(fc) < Math.abs(fb)) {
        a = b;
        b = c;
        c = a;
        fa = fb;
        fb = fc;
        fc = fa;
      }

      const tol1 = 2 * tol * Math.abs(b) + 0.5 * tol;
      const xm = 0.5 * (c - b);

      if (Math.abs(xm) <= tol1 || fb === 0) {
        return b;
      }

      if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
        let s = fb / fa;

        let p, q, r;
        if (a === c) {
          p = 2 * xm * s;
          q = 1 - s;
        } else {
          q = fa / fc;
          r = fb / fc;
          p = s * (2 * xm * q * (q - r) - (b - a) * (r - 1));
          q = (q - 1) * (r - 1) * (s - 1);
        }

        if (p > 0) {
          q = -q;
        } else {
          p = -p;
        }

        if (
          2 * p < 3 * xm * q - Math.abs(tol1 * q) &&
          p < Math.abs(0.5 * e * q)
        ) {
          e = d;
          d = p / q;
        } else {
          d = xm;
          e = d;
        }
      } else {
        d = xm;
        e = d;
      }

      a = b;
      fa = fb;

      if (Math.abs(d) > tol1) {
        b += d;
      } else {
        b += Math.sign(xm) * tol1;
      }

      fb = f(b);
    }
  }

  let ce;
  try {
    // Find a root of a function in a bracketing interval using Brent's method.
    ce = optimizeBrent(functionToOptimize, 0, 40);
  } catch (error) {
    ce = 0;
  }

  if (ce === 0) {
    console.warn(
      `Assuming cooling effect = 0 since it could not be calculated for this set of inputs tdb=${tdb}, tr=${tr}, rh=${rh}, vr=${vr}, clo=${clo}, met=${met}`,
    );
  }

  if (units.toLowerCase() === "ip") {
    ce = (ce / 1.8) * 3.28;
  }

  return Math.round(ce * 100) / 100;
}
