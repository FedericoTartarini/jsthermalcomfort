import { CloToutResult } from "../../../../src/models/clo_tout";
/**
 * @typedef {object} CloToutResult
 * @property {number} clo - Representative clothing insulation Icl, [clo]
 */
/**
 * Representative clothing insulation Icl as a function of outdoor air
 * temperature at 06:00 a.m {@link #ref_4|[4]}.
 *
 * Note: The ASHRAE 55 2020 states that it is acceptable to determine the
 * clothing insulation Icl using this equation in mechanically conditioned
 * buildings {@link #ref_1|[1]}.
 *
 * @public
 * @memberof models
 * @docname Clothing prediction
 *
 * @see {@link clo_tout_array} for a version that supports arrays
 *
 * @param {number} tout - outdoor air temperature at 06:00 a.m., default in
 * [°C] in [°F] if `units` = 'IP'
 * @param {("IP" | "SI")} units - select the SI (International System of Units)
 * or the IP (Imperial Units) system.
 *
 * @returns {CloToutResult} set containing results for the model
 */
export function clo_tout(tout: number, units?: ("IP" | "SI")): CloToutResult;

/**
 * Representative clothing insulation Icl as a function of outdoor air
 * temperature at 06:00 a.m {@link #ref_4|[4]}.
 *
 * Note: The ASHRAE 55 2020 states that it is acceptable to determine the
 * clothing insulation Icl using this equation in mechanically conditioned
 * buildings {@link #ref_1|[1]}.
 *
 * @public
 * @memberof models
 * @docname Clothing prediction (array version)
 *
 * @see {@link clo_tout} for a version that supports scalar arguments
 *
 * @param {number[]} tout - outdoor air temperatures at 06:00 a.m., default in
 * [°C] in [°F] if `units` = 'IP'
 * @param {("IP" | "SI")} units  - select the SI (International System of Units)
 * or the IP (Imperial Units) system.
 *
 * @returns {number[]} Representative clothing insulation Icl, [clo]
 */
export function clo_tout_array(tout: number[], units?: ("IP" | "SI")): number[];
//# sourceMappingURL=clo_tout.d.ts.map