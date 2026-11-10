import {
  checkWorkCapacityStandardsInputs,
  parseInputs,
} from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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
    capacity: { kind: "numeric", nullable: true, unit: "%" },
  },
} as const satisfies ModelInfo);

/**
 * Estimate work capacity due to heat based on NIOSH standards as described by Brode
 * et al.
 *
 * Estimates the amount of work that will be done at a given WBGT and
 * intensity of work as a percent. 100% means work is unaffected by heat. 0%
 * means no work is done.
 *
 * The function definitions / parameters can be found in: 1. Bröde P, Fiala D,
 * Lemke B, Kjellstrom T. Estimated work ability in warm outdoor environments
 * depends on the chosen heat stress assessment metric. International Journal
 * of Biometeorology. 2018 Mar;62(3):331-45.
 *
 * For a comparison of different functions see Fig 1 of Day E, Fankhauser S, Kingsmill
 * N, Costa H, Mavrogianni A. Upholding labour productivity under climate
 * change: an assessment of adaptation options. Climate Policy. 2019
 * Mar;19(3):367-85.
 *
 * @param inputs
 * @param inputs.wbgt - Wet bulb globe temperature, [°C].
 * @param inputs.met - Metabolic heat production in Watts
 *
 * @returns A dataclass containing the work capacity. See
 * {@link WorkCapacity} for more details. To access the
 * `capacity` value, use the `capacity` attribute of the returned `WorkCapacity` instance, e.g.,
 * `result.capacity`.
 *
 * - `capacity` - Work capacity affected by heat.
 */
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

  return buildOutputs(WORK_CAPACITY_NIOSH_INFO, { capacity }, []);
}
