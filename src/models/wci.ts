import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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
    wci: { kind: "numeric", nullable: true, unit: "W/m²" },
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

/**
 * Calculate the Wind Chill Index (WCI) in accordance with the ASHRAE 2017 Handbook Fundamentals - Chapter 9 [ashrae2017](../../docs/references.md#ashrae2017).
 *
 * The wind chill index (WCI) is an empirical index based on cooling measurements
 * taken on a cylindrical flask partially filled with water in Antarctica
 * (Siple and Passel 1945). For a surface temperature of 33°C, the index describes
 * the rate of heat loss from the cylinder via radiation and convection as a function
 * of ambient temperature and wind velocity.
 *
 * This formulation has been met with some valid criticism. WCI is unlikely to be an
 * accurate measure of heat loss from exposed flesh, which differs from plastic in terms
 * of curvature, roughness, and radiation exchange qualities, and is always below 33°C
 * in a cold environment. Furthermore, the equation's values peak at 90 km/h and then
 * decline as velocity increases. Nonetheless, this score reliably represents the
 * combined effects of temperature and wind on subjective discomfort for velocities
 * below 80 km/h [ashrae2017](../../docs/references.md#ashrae2017).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.v - Wind speed 10m above ground level, [m/s].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Wind Chill Index. See {@link WCI} for more details.
 * To access the `wci` value, use the `wci` attribute of the returned `WCI` instance, e.g., `result.wci`.
 *
 * - `wci` - Wind Chill Index, [W/m^2].
 *
 * @example
 * ```ts
 * import { wci } from "jsthermalcomfort/models";
 *
 * const result = wci({ tdb: -5, v: 5.5 });
 * console.log(result.wci); // 1255.2
 *
 * const results = [
 *   { tdb: -5, v: 5.5 },
 *   { tdb: -10, v: 10 },
 * ].map((inputs) => wci({ ...inputs, round_output: true }));
 * console.log(results.map((r) => r.wci)); // [1255.2, 1603.9]
 * ```
 */
export function wci(inputs: WCIInputs): WCI {
  // Validate inputs using the WCIInputs class
  const { tdb, v, round_output } = parseInputs(WCI_INFO, inputs);

  let _wci = (10.45 + 10 * v ** 0.5 - v) * (33 - tdb);

  // the factor 1.163 is used to convert to W/m^2
  _wci = _wci * 1.163;

  if (round_output) {
    _wci = round(_wci, 1);
  }

  return buildOutputs(WCI_INFO, { wci: _wci }, []);
}
