import JOS3Defaults from "../JOS3Defaults.js";
import { clo_area_factor } from "./clo_area_factor.js";
import * as math from "mathjs";
/**
 * Calculate total evaporative thermal resistance (between the skin and ambient air).
 *
 * @param {math.Matrix} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {math.Matrix} clo - Clothing insulation [clo].
 * @param {number | math.Matrix} [i_clo=0.45] - Clothing vapor permeation efficiency [-].
 * @param {number} [lewis_rate=16.5] - Lewis rate [K/kPa].
 *
 * @returns {math.Matrix} r_et - Total evaporative thermal resistance.
 */
export function wet_r(hc, clo, i_clo = JOS3Defaults.clothing_vapor_permeation_efficiency, lewis_rate = JOS3Defaults.lewis_rate) {
    if (hc.toArray().some((hc) => hc < 0)) {
        throw new Error("Input parameter hc must be non-negative.");
    }
    let fcl = clo_area_factor(clo);
    let r_cl = math.dotMultiply(0.155, clo);
    let r_ea = math.dotDivide(1, math.dotMultiply(lewis_rate, hc));
    let r_ecl = math.dotDivide(r_cl, math.multiply(i_clo, lewis_rate));
    return math.add(math.dotDivide(r_ea, fcl), r_ecl);
}
