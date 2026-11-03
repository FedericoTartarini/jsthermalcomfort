import {
  BASE_INPUTS_WORK_INTENSITY,
  parseInputs,
} from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { WorkIntensity } from "../utilities/options.ts";
import type { WORK_CAPACITY_HOTHAPS_INFO } from "./work_capacity_hothaps.ts";

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
// Typed from hothaps' INFO, whose capacity can be NaN where dunne's cannot.
export type WorkCapacity = OutputsOf<typeof WORK_CAPACITY_HOTHAPS_INFO>;

/**
 * Estimate work capacity due to heat based on Dunne et al [Dunne2013](../../docs/references.md#dunne2013).
 *
 * Estimates the amount of work that will be done at a given WBGT and
 * intensity of work as a percent. 100% means work is unaffected by heat. 0%
 * means no work is done.
 *
 * This is based upon NIOSH safety standards. See:
 * Dunne JP, Stouffer RJ, John JG. Reductions in labour capacity from heat
 * stress under climate warming. Nature Climate Change. 2013 Jun;3(6):563-6.
 *
 * Heavy intensity work is sometimes labelled as 400 W, but this is only
 * nominal. Moderate work is assumed to be half as much as heavy intensity, and
 * light half as much as moderate.
 *
 * @param inputs
 * @param inputs.wbgt - Wet bulb globe temperature, [°C].
 * @param inputs.work_intensity - Which work intensity to use for the calculation, choice of "heavy",
 * "moderate" or "light". Default is "heavy".
 *
 * > [!NOTE]
 * > Dunne et al [Dunne2013](../../docs/references.md#dunne2013) suggests that heavy intensity work is 350-500 kcal/h, moderate
 * > is 200-350 kcal/h, and light is less than 100-200 kcal/h.
 *
 * @returns A dataclass containing the work capacity. See
 * {@link WorkCapacity} for more details. To access the
 * `capacity` value, use the `capacity` attribute of the returned `WorkCapacity` instance, e.g.,
 * `result.capacity`.
 *
 * - `capacity` - Work capacity affected by heat.
 */
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

  return buildOutputs(WORK_CAPACITY_DUNNE_INFO, { capacity }, []);
}
