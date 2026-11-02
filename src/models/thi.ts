import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
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
    thi: { kind: "numeric", unit: null },
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

  return Object.freeze({ thi: _thi, warnings: Object.freeze([]) });
}
