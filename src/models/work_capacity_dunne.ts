import {
  BASE_INPUTS_WORK_INTENSITY,
  parseInputs,
} from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { WorkIntensity } from "../utilities/options.ts";

export const WORK_CAPACITY_DUNNE_INFO = deepFreeze({
  name: "work_capacity_dunne",
  label: "Work Capacity (Dunne)",
  standards: [],
  inputs: {
    wbgt: { kind: "numeric", unit: "°C" },
    work_intensity: {
      ...BASE_INPUTS_WORK_INTENSITY,
      default: WorkIntensity.HEAVY,
    },
  },
  outputs: {
    capacity: { kind: "numeric", unit: "%" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type WorkCapacityDunneInputs = InputsOf<typeof WORK_CAPACITY_DUNNE_INFO>;

/**
 * Dataclass to represent work loss.
 *
 * @interface
 */
export type WorkCapacity = OutputsOf<typeof WORK_CAPACITY_DUNNE_INFO>;

export function work_capacity_dunne(
  inputs: WorkCapacityDunneInputs,
): WorkCapacity {
  // validate inputs
  let { wbgt, work_intensity } = parseInputs(WORK_CAPACITY_DUNNE_INFO, inputs);

  // convert str to enum
  work_intensity = work_intensity.toLowerCase();

  let capacity = Math.min(
    Math.max(100 - 25 * Math.max(0, wbgt - 25) ** (2 / 3), 0),
    100,
  );

  const factor_map = {
    [WorkIntensity.HEAVY]: 1,
    [WorkIntensity.MODERATE]: 2,
    [WorkIntensity.LIGHT]: 4,
  };

  capacity = Math.min(
    Math.max(
      capacity * factor_map[work_intensity as keyof typeof factor_map],
      0,
    ),
    100,
  );

  return Object.freeze({ capacity, warnings: Object.freeze([]) });
}
