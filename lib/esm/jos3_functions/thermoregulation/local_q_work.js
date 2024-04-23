import * as math from "mathjs";
/**
 * Calculate local thermogenesis by work [W].
 *
 * @param {number} bmr - Basal metabolic rate [W]
 * @param {number} par - Physical activity ratio [-]
 * @throws {Error} If par is less than 1
 *
 * @return {math.MathCollection} q_work - Local thermogenesis by work [W]
 */
export function local_q_work(bmr, par) {
    if (par < 1) {
        throw new Error("par must be greater than or equal to 1");
    }
    let q_work_all = (par - 1) * bmr;
    let workf = math.matrix([
        0, 0, 0.091, 0.08, 0.129, 0.0262, 0.0139, 0.005, 0.0262, 0.0139, 0.005,
        0.201, 0.099, 0.005, 0.201, 0.099, 0.005,
    ]);
    return math.dotMultiply(workf, q_work_all);
}
