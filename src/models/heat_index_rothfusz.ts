import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import {
  _mapping,
  _valid_range,
  HEAT_INDEX_RISK_CATEGORIES,
} from "../_internal/validation.ts";

export const HEAT_INDEX_ROTHFUSZ_INFO = deepFreeze({
  name: "heat_index_rothfusz",
  label: "Heat Index (Rothfusz)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C", applicability: { min: 27.0 } },
    rh: { kind: "numeric", unit: "%" },
    round_output: { kind: "bool", default: true },
    limit_inputs: { kind: "bool", default: true },
  },
  outputs: {
    hi: { kind: "numeric", nullable: true, unit: "°C" },
    stress_category: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: HEAT_INDEX_RISK_CATEGORIES,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type HIInputs = InputsOf<typeof HEAT_INDEX_ROTHFUSZ_INFO>;

/**
 * Dataclass to represent the Heat Index (HI).
 *
 * @interface
 */
export type HI = OutputsOf<typeof HEAT_INDEX_ROTHFUSZ_INFO>;

/**
 * Calculate the Heat Index (HI) in accordance with the Rothfusz (1990) model
 * [Rothfusz1990](../../docs/references.md#rothfusz1990).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 * Stress categories are always determined from the unrounded heat index.
 * @param inputs.limit_inputs - If True, limits the inputs to the standard applicability limits. Defaults to True.
 *
 * > [!NOTE]
 * > By default, if the inputs are outside the standard applicability limits the
 * > function returns NaN. If False returns heat index
 * > values even if input values are outside the applicability limits of the model.
 * >
 * > The applicability limit is tdb >= 27°C.
 *
 * @returns A dataclass containing the Heat Index. See {@link HI} for more details.
 * To access the `hi` value, use the `hi` attribute of the returned `HI` instance, e.g., `result.hi`.
 *
 * - `hi` - Heat Index, [°C].
 * - `stress_category`
 *
 * @example
 * ```ts
 * import { heat_index_rothfusz } from "jsthermalcomfort/models";
 *
 * const result = heat_index_rothfusz({ tdb: 29, rh: 50 });
 * console.log(result.hi); // 29.7
 * console.log(result.stress_category); // "caution"
 * ```
 */
export function heat_index_rothfusz(inputs: HIInputs): HI {
  // Validate inputs using the HIInputs class
  const { tdb, rh, round_output, limit_inputs } = parseInputs(
    HEAT_INDEX_ROTHFUSZ_INFO,
    inputs,
  );

  const hi = _rothfusz_heat_index_optimized(tdb, rh);

  // heat index should only be calculated for temperatures at or above 27 °C
  const warnings: ModelWarning[] = [];
  const tdb_valid = _valid_range(
    tdb,
    HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability,
    "tdb",
    "input",
    HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.unit,
    warnings,
  );
  let hi_valid = limit_inputs && Number.isNaN(tdb_valid) ? NaN : hi;

  const stress_category = _mapping(
    hi_valid,
    HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier,
  );

  if (round_output) {
    hi_valid = round(hi_valid, 1);
  }

  return buildOutputs(
    HEAT_INDEX_ROTHFUSZ_INFO,
    {
      hi: hi_valid,
      stress_category,
    },
    warnings,
  );
}

function _rothfusz_heat_index_optimized(tdb: number, rh: number): number {
  return (
    -8.784695 +
    1.61139411 * tdb +
    2.338549 * rh -
    0.14611605 * tdb * rh -
    1.2308094e-2 * (tdb * tdb) -
    1.6424828e-2 * (rh * rh) +
    2.211732e-3 * (tdb * tdb) * rh +
    7.2546e-4 * tdb * (rh * rh) -
    3.582e-6 * (tdb * tdb) * (rh * rh)
  );
}
