/**
 * @typedef {object} PsyTaRhReturnType
 * @property {number} p_vap - partial pressure of water vapor in moist air, [Pa]
 * @property {number} hr - humidity ratio, [kg water/kg dry air]
 * @property {number} t_wb - wet bulb temperature, [°C]
 * @property {number} t_dp - dew point temperature, [°C]
 * @property {number} h - enthalpy [J/kg dry air]
 * @public
 */
/**
 * Calculates psychrometric values of air based on dry bulb air temperature and
 * relative humidity.
 *
 * @public
 * @memberof psychrometrics
 *
 * @param {number} tdb - air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {number} [p_atm = 101325] - atmospheric pressure, [Pa]
 *
 * @returns {PsyTaRhReturnType} object with calculated psychrometrics values
 *
 * @example
 * import { psy_ta_rh } from "jsthermalcomfort";
 * const results = psy_ta_rh(21, 56);
 * console.log(results); // { p_sat: 2487.7, p_vap: 1393.112, hr: -2.2041754048718936, t_wb: 15.4, t_dp: 11.9, h: -5575107.96 }
 */
export function psy_ta_rh(tdb: number, rh: number, p_atm?: number): PsyTaRhReturnType;
export type PsyTaRhReturnType = {
    /**
     * - partial pressure of water vapor in moist air, [Pa]
     */
    p_vap: number;
    /**
     * - humidity ratio, [kg water/kg dry air]
     */
    hr: number;
    /**
     * - wet bulb temperature, [°C]
     */
    t_wb: number;
    /**
     * - dew point temperature, [°C]
     */
    t_dp: number;
    /**
     * - enthalpy [J/kg dry air]
     */
    h: number;
};
//# sourceMappingURL=psy_ta_rh.d.ts.map