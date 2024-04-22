import { clo_area_factor } from "./clo_area_factor.js";
import * as math from "mathjs";
/**
 * Calculate total sensible thermal resistance (between the skin and ambient air).
 *
 * @param {math.Matrix} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {math.Matrix} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 * @param {math.Matrix} clo - Clothing insulation [clo].
 *
 * @returns {math.Matrix} Total sensible thermal resistance between skin and ambient.
 */
export function dry_r(hc, hr, clo) {
    if (hc.toArray().some((x) => x < 0) || hr.toArray().some((x) => x < 0)) {
        throw new Error("Input parameters hc and hr must be non-negative.");
    }
    let fcl = clo_area_factor(clo);
    let r_a = math.dotDivide(1, math.add(hc, hr));
    let r_cl = math.dotMultiply(0.155, clo);
    return math.add(math.dotDivide(r_a, fcl), r_cl);
}
