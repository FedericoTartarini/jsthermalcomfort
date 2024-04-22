import JOS3Defaults from "../JOS3Defaults.js";
import { basal_met } from "./basal_met.js";
import * as math from "mathjs";
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
export function local_mbase(height = JOS3Defaults.height, weight = JOS3Defaults.weight, age = JOS3Defaults.age, sex = JOS3Defaults.sex, bmr_equation = JOS3Defaults.bmr_equation) {
    let mbase_all = basal_met(height, weight, age, sex, bmr_equation);
    let mbf_cr = math.matrix([
        0.19551, 0.00324, 0.28689, 0.25677, 0.09509, 0.01435, 0.00409, 0.00106,
        0.01435, 0.00409, 0.00106, 0.01557, 0.00422, 0.0025, 0.01557, 0.00422,
        0.0025,
    ]);
    let mbf_ms = math.matrix([
        0.00252, 0.0, 0.0, 0.0, 0.04804, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
    ]);
    let mbf_fat = math.matrix([
        0.00127, 0.0, 0.0, 0.0, 0.0095, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
    ]);
    let mbf_sk = math.matrix([
        0.00152, 0.00033, 0.00211, 0.00187, 0.003, 0.00059, 0.00031, 0.00059,
        0.00059, 0.00031, 0.00059, 0.00144, 0.00027, 0.00118, 0.00144, 0.00027,
        0.00118,
    ]);
    let mbase_cr = math.dotMultiply(mbf_cr, mbase_all);
    let mbase_ms = math.dotMultiply(mbf_ms, mbase_all);
    let mbase_fat = math.dotMultiply(mbf_fat, mbase_all);
    let mbase_sk = math.dotMultiply(mbf_sk, mbase_all);
    return [mbase_cr, mbase_ms, mbase_fat, mbase_sk];
}
