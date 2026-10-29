import { notOfType } from "../_internal/errors.ts";
import { dew_point_tmp } from "./dew_point_tmp.ts";
import { enthalpy_air } from "./enthalpy_air.ts";
import { p_sat } from "./p_sat.ts";
import { wet_bulb_tmp } from "./wet_bulb_tmp.ts";

export interface PsychrometricValues {
  readonly p_sat: number;
  readonly p_vap: number;
  readonly hr: number;
  readonly wet_bulb_tmp: number;
  readonly dew_point_tmp: number;
  readonly h: number;
}

/**
 * Calculate psychrometric values of air based on dry bulb air temperature and
 * relative humidity.
 *
 * For more accurate results we recommend the use of the Python
 * package [psychrolib](https://pypi.org/project/PsychroLib/).
 *
 * @param tdb - air temperature, [°C]
 * @param rh - relative humidity, [%]
 * @param p_atm - atmospheric pressure, [Pa]
 * @returns
 * - `p_sat`
 * - `p_vap` - partial pressure of water vapor in moist air, [Pa]
 * - `hr` - humidity ratio, [kg water/kg dry air]
 * - `wet_bulb_tmp` - wet bulb temperature, [°C]
 * - `dew_point_tmp` - dew point temperature, [°C]
 * - `h` - enthalpy [J/kg dry air]
 *
 * @remarks
 * **Elevation and Barometric Sensitivity:**
 * Psychrometric properties, particularly humidity ratio (:math:`W`) and
 * mixture enthalpy (:math:`h`), are sensitive to atmospheric pressure
 * (:math:`p_{atm}`).
 *
 * At high elevations (e.g., Denver, CO at 1,609 m / 5,280 ft, where
 * :math:`p_{atm} \approx 82,500\text{ Pa}`), the moisture-holding capacity
 * of dry air increases. At 25°C and 50% RH:
 * - At sea level (101,325 Pa): :math:`W \approx 0.00988\text{ kg}_w/\text{kg}_{da}`
 * - At 1,609 m (82,500 Pa): :math:`W \approx 0.01218\text{ kg}_w/\text{kg}_{da}` (+23.3% delta)
 *
 * Omitting local atmospheric pressure when calling comfort models that
 * derive latent heat exchange or skin wettedness will result in systematic
 * deviations in elevated or non-standard barometric conditions.
 *
 * For rigorous real-gas calculations incorporating enhancement factors
 * (:math:`f_w`), see ASHRAE RP-1485 / Hyland-Wexler formulations. The
 * `psychrolib` library provides a standard ideal-gas psychrometric
 * implementation.
 */
export function psy_ta_rh(
  tdb: number,
  rh: number,
  p_atm = 101325,
): PsychrometricValues {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  if (typeof (rh as unknown) !== "number") throw notOfType("rh", "a number");
  if (typeof (p_atm as unknown) !== "number") {
    throw notOfType("p_atm", "a number");
  }

  const p_saturation = p_sat(tdb);
  const p_vap = (rh / 100) * p_saturation;
  const hr = (0.62198 * p_vap) / (p_atm - p_vap);
  const tdp = dew_point_tmp(tdb, rh);
  const twb = wet_bulb_tmp(tdb, rh);
  const h = enthalpy_air(tdb, hr);

  return Object.freeze({
    p_sat: p_saturation,
    p_vap,
    hr,
    wet_bulb_tmp: twb,
    dew_point_tmp: tdp,
    h,
  });
}
