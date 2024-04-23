/**
 * Calculate thermal conductance between layers.

 * @param {number} height - Body height in [m]. Default is 1.72.
 * @param {number} weight - Body weight in [kg]. Default is 74.43.
 * @param {string} bsa_equation - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi". Default is "dubois".
 * @param {number} fat - Body fat rate in [%]. Default is 15.

 * @returns {math.Matrix} conductance - Thermal conductance between layers in [W/K]. The shape is (NUM_NODES, NUM_NODES).
 */
export function conductance(height?: number, weight?: number, bsa_equation?: string, fat?: number): math.Matrix;
import * as math from "mathjs";
//# sourceMappingURL=conductance.d.ts.map