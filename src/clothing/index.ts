/**
 * There are several key variables related to the thermal insulation and water
 * vapour resistance of clothing ensembles.
 *
 * @sortStrategy kind
 * @packageDocumentation
 */
// `kind` keeps the export order below, whose functions follow the page
// order of pythermalcomfort v4.8.1's `docs/documentation/clothing.rst`.
import { clo_area_factor } from "./clo_area_factor.ts";
import { clo_correction_factor_environment } from "./clo_correction_factor_environment.ts";
import { clo_dynamic_ashrae } from "./clo_dynamic_ashrae.ts";
import { clo_dynamic_iso, clo_dynamic_iso_vr } from "./clo_dynamic_iso.ts";
import { clo_insulation_air_layer } from "./clo_insulation_air_layer.ts";
import { clo_intrinsic_insulation_ensemble } from "./clo_intrinsic_insulation_ensemble.ts";
import { clo_total_insulation } from "./clo_total_insulation.ts";

export {
  clo_insulation_air_layer,
  clo_correction_factor_environment,
  clo_area_factor,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_dynamic_ashrae,
  clo_intrinsic_insulation_ensemble,
  clo_total_insulation,
};

/**
 * The named exports as one object, for `import pkg from "jsthermalcomfort"`.
 * Each member is documented under its own name.
 *
 * @hidden
 */
export default {
  clo_insulation_air_layer,
  clo_correction_factor_environment,
  clo_area_factor,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_dynamic_ashrae,
  clo_intrinsic_insulation_ensemble,
  clo_total_insulation,
};
