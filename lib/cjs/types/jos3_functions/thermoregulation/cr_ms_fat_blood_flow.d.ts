/**
 * @typedef CrMsFatBloodFlowResult
 * @type {object}
 * @property {math.MathCollection} bf_core - Core blood flow rate [L/h].
 * @property {math.MathCollection} bf_muscle - Muscle blood flow rate [L/h].
 * @property {math.MathCollection} bf_fat - Fat blood flow rate [L/h].
 */
/**
 * Calculate core, muscle and fat blood flow rate [L/h].
 *
 * @param {math.MathCollection} q_work - Heat production by work [W].
 * @param {math.MathCollection} q_shiv - Heat production by shivering [W].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name of bsa calculation. Choose from "dubois","takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - Age [years].
 * @param {number} [ci=2.59] - Cardiac index [L/min/㎡].
 *
 * @returns {CrMsFatBloodFlowResult} - Core, muscle and fat blood flow rate [L/h].
 */
export function cr_ms_fat_blood_flow(q_work: math.MathCollection, q_shiv: math.MathCollection, height?: number, weight?: number, bsa_equation?: string, age?: number, ci?: number): CrMsFatBloodFlowResult;
export type CrMsFatBloodFlowResult = {
    /**
     * - Core blood flow rate [L/h].
     */
    bf_core: math.MathCollection;
    /**
     * - Muscle blood flow rate [L/h].
     */
    bf_muscle: math.MathCollection;
    /**
     * - Fat blood flow rate [L/h].
     */
    bf_fat: math.MathCollection;
};
import * as math from "mathjs";
//# sourceMappingURL=cr_ms_fat_blood_flow.d.ts.map