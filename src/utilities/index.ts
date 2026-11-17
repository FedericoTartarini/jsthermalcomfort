/**
 * Helper functions for unit conversions, data processing, and common
 * calculations.
 *
 * @sortStrategy kind
 * @packageDocumentation
 */
// `kind` keeps the export order below, whose functions follow the page order
// of pythermalcomfort v4.8.1's `docs/documentation/utilities_functions.rst`.
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
