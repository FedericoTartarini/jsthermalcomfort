import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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

/**
 * Calculate the Environmental Stress Index (ESI) [Moran2001](../../docs/references.md#moran2001).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.sol_radiation_global - Global solar radiation, [W/m2].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Environmental Stress Index. See {@link ESI} for more details.
 * To access the `esi` value, use the `esi` attribute of the returned `ESI` instance, e.g., `result.esi`.
 *
 * - `esi` - Environmental Stress Index.
 *
 * @example
 * ```ts
 * import { esi } from "jsthermalcomfort/models";
 *
 * const result = esi({ tdb: 30.2, rh: 42.2, sol_radiation_global: 766 });
 * console.log(result.esi); // 26.2
 *
 * const results = [
 *   { tdb: 30.2, rh: 42.2, sol_radiation_global: 766 },
 *   { tdb: 27.0, rh: 68.8, sol_radiation_global: 289 },
 * ].map((inputs) => esi(inputs));
 * console.log(results.map((r) => r.esi)); // [26.2, 25.6]
 * ```
 */
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

  return buildOutputs(ESI_INFO, { esi: _esi }, []);
}
