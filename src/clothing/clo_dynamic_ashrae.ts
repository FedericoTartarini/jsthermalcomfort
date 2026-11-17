import { Standard } from "../utilities/options.ts";
import { notOfType } from "../_internal/errors.ts";
import { round } from "../_internal/round.ts";

/**
 * Estimates the dynamic intrinsic clothing insulation (I_cl,r), which ASHRAE
 * 55:2023 refers to as I_cl,active. The activity as well as the air speed
 * modify the insulation characteristics of the clothing. Consequently, the
 * ASHRAE 55 standard provides a correction factor for the clothing insulation
 * (I_cl) based on the metabolic rate: above 1.2 met,
 * clo = I_cl × (0.6 + 0.4 / met).
 *
 * This is the correction ASHRAE 55 applies, so its result is the `clo` that
 * {@link models!pmv_ppd_ashrae} and the other ASHRAE 55 models take.
 * For ISO 7730 use {@link clo_dynamic_iso}. Same name,
 * parameters and values as pythermalcomfort's `clothing.clo_dynamic_ashrae`.
 *
 * @param {number} clo - clothing insulation, [clo]. This is the basic insulation (I_cl), also known
 * as the intrinsic clothing insulation value under reference conditions
 * @param {number} met - metabolic rate, [met]
 * @param {"55-2023"} [standard="55-2023"] - version of the ASHRAE 55 Standard to use. Currently, the only
 * option available is "55-2023"; any other value throws
 * @returns {number} dynamic clothing insulation (I_cl,r), [clo]
 *
 * @example
 * import { clo_dynamic_ashrae } from "jsthermalcomfort";
 * console.log(clo_dynamic_ashrae(1, 2)); // 0.8
 */
export function clo_dynamic_ashrae(
  clo: number,
  met: number,
  // Upstream's `model`; this library names the option `standard` (ADR 0003).
  standard: typeof Standard.ashrae_55_2023 = Standard.ashrae_55_2023,
): number {
  for (const [key, value] of Object.entries({ clo, met })) {
    if (typeof (value as unknown) !== "number")
      throw notOfType(key, "a number");
  }
  if (typeof (standard as unknown) !== "string") {
    throw notOfType("standard", "a string");
  }
  if (standard.toLowerCase() !== Standard.ashrae_55_2023)
    throw new RangeError(
      `Dynamic clothing insulation calculations can only be performed in compliance with ASHRAE ${Standard.ashrae_55_2023}`,
    );

  return met > 1.2 ? round(clo * (0.6 + 0.4 / met), 3) : clo;
}
