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
  psy_ta_rh,
  enthalpy_air,
  wet_bulb_tmp,
  dew_point_tmp,
  hr_to_rh,
  rh_from_dew_point,
  rh_from_wet_bulb,
  rh_from_vapour_pressure,
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
  psy_ta_rh,
  enthalpy_air,
  wet_bulb_tmp,
  dew_point_tmp,
  hr_to_rh,
  rh_from_dew_point,
  rh_from_wet_bulb,
  rh_from_vapour_pressure,
};
