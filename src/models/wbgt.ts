import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { Standard } from "../utilities/options.ts";

export const WBGT_INFO = deepFreeze({
  name: "wbgt",
  label: "Wet Bulb Globe Temperature (WBGT)",
  standards: [Standard.iso_7243_2017],
  inputs: {
    twb: { kind: "numeric", unit: "°C" },
    tg: { kind: "numeric", unit: "°C" },
    tdb: { kind: "numeric", unit: "°C", default: null },
    with_solar_load: { kind: "bool", default: false },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    wbgt: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type WBGTInputs = InputsOf<typeof WBGT_INFO>;

/**
 * Dataclass to represent the Wet Bulb Globe Temperature (WBGT) index.
 *
 * @interface
 */
export type WBGT = OutputsOf<typeof WBGT_INFO>;

export function wbgt(inputs: WBGTInputs): WBGT {
  // Validate inputs using the WBGTInputs class
  const { twb, tg, tdb, with_solar_load, round_output } = parseInputs(
    WBGT_INFO,
    inputs,
  );

  if (with_solar_load && tdb === null) {
    throw new TypeError("Please enter the dry bulb air temperature");
  }

  let t_wbg: number;
  // `tdb !== null` only narrows tdb's type: the call it excludes threw above.
  if (with_solar_load && tdb !== null) {
    t_wbg = 0.7 * twb + 0.2 * tg + 0.1 * tdb;
  } else {
    t_wbg = 0.7 * twb + 0.3 * tg;
  }

  if (round_output) {
    t_wbg = round(t_wbg, 1);
  }

  return Object.freeze({ wbgt: t_wbg, warnings: Object.freeze([]) });
}
