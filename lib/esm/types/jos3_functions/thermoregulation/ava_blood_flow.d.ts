/**
 * @typedef AvaBloodFlowResult
 * @type {object}
 * @property {number} bf_ava_hand - AVA blood flow rate at hand [L/h].
 * @property {number} bf_ava_foot - AVA blood flow rate at foot [L/h].
 */
/**
 * Calculate areteriovenous anastmoses (AVA) blood flow rate [L/h] based on
 * Takemori's model, 1995.
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {number} [height=1.72] - Body height [m]
 * @param {number} [weight=74.43] - Body weight [kg]
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi"
 * @param {number} [age=20] - age [years]
 * @param {number} [ci=2.59] - Cardiac index [L/min/m2]
 *
 * @returns {AvaBloodFlowResult} AVA blood flow rate at hand and foot [L/h]
 */
export function ava_blood_flow(err_cr: math.MathCollection, err_sk: math.MathCollection, height?: number, weight?: number, bsa_equation?: string, age?: number, ci?: number): AvaBloodFlowResult;
export type AvaBloodFlowResult = {
    /**
     * - AVA blood flow rate at hand [L/h].
     */
    bf_ava_hand: number;
    /**
     * - AVA blood flow rate at foot [L/h].
     */
    bf_ava_foot: number;
};
import * as math from "mathjs";
//# sourceMappingURL=ava_blood_flow.d.ts.map