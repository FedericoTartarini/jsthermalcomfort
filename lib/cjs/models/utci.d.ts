/**
 * Determines the Universal Thermal Climate Index (UTCI). The UTCI is the
    equivalent temperature for the environment derived from a reference
    environment. It is defined as the air temperature of the reference
    environment which produces the same strain index value in comparison with
    the reference individual's response to the real environment. It is regarded
    as one of the most comprehensive indices for calculating heat stress in
    outdoor spaces. The parameters that are taken into account for calculating
    UTCI involve dry bulb temperature, mean radiation temperature, the pressure
    of water vapor or relative humidity, and wind speed (at the elevation of 10
    m above the ground). {@link #ref_7|[7]}
 * - Note: You can use this function to calculate the Universal Thermal Climate Index (UTCI) The applicability wind speed value must be between 0.5 and 17 m/s.
 * @see {@link utci_array} for a version that supports arrays
 *
 * @public
 * @memberof models
 * @docname Universal Thermal Climate Index (UTCI)
 *
 * @param {number} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number} v - wind speed 10m above ground level, default in [m/s] in [fps] if `units` = 'IP'
 * @param {number} rh - relative humidity, [%]
 * @param {"SI"|"IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} return_stress_category - default False if True returns the UTCI categorized in terms of thermal stress.
 * @param {boolean} limit_inputs - default True. By default, if the inputs are outsude the standard applicability limits the
        function returns nan. If False returns UTCI values even if input values are
        outside the applicability limits of the model. The valid input ranges are
        -50 < tdb [°C] < 50, tdb - 70 < tr [°C] < tdb + 30, and for 0.5 < v [m/s] < 17.0.
 * @example
 * console.log(utci(25, 25, 1.0, 50)) // will print 24.6
 * console.log(utci(77, 77, 3.28, 50, 'ip')) // will print 76.4
 * console.log(utci(25, 25, 1.0, 50, 'si', true))
 * // will print {utci: 24.6, stress_category: "no thermal stress"}
 */
export function utci(tdb: number, tr: number, v: number, rh: number, units?: "SI" | "IP", return_stress_category?: boolean, limit_inputs?: boolean): number | {
    utci: number;
    stress_category: string;
};
/**
 * Determines the Universal Thermal Climate Index (UTCI) (Supports array type). The UTCI is the
    equivalent temperature for the environment derived from a reference
    environment. It is defined as the air temperature of the reference
    environment which produces the same strain index value in comparison with
    the reference individual's response to the real environment. It is regarded
    as one of the most comprehensive indices for calculating heat stress in
    outdoor spaces. The parameters that are taken into account for calculating
    UTCI involve dry bulb temperature, mean radiation temperature, the pressure
    of water vapor or relative humidity, and wind speed (at the elevation of 10
    m above the ground). {@link #ref_7|[7]}
 * - Note: You can use this function to calculate the Universal Thermal Climate Index (UTCI) The applicability wind speed value must be between 0.5 and 17 m/s.
 * @see {@link utci} for scalar arguments.

 * @public
 * @memberof models
 * @docname Universal Thermal Climate Index (array version)
 *
 * @param {number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number[]} v - wind speed 10m above ground level, default in [m/s] in [fps] if `units` = 'IP'
 * @param {number[]} rh - relative humidity, [%]
 * @param {"SI"|"IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} return_stress_category - default False, if True returns the UTCI categorized in terms of thermal stress.
 * @param {boolean} limit_inputs - default True. By default, if the inputs are outsude the standard applicability limits the
        function returns nan. If False returns UTCI values even if input values are
        outside the applicability limits of the model. The valid input ranges are
        -50 < tdb [°C] < 50, tdb - 70 < tr [°C] < tdb + 30, and for 0.5 < v [m/s] < 17.0.
 * @example
 * console.log(utci_array([25, 25], [27, 25], [1, 1], [50, 50])) // will print [25.2, 24.6]
 * console.log(utci_array([25, 25], [27, 25], [1, 1], [50, 50], "si", true))
 * // will print {
   //     utci: [25.2, 24.6],
    //    stress_category: ["no thermal stress", "no thermal stress"],
    //  }
 */
export function utci_array(tdb: number[], tr: number[], v: number[], rh: number[], units?: "SI" | "IP", return_stress_category?: boolean, limit_inputs?: boolean): number[] | {
    utci: number[];
    stress_category: string[];
};
//# sourceMappingURL=utci.d.ts.map