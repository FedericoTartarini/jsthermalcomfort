import {
  met_typical_tasks,
  clo_typical_ensembles,
  clo_individual_garments,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  f_r_garments,
  DefaultSkinTemperature,
} from "./reference_tables.ts";
import { body_surface_area } from "./body_surface_area.ts";
import {
  c_to_k,
  cp_air,
  cp_vapour,
  cp_water,
  g,
  h_fg,
  met_to_w_m2,
  r_air,
} from "./constants.ts";
import { units_converter } from "./units_converter.ts";
import {
  BodySurfaceAreaEquations,
  Postures,
  Sex,
  Standard,
  Units,
  WorkIntensity,
} from "./options.ts";
import {
  clo_area_factor,
  clo_correction_factor_environment,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_insulation_air_layer,
  clo_intrinsic_insulation_ensemble,
  clo_total_insulation,
} from "./clothing.ts";

export {
  c_to_k,
  cp_vapour,
  cp_water,
  cp_air,
  h_fg,
  r_air,
  g,
  met_to_w_m2,
  body_surface_area,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_area_factor,
  clo_correction_factor_environment,
  clo_insulation_air_layer,
  clo_intrinsic_insulation_ensemble,
  clo_total_insulation,
  units_converter,
  met_typical_tasks,
  clo_typical_ensembles,
  clo_individual_garments,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  f_r_garments,
  DefaultSkinTemperature,
  Standard,
  Units,
  Postures,
  Sex,
  BodySurfaceAreaEquations,
  WorkIntensity,
};

/**
 * The named exports as one object, for `import pkg from "jsthermalcomfort"`.
 * Each member is documented under its own name.
 *
 * @hidden
 */
export default {
  c_to_k,
  cp_vapour,
  cp_water,
  cp_air,
  h_fg,
  r_air,
  g,
  met_to_w_m2,
  body_surface_area,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_area_factor,
  clo_correction_factor_environment,
  clo_insulation_air_layer,
  clo_intrinsic_insulation_ensemble,
  clo_total_insulation,
  units_converter,
  met_typical_tasks,
  clo_typical_ensembles,
  clo_individual_garments,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  f_r_garments,
  DefaultSkinTemperature,
  Standard,
  Units,
  Postures,
  Sex,
  BodySurfaceAreaEquations,
  WorkIntensity,
};
