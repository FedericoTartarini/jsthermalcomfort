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
export function wet_r(hc: math.Matrix, clo: math.Matrix, i_clo?: number | math.Matrix, lewis_rate?: number): math.Matrix;
import * as math from "mathjs";
//# sourceMappingURL=wet_r.d.ts.map