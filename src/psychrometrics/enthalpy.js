import { round } from "../utilities/utilities";

/**
 * Calculates air enthalpy
 *
 * @param {number} airTemperature air temperature [C]
 * @param {number} humidityRatio - humidity ratio [kg water/kg dry air]
 * @returns {number} enthalpy [J/kg dry air]
 */
export function enthalpy(airTemperature, humidityRatio) {
  const cp_air = 1004;
  const h_fg = 2501000;
  const cp_vapor = 1805.0;

  const dryAir = cp_air * airTemperature;
  const satVap = h_fg + cp_vapor * airTemperature;
  const h = dryAir + humidityRatio * satVap;

  return round(h, 2);
}
