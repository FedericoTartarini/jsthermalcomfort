/**
 * Rounds a number to the given precision.
 *
 * @param {number} number - the number to round
 * @param {number} precision - the number of decimal places to round to
 * @returns {number} the rounded result
 */
export function round(number: number, precision: number): number;
/**
 * Converts sharp and altittude from radians to degree unit
 * @param {number} sharp
 * @param {number} altitude
 * @returns {[number, number]}
 */
export function transpose_sharp_altitude(sharp: number, altitude: number): [number, number];
/**
 * Check that the values comply with the standard provided
 *
 * @param {Standard} standard
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
export function check_standard_compliance(standard: Standard, kwargs: ComplianceKwargs): string[];
/**
 * @typedef {Object.<string, number[]>} CheckStandardComplianceResult
 * @property {number[]} tdb
 * @property {number[]} tr
 * @property {number[]} v
 * @property {number[]} [met]
 * @property {number[]} [clo]
 * @property {number[]} [rh]
 */
/**
 * Check that the values as an array comply with the standard provided and returns arrays where
 * the values that do not comply are NaN
 * @see {@link check_standard_compliance} for scalar variant that returns warnings
 *
 * @param {Standard | "FAN_HEATWAVES"} standard - standard to check compliance with
 * @param {ComplianceKwargsArray & {airspeed_control?: boolean}} kwargs - values to check compliance against
 *
 * @returns {CheckStandardComplianceResult} filtered arrays based on compliance limits
 */
export function check_standard_compliance_array(standard: Standard | "FAN_HEATWAVES", kwargs: ComplianceKwargsArray & {
    airspeed_control?: boolean;
}): CheckStandardComplianceResult;
/**
 * Returns the body surface area in square meters
 *
 * @public
 * @memberof utilities
 * @docname Body Surface Area
 *
 * @param {number} weight - body weight, [kg]
 * @param {number} height - height, [m]
 * @param {("dubois" | "takahira" | "fujimoto" | "kurazumi")} [formula="dubois"] - formula used to calculate the body surface area. default="dubois"
 * @returns {number} body surface area, [m2]
 *
 * @category Utilities
 */
export function body_surface_area(weight: number, height: number, formula?: ("dubois" | "takahira" | "fujimoto" | "kurazumi")): number;
/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed
 *
 * @see {@link v_relative_array} for a version that supports array arguments
 *
 * @param {number} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number} relative air speed, [m/s]
 */
export function v_relative(v: number, met: number): number;
/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed (array version)
 *
 * @see {@link v_relative} for a version that supports scalar arguments
 *
 * @param {number[]} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number[]} relative air speed, [m/s]
 */
export function v_relative_array(v: number[], met: number): number[];
/**
 * Estimates the dynamic clothing insulation of a moving occupant. The activity as
 * well as the air speed modify the insulation characteristics of the clothing and the
 * adjacent air layer. Consequently, the ISO 7730 states that the clothing insulation
 * shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing
 *
 * @see {@link clo_dynamic_array} for a version that supports array arguments
 *
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number} dunamic clothing insulation, [clo]
 */
export function clo_dynamic(clo: number, met: number, standard?: ("ASHRAE" | "ISO")): number;
/**
 * Estimates the dynamic clothing insulation of a moving occupant. The activity as
 * well as the air speed modify the insulation characteristics of the clothing and the
 * adjacent air layer. Consequently, the ISO 7730 states that the clothing insulation
 * shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing (array version)
 *
 * @see {@link clo_dynamic} for a version that supports scalar arguments
 *
 * @param {number[]} clo - clothing insulation, [clo]
 * @param {number[]} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number[]} dunamic clothing insulation, [clo]
 */
export function clo_dynamic_array(clo: number[], met: number[], standard?: ("ASHRAE" | "ISO")): number[];
/**
 * Converts IP values to SI units
 *
 * @memberof utilities
 * @docname Units converter
 * @public
 *
 * @template {Object.<string, number>} T
 * @param {T} kwargs - [t, v] units to convert
 * @param {"IP" | "SI"} [from_units="IP"] - specify system to convert from
 * @returns {T} converted values in SI units
 *
 * @see {@link units_converter_array} for a version that supports array parameters
 */
export function units_converter<T extends {
    [x: string]: number;
}>(kwargs: T, from_units?: "IP" | "SI"): T;
/**
 * Converts IP values to SI units
 *
 * @memberof utilities
 * @docname Units converter (array version)
 * @public
 *
 * @template {Object.<string, number[]>} T
 * @param {T} kwargs - [t, v] units to convert
 * @param {"IP" | "SI"} [from_units="IP"] - specify system to convert from
 * @returns {T} converted values in SI units
 *
 * @see {@link units_converter} for a version that supports scalar parameters
 */
export function units_converter_array<T extends {
    [x: string]: number[];
}>(kwargs: T, from_units?: "IP" | "SI"): T;
/**
 * Estimates the running mean temperature also known as prevailing mean outdoor temperature
 *
 * @public
 * @memberof utilities
 * @docname Running mean outdoor temperature
 *
 * @param {number[]} temp_array - array containing the mean daily temperature in descending order (i.e. from
 * newest/yestedayr to oldest) :math:`[t_{day-1}, t_{day-2}, ... , t_{day-n}]`,
 * Where :math:`t_{day-1}` is yesterday's daily mean temperature. The EN
 * 16798-1 2019 {@link #ref_3|[3]} states that n should be equal to 7
 *
 * @param {number} [alpha=0.8] - constant between 0 and 1. The EN 16798-1 2019 {@link #ref_3|[3]} recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggest that a slow-response running mean (alpha = 0.9)
 * could be more appropriate for climates in which synoptic-scale (day-to-day)
 * temperature dynamics are relatively minor, sich as the humid tropics.
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} running mean outdoor temperature
 */
export function running_mean_outdoor_temperature(temp_array: number[], alpha?: number, units?: "IP" | "SI"): number;
/**
 * Calculates the sky-vault view fraction
 *
 * @public
 * @memberof utilities
 * @docname Sky-vault view fraction
 *
 * @param {number} w - width of the window, [m]
 * @param {number} h - height of the window, [m]
 * @param {number} d - distance between the occupant and the window, [m]
 *
 * @returns {number} sky-vault view faction ranges between 0 and 1
 */
export function f_svv(w: number, h: number, d: number): number;
/**
 * Filter values based on a valid range (It turns the filtered values to NaNs)
 *
 * @param {number[]} [range] - the range to limit
 * @param {[number, number]} valid - the [min, max] to constrian the range to
 * @returns {number[]} the constrained range with NaNs for values that are outside the min, max range
 */
export function valid_range(range?: number[], [min, max]: [number, number]): number[];
/**
 * Total Clothing insulation of typical ensembles
 * @public
 * @memberof reference_values
 * @docname Typical ensembles insulation, [clo]
 *
 * @param {"Walking shorts, short-sleeve shirt" | "Typical summer indoor clothing" |
 * "Knee-length skirt, short-sleeve shirt, sandals, underwear" | "Trousers, long-sleeve shirt" |
 * "Knee-length skirt, long-sleeve shirt, full slip" | "Sweat pants, long-sleeve sweatshirt" |
 * "Jacket, Trousers, long-sleeve shirt" | "Typical winter indoor clothing"} ensembles - Typical ensembles. One of:
 *   - "Walking shorts, short-sleeve shirt"
 *   - "Typical summer indoor clothing"
 *   - "Knee-length skirt, short-sleeve shirt, sandals, underwear"
 *   - "Trousers, short-sleeve shirt, socks, shoes, underwear"
 *   - "Trousers, long-sleeve shirt"
 *   - "Knee-length skirt, long-sleeve shirt, full slip"
 *   - "Sweat pants, long-sleeve sweatshirt"
 *   - "Jacket, Trousers, long-sleeve shirt"
 *   - "Typical winter indoor clothing"
 *
 * @returns {number} - Clothing insulation of the given ensembles
 * @example
 * const result = clo_typical_ensembles("Trousers, long-sleeve shirt"); // returns 0.61
 */
export function clo_typical_ensembles(ensembles: "Walking shorts, short-sleeve shirt" | "Typical summer indoor clothing" | "Knee-length skirt, short-sleeve shirt, sandals, underwear" | "Trousers, long-sleeve shirt" | "Knee-length skirt, long-sleeve shirt, full slip" | "Sweat pants, long-sleeve sweatshirt" | "Jacket, Trousers, long-sleeve shirt" | "Typical winter indoor clothing"): number;
/**
 * Met values of typical tasks.
 * @public
 * @memberof reference_values
 * @docname Met typical tasks, [met]
 * @constant
 * @type {Object}
 * @property {number} Sleeping - 0.7
 * @property {number} Reclining - 0.8
 * @property {number} Seated_Cquiet - 1.0
 * @property {number} Reading_seated - 1.0
 * @property {number} Writing - 1.0
 * @property {number} Reading_seatedTyping - 1.1
 * @property {number} Standing_relaxed - 1.2
 * @property {number} Filing_seated - 1.2
 * @property {number} Flying_aircraft_routine - 1.2
 * @property {number} Filing_standing - 1.4
 * @property {number} Driving_a_car - 1.5
 * @property {number} Walking_about - 1.7
 * @property {number} Cooking - 1.8
 * @property {number} Table_sawing - 1.8
 * @property {number} Walking_2mph_3_2kmh - 2.0
 * @property {number} Lifting_packing - 2.1
 * @property {number} Seated_heavy_limb_movement - 2.2
 * @property {number} Light_machine_work - 2.2
 * @property {number} Flying_aircraft_combat - 2.4
 * @property {number} Walking_3mph_4_8kmh - 2.6
 * @property {number} House_cleaning - 2.7
 * @property {number} Driving_heavy_vehicle - 3.2
 * @property {number} Dancing - 3.4
 * @property {number} Calisthenics - 3.5
 * @property {number} Walking_4mph_6_4kmh - 3.8
 * @property {number} Tennis - 3.8
 * @property {number} Heavy_machine_work - 4.0
 * @property {number} Handling_100lb_45_kg_bags - 4.0
 * @property {number} Pick_and_shovel_work - 4.4
 * @property {number} Basketball - 6.3
 * @property {number} Wrestling - 7.8
 * @example
 * import { met_typical_tasks } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(met_typical_tasks['Seated_Cquiet']);
 * // output 1.0
 */
export const met_typical_tasks: any;
/**
 * Clo values of individual clothing elements. To calculate the total clothing insulation you need to add these values together.
 * @public
 * @memberof reference_values
 * @docname Insulation of individual garments, [clo]
 * @constant
 * @type {Object}
 * @property {number} Metal_chair - 0.0
 * @property {number} Bra - 0.01
 * @property {number} Wooden_stool - 0.01
 * @property {number} Ankle_socks - 0.02
 * @property {number} Shoes_or_sandals - 0.02
 * @property {number} Slippers - 0.03
 * @property {number} Panty_hose - 0.02
 * @property {number} Calf_length_socks - 0.03
 * @property {number} Women_underwear - 0.03
 * @property {number} Men_underwear - 0.04
 * @property {number} Knee_socks_thick - 0.06
 * @property {number} Short_shorts - 0.06
 * @property {number} Walking_shorts: 0.08,
 * @property {number} T_shirt - 0.08
 * @property {number} Standard_office_chair - 0.1
 * @property {number} Executive_chair - 0.15
 * @property {number} Boots - 0.1
 * @property {number} Sleeveless_scoop_neck_blouse - 0.12
 * @property {number} Half_slip - 0.14
 * @property {number} Long_underwear_bottoms - 0.15
 * @property {number} Full_slip - 0.16
 * @property {number} Short_sleeve_knit_shirt - 0.17
 * @property {number} Sleeveless_vest_thin - 0.1
 * @property {number} Sleeveless_vest_thick - 0.17
 * @property {number} Sleeveless_short_gown_thin - 0.18
 * @property {number} Short_sleeve_dress_shirt - 0.19
 * @property {number} Sleeveless_long_gown_thin - 0.2
 * @property {number} Long_underwear_top - 0.2
 * @property {number} Thick_skirt - 0.23
 * @property {number} Long_sleeve_dress_shirt - 0.25
 * @property {number} Long_sleeve_flannel_shirt - 0.34
 * @property {number} Long_sleeve_sweat_shirt - 0.34
 * @property {number} Short_sleeve_hospital_gown - 0.31
 * @property {number} Short_sleeve_short_robe_thin - 0.34
 * @property {number} Short_sleeve_pajamas - 0.42
 * @property {number} Long_sleeve_long_gown - 0.46
 * @property {number} Long_sleeve_short_wrap_robe_thick - 0.48
 * @property {number} Long_sleeve_pajamas_thick - 0.57
 * @property {number} Long_sleeve_long_wrap_robe_thick - 0.69
 * @property {number} Thin_trousers - 0.15
 * @property {number} Thick_trousers - 0.24
 * @property {number} Sweatpants - 0.28
 * @property {number} Overalls - 0.3
 * @property {number} Coveralls - 0.49
 * @property {number} Thin_skirt - 0.14
 * @property {number} Long_sleeve_shirt_dress_thin - 0.33
 * @property {number} Long_sleeve_shirt_dress_thick - 0.47
 * @property {number} Short_sleeve_shirt_dress - 0.29
 * @property {number} Sleeveless_scoop_neck_shirt_thin - 0.23
 * @property {number} Sleeveless_scoop_neck_shirt_thick - 0.27
 * @property {number} Long_sleeve_shirt_thin - 0.25
 * @property {number} Long_sleeve_shirt_thick - 0.36
 * @property {number} Single_breasted_coat_thin - 0.36
 * @property {number} Single_breasted_coat_thick - 0.44
 * @property {number} Double_breasted_coat_thin - 0.42
 * @property {number} Double_breasted_coat_thick - 0.48
 * @example
 * import { clo_individual_garments } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(clo_individual_garments['Metal_chair']);
 * // output 0.0
 */
export const clo_individual_garments: any;
export type ComplianceKwargs = {
    met?: number;
    clo?: number;
    tdb?: number;
    tr?: number;
    v?: number;
    vr?: number;
    v_limited?: number;
    rh?: number;
};
export type ComplianceKwargsArray = {
    met?: number[];
    clo?: number[];
    tdb?: number[];
    tr?: number[];
    v?: number[];
    v_limited?: number[];
    rh?: number[];
};
export type Standard = "ANKLE_DRAFT" | "ASHRAE" | "ISO" | "ISO7933";
export type CheckStandardComplianceResult = {
    [x: string]: number[];
};
//# sourceMappingURL=utilities.d.ts.map