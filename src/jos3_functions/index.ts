// jos3 D5: the JOS-3 functions, exported as upstream's
// pythermalcomfort.jos3_functions is importable, in upstream's four modules:
// construction, matrix, parameters and thermoregulation
// (pythermalcomfort/jos3_functions/ at v4.6.2). The files stay one per
// function. A namespace rather than root exports, as several names repeat
// others the package exports (clo_area_factor in the utilities).
import { validate_body_parameters } from "./validate_body_parameters.ts";
import { to_array_body_parts } from "./to_array_body_parts.ts";
import { bsa_rate } from "./bsa_rate.ts";
import { local_bsa } from "./local_bsa.ts";
import { weight_rate } from "./weight_rate.ts";
import { bfb_rate } from "./bfb_rate.ts";
import { conductance } from "./conductance.ts";
import { capacity } from "./capacity.ts";
import { pass_values_to_jos3_body_parts } from "./pass_values_to_jos3_body_parts.ts";
import {
  IDICT,
  INDEX,
  LAYER_NAMES,
  NUM_NODES,
  VINDEX,
  index_by_layer,
  index_order,
  local_arr,
  remove_body_name,
  valid_index_by_layer,
  vessel_blood_flow,
  whole_body,
} from "./matrix.ts";
import { Default } from "./Default.ts";
import { ALL_OUT_PARAMS } from "./ALL_OUT_PARAMS.ts";
import { local_clo_typical_ensembles } from "./local_clo_typical_ensembles.ts";
import { natural_convection } from "./thermoregulation/natural_convection.ts";
import { forced_convection } from "./thermoregulation/forced_convection.ts";
import { conv_coef } from "./thermoregulation/conv_coef.ts";
import { rad_coef } from "./thermoregulation/rad_coef.ts";
import { fixed_hc } from "./thermoregulation/fixed_hc.ts";
import { fixed_hr } from "./thermoregulation/fixed_hr.ts";
import { operative_temp } from "./thermoregulation/operative_temp.ts";
import { clo_area_factor } from "./thermoregulation/clo_area_factor.ts";
import { dry_r } from "./thermoregulation/dry_r.ts";
import { wet_r } from "./thermoregulation/wet_r.ts";
import { error_signals } from "./thermoregulation/error_signals.ts";
import { tetens } from "./thermoregulation/tetens.ts";
import { evaporation } from "./thermoregulation/evaporation.ts";
import { skin_blood_flow } from "./thermoregulation/skin_blood_flow.ts";
import { ava_blood_flow } from "./thermoregulation/ava_blood_flow.ts";
import { basal_met } from "./thermoregulation/basal_met.ts";
import { local_mbase } from "./thermoregulation/local_mbase.ts";
import { local_q_work } from "./thermoregulation/local_q_work.ts";
import {
  get_pre_shiv,
  set_pre_shiv,
  shivering,
} from "./thermoregulation/shivering.ts";
import { nonshivering } from "./thermoregulation/nonshivering.ts";
import { sum_m } from "./thermoregulation/sum_m.ts";
import { cr_ms_fat_blood_flow } from "./thermoregulation/cr_ms_fat_blood_flow.ts";
import { sum_bf } from "./thermoregulation/sum_bf.ts";
import { resp_heat_loss } from "./thermoregulation/resp_heat_loss.ts";

/** Upstream's `jos3_functions.construction`. */
const construction = Object.freeze({
  validate_body_parameters,
  to_array_body_parts,
  bsa_rate,
  local_bsa,
  weight_rate,
  bfb_rate,
  conductance,
  capacity,
  pass_values_to_jos3_body_parts,
});

/** Upstream's `jos3_functions.matrix`. */
const matrix = Object.freeze({
  LAYER_NAMES,
  index_order,
  IDICT,
  NUM_NODES,
  index_by_layer,
  valid_index_by_layer,
  INDEX,
  VINDEX,
  local_arr,
  vessel_blood_flow,
  whole_body,
  remove_body_name,
});

/** Upstream's `jos3_functions.parameters`: its tables. */
const parameters = Object.freeze({
  Default,
  ALL_OUT_PARAMS,
  local_clo_typical_ensembles,
});

// Upstream's PRE_SHIV is a module global that a caller can read and assign
// (thermoregulation.py:1135 at v4.6.2); here it is an accessor property, so
// `thermoregulation.PRE_SHIV = 0` sets what shivering reads. The object is
// frozen after its declaration, so its type keeps PRE_SHIV assignable; a
// frozen accessor still calls its setter.
/** Upstream's `jos3_functions.thermoregulation`. */
const thermoregulation = {
  natural_convection,
  forced_convection,
  conv_coef,
  rad_coef,
  fixed_hc,
  fixed_hr,
  operative_temp,
  clo_area_factor,
  dry_r,
  wet_r,
  error_signals,
  tetens,
  evaporation,
  skin_blood_flow,
  ava_blood_flow,
  basal_met,
  local_mbase,
  local_q_work,
  get PRE_SHIV(): number {
    return get_pre_shiv();
  },
  set PRE_SHIV(value: number) {
    set_pre_shiv(value);
  },
  shivering,
  nonshivering,
  sum_m,
  cr_ms_fat_blood_flow,
  sum_bf,
  resp_heat_loss,
};
Object.freeze(thermoregulation);

export { construction, matrix, parameters, thermoregulation };

export default { construction, matrix, parameters, thermoregulation };
