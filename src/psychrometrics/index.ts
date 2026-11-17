/**
 * Functions for calculating psychrometric properties of moist air.
 *
 * @sortStrategy kind
 * @packageDocumentation
 */
// `kind` keeps the export order below, whose functions follow the page
// order of pythermalcomfort v4.8.1's `docs/documentation/psychrometrics.rst`.
import { antoine } from "./antoine.ts";
import { p_sat } from "./p_sat.ts";
import { p_sat_torr } from "./p_sat_torr.ts";
import { enthalpy_air } from "./enthalpy_air.ts";
import { wet_bulb_tmp } from "./wet_bulb_tmp.ts";
import { dew_point_tmp } from "./dew_point_tmp.ts";
import { psy_ta_rh } from "./psy_ta_rh.ts";
import { hr_to_rh } from "./hr_to_rh.ts";
import { rh_from_dew_point } from "./rh_from_dew_point.ts";
import { rh_from_wet_bulb } from "./rh_from_wet_bulb.ts";
import { rh_from_vapour_pressure } from "./rh_from_vapour_pressure.ts";

export type { PsychrometricValues } from "./psy_ta_rh.ts";

export {
  p_sat,
  p_sat_torr,
  antoine,
  psy_ta_rh,
  hr_to_rh,
  rh_from_dew_point,
  rh_from_wet_bulb,
  rh_from_vapour_pressure,
  wet_bulb_tmp,
  dew_point_tmp,
  enthalpy_air,
};

/**
 * The named exports as one object, for `import pkg from "jsthermalcomfort"`.
 * Each member is documented under its own name.
 *
 * @hidden
 */
export default {
  p_sat,
  p_sat_torr,
  antoine,
  psy_ta_rh,
  hr_to_rh,
  rh_from_dew_point,
  rh_from_wet_bulb,
  rh_from_vapour_pressure,
  wet_bulb_tmp,
  dew_point_tmp,
  enthalpy_air,
};
