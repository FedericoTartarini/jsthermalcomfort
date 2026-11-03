import { two_nodes_gagge } from "./two_nodes_gagge.ts";
import type { GaggeTwoNodesInputs, SET } from "./two_nodes_gagge.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { BASE_INPUTS_POSITION, parseInputs } from "../_internal/define.ts";
import {
  buildOutputs,
  deepFreeze,
  toComputedOutputs,
} from "../_internal/modelInfo.ts";
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
    set: { kind: "numeric", nullable: true, unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type SETInputs = InputsOf<typeof SET_TMP_INFO>;

/**
 * Calculate the Standard Effective Temperature (SET).
 *
 * The SET is the
 * temperature of a hypothetical isothermal environment at 50% (rh), <0.1 m/s
 * (20 fpm) average air speed (v), and tr = tdb, in which the total heat loss
 * from the skin of an imaginary occupant wearing clothing, standardized for
 * the activity concerned is the same as that from a person in the actual
 * environment with actual clothing and activity level. [Gagge1986](../../docs/references.md#gagge1986)
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.v - Air speed, [m/s].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.body_surface_area - Body surface area, default value 1.8258 [m2]
 *
 * > [!NOTE]
 * > The body surface area can be calculated using the function
 * > `body_surface_area`.
 * @param inputs.p_atm - Atmospheric pressure, default value 101325 [Pa]
 * @param inputs.position - Select either "sitting" or "standing". Defaults to "standing".
 * @param inputs.limit_inputs - If True, limits the inputs to the standard applicability limits. Defaults to True.
 *
 * > [!NOTE]
 * > By default, if the inputs are outside the standard applicability limits the
 * > function returns nan. If False returns values regardless of the input values.
 * > The limits are 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40,
 * > 0 <= v [m/s] <= 2, 1 <= met [met] <= 4, and 0 <= clo [clo] <= 1.5.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Standard Effective Temperature. See {@link SET} for more details.
 * To access the `set` value, use the corresponding attribute of the returned `SET` instance, e.g., `result.set`.
 *
 * - `set` - Standard effective temperature, [°C].
 *
 * @example
 * ```ts
 * import { set_tmp } from "jsthermalcomfort/models";
 *
 * const result = set_tmp({ tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(result.set); // 24.3
 *
 * const results = [25, 25].map((tdb) =>
 *   set_tmp({ tdb, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 }),
 * );
 * console.log(results.map(({ set }) => set)); // [24.3, 24.3]
 * ```
 */
export function set_tmp(inputs: SETInputs): SET {
  // Validate inputs using the SETInputs class
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

  let set_array = toComputedOutputs(
    SET_TMP_INFO,
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
      calculate_ce,
      round_output: false,
    }),
  ).set;

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

  return buildOutputs(SET_TMP_INFO, { set: set_array }, warnings);
}
