import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _mapping } from "../_internal/validation.ts";

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
      masked: true,
      unit: null,
      classifier: {
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
      },
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

export function discomfort_index(inputs: DIInputs): DI {
  // Validate inputs using the DIInputs class
  const { tdb, rh } = parseInputs(DISCOMFORT_INDEX_INFO, inputs);

  const di = tdb - 0.55 * (1 - 0.01 * rh) * (tdb - 14.5);

  return Object.freeze({
    di: round(di, 1),
    discomfort_condition: _mapping(
      di,
      DISCOMFORT_INDEX_INFO.outputs.discomfort_condition.classifier,
    ),
    warnings: Object.freeze([]),
  });
}
