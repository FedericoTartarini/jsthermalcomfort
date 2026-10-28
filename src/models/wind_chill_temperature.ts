import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

export const WIND_CHILL_TEMPERATURE_INFO = deepFreeze({
  name: "wind_chill_temperature",
  label: "Wind Chill Temperature",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "km/h" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    wct: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type WCTInputs = InputsOf<typeof WIND_CHILL_TEMPERATURE_INFO>;

/**
 * Dataclass to represent the Wind Chill Temperature (WCT).
 *
 * @interface
 */
export type WCT = OutputsOf<typeof WIND_CHILL_TEMPERATURE_INFO>;

export function wind_chill_temperature(inputs: WCTInputs): WCT {
  // Validate inputs using the WCYInputs class
  const { tdb, v, round_output } = parseInputs(
    WIND_CHILL_TEMPERATURE_INFO,
    inputs,
  );

  let _wct =
    13.12 + 0.6215 * tdb - 11.37 * v ** 0.16 + 0.3965 * tdb * v ** 0.16;

  if (round_output) {
    _wct = round(_wct, 1);
  }

  return Object.freeze({ wct: _wct, warnings: Object.freeze([]) });
}
