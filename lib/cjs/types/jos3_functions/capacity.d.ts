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
export function capacity(height?: number, weight?: number, bsa_equation?: string, age?: number, ci?: number): number[];
//# sourceMappingURL=capacity.d.ts.map