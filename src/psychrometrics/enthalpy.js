import { round } from "../utilities/utilities";

/**
 * Calculates air enthalpy
 *
 * @param {number} tdb air temperature [C]
 * @param {number} hr - humidity ratio [kg water/kg dry air]
 * @returns {number} enthalpy [J/kg dry air]
 */
export function enthalpy(tdb, hr) {
  const cp_air = 1004;
  const h_fg = 2501000;
  const cp_vapor = 1805.0;

  const dryAir = cp_air * tdb;
  const satVap = h_fg + cp_vapor * tdb;
  const h = dryAir + hr * satVap;

  return round(h, 2);
}
