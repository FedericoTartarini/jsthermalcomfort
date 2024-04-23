/**
 * @typedef SumMResult
 * @type {object}
 * @property {math.MathCollection} q_thermogenesis_core - Total thermogenesis in core layer [W].
 * @property {math.MathCollection} q_thermogenesis_muscle - Total thermogenesis in muscle layer [W].
 * @property {math.MathCollection} q_thermogenesis_fat - Total thermogenesis in fat layer [W].
 * @property {math.MathCollection} q_thermogenesis_skin - Total thermogenesis in skin layer [W].
 */
/**
 * Calculate total thermogenesis in each layer [W].
 *
 * @param {[math.MathCollection, math.MathCollection, math.MathCollection, math.MathCollection]} mbase - Local basal metabolic rate (Mbase) [W].
 * @param {math.MathCollection} q_work - Local thermogenesis by work [W].
 * @param {math.MathCollection} q_shiv - Local thermogenesis by shivering [W].
 * @param {math.MathCollection} q_nst - Local thermogenesis by non-shivering [W].
 *
 * @return {SumMResult} Total thermogenesis in core, muscle, fat, skin layers [W].
 */
export function sum_m(mbase: [math.MathCollection, math.MathCollection, math.MathCollection, math.MathCollection], q_work: math.MathCollection, q_shiv: math.MathCollection, q_nst: math.MathCollection): SumMResult;
export type SumMResult = {
    /**
     * - Total thermogenesis in core layer [W].
     */
    q_thermogenesis_core: math.MathCollection;
    /**
     * - Total thermogenesis in muscle layer [W].
     */
    q_thermogenesis_muscle: math.MathCollection;
    /**
     * - Total thermogenesis in fat layer [W].
     */
    q_thermogenesis_fat: math.MathCollection;
    /**
     * - Total thermogenesis in skin layer [W].
     */
    q_thermogenesis_skin: math.MathCollection;
};
import * as math from "mathjs";
//# sourceMappingURL=sum_m.d.ts.map