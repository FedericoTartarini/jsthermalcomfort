import { Standard } from "../utilities/options.ts";
import { notOfType } from "../_internal/errors.ts";
import { round } from "../_internal/round.ts";

/**
 * Estimates the dynamic intrinsic clothing insulation (I<sub>cl,r</sub>).
 *
 * The ASHRAE 55:2023 refers to it as (I<sub>cl,active</sub>). The activity as well as the air speed
 * modify the insulation characteristics of the clothing. Consequently, the ASHRAE 55
 * standard provides a correction factor for the clothing insulation (I<sub>cl</sub>)
 * based on the metabolic rate.
 *
 * The ASHRAE 55 Standard corrects for the effect of the body movement for met
 * higher than 1.2 met using the equation
 * clo = I<sub>cl</sub> × (0.6 + 0.4 / met).
 *
 * @param clo - clothing insulation, [clo]
 *
 * > [!NOTE]
 * > this is the basic insulation (I<sub>cl</sub>) also known as the intrinsic
 * > clothing insulation value under reference conditions
 * @param met - metabolic rate, [met]
 * @param standard - Select the version of the ASHRAE 55 Standard to use. Currently, the only
 * option available is "55-2023".
 * @returns dynamic clothing insulation (I<sub>cl,r</sub>), [clo]
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
