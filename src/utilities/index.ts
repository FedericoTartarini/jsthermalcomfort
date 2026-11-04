import {
  met_typical_tasks,
  clo_typical_ensembles,
  clo_individual_garments,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
} from "./utilities.js";
import { body_surface_area } from "./body_surface_area.ts";
import { units_converter } from "./units_converter.ts";
import { Postures, Sex, Standard, Units, WorkIntensity } from "./options.ts";
import {
  clo_area_factor,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_insulation_air_layer,
  clo_total_insulation,
} from "./clothing.ts";

export {
  body_surface_area,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_area_factor,
  clo_insulation_air_layer,
  clo_total_insulation,
  units_converter,
  met_typical_tasks,
  clo_typical_ensembles,
  clo_individual_garments,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  Standard,
  Units,
  Postures,
  Sex,
  WorkIntensity,
};

/**
 * The named exports as one object, for `import pkg from "jsthermalcomfort"`.
 * Each member is documented under its own name.
 *
 * @hidden
 */
export default {
  body_surface_area,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_area_factor,
  clo_insulation_air_layer,
  clo_total_insulation,
  units_converter,
  met_typical_tasks,
  clo_typical_ensembles,
  clo_individual_garments,
  CLO_INDIVIDUAL_GARMENT_GROUPS,
  Standard,
  Units,
  Postures,
  Sex,
  WorkIntensity,
};
