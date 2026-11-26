import { notOfType } from "../_internal/errors.ts";
import { cp_air, cp_vapour, h_fg } from "../utilities/constants.ts";

/**
 * Calculate air enthalpy.
 *
 * @param tdb - air temperature, [°C]
 * @param hr - humidity ratio, [kg water/kg dry air]
 * @returns enthalpy [J/kg dry air]
 */
export function enthalpy_air(tdb: number, hr: number): number {
  if (typeof (tdb as unknown) !== "number") throw notOfType("tdb", "a number");
  if (typeof (hr as unknown) !== "number") throw notOfType("hr", "a number");

  const h_dry_air = cp_air * tdb;
  const h_sat_vap = h_fg + cp_vapour * tdb;
  return h_dry_air + hr * h_sat_vap;
}
