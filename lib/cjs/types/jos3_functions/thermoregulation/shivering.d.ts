/**
 * Sets the value of PRE_SHIV.
 *
 * @param {number} value - the value to set PRE_SHIV to
 */
export function set_pre_shiv(value: number): void;
/**
 * Calculate local thermogenesis by shivering [W].
 *
 * @param {math.MathCollection} err_cr - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} err_sk - Difference between set-point and body temperatures [°C].
 * @param {math.MathCollection} t_core - Core and skin temperatures [°C].
 * @param {math.MathCollection} t_skin - Core and skin temperatures [°C].
 * @param {number} [height=1.72] - Body height [m].
 * @param {number} [weight=74.43] - Body weight [kg].
 * @param {string} [bsa_equation="dubois"] - The equation name (str) of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto", or "kurazumi".
 * @param {number} [age=20] - age [years].
 * @param {string} [sex="male"] - Choose male or female.
 * @param {number} [dtime=60] - Interval of analysis time.
 * @param {object} options - Additional options.
 *
 * @returns {math.MathCollection} q_shiv - Local thermogenesis by shivering [W].
 */
export function shivering(err_cr: math.MathCollection, err_sk: math.MathCollection, t_core: math.MathCollection, t_skin: math.MathCollection, height?: number, weight?: number, bsa_equation?: string, age?: number, sex?: string, dtime?: number, options?: object): math.MathCollection;
export let PRE_SHIV: number;
import * as math from "mathjs";
//# sourceMappingURL=shivering.d.ts.map