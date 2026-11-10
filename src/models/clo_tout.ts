import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Standard, Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

export const CLO_TOUT_INFO = deepFreeze({
  name: "clo_tout",
  label: "Clothing prediction",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tout: { kind: "numeric", unit: "°C" },
    units: BASE_INPUTS_UNITS,
  },
  outputs: {
    clo_tout: { kind: "numeric", unit: "clo" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type CloTOutInputs = InputsOf<typeof CLO_TOUT_INFO>;

/**
 * Dataclass to represent the clothing insulation Icl as a function of outdoor air
 * temperature.
 *
 * @interface
 */
export type CloTOut = OutputsOf<typeof CLO_TOUT_INFO>;

/**
 * Calculate representative clothing insulation Icl based on outdoor air temperature
 * at 06:00 a.m. [Schiavon2013](../../docs/references.md#schiavon2013).
 *
 * @param inputs
 * @param inputs.tout - Outdoor air temperature at 06:00 a.m., default in [°C] or [°F] if `units` = 'IP'.
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * Supported values are 'SI' and 'IP'. Defaults to 'SI'.
 *
 * @returns A dataclass containing the representative clothing insulation Icl. See {@link CloTOut} for more details.
 * To access the `clo_tout` value, use the `clo_tout` attribute of the returned `CloTOut` instance, e.g., `result.clo_tout`.
 *
 * - `clo_tout` - Representative clothing insulation Icl.
 *
 * @throws `TypeError` If `tout` is not a number, or `units` is not a string.
 * @throws `RangeError` If an invalid unit is provided.
 *
 * @remarks
 * > [!NOTE]
 * > ASHRAE 55 Section 5.2.2.2 (f) uses this relationship (its Figure 5-1) to determine
 * > the clothing insulation Icl of a representative occupant for a day as a function of
 * > the outdoor air temperature at 6 a.m. [55ASHRAE2023](../../docs/references.md#55ashrae2023).
 *
 * > [!NOTE]
 * > Limitations:
 * > - This equation may not be accurate for extreme temperature ranges.
 *
 * @example
 * ```ts
 * import { clo_tout } from "jsthermalcomfort/models";
 *
 * let result = clo_tout({ tout: 27 });
 * console.log(result.clo_tout); // 0.46
 *
 * const clo = [27, 25].map((tout) => clo_tout({ tout }).clo_tout);
 * console.log(clo); // [0.46, 0.47]
 * ```
 */
export function clo_tout(inputs: CloTOutInputs): CloTOut {
  // Validate inputs using the CloTOutInputs class
  let { tout, units } = parseInputs(CLO_TOUT_INFO, inputs);

  // Convert units if necessary
  if (units.toUpperCase() === Units.IP) {
    ({ tmp: tout } = units_converter(Units.IP, { tmp: tout }));
  }

  let clo = tout < 26 ? Math.pow(10, -0.1635 - 0.0066 * tout) : 0.46;
  clo = tout < 5 ? 0.818 - 0.0364 * tout : clo;
  clo = tout < -5 ? 1 : clo;

  return buildOutputs(CLO_TOUT_INFO, { clo_tout: round(clo, 2) }, []);
}
