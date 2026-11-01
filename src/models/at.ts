import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { psy_ta_rh } from "../psychrometrics/psy_ta_rh.ts";

export const AT_INFO = deepFreeze({
  name: "at",
  label: "Apparent Temperature",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    v: { kind: "numeric", unit: "m/s" },
    q: { kind: "numeric", unit: "W/m²", default: null },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    at: { kind: "numeric", unit: "°C" },
  },
} as const satisfies ModelInfo);

/** @interface */
export type ATInputs = InputsOf<typeof AT_INFO>;

/**
 * Dataclass to store the results of the Apparent Temperature (AT) calculation.
 *
 * @interface
 */
export type AT = OutputsOf<typeof AT_INFO>;

export function at(inputs: ATInputs): AT {
  // Validate inputs
  const { tdb, rh, v, q, round_output } = parseInputs(AT_INFO, inputs);

  // Calculate vapor pressure
  const p_vap = psy_ta_rh(tdb, rh).p_vap / 100;

  // Calculate apparent temperature
  let t_at: number;
  if (q !== null) {
    t_at = tdb + 0.348 * p_vap - 0.7 * v + (0.7 * q) / (v + 10) - 4.25;
  } else {
    t_at = tdb + 0.33 * p_vap - 0.7 * v - 4.0;
  }

  if (round_output) {
    t_at = round(t_at, 1);
  }

  return Object.freeze({ at: t_at, warnings: Object.freeze([]) });
}
