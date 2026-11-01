import {
  checkWorkCapacityStandardsInputs,
  parseInputs,
} from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo } from "../_internal/modelInfo.ts";
import type { WorkCapacity } from "./work_capacity_dunne.ts";

export const WORK_CAPACITY_ISO_INFO = deepFreeze({
  name: "work_capacity_iso",
  label: "Work Capacity (ISO)",
  standards: [],
  inputs: {
    wbgt: { kind: "numeric", unit: "°C" },
    met: { kind: "numeric", unit: "W" },
  },
  outputs: {
    capacity: { kind: "numeric", unit: "%" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type WorkCapacityStandardsInputs = InputsOf<
  typeof WORK_CAPACITY_ISO_INFO
>;

export function work_capacity_iso(
  inputs: WorkCapacityStandardsInputs,
): WorkCapacity {
  // Validate inputs
  const { wbgt, met } = parseInputs(WORK_CAPACITY_ISO_INFO, inputs);
  checkWorkCapacityStandardsInputs(met);

  const met_rest = 117; // assumed resting metabolic rate

  const wbgt_lim = 34.9 - met / 46;
  const wbgt_lim_rest = 34.9 - met_rest / 46;
  let capacity = ((wbgt_lim_rest - wbgt) / (wbgt_lim_rest - wbgt_lim)) * 100;
  capacity = Math.min(Math.max(capacity, 0), 100);

  return Object.freeze({ capacity, warnings: Object.freeze([]) });
}
