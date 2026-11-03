import { two_nodes_gagge, TWO_NODES_GAGGE_INFO } from "./two_nodes_gagge.ts";
import type { GaggeTwoNodesInputs } from "./two_nodes_gagge.ts";
import { BASE_INPUTS_POSITION, parseInputs } from "../_internal/define.ts";
import {
  buildOutputs,
  deepFreeze,
  toComputedOutputs,
} from "../_internal/modelInfo.ts";
import type {
  ComputedOutputsOf,
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _as_flag, _valid_range } from "../_internal/validation.ts";
import { Postures } from "../utilities/options.ts";

export const USE_FANS_HEATWAVES_INFO = deepFreeze({
  name: "use_fans_heatwaves",
  label: "Use of fans during heatwaves",
  standards: [],
  inputs: {
    tdb: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 20.0, max: 50.0 },
    },
    tr: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 20.0, max: 50.0 },
    },
    v: { kind: "numeric", unit: "m/s", applicability: { min: 0.1, max: 4.5 } },
    rh: { kind: "numeric", unit: "%", applicability: { min: 0, max: 100 } },
    met: {
      kind: "numeric",
      unit: "met",
      applicability: { min: 0.7, max: 2.0 },
    },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: { min: 0.0, max: 1.0 },
    },
    wme: { kind: "numeric", unit: "met", default: 0 },
    body_surface_area: { kind: "numeric", unit: "m²", default: 1.8258 },
    p_atm: { kind: "numeric", unit: "Pa", default: 101325 },
    position: { ...BASE_INPUTS_POSITION, default: Postures.standing },
    max_skin_blood_flow: { kind: "numeric", unit: "kg/h/m²", default: 80 },
    max_sweating: { kind: "numeric", unit: "mL/h/m²", default: 500 },
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    e_skin: { kind: "numeric", nullable: true, unit: "W/m²" },
    e_rsw: { kind: "numeric", nullable: true, unit: "W/m²" },
    e_max: { kind: "numeric", nullable: true, unit: "W/m²" },
    q_sensible: { kind: "numeric", nullable: true, unit: "W/m²" },
    q_skin: { kind: "numeric", nullable: true, unit: "W/m²" },
    q_res: { kind: "numeric", nullable: true, unit: "W/m²" },
    t_core: { kind: "numeric", nullable: true, unit: "°C" },
    t_skin: { kind: "numeric", nullable: true, unit: "°C" },
    m_bl: { kind: "numeric", nullable: true, unit: "kg/h/m²" },
    m_rsw: { kind: "numeric", nullable: true, unit: "mL/h/m²" },
    w: { kind: "numeric", nullable: true, unit: null },
    w_max: { kind: "numeric", nullable: true, unit: null },
    heat_strain: { kind: "flag", nullable: true, unit: null },
    heat_strain_blood_flow: { kind: "flag", nullable: true, unit: null },
    heat_strain_w: { kind: "flag", nullable: true, unit: null },
    heat_strain_sweating: { kind: "flag", nullable: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type UseFansHeatwavesInputs = InputsOf<typeof USE_FANS_HEATWAVES_INFO>;

/**
 * Dataclass to represent the results of using fans during heatwaves.
 *
 * @interface
 */
export type UseFansHeatwaves = OutputsOf<typeof USE_FANS_HEATWAVES_INFO>;

/**
 * Estimate if the conditions you have selected would cause heat strain.
 *
 * This occurs when either the following variables reaches its
 * maximum value:
 *
 * * m_rsw Rate at which regulatory sweat is generated, [mL/h/m2]
 * * w : Skin wettedness, adimensional. Ranges from 0 and 1.
 * * m_bl : Skin blood flow [kg/h/m2]
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.v - Air speed, [m/s].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.body_surface_area - Body surface area, default value 1.8258 [m2]. Defaults to 1.8258.
 *
 * > [!NOTE]
 * > The body surface area can be calculated using the function
 * > `body_surface_area`.
 * @param inputs.p_atm - Atmospheric pressure, default value 101325 [Pa]. Defaults to 101325.
 * @param inputs.position - Select either "sitting" or "standing". Defaults to "standing".
 * @param inputs.max_skin_blood_flow - Maximum blood flow from the core to the skin. Defaults to 80.
 * @param inputs.limit_inputs - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns values even if input values are
 * outside the applicability limits of the model. Defaults to True. The
 * applicability limits are 20 <= tdb [°C] <= 50, 20 <= tr [°C] <= 50,
 * 0.1 <= v [m/s] <= 4.5, 0.7 <= met [met] <= 2, and 0 <= clo [clo] <= 1.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param inputs.max_sweating - Maximum rate at which regulatory sweat is generated, [mL/h/m2]. Defaults to 500.
 *
 * @returns A dataclass containing the results of using fans during heatwaves.
 * See {@link UseFansHeatwaves} for more details.
 * To access the results, use the corresponding attributes of the returned `UseFansHeatwaves` instance, e.g., `result.e_skin`.
 *
 * - `e_skin` - Total rate of evaporative heat loss from skin, [W/m2]. Equal to e_rsw + e_diff.
 * - `e_rsw` - Rate of evaporative heat loss from sweat evaporation, [W/m2].
 * - `e_max` - Maximum rate of evaporative heat loss from skin, [W/m2].
 * - `q_sensible` - Sensible heat loss from skin, [W/m2].
 * - `q_skin` - Total rate of heat loss from skin, [W/m2]. Equal to q_sensible + e_skin.
 * - `q_res` - Total rate of heat loss through respiration, [W/m2].
 * - `t_core` - Core temperature, [°C].
 * - `t_skin` - Skin temperature, [°C].
 * - `m_bl` - Skin blood flow, [kg/h/m2].
 * - `m_rsw` - Rate at which regulatory sweat is generated, [mL/h/m2].
 * - `w` - Skin wettedness, adimensional. Ranges from 0 to 1.
 * - `w_max` - Skin wettedness (w) practical upper limit, adimensional. Ranges from 0 to 1.
 * - `heat_strain` - 1.0 if the model predicts that the person may be experiencing heat strain, 0.0
 *   if not, and NaN where the inputs are outside the applicability limits.
 * - `heat_strain_blood_flow` - 1.0 if skin blood flow (m_bl) reaches its maximum value, otherwise 0.0, or NaN
 *   outside the applicability limits.
 * - `heat_strain_w` - 1.0 if skin wettedness (w) reaches its maximum value, otherwise 0.0, or NaN
 *   outside the applicability limits.
 * - `heat_strain_sweating` - 1.0 if regulatory sweating (m_rsw) reaches its maximum value, otherwise 0.0,
 *   or NaN outside the applicability limits.
 *
 * @example
 * ```ts
 * import { use_fans_heatwaves } from "jsthermalcomfort/models";
 *
 * const result = use_fans_heatwaves({
 *   tdb: 35,
 *   tr: 35,
 *   v: 1.0,
 *   rh: 50,
 *   met: 1.2,
 *   clo: 0.5,
 * });
 * console.log(result.e_skin); // 63
 * ```
 */
export function use_fans_heatwaves(
  inputs: UseFansHeatwavesInputs,
): UseFansHeatwaves {
  // Validate inputs using the UseFansHeatwavesInputs class
  const {
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    wme,
    body_surface_area,
    p_atm,
    position,
    max_skin_blood_flow,
    max_sweating,
    limit_inputs,
    round_output,
  } = parseInputs(USE_FANS_HEATWAVES_INFO, inputs);

  const result = toComputedOutputs(
    TWO_NODES_GAGGE_INFO,
    two_nodes_gagge({
      tdb,
      tr,
      v,
      rh,
      met,
      clo,
      wme,
      body_surface_area,
      p_atm,
      position: position as GaggeTwoNodesInputs["position"],
      max_skin_blood_flow,
      round_output: false,
      max_sweating,
    }),
  );

  // NaN where the underlying value is NaN, which np.max then carries into heat_strain
  const heat_strain_blood_flow = _as_flag(
    result.m_bl === max_skin_blood_flow,
    !Number.isNaN(result.m_bl),
  );
  const heat_strain_w = _as_flag(
    result.w === result.w_max,
    !(Number.isNaN(result.w) || Number.isNaN(result.w_max)),
  );
  const heat_strain_sweating = _as_flag(
    result.m_rsw === max_sweating,
    !Number.isNaN(result.m_rsw),
  );

  const heat_strain = Math.max(
    heat_strain_blood_flow,
    heat_strain_w,
    heat_strain_sweating,
  );

  const output: {
    -readonly [
      K in keyof ComputedOutputsOf<typeof USE_FANS_HEATWAVES_INFO>
    ]: ComputedOutputsOf<typeof USE_FANS_HEATWAVES_INFO>[K];
  } = {
    e_skin: result.e_skin,
    e_rsw: result.e_rsw,
    e_max: result.e_max,
    q_sensible: result.q_sensible,
    q_skin: result.q_skin,
    q_res: result.q_res,
    t_core: result.t_core,
    t_skin: result.t_skin,
    m_bl: result.m_bl,
    m_rsw: result.m_rsw,
    w: result.w,
    w_max: result.w_max,
    heat_strain,
    heat_strain_blood_flow,
    heat_strain_w,
    heat_strain_sweating,
  };

  const warnings: ModelWarning[] = [];
  // fan_heatwaves applicability limits (extended from ASHRAE 55 baseline).
  const tdb_valid = _valid_range(
    tdb,
    USE_FANS_HEATWAVES_INFO.inputs.tdb.applicability,
    "tdb",
    "input",
    USE_FANS_HEATWAVES_INFO.inputs.tdb.unit,
    warnings,
  );
  const tr_valid = _valid_range(
    tr,
    USE_FANS_HEATWAVES_INFO.inputs.tr.applicability,
    "tr",
    "input",
    USE_FANS_HEATWAVES_INFO.inputs.tr.unit,
    warnings,
  );
  const v_valid = _valid_range(
    v,
    USE_FANS_HEATWAVES_INFO.inputs.v.applicability,
    "v",
    "input",
    USE_FANS_HEATWAVES_INFO.inputs.v.unit,
    warnings,
  );
  // rh is range-checked for its side-effect warning but is not included
  // in all_valid (matches the function's prior behaviour).
  _valid_range(
    rh,
    USE_FANS_HEATWAVES_INFO.inputs.rh.applicability,
    "rh",
    "input",
    USE_FANS_HEATWAVES_INFO.inputs.rh.unit,
    warnings,
  );
  const met_valid = _valid_range(
    met,
    USE_FANS_HEATWAVES_INFO.inputs.met.applicability,
    "met",
    "input",
    USE_FANS_HEATWAVES_INFO.inputs.met.unit,
    warnings,
  );
  const clo_valid = _valid_range(
    clo,
    USE_FANS_HEATWAVES_INFO.inputs.clo.applicability,
    "clo",
    "input",
    USE_FANS_HEATWAVES_INFO.inputs.clo.unit,
    warnings,
  );
  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid)
  );
  if (limit_inputs && !all_valid) {
    for (const key of Object.keys(output) as (keyof typeof output)[]) {
      output[key] = NaN;
    }
  }

  if (round_output) {
    for (const key of Object.keys(output) as (keyof typeof output)[]) {
      output[key] = round(output[key], 1);
    }
  }

  return buildOutputs(USE_FANS_HEATWAVES_INFO, output, warnings);
}
