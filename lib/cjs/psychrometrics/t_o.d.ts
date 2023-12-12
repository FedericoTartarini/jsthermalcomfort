/**
 * Calculates operative temperature in accordance with ISO 7726:1998 {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link t_o_array} for a version that supports arrays
 *
 * @param {number} tdb - air temperature [C]
 * @param {number} tr - mean radiant temperature [C]
 * @param {number} v - air speed [m/s]
 * @param {("ISO" | "ASHRAE")} standard - the standard to use
 * @returns {number} operative temperature [C]
 */
export function t_o(tdb: number, tr: number, v: number, standard?: ("ISO" | "ASHRAE")): number;
/**
 * Calculates operative temperature in accordance with ISO 7726:1998 {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link t_o} for a version that supports scalar arguments
 *
 * @param {number[]} tdb - air temperature [C]
 * @param {number[]} tr - mean radiant temperature [C]
 * @param {number[]} v - air speed [m/s]
 * @param {("ISO" | "ASHRAE")} standard - the standard to use
 * @returns {number[]} operative temperature [C]
 */
export function t_o_array(tdb: number[], tr: number[], v: number[], standard?: ("ISO" | "ASHRAE")): number[];
//# sourceMappingURL=t_o.d.ts.map