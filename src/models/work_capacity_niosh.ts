import {
  checkWorkCapacityStandardsInputs,
  parseInputs,
} from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { ModelInfo } from "../_internal/modelInfo.ts";
import type { WorkCapacity } from "./work_capacity_dunne.ts";
import type { WorkCapacityStandardsInputs } from "./work_capacity_iso.ts";

export const WORK_CAPACITY_NIOSH_INFO = deepFreeze({
  name: "work_capacity_niosh",
  label: "Work Capacity (NIOSH)",
  standards: [],
  inputs: {
    wbgt: { kind: "numeric", unit: "°C" },
    met: { kind: "numeric", unit: "W" },
  },
  outputs: {
    capacity: { kind: "numeric", unit: "%" },
  },
} as const satisfies ModelInfo);

export function work_capacity_niosh(
  inputs: WorkCapacityStandardsInputs,
): WorkCapacity {
  // Validate inputs
  const { wbgt, met } = parseInputs(WORK_CAPACITY_NIOSH_INFO, inputs);
  checkWorkCapacityStandardsInputs(met);

  const met_rest = 117; // assumed resting metabolic rate

  const wbgt_lim = 56.7 - 11.5 * Math.log10(met);
  const wbgt_lim_rest = 56.7 - 11.5 * Math.log10(met_rest);
  let capacity = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100;
  capacity = capacity < 0 ? 0 : capacity > 100 ? 100 : capacity;

  return Object.freeze({ capacity, warnings: Object.freeze([]) });
}
