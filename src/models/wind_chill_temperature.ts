import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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
    wct: { kind: "numeric", nullable: true, unit: "°C" },
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

/**
 * Calculate the Wind Chill Temperature ([WCT](https://en.wikipedia.org/wiki/Wind_chill#North_American_and_United_Kingdom_wind_chill_index)).
 *
 * We validated the implementation of this model by comparing the results with the Wind Chill
 * Temperature Calculator on [Calculator.net](https://www.calculator.net/wind-chill-calculator.html)
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.v - Wind speed 10m above ground level, [km/h].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Wind Chill Temperature. See {@link WCT} for more details.
 * To access the `wct` value, use the `wct` attribute of the returned `WCT` instance, e.g., `result.wct`.
 *
 * - `wct` - Wind Chill Temperature, [°C].
 *
 * @example
 * ```ts
 * import { wind_chill_temperature } from "jsthermalcomfort/models";
 *
 * const result = wind_chill_temperature({ tdb: -5, v: 5.5 });
 * console.log(result.wct); // -7.5
 *
 * const results = [
 *   { tdb: -5, v: 5.5 },
 *   { tdb: -10, v: 10 },
 * ].map((inputs) => wind_chill_temperature({ ...inputs, round_output: true }));
 * console.log(results.map((r) => r.wct)); // [-7.5, -15.3]
 * ```
 */
export function wind_chill_temperature(inputs: WCTInputs): WCT {
  // Validate inputs using the WCTInputs class
  const { tdb, v, round_output } = parseInputs(
    WIND_CHILL_TEMPERATURE_INFO,
    inputs,
  );

  let _wct =
    13.12 + 0.6215 * tdb - 11.37 * v ** 0.16 + 0.3965 * tdb * v ** 0.16;

  if (round_output) {
    _wct = round(_wct, 1);
  }

  return buildOutputs(WIND_CHILL_TEMPERATURE_INFO, { wct: _wct }, []);
}
