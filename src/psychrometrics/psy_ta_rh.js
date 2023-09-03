import { p_sat } from "./p_sat";
import { t_dp } from "./t_dp";
import { t_wb } from "./t_wb";
import { enthalpy } from "./enthalpy";

/**
 * @typedef {object} PsyTaRhReturnType
 * @property {number} p_vap - partial pressure of water vapor in moist air, [Pa]
 * @property {number} hr - humidity ratio, [kg water/kg dry air]
 * @property {number} t_wb - wet bulb temperature, [°C]
 * @property {number} t_dp - dew point temperature, [°C]
 * @property {number} h - enthalpy [J/kg dry air]
 */

/**
 * Calculates psychrometric values of air based on dry bulb air temperature and
 * relative humidity.
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
export function psy_ta_rh(tdb, rh, p_atm = 101325) {
  const p_saturation = p_sat(tdb);
  const p_vap = (rh / 100) * p_saturation;
  const hr = (0.62198 * p_vap) / (p_atm - p_vap);
  const tdp = t_dp(tdb, rh);
  const twb = t_wb(tdb, rh);
  const h = enthalpy(tdb, hr);

  return {
    p_sat: p_saturation,
    t_wb: twb,
    t_dp: tdp,
    p_vap,
    hr,
    h,
  };
}
