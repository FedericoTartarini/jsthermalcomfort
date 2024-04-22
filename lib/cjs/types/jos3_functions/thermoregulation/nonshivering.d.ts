/**
 * Calculate local metabolic rate by non-shivering [W]
 *
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {boolean} [cold_acclimation=false] - Whether the subject acclimates cold environment or not.
 * @param {boolean} [batpositive=true] - Whether BAT activity is positive or not.
 *
 * @returns {math.MathCollection} q_nst - Local metabolic rate by non-shivering [W].
 */
export function nonshivering(err_sk: math.MathCollection, height?: number, weight?: number, bsa_equation?: string, age?: number, cold_acclimation?: boolean, batpositive?: boolean): math.MathCollection;
import * as math from "mathjs";
//# sourceMappingURL=nonshivering.d.ts.map