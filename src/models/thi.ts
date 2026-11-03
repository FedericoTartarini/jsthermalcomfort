import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

export const THI_INFO = deepFreeze({
  name: "thi",
  label: "Temperature-Humidity Index (THI)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    thi: { kind: "numeric", nullable: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type THIInputs = InputsOf<typeof THI_INFO>;

/**
 * Dataclass to represent the Temperature-Humidity Index (THI).
 *
 * @interface
 */
export type THI = OutputsOf<typeof THI_INFO>;

/**
 * Calculate the Temperature-Humidity Index (THI) defined in [Yan2025](../../docs/references.md#yan2025), equivalent
 * to the definition in [Schlatter1987](../../docs/references.md#schlatter1987), but uses Celsius instead of Fahrenheit.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Temperature-Humidity Index.
 * See {@link THI} for more details.
 * To access the `thi` value, use the `thi` attribute of the returned `THI`
 * instance, e.g., `result.thi`.
 *
 * - `thi` - Temperature-Humidity Index (THI).
 */
export function thi(inputs: THIInputs): THI {
  // Validate inputs using the THIInputs class
  const { tdb, rh, round_output } = parseInputs(THI_INFO, inputs);

  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity must be between 0 and 100 %");
  }

  let _thi = 1.8 * tdb + 32 - 0.55 * (1 - 0.01 * rh) * (1.8 * tdb - 26);

  if (round_output) {
    _thi = round(_thi, 1);
  }

  return buildOutputs(THI_INFO, { thi: _thi }, []);
}
