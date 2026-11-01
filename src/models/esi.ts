import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

export const ESI_INFO = deepFreeze({
  name: "esi",
  label: "Environmental Stress Index (ESI)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    sol_radiation_global: { kind: "numeric", unit: "W/m²" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    esi: { kind: "numeric", unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type ESIInputs = InputsOf<typeof ESI_INFO>;

/**
 * Dataclass to represent the Environmental Stress Index (ESI).
 *
 * @interface
 */
export type ESI = OutputsOf<typeof ESI_INFO>;

export function esi(inputs: ESIInputs): ESI {
  const { tdb, rh, sol_radiation_global, round_output } = parseInputs(
    ESI_INFO,
    inputs,
  );

  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity must be between 0 and 100 %");
  }

  if (sol_radiation_global < 0) {
    throw new RangeError(
      "Solar radiation must be greater than or equal to 0 W/m2",
    );
  }

  let _esi =
    0.63 * tdb -
    0.03 * rh +
    0.002 * sol_radiation_global +
    0.0054 * (tdb * rh) -
    0.073 * (1 / (0.1 + sol_radiation_global));

  if (round_output) {
    _esi = round(_esi, 1);
  }

  return Object.freeze({ esi: _esi, warnings: Object.freeze([]) });
}
