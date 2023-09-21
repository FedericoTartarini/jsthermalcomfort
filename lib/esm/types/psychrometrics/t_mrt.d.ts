/**
 * Converts globe temperature reading into mean radiant temperature in accordance with either the Mixed Convection
 * developed by Teitelbaum E. et al. (2022) or the ISO 7726:1998 Standard {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link t_mrt_array} for a version that supports arrays
 *
 * @param {number} tg - globe temperature, [°C]
 * @param {number} tdb - air temperature, [°C]
 * @param {number} v - air speed, [m/s]
 * @param {number} d - diameter of the globe, [m] default 0.15 m
 * @param {number} emissivity - emissivity of the globe temperature sensor, default 0.95
 * @param {"Mixed Convection" | "ISO"} standard - either choose between the Mixed Convection and ISO formulations.
 *      The Mixed Convection formulation has been proposed by Teitelbaum E. et al. (2022)
 *      to better determine the free and forced convection coefficient used in the
 *      calculation of the mean radiant temperature. They also showed that mean radiant
 *      temperature measured with ping-pong ball-sized globe thermometers is not reliable
 *      due to a stochastic convective bias {@link #ref_22|[22]}. The Mixed Convection model has only
 *      been validated for globe sensors with a diameter between 0.04 and 0.15 m.
 * @returns {number}
 */
export function t_mrt(tg: number, tdb: number, v: number, d?: number, emissivity?: number, standard?: "Mixed Convection" | "ISO"): number;
/**
 * Converts globe temperature reading into mean radiant temperature in accordance with either the Mixed Convection
 * developed by Teitelbaum E. et al. (2022) or the ISO 7726:1998 Standard {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 * @see {@link t_mrt} for scalar arguments. Accepts array arguments.
 *
 * @param {number[]} tg - globe temperature, [°C]
 * @param {number[]} tdb - air temperature, [°C]
 * @param {number[]} v - air speed, [m/s]
 * @param {number[]} d - diameter of the globe, [m] default 0.15 m
 * @param {number[]} emissivity - emissivity of the globe temperature sensor, default 0.95
 * @param {"Mixed Convection" | "ISO"} standard - either choose between the Mixed Convection and ISO formulations. Refer to the {@link #t_mrt|t_mrt} function for more information
 * @returns {number[]}
 */
export function t_mrt_array(tg: number[], tdb: number[], v: number[], d: number[], emissivity: number[], standard?: "Mixed Convection" | "ISO"): number[];
//# sourceMappingURL=t_mrt.d.ts.map