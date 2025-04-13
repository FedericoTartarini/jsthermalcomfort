import { round, transpose_sharp_altitude } from "../utilities/utilities.js";
// avoid reallocating these arrays accross function calls
const _alt_range = [0, 15, 30, 45, 60, 75, 90];
const _az_range = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];
// avoid reallocating these table across function calls
const _fp_table_sitting = [
    [0.29, 0.324, 0.305, 0.303, 0.262, 0.224, 0.177],
    [0.292, 0.328, 0.294, 0.288, 0.268, 0.227, 0.177],
    [0.288, 0.332, 0.298, 0.29, 0.264, 0.222, 0.177],
    [0.274, 0.326, 0.294, 0.289, 0.252, 0.214, 0.177],
    [0.254, 0.308, 0.28, 0.276, 0.241, 0.202, 0.177],
    [0.23, 0.282, 0.262, 0.26, 0.233, 0.193, 0.177],
    [0.216, 0.26, 0.248, 0.244, 0.22, 0.186, 0.177],
    [0.234, 0.258, 0.236, 0.227, 0.208, 0.18, 0.177],
    [0.262, 0.26, 0.224, 0.208, 0.196, 0.176, 0.177],
    [0.28, 0.26, 0.21, 0.192, 0.184, 0.17, 0.177],
    [0.298, 0.256, 0.194, 0.174, 0.168, 0.168, 0.177],
    [0.306, 0.25, 0.18, 0.156, 0.156, 0.166, 0.177],
    [0.3, 0.24, 0.168, 0.152, 0.152, 0.164, 0.177],
];
const _fp_table = [
    [0.35, 0.35, 0.314, 0.258, 0.206, 0.144, 0.082],
    [0.342, 0.342, 0.31, 0.252, 0.2, 0.14, 0.082],
    [0.33, 0.33, 0.3, 0.244, 0.19, 0.132, 0.082],
    [0.31, 0.31, 0.275, 0.228, 0.175, 0.124, 0.082],
    [0.283, 0.283, 0.251, 0.208, 0.16, 0.114, 0.082],
    [0.252, 0.252, 0.228, 0.188, 0.15, 0.108, 0.082],
    [0.23, 0.23, 0.214, 0.18, 0.148, 0.108, 0.082],
    [0.242, 0.242, 0.222, 0.18, 0.153, 0.112, 0.082],
    [0.274, 0.274, 0.245, 0.203, 0.165, 0.116, 0.082],
    [0.304, 0.304, 0.27, 0.22, 0.174, 0.121, 0.082],
    [0.328, 0.328, 0.29, 0.234, 0.183, 0.125, 0.082],
    [0.344, 0.344, 0.304, 0.244, 0.19, 0.128, 0.082],
    [0.347, 0.347, 0.308, 0.246, 0.191, 0.128, 0.082],
];
/**
 * @typedef {object} SolarGainReturnType
 * @property {number} erf - Solar gain to the human body using the Effective Radiant Field [W/m2]
 * @property {number} delta_mrt - Delta mean radiant temperature. The amount by which the mean radiant
 * temperature of the space should be increased if no solar radiation is present.
 * @public
 */
/**
 * Calculates the solar gain to the human body using the Effective Radiant
 * Field ( ERF) {@link #ref_1|[1]}. The ERF is a measure of the net energy flux to or from
 * the human body. ERF is expressed in W over human body surface area [w/m2].
 *
 * In addition, it calculates the delta mean radiant temperature. Which is the
 * amount by which the mean radiant temperature of the space should be
 * increased if no solar radiation is present.
 *
 * More information on the calculation procedure can be found in Appendix C of {@link #ref_1|[1]}.
 *
 * @memberof models
 * @public
 * @docname Solar gain on people
 *
 * @param {number} sol_altitude - Solar altitude, degrees from horizontal [deg]. Ranges between 0 and 90.
 * @param {number} sharp - Solar horizontal angle relative to the front of the person (SHARP) [deg].
 * Ranges between 0 and 180 and is symmetrical on either side. Zero (0) degrees
 * represents direct-beam radiation from the front, 90 degrees represents
 * direct-beam radiation from the side, and 180 degrees rep- resent direct-beam
 * radiation from the back. SHARP is the angle between the sun and the person
 * only. Orientation relative to compass or to room is not included in SHARP.
 * @param {number} sol_radiation_dir - Direct-beam solar radiation, [W/m2]. Ranges between 200 and 1000. See Table C2-3 of ASHRAE 55 2020 {@link #ref_1|[1]}.
 * @param {number} sol_transmittance - Total solar transmittance, ranges from 0 to 1. The total solar
 * transmittance of window systems, including glazing unit, blinds, and other
 * façade treatments, shall be determined using one of the following methods:
 * - i) Provided by manufacturer or from the National Fenestration Rating Council approved Lawrence Berkeley National Lab International Glazing Database.
 * - ii) Glazing unit plus venetian blinds or other complex or unique shades shall be calculated using National Fenestration Rating Council approved software or Lawrence Berkeley National Lab Complex Glazing Database.
 * @param {number} f_svv - Fraction of sky-vault view fraction exposed to body, ranges from 0 to 1. It can be calculated using the function {@link #f_svv|f_svv} in utilities.
 * @param {number} f_bes - Fraction of the possible body surface exposed to sun, ranges from 0 to 1. See Table C2-2 and equation C-7 ASHRAE 55 2020 {@link #ref_1|[1]}.
 * @param {number} [asw=0.7] - The average short-wave absorptivity of the occupant. It will range widely,
 * depending on the color of the occupant’s skin as well as the color and
 * amount of clothing covering the body.
 *
 * A value of 0.7 shall be used unless more specific information about the
 * clothing or skin color of the occupants is available.
 * Note: Short-wave absorptivity typically ranges from 0.57 to 0.84, depending
 * on skin and clothing color. More information is available in Blum (1945).
 * @param {"standing" | "supine" | "sitting"} [posture="sitting"] - Default 'sitting' list of available options 'standing', 'supine' or 'sitting'
 * @param {number} [floor_reflectance=0.7] - Floor refectance. It is assumed to be constant and equal to 0.6.
 *
 * @returns {SolarGainReturnType}
 *
 * @example
 * import {solar_gain} from "jsthermalcomfort/models";
 * const results = solar_gain(0, 120, 800, 0.5, 0.7, "sitting");
 * console.log(results); // {erf: 42.9, delta_mrt: 10.3}
 */
export function solar_gain(sol_altitude, sharp, sol_radiation_dir, sol_transmittance, f_svv, f_bes, asw = 0.7, posture = "sitting", floor_reflectance = 0.6) {
    posture = posture.toLowerCase();
    if (posture !== "standing" && posture !== "supine" && posture !== "sitting")
        throw new Error("Posture has to be either standing, supine or sitting");
    const deg_to_rad = 0.0174532925;
    const hr = 6;
    const i_diff = 0.2 * sol_radiation_dir;
    // fp is the projected area factor
    const fp_table = posture === "sitting" ? _fp_table_sitting : _fp_table;
    if (posture === "supine") {
        [sharp, sol_altitude] = transpose_sharp_altitude(sharp, sol_altitude);
    }
    const alt_i = find_span(_alt_range, sol_altitude);
    const az_i = find_span(_az_range, sharp);
    const fp11 = fp_table[az_i][alt_i];
    const fp12 = fp_table[az_i][alt_i + 1];
    const fp21 = fp_table[az_i + 1][alt_i];
    const fp22 = fp_table[az_i + 1][alt_i + 1];
    const az1 = _az_range[az_i];
    const az2 = _az_range[az_i + 1];
    const alt1 = _alt_range[alt_i];
    const alt2 = _alt_range[alt_i + 1];
    let fp = fp11 * (az2 - sharp) * (alt2 - sol_altitude);
    fp += fp21 * (sharp - az1) * (alt2 - sol_altitude);
    fp += fp12 * (az2 - sharp) * (sol_altitude - alt1);
    fp += fp22 * (sharp - az1) * (sol_altitude - alt1);
    fp /= (az2 - az1) * (alt2 - alt1);
    const f_eff = posture === "sitting" ? 0.696 : 0.725; // fraction of the body surface exposed to environmental radiation
    const sw_abs = asw;
    const lw_abs = 0.95;
    const e_diff = f_eff * f_svv * 0.5 * sol_transmittance * i_diff;
    const e_direct = f_eff * fp * sol_transmittance * f_bes * sol_radiation_dir;
    const e_reflected = f_eff *
        f_svv *
        0.5 *
        sol_transmittance *
        (sol_radiation_dir * Math.sin(sol_altitude * deg_to_rad) + i_diff) *
        floor_reflectance;
    const e_solar = e_diff + e_direct + e_reflected;
    const erf = e_solar * (sw_abs / lw_abs);
    const d_mrt = erf / (hr * f_eff);
    return { erf: round(erf, 1), delta_mrt: round(d_mrt, 1) };
}
/**
 *
 * @param {number[]} arr
 * @param {number} x
 *
 * @returns {number}
 */
export function find_span(arr, x) {
    let left = 0;
    let right = arr.length - 1;
    while (left <= right) {
        let mid = left + Math.floor((right - left) / 2);
        if (arr[mid + 1] >= x && x > arr[mid]) {
            return mid;
        }
        if (x <= arr[mid]) {
            right = mid - 1;
        }
        else if (x > arr[mid]) {
            left = mid + 1;
        }
    }
    return x === arr[0] ? 0 : -1;
}
