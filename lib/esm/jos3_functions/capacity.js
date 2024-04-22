import JOS3Defaults from "./JOS3Defaults.js";
import { validate_body_parameters } from "./validate_body_parameters.js";
import { bfb_rate } from "./bfb_rate.js";
import { weight_rate } from "./weight_rate.js";
import { NUM_NODES, BODY_NAMES, IDICT } from "./matrix.js";
/**
 * Calculate thermal capacity in Joules per Kelvin (J/K).
 * Derived from Yokoyama's model, assuming blood's heat as 1.0 [kcal/L.K].
 *
 * @param {number} [height=JOS3Defaults.height] - Body height in meters. Default
 * is 1.72.
 * @param {number} [weight=JOS3Defaults.weight] - Body weight in kg. Default is
 * 74.43.
 * @param {string} [bsa_equation=JOS3Defaults.bsa_equation] - Equation name for
 * bsa calc. Must be from "dubois","takahira", "fujimoto", "kurazumi".
 * Default is "dubois".
 * @param {number} [age=JOS3Defaults.age] - Age in years. Default is 20.
 * @param {number} [ci=JOS3Defaults.cardiac_index] - Cardiac index in L/min/㎡.
 * Default is 2.59.

 * @returns {number[]} - Thermal capacity in W/K. Shape is (NUM_NODES).
 */
export function capacity(height = JOS3Defaults.height, weight = JOS3Defaults.weight, bsa_equation = JOS3Defaults.bsa_equation, age = JOS3Defaults.age, ci = JOS3Defaults.cardiac_index) {
    validate_body_parameters(height, weight, age);
    // artery [Wh/K]
    let cap_art = [
        0.096, 0.025, 0.12, 0.111, 0.265, 0.0186, 0.0091, 0.0044, 0.0186, 0.0091,
        0.0044, 0.0813, 0.04, 0.0103, 0.0813, 0.04, 0.0103,
    ];
    // vein [Wh/K]
    let cap_vein = [
        0.321, 0.085, 0.424, 0.39, 0.832, 0.046, 0.024, 0.01, 0.046, 0.024, 0.01,
        0.207, 0.1, 0.024, 0.207, 0.1, 0.024,
    ];
    // superficial vein [Wh/K]
    let cap_sfv = [
        0, 0, 0, 0, 0, 0.025, 0.015, 0.011, 0.025, 0.015, 0.011, 0.074, 0.05, 0.021,
        0.074, 0.05, 0.021,
    ];
    // central blood [Wh/K]
    let cap_cb = 1.999;
    // core [Wh/K]
    let cap_cr = [
        1.7229, 0.564, 10.2975, 9.3935, 4.488, 1.6994, 1.1209, 0.1536, 1.6994,
        1.1209, 0.1536, 5.3117, 2.867, 0.2097, 5.3117, 2.867, 0.2097,
    ];
    // muscle [Wh/K]
    let cap_ms = [
        0.305, 0.0, 0.0, 0.0, 7.409, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ];
    // fat [Wh/K]
    let cap_fat = [
        0.203, 0.0, 0.0, 0.0, 1.947, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ];
    // skin [Wh/K]
    let cap_sk = [
        0.1885, 0.058, 0.441, 0.406, 0.556, 0.126, 0.084, 0.088, 0.126, 0.084,
        0.088, 0.334, 0.169, 0.107, 0.334, 0.169, 0.107,
    ];
    // Changes the values based on the standard body
    const bfbr = bfb_rate(height, weight, bsa_equation, age, ci);
    const wr = weight_rate(weight);
    cap_art = cap_art.map((x) => x * bfbr);
    cap_vein = cap_vein.map((x) => x * bfbr);
    cap_sfv = cap_sfv.map((x) => x * bfbr);
    cap_cb = cap_cb * bfbr;
    cap_cr = cap_cr.map((x) => x * wr);
    cap_ms = cap_ms.map((x) => x * wr);
    cap_fat = cap_fat.map((x) => x * wr);
    cap_sk = cap_sk.map((x) => x * wr);
    let cap_whole = Array(NUM_NODES).fill(0);
    cap_whole[0] = cap_cb;
    for (let i = 0; i < BODY_NAMES.length; i++) {
        // Dictionary of indices in each body segment
        // key = layer name, value = index of matrix
        let bn = BODY_NAMES[i];
        let index_of = IDICT[bn];
        // Common
        cap_whole[index_of["artery"]] = cap_art[i];
        cap_whole[index_of["vein"]] = cap_vein[i];
        cap_whole[index_of["core"]] = cap_cr[i];
        cap_whole[index_of["skin"]] = cap_sk[i];
        // Only limbs
        if (i >= 5) {
            cap_whole[index_of["sfvein"]] = cap_sfv[i];
        }
        // If the segment has a muscle or fat layer
        if (index_of["muscle"] !== null || index_of["fat"] !== null) {
            cap_whole[index_of["muscle"]] = cap_ms[i];
            cap_whole[index_of["fat"]] = cap_fat[i];
        }
    }
    return cap_whole.map((x) => x * 3600);
}
