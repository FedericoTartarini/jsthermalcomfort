import { BODY_NAMES, IDICT } from "../matrix.js";
import * as math from "mathjs";
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
export function sum_m(mbase, q_work, q_shiv, q_nst) {
    let [q_thermogenesis_core, q_thermogenesis_muscle, q_thermogenesis_fat, q_thermogenesis_skin,] = mbase;
    for (let i = 0; i < BODY_NAMES.length; i++) {
        let bn = BODY_NAMES[i];
        if (IDICT[bn]["muscle"] !== null) {
            q_thermogenesis_muscle.set([i], q_thermogenesis_muscle.get([i]) + q_work.get([i]) + q_shiv.get([i]));
        }
        else {
            q_thermogenesis_core.set([i], q_thermogenesis_core.get([i]) + q_work.get([i]) + q_shiv.get([i]));
        }
    }
    q_thermogenesis_core = math.add(q_thermogenesis_core, q_nst);
    return {
        q_thermogenesis_core,
        q_thermogenesis_muscle,
        q_thermogenesis_fat,
        q_thermogenesis_skin,
    };
}
