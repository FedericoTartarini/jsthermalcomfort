/**
 * Calculate the ratio of basal blood flow (BFB) of the standard body (290 L/h).
 *
 * @param {number} height - Body height [m]. The default is 1.72.
 * @param {number} weight - Body weight [kg]. The default is 74.43.
 * @param {string} bsa_equation - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi". The default is "dubois".
 * @param {number} age - age [years]. The default is 20.
 * @param {number} ci - Cardiac index [L/min/㎡]. The default is 2.59.
 *
 * @returns {number} - Basal blood flow rate.
 */
export function bfb_rate(height?: number, weight?: number, bsa_equation?: string, age?: number, ci?: number): number;
//# sourceMappingURL=bfb_rate.d.ts.map