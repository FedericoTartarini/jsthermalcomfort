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

  let h_dry_air = cp_air * tdb;
  let h_sat_vap = h_fg + cp_vapor * tdb;
  return h_dry_air + hr * h_sat_vap;
}
