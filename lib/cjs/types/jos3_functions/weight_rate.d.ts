/**
 * Calculate the ratio of the body weight to the standard body (74.43 kg).
 *
 * The standard values of local body weights are as as follows:
 *   weight_local = [
 *       3.18, 0.84, 12.4, 11.03, 17.57,
 *       2.16, 1.37, 0.34, 2.16, 1.37, 0.34,
 *       7.01, 3.34, 0.48, 7.01, 3.34, 0.48
 *   ]
 *
 * The data have been derived from 65MN.
 * The weight of neck is extracted from the weight of 65MN's head based on
 * the local body surface area of Smith's model.
 *
 * @param {number} [weight=JOS3Defaults.weight] - The body weight [kg].
 *
 * @returns {number} the ratio of the body weight to the standard body (74.43 kg).
 */
export function weight_rate(weight?: number): number;
//# sourceMappingURL=weight_rate.d.ts.map