/**
 * Calculate local body surface area (bsa) [m2].
 *
 * The local body surface area has been derived from 65MN.
 * The head have been divided to head and neck based on Smith's model.
 *     head = 0.1396*0.1117/0.1414 (65MN_Head * Smith_Head / Smith_Head+neck)
 *     neck = 0.1396*0.0297/0.1414 (65MN_Head * Smith_Neck / Smith_Head+neck)
 *
 * @param {number} [height=JOS3Defaults.height] - Body height [m]
 * @param {number} [weight=JOS3Defaults.weight] - Body weight [kg]
 * @param {string} [bsa_equation=JOS3Defaults.bsa_equation] - The equation name
 * of bsa calculation. Choose a name from "dubois", "takahira", "fujimoto",
 * or "kurazumi".
 *
 * @returns {math.Matrix}  local_bsa of length 17 - Local body surface area (bsa) [m2]
 */
export function local_bsa(height?: number, weight?: number, bsa_equation?: string): math.Matrix;
import * as math from "mathjs";
//# sourceMappingURL=local_bsa.d.ts.map