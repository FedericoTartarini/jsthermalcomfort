/**
 * Upstream's `dew_point_tmp` (`pythermalcomfort/psychrometrics/dew_point_tmp.py`
 * at v4.6.2): the dew point temperature, [°C], from the Magnus formula with
 * the WMO 2024 coefficients 6.112 hPa, 17.62 and 243.12 °C (:49-53), with
 * upstream's grouping. Unrounded, as upstream returns it.
 *
 * Not the public `t_dp` (`src/psychrometrics/t_dp.js`), which uses other
 * coefficients and rounds to 0.1 °C, so it cannot stand in for this; the
 * psychrometric family is aligned with upstream in ticket 41.
 *
 * At rh 0 the logarithm of 0 is -Infinity, and the result is NaN, as
 * upstream's.
 *
 * Private: not exported from the package root.
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @returns {number} dew point temperature, [°C]
 * @throws {RangeError} when `rh` is outside [0, 100], as upstream raises a
 * ValueError (:46-47; ADR 0012)
 */
export function dew_point_tmp(tdb: number, rh: number): number {
  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity must be between 0 and 100%.");
  }

  // saturation vapor pressure in hPa
  const e_w = 6.112 * Math.exp((17.62 * tdb) / (243.12 + tdb));
  // actual vapor pressure in hPa
  const e_s = (rh / 100) * e_w;
  return (243.12 * Math.log(e_s / 6.112)) / (17.62 - Math.log(e_s / 6.112));
}
