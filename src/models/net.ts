import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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
    net: { kind: "numeric", nullable: true, unit: "°C" },
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

/**
 * Calculate the Normal Effective Temperature (NET). Missenard (1933)
 * devised a formula for calculating effective temperature. The index
 * establishes a link between the same condition of the organism's
 * thermoregulatory capability (warm and cold perception) and the surrounding
 * environment's temperature and humidity. The index is calculated as a
 * function of three meteorological factors: air temperature, relative
 * humidity of air, and wind speed. This index allows to calculate the
 * effective temperature felt by a person. Missenard original equation was
 * then used to calculate the Normal Effective Temperature (NET), by
 * considering normal atmospheric pressure and a normal human body temperature
 * (37°C). The NET is still in use in Germany, where medical check-ups for
 * subjects working in the heat are decided on by prevailing levels of ET,
 * depending on metabolic rates. The NET is also constantly monitored by the
 * Hong Kong Observatory [Blazejczyk2012](../../docs/references.md#blazejczyk2012). In central Europe the following thresholds are
 * in use: <1°C = very cold; 1-9 = cold; 9-17 = cool; 17-21 = fresh; 21-23 = comfortable;
 * 23-27 = warm; >27°C = hot [Blazejczyk2012](../../docs/references.md#blazejczyk2012).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.v - Wind speed [m/s] at 1.2 m above the ground.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Normal Effective Temperature. See {@link NET} for more details.
 * To access the `net` value, use the `net` attribute of the returned `NET` instance, e.g., `result.net`.
 *
 * - `net` - Normal Effective Temperature, [°C].
 *
 * @example
 * ```ts
 * import { net } from "jsthermalcomfort/models";
 *
 * const result = net({ tdb: 37, rh: 100, v: 0.1 });
 * console.log(result.net); // 37
 *
 * const results = [
 *   { tdb: 37, rh: 100, v: 0.1 },
 *   { tdb: 30, rh: 60, v: 0.5 },
 * ].map((inputs) => net({ ...inputs, round_output: false }));
 * console.log(results.map((r) => r.net)); // [37, 26.389775345409905]
 * ```
 */
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

  return buildOutputs(NET_INFO, { net: et }, []);
}
