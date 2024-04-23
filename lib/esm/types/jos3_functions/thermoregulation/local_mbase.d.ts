/**
 * Calculate local basal metabolic rate [W].
 *
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {number} [age=20] - Age [years].
 * @param {string} [sex='male'] - Sex (male or female).
 * @param {string} [bmr_equation='harris-benedict'] - BMR equation to use (harris-benedict or ganpule).
 *
 * @returns {[math.MathCollection, math.MathCollection, math.MathCollection, math.MathCollection]} mbase - Local basal metabolic rate (Mbase) [W].
 */
export function local_mbase(height?: number, weight?: number, age?: number, sex?: string, bmr_equation?: string): [math.MathCollection, math.MathCollection, math.MathCollection, math.MathCollection];
import * as math from "mathjs";
//# sourceMappingURL=local_mbase.d.ts.map