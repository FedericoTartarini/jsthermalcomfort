import JOS3Defaults from "../JOS3Defaults.js";
import * as math from "mathjs";
/**
 * Fixes hr values to fit two-node-model's values.
 *
 * @param {math.MathCollection} hr
 * @return {math.Matrix}
 */
export function fixed_hr(hr) {
    let mean_hr = math.sum(math.dotMultiply(hr, JOS3Defaults.local_bsa)) /
        math.sum(JOS3Defaults.local_bsa);
    return math.dotDivide(math.dotMultiply(hr, 4.7), mean_hr);
}
