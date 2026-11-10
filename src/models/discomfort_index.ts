import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _mapping } from "../_internal/validation.ts";

/**
 * Discomfort condition of each Discomfort Index range, [°C]. Bins include their lower
 * edge.
 */
const DISCOMFORT_CATEGORIES = deepFreeze({
  edges: [21, 24, 27, 29, 32, 99],
  labels: [
    "No discomfort",
    "Less than 50% feels discomfort",
    "More than 50% feels discomfort",
    "Most of the population feels discomfort",
    "Everyone feels severe stress",
    "State of medical emergency",
  ],
  right: false,
} as const satisfies ClassifierBins);

export const DISCOMFORT_INDEX_INFO = deepFreeze({
  name: "discomfort_index",
  label: "Discomfort Index (DI)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
  },
  outputs: {
    di: { kind: "numeric", unit: "°C" },
    discomfort_condition: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: DISCOMFORT_CATEGORIES,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type DIInputs = InputsOf<typeof DISCOMFORT_INDEX_INFO>;

/**
 * Dataclass to represent the Discomfort Index (DI) and its classification.
 *
 * @interface
 */
export type DI = OutputsOf<typeof DISCOMFORT_INDEX_INFO>;

/**
 * Calculate the Discomfort Index (DI).
 *
 * The index is essentially an
 * effective temperature based on air temperature and humidity. The discomfort
 * index is usually divided into 6 discomfort categories and it only applies to
 * warm environments: [Polydoros2015](../../docs/references.md#polydoros2015)
 *
 * * class 1 - DI < 21 °C - No discomfort
 * * class 2 - 21 <= DI < 24 °C - Less than 50% feels discomfort
 * * class 3 - 24 <= DI < 27 °C - More than 50% feels discomfort
 * * class 4 - 27 <= DI < 29 °C - Most of the population feels discomfort
 * * class 5 - 29 <= DI < 32 °C - Everyone feels severe stress
 * * class 6 - DI >= 32 °C - State of medical emergency
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 *
 * @returns A dataclass containing the Discomfort Index and its classification. See {@link DI} for more details.
 * To access the `di` and `discomfort_condition` values, use the respective attributes of the returned `DI` instance, e.g., `result.di`.
 *
 * - `di` - Discomfort Index, [°C].
 * - `discomfort_condition` - Classification of the thermal comfort conditions according to the discomfort index.
 *
 * @example
 * ```ts
 * import { discomfort_index } from "jsthermalcomfort/models";
 *
 * const result = discomfort_index({ tdb: 25, rh: 50 });
 * console.log(result.di); // 22.1
 * console.log(result.discomfort_condition); // "Less than 50% feels discomfort"
 *
 * const results = [
 *   { tdb: 25, rh: 50 },
 *   { tdb: 30, rh: 60 },
 * ].map((inputs) => discomfort_index(inputs));
 * console.log(results.map((r) => r.di)); // [22.1, 26.6]
 * console.log(results.map((r) => r.discomfort_condition));
 * // ["Less than 50% feels discomfort", "More than 50% feels discomfort"]
 * ```
 */
export function discomfort_index(inputs: DIInputs): DI {
  // Validate inputs using the DIInputs class
  const { tdb, rh } = parseInputs(DISCOMFORT_INDEX_INFO, inputs);

  const di = tdb - 0.55 * (1 - 0.01 * rh) * (tdb - 14.5);

  return buildOutputs(
    DISCOMFORT_INDEX_INFO,
    {
      di: round(di, 1),
      discomfort_condition: _mapping(
        di,
        DISCOMFORT_INDEX_INFO.outputs.discomfort_condition.classifier,
      ),
    },
    [],
  );
}
