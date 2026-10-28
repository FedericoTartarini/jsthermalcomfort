import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

export const WCI_INFO = deepFreeze({
  name: "wci",
  label: "Wind Chill Index",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "m/s" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    wci: { kind: "numeric", unit: "W/m²" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type WCIInputs = InputsOf<typeof WCI_INFO>;

/**
 * Dataclass to represent the Wind Chill Index (WCI).
 *
 * @interface
 */
export type WCI = OutputsOf<typeof WCI_INFO>;

export function wci(inputs: WCIInputs): WCI {
  // Validate inputs using the WCYInputs class
  const { tdb, v, round_output } = parseInputs(WCI_INFO, inputs);

  let _wci = (10.45 + 10 * v ** 0.5 - v) * (33 - tdb);

  // the factor 1.163 is used to convert to W/m^2
  _wci = _wci * 1.163;

  if (round_output) {
    _wci = round(_wci, 1);
  }

  return Object.freeze({ wci: _wci, warnings: Object.freeze([]) });
}
