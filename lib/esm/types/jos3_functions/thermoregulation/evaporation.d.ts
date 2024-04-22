/**
 * @typedef EvaporationResult
 * @type {object}
 * @property {math.MathCollection} wet - Local skin wettedness [-].
 * @property {math.MathCollection} e_sk - Evaporative heat loss at the skin by sweating and diffuse [W].
 * @property {math.MathCollection} e_max - Maximum evaporative heat loss at the skin [W].
 * @property {math.MathCollection} e_sweat - Evaporative heat loss at the skin by only sweating [W].
 */
/**
 * Calculate evaporative heat loss.
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} t_skin - Skin temperatures [°C].
 * @param {math.MathCollection} tdb - Air temperatures at local body segments [°C].
 * @param {math.MathCollection} rh - Relative humidity at local body segments [%].
 * @param {math.MathCollection} ret - Total evaporative thermal resistances [m2.K/W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 *
 * @returns {EvaporationResult} an object containing the results of the calculation.
 */
export function evaporation(err_cr: math.MathCollection, err_sk: math.MathCollection, t_skin: math.MathCollection, tdb: math.MathCollection, rh: math.MathCollection, ret: math.MathCollection, height?: number, weight?: number, bsa_equation?: string, age?: number): EvaporationResult;
export function antoine(x: number): number;
export type EvaporationResult = {
    /**
     * - Local skin wettedness [-].
     */
    wet: math.MathCollection;
    /**
     * - Evaporative heat loss at the skin by sweating and diffuse [W].
     */
    e_sk: math.MathCollection;
    /**
     * - Maximum evaporative heat loss at the skin [W].
     */
    e_max: math.MathCollection;
    /**
     * - Evaporative heat loss at the skin by only sweating [W].
     */
    e_sweat: math.MathCollection;
};
import * as math from "mathjs";
//# sourceMappingURL=evaporation.d.ts.map