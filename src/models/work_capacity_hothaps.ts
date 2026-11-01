import {
  BASE_INPUTS_WORK_INTENSITY,
  parseInputs,
} from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo } from "../_internal/modelInfo.ts";
import { WorkIntensity } from "../utilities/options.ts";
import type { WorkCapacity } from "./work_capacity_dunne.ts";

export const WORK_CAPACITY_HOTHAPS_INFO = deepFreeze({
  name: "work_capacity_hothaps",
  label: "Work Capacity (Hothaps)",
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
export type WorkCapacityHothapsInputs = InputsOf<
  typeof WORK_CAPACITY_HOTHAPS_INFO
>;

export function work_capacity_hothaps(
  inputs: WorkCapacityHothapsInputs,
): WorkCapacity {
  // validate inputs
  let { wbgt, work_intensity } = parseInputs(
    WORK_CAPACITY_HOTHAPS_INFO,
    inputs,
  );

  // convert str to enum
  work_intensity = work_intensity.toLowerCase();

  const params = {
    [WorkIntensity.HEAVY]: { divisor: 30.94, exponent: 16.64 },
    [WorkIntensity.MODERATE]: { divisor: 32.93, exponent: 17.81 },
    [WorkIntensity.LIGHT]: { divisor: 34.64, exponent: 22.72 },
  };
  const divisor = params[work_intensity as keyof typeof params].divisor;
  const exponent = params[work_intensity as keyof typeof params].exponent;
  const capacity = Math.min(
    Math.max(100 * (0.1 + 0.9 / (1 + (wbgt / divisor) ** exponent)), 0),
    100,
  );

  return Object.freeze({ capacity, warnings: Object.freeze([]) });
}
