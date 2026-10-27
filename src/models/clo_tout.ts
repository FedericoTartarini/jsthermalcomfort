import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import type { InputsOf } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelDocs.ts";
import type {
  ModelInfo,
  ModelResult,
  OutputsOf,
} from "../_internal/modelDocs.ts";
import { round } from "../_internal/round.ts";
import { Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

export const CLO_TOUT_INFO = deepFreeze({
  name: "clo_tout",
  label: "Clothing prediction",
  inputs: {
    tout: { kind: "numeric", unit: "°C" },
    units: BASE_INPUTS_UNITS,
  },
  outputs: {
    /** Representative clothing insulation Icl. */
    clo_tout: { kind: "numeric", unit: "clo" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type CloTOutInputs = InputsOf<typeof CLO_TOUT_INFO.inputs>;

/**
 * Dataclass to represent the clothing insulation Icl as a function of outdoor air
 * temperature.
 *
 * @interface
 */
export type CloTOut = ModelResult & OutputsOf<typeof CLO_TOUT_INFO.outputs>;

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
 * @throws `TypeError` If `tout` is not a number, or `units` is not a string.
 * @throws `RangeError` If an invalid unit is provided.
 *
 * @remarks
 * > [!NOTE]
 * > The ASHRAE 55 2020 states that it is acceptable to determine the clothing
 * > insulation Icl using this equation in mechanically conditioned buildings [55ASHRAE2023](../../docs/references.md#55ashrae2023).
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

  return Object.freeze({
    clo_tout: round(clo, 2),
    warnings: Object.freeze([]),
  });
}
