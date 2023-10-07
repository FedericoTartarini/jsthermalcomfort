/**
 * Calculates the Apparent Temperature (AT). The AT is defined as the temperature at the reference
 * humidity level producing the same amount of discomfort as that experienced under the current ambient
 * temperature, humidity, and solar radiation {@link #ref_17|[17]}. In other words, the AT is an adjustment to the dry
 * bulb temperature based on the relative humidity value. Absolute humidity with a dew point of 14°C
 * is chosen as a reference.
 *
 * {@link #ref_16|[16]}. It includes the chilling effect of the wind at lower temperatures.
 *
 * Two formulas for AT are in use by the Australian Bureau of Meteorology: one includes solar
 * radiation and the other one does not ({@link http://www.bom.gov.au/info/thermal_stress/}, 29 Sep 2021).
 * Please specify q if you want to estimate AT with solar load.
 *
 * @public
 * @memberof models
 * @docname Apparent Temperature (AT)
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {number} v - wind speed 10m above ground level, [m/s]
 * @param {number | undefined} [q] - Net radiation absorbed per unit area of body surface [W/m2]
 * @param {object} [kwargs] - other parameters
 * @param {boolean} [kwargs.round=true] - if True rounds output value, if False it does not round it
 *
 * @returns {number} apparent temperature, [°C]
 *
 * @example
 * const result = at(25, 30, 0.1);
 * console.log(result); // 24.1
 */
export function at(tdb: number, rh: number, v: number, q?: number | undefined, kwargs?: {
    round?: boolean;
}): number;
//# sourceMappingURL=at.d.ts.map