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

  let dryAir = cp_air * airTemperature;
  let satVap = h_fg + cp_vapor * airTemperature;
  return dryAir + humidityRatio * satVap;
}
