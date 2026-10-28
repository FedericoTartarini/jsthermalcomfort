import { two_nodes_gagge } from "./two_nodes_gagge.ts";
import type { GaggeTwoNodesInputs } from "./two_nodes_gagge.ts";
import { BASE_INPUTS_POSITION, parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _valid_range } from "../_internal/validation.ts";
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
    e_skin: { kind: "numeric", unit: "W/m²" },
    e_rsw: { kind: "numeric", unit: "W/m²" },
    e_max: { kind: "numeric", unit: "W/m²" },
    q_sensible: { kind: "numeric", unit: "W/m²" },
    q_skin: { kind: "numeric", unit: "W/m²" },
    q_res: { kind: "numeric", unit: "W/m²" },
    t_core: { kind: "numeric", unit: "°C" },
    t_skin: { kind: "numeric", unit: "°C" },
    m_bl: { kind: "numeric", unit: "kg/h/m²" },
    m_rsw: { kind: "numeric", unit: "mL/h/m²" },
    w: { kind: "numeric", unit: null },
    w_max: { kind: "numeric", unit: null },
    heat_strain: { kind: "bool", masked: true, unit: null },
    heat_strain_blood_flow: { kind: "bool", masked: true, unit: null },
    heat_strain_w: { kind: "bool", masked: true, unit: null },
    heat_strain_sweating: { kind: "bool", masked: true, unit: null },
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

  const result = two_nodes_gagge({
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
  });

  const heat_strain_blood_flow = result.m_bl === max_skin_blood_flow;
  const heat_strain_w = result.w === result.w_max;
  const heat_strain_sweating = result.m_rsw === max_sweating;

  const heat_strain =
    heat_strain_blood_flow || heat_strain_w || heat_strain_sweating;

  const output: {
    -readonly [
      K in Exclude<keyof UseFansHeatwaves, "warnings">
    ]: UseFansHeatwaves[K];
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
    // np.around raises on the boolean outputs, which only limit_inputs' np.where makes floats (deviation use_fans_heatwaves-4).
    if (!limit_inputs) {
      throw new TypeError(
        "Cannot cast ufunc 'multiply' output from dtype('float64') to dtype('bool') with casting rule 'same_kind'",
      );
    }
    for (const key of Object.keys(output) as (keyof typeof output)[]) {
      const value = output[key];
      if (typeof value === "number") output[key] = round(value, 1);
    }
  }

  return Object.freeze({ ...output, warnings: Object.freeze(warnings) });
}
