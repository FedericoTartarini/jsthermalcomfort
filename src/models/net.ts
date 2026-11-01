import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

export const NET_INFO = deepFreeze({
  name: "net",
  label: "Normal Effective Temperature (NET)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    v: { kind: "numeric", unit: "m/s" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    net: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type NETInputs = InputsOf<typeof NET_INFO>;

/**
 * Dataclass to represent the Normal Effective Temperature (NET).
 *
 * @interface
 */
export type NET = OutputsOf<typeof NET_INFO>;

export function net(inputs: NETInputs): NET {
  // Validate inputs using the NETInputs class
  const { tdb, rh, v, round_output } = parseInputs(NET_INFO, inputs);

  const frac = 1.0 / (1.76 + 1.4 * v ** 0.75);
  let et =
    37 -
    (37 - tdb) / (0.68 - 0.0014 * rh + frac) -
    0.29 * tdb * (1 - 0.01 * rh);

  if (round_output) {
    et = round(et, 1);
  }

  return Object.freeze({ net: et, warnings: Object.freeze([]) });
}
