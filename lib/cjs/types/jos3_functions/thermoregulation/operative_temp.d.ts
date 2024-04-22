/**
 * Calculate operative temperature [°C]
 *
 * @param {math.MathCollection} tdb - Air temperature [°C]
 * @param {math.MathCollection} tr - Mean radiant temperature [°C]
 * @param {math.MathCollection} hc - Convective heat transfer coefficient [W/(m2*K)]
 * @param {math.MathCollection} hr - Radiative heat transfer coefficient [W/(m2*K)]

 * @returns {math.MathCollection} Operative temperature [°C]
 */
export function operative_temp(tdb: math.MathCollection, tr: math.MathCollection, hc: math.MathCollection, hr: math.MathCollection): math.MathCollection;
import * as math from "mathjs";
//# sourceMappingURL=operative_temp.d.ts.map