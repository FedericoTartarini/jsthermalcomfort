import { round } from "../utilities/utilities.js";
/**
 * Calculates vapour pressure of water at different temperatures
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} tdb - air temperature, [°C]
 * @returns {number} - vapour pressure of water, [Pa]
 *
 * @category Psychrometrics
 */
export function p_sat(tdb) {
    const c_to_k = 273.15;
    const ta_k = tdb + c_to_k;
    const c1 = -5674.5359;
    const c2 = 6.3925247;
    const c3 = -0.009677843; // = -0.9677843 * math.pow(10, -2)
    const c4 = 6.2215701e-7; // = 0.62215701 * math.pow(10, -6)
    const c5 = 2.0747825e-9; // = 0.20747825 * math.pow(10, -8)
    const c6 = -9.484024e-13; // = -0.9484024 * math.pow(10, -12)
    const c7 = 4.1635019;
    const c8 = -5800.2206;
    const c9 = 1.3914993;
    const c10 = -0.048640239;
    const c11 = 0.000041764767999999996; // = 0.41764768 * math.pow(10, -4)
    const c12 = -1.4452093e-8; // = -0.14452093 * math.pow(10, -7)
    const c13 = 6.5459673;
    const calc = () => {
        if (ta_k < c_to_k) {
            return Math.exp(c1 / ta_k +
                c2 +
                ta_k * (c3 + ta_k * (c4 + ta_k * (c5 + c6 * ta_k))) +
                c7 * Math.log(ta_k));
        }
        return Math.exp(c8 / ta_k +
            c9 +
            ta_k * (c10 + ta_k * (c11 + ta_k * c12)) +
            c13 * Math.log(ta_k));
    };
    return round(calc(), 1);
}
