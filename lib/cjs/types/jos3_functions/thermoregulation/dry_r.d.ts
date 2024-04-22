/**
 * Calculate total sensible thermal resistance (between the skin and ambient air).
 *
 * @param {math.Matrix} hc - Convective heat transfer coefficient (hc) [W/(m2*K)].
 * @param {math.Matrix} hr - Radiative heat transfer coefficient (hr) [W/(m2*K)].
 * @param {math.Matrix} clo - Clothing insulation [clo].
 *
 * @returns {math.Matrix} Total sensible thermal resistance between skin and ambient.
 */
export function dry_r(hc: math.Matrix, hr: math.Matrix, clo: math.Matrix): math.Matrix;
import * as math from "mathjs";
//# sourceMappingURL=dry_r.d.ts.map