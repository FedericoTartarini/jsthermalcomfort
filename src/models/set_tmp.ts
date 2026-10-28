import { two_nodes_gagge } from "./two_nodes_gagge.ts";
import type { GaggeTwoNodesInputs, SET } from "./two_nodes_gagge.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { BASE_INPUTS_POSITION, parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Postures } from "../utilities/options.ts";

export const SET_TMP_INFO = deepFreeze({
  name: "set_tmp",
  label: "Standard Effective Temperature",
  standards: ASHRAE_55_COMPLIANCE_STANDARDS,
  inputs: {
    tdb: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    v: { kind: "numeric", unit: "m/s", applicability: ASHRAE_55_LIMITS.v },
    rh: { kind: "numeric", unit: "%" },
    met: {
      kind: "numeric",
      unit: "met",
      applicability: ASHRAE_55_LIMITS.met,
    },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: ASHRAE_55_LIMITS.clo,
    },
    wme: { kind: "numeric", unit: "met", default: 0.0 },
    body_surface_area: { kind: "numeric", unit: "m²", default: 1.8258 },
    p_atm: { kind: "numeric", unit: "Pa", default: 101325 },
    position: { ...BASE_INPUTS_POSITION, default: Postures.standing },
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
    calculate_ce: { kind: "bool", default: false },
  },
  outputs: {
    set: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type SETInputs = InputsOf<typeof SET_TMP_INFO>;

export function set_tmp(inputs: SETInputs): SET {
  // Validate inputs using the SetTmpInputs class
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
    limit_inputs,
    round_output,
    calculate_ce,
  } = parseInputs(SET_TMP_INFO, inputs);

  let set_array = two_nodes_gagge({
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
    calculate_ce,
    round_output: false,
  }).set;

  const warnings: ModelWarning[] = [];
  const [tdb_valid, tr_valid, v_valid, met_valid, clo_valid] =
    _check_ashrae55_compliance(
      {
        tdb,
        tr,
        v,
        met,
        clo,
      },
      warnings,
    );
  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid)
  );
  set_array = limit_inputs && !all_valid ? NaN : set_array;

  if (round_output) {
    set_array = round(set_array, 1);
  }

  return Object.freeze({ set: set_array, warnings: Object.freeze(warnings) });
}
