/**
 * @typedef {object} SolarGainReturnType
 * @property {number} erf - Solar gain to the human body using the Effective Radiant Field [W/m2]
 * @property {number} delta_mrt - Delta mean radiant temperature. The amount by which the mean radiant
 * temperature of the space should be increased if no solar radiation is present.
 * @public
 */
/**
 * Calculates the solar gain to the human body using the Effective Radiant
 * Field ( ERF) {@link #ref_1|[1]}. The ERF is a measure of the net energy flux to or from
 * the human body. ERF is expressed in W over human body surface area [w/m2].
 *
 * In addition, it calculates the delta mean radiant temperature. Which is the
 * amount by which the mean radiant temperature of the space should be
 * increased if no solar radiation is present.
 *
 * More information on the calculation procedure can be found in Appendix C of {@link #ref_1|[1]}.
 *
 * @memberof models
 * @public
 * @docname Solar gain on people
 *
 * @param {number} sol_altitude - Solar altitude, degrees from horizontal [deg]. Ranges between 0 and 90.
 * @param {number} sharp - Solar horizontal angle relative to the front of the person (SHARP) [deg].
 * Ranges between 0 and 180 and is symmetrical on either side. Zero (0) degrees
 * represents direct-beam radiation from the front, 90 degrees represents
 * direct-beam radiation from the side, and 180 degrees rep- resent direct-beam
 * radiation from the back. SHARP is the angle between the sun and the person
 * only. Orientation relative to compass or to room is not included in SHARP.
 * @param {number} sol_radiation_dir - Direct-beam solar radiation, [W/m2]. Ranges between 200 and 1000. See Table C2-3 of ASHRAE 55 2020 {@link #ref_1|[1]}.
 * @param {number} sol_transmittance - Total solar transmittance, ranges from 0 to 1. The total solar
 * transmittance of window systems, including glazing unit, blinds, and other
 * façade treatments, shall be determined using one of the following methods:
 * - i) Provided by manufacturer or from the National Fenestration Rating Council approved Lawrence Berkeley National Lab International Glazing Database.
 * - ii) Glazing unit plus venetian blinds or other complex or unique shades shall be calculated using National Fenestration Rating Council approved software or Lawrence Berkeley National Lab Complex Glazing Database.
 * @param {number} f_svv - Fraction of sky-vault view fraction exposed to body, ranges from 0 to 1. It can be calculated using the function {@link #f_svv|f_svv} in utilities.
 * @param {number} f_bes - Fraction of the possible body surface exposed to sun, ranges from 0 to 1. See Table C2-2 and equation C-7 ASHRAE 55 2020 {@link #ref_1|[1]}.
 * @param {number} [asw=0.7] - The average short-wave absorptivity of the occupant. It will range widely,
 * depending on the color of the occupant’s skin as well as the color and
 * amount of clothing covering the body.
 *
 * A value of 0.7 shall be used unless more specific information about the
 * clothing or skin color of the occupants is available.
 * Note: Short-wave absorptivity typically ranges from 0.57 to 0.84, depending
 * on skin and clothing color. More information is available in Blum (1945).
 * @param {"standing" | "supine" | "sitting"} [posture="sitting"] - Default 'sitting' list of available options 'standing', 'supine' or 'sitting'
 * @param {number} [floor_reflectance=0.7] - Floor refectance. It is assumed to be constant and equal to 0.6.
 *
 * @returns {SolarGainReturnType}
 *
 * @example
 * import {solar_gain} from "jsthermalcomfort/models";
 * const results = solar_gain(0, 120, 800, 0.5, 0.7, "sitting");
 * console.log(results); // {erf: 42.9, delta_mrt: 10.3}
 */
export function solar_gain(sol_altitude: number, sharp: number, sol_radiation_dir: number, sol_transmittance: number, f_svv: number, f_bes: number, asw?: number, posture?: "standing" | "supine" | "sitting", floor_reflectance?: number): SolarGainReturnType;
/**
 *
 * @param {number[]} arr
 * @param {number} x
 *
 * @returns {number}
 */
export function find_span(arr: number[], x: number): number;
export type SolarGainReturnType = {
    /**
     * - Solar gain to the human body using the Effective Radiant Field [W/m2]
     */
    erf: number;
    /**
     * - Delta mean radiant temperature. The amount by which the mean radiant
     * temperature of the space should be increased if no solar radiation is present.
     */
    delta_mrt: number;
};
//# sourceMappingURL=solar_gain.d.ts.map