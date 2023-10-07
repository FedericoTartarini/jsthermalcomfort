import { units_converter, round } from "../utilities/utilities.js";
import { set_tmp } from "./set_tmp.js";
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
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of individual body parts.
 * vr can be calculated using the function `v_relative` which is in .utilities.js.
 *
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [met]
 * @param {number} clo - clothing insulation, [clo]
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 *
 * @param {number} [wme=0] - external work
 * @param {'SI'|'IP'} [units= "SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @returns {number} ce - Cooling Effect, default in [°C] in [°F] if `units` = 'IP'
 *
 * @example
 * const CE = cooling_effect(25, 25, 0.3, 50, 1.2, 0.5);
 * console.log(CE); // Output: 1.64
 *
 * // For users who want to use the IP system
 * const CE_IP = cooling_effect(77, 77, 1.64, 50, 1, 0.6, "IP");
 * console.log(CE_IP); // Output: 3.74
 */
export function cooling_effect(tdb, tr, vr, rh, met, clo, wme = 0, units = "SI") {
    if (units.toLowerCase() === "ip") {
        const result = units_converter({ tdb, tr, vr }, "IP");
        tdb = result.tdb;
        tr = result.tr;
        vr = result.vr;
    }
    if (vr <= 0.1) {
        return 0;
    }
    const still_air_threshold = 0.1;
    const initial_set_tmp = set_tmp(tdb, tr, vr, rh, met, clo, wme, undefined, undefined, undefined, undefined, false, {
        round: false,
        calculate_ce: true,
    });
    function func(x) {
        return (set_tmp(tdb - x, tr - x, still_air_threshold, rh, met, clo, wme, undefined, undefined, undefined, undefined, false, {
            round: false,
            calculate_ce: true,
        }) - initial_set_tmp);
    }
    let ce;
    try {
        // Find a root of a function in a bracketing interval
        ce = findRoot(func, 0, 40);
    }
    catch (error) {
        ce = 0;
    }
    if (ce === 0) {
        console.warn(`Assuming cooling effect = 0 since it could not be calculated for this set of inputs tdb=${tdb}, tr=${tr}, rh=${rh}, vr=${vr}, clo=${clo}, met=${met}`);
    }
    if (units.toLowerCase() === "ip") {
        ce = (ce / 1.8) * 3.28;
    }
    return round(ce, 2);
}
/**
 * @param func - The target function that needs to find the root.
 * @param a - The left boundary of the search interval
 * @param b - The right boundary of the search interval
 * @returns {number} - return root if found
 */
function findRoot(func, a, b) {
    const maxIterations = 100; // Set the maximum number of iterations to prevent infinite loop
    let fa = func(a);
    let fb = func(b);
    let c, fc;
    if (Math.sign(fa) === Math.sign(fb)) {
        throw new Error("Function has the same sign at both ends of the interval.");
    }
    for (let i = 0; i < maxIterations; i++) {
        // Calculate a new approximation 'c' using the bisection method
        c = (a + b) / 2;
        fc = func(c);
        if (Math.abs(fc) < 1e-6) {
            return c;
        }
        if (Math.sign(fc) === Math.sign(fa)) {
            // Update the interval boundaries
            a = c;
            fa = fc;
        }
        else {
            b = c;
            fb = fc;
        }
    }
    throw new Error("Maximum number of iterations reached.");
}
