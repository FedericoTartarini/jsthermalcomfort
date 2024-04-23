/**
 * Calculate skin blood flow rate (bf_skin) [L/h].
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {number} [ci=2.59] - Cardiac index [L/min/㎡].
 *
 * @returns {math.MathCollection} bf_skin - Skin blood flow rate [L/h].
 */
export function skin_blood_flow(err_cr: math.MathCollection, err_sk: math.MathCollection, height?: number, weight?: number, bsa_equation?: string, age?: number, ci?: number): math.MathCollection;
import * as math from "mathjs";
//# sourceMappingURL=skin_blood_flow.d.ts.map