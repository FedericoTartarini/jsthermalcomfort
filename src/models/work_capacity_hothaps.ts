import {
  BASE_INPUTS_WORK_INTENSITY,
  parseInputs,
} from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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
    capacity: { kind: "numeric", nullable: true, unit: "%" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type WorkCapacityHothapsInputs = InputsOf<
  typeof WORK_CAPACITY_HOTHAPS_INFO
>;

/**
 * Estimate work capacity due to heat, based on [Kjellstrom2018](../../docs/references.md#kjellstrom2018).
 *
 * Estimates the amount of work that will be done at a given WBGT and
 * intensity of work as a percent. 100% means work is unaffected by heat. 0%
 * means no work is done. Note that in this version the functions do not reach
 * 0% as it is assumed that it is always possible to work in short bursts for
 * 10% of the time.
 *
 * Note that for this function "the empirical evidence is from studies in
 * highly distinct locations, including a gold mine (Wyndham, 1969), 124 rice
 * harvesters in West Bengal in India (Sahu et al., 2013), and six women
 * observed in a climatic chamber (Nag and Nag, 1992)."
 * (https://adaptecca.es/sites/default/files/documentos/2018_jrc_pesetaiii_impact_labour_productivity.pdf).
 * The shape of the function is just an assumption, and the fit of the
 * sigmoid to the data it is analysing is not especially good.
 *
 * Heavy intensity work is sometimes labelled as 400 W, moderate 300 W, light 200
 * W, but this is only nominal.
 *
 * The correction citation is: Bröde P, Fiala D, Lemke B, Kjellstrom T.
 * Estimated work ability in warm outdoor environments depends on the chosen
 * heat stress assessment metric. International Journal of Biometeorology.
 * 2018 Mar;62(3):331-45.
 *
 *
 * The relevant definitions of the functions can be found most clearly in:
 * Orlov A, Sillmann J, Aunan K, Kjellstrom T, Aaheim A. Economic costs of
 * heat-induced reductions in worker productivity due to global warming. Global
 * Environmental Change [Internet]. 2020 Jul;63. Available from:
 * https://doi.org/10.1016/j.gloenvcha.2020.102087
 *
 * For a comparison of different functions see Fig 1 of Day E, Fankhauser S, Kingsmill
 * N, Costa H, Mavrogianni A. Upholding labour productivity under climate
 * change: an assessment of adaptation options. Climate Policy. 2019
 * Mar;19(3):367-85.
 *
 * @param inputs
 * @param inputs.wbgt - Wet bulb globe temperature, [°C].
 * @param inputs.work_intensity - Which work intensity to use for the calculation, choice of "heavy",
 * "moderate" or "light".
 *
 * @returns A dataclass containing the work capacity. See
 * {@link WorkCapacity} for more details. To access the
 * `capacity` value, use the `capacity` attribute of the returned `WorkCapacity` instance, e.g.,
 * `result.capacity`.
 *
 * - `capacity` - Work capacity affected by heat.
 */
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

  return buildOutputs(WORK_CAPACITY_HOTHAPS_INFO, { capacity }, []);
}
