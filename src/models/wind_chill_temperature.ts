import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";

/** Describes the standards, inputs and outputs of {@link wind_chill_temperature}. */
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

/**
 * @interface
 * @hidden
 */
export type WCTInputs = InputsOf<typeof WIND_CHILL_TEMPERATURE_INFO>;

/**
 * Object to represent the Wind Chill Temperature (WCT).
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
 * The formula is the one the US National Weather Service and Environment Canada adopted for the winter
 * of 2001-2002 ([JAG/TI](https://web.archive.org/web/20090816055959id_/http://www.ofcm.gov/jagti/r19-ti-plan/pdf/entire_r19_ti.pdf)).
 * The WCT is how cold people feel when outside, based on the rate of heat loss from exposed skin caused
 * by wind and cold. It is defined only for air temperatures at or below 10 °C (50 °F) and wind speeds
 * above 4.8 km/h (3 mph) ([NWS](https://www.weather.gov/safety/cold-wind-chill-chart)); the function
 * checks neither limit and returns a value outside them as well.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.v - Wind speed 10m above ground level, [km/h].
 * @param inputs.round_output - If true, rounds output value. If false, it does not round it. Defaults to true.
 *
 * @returns An object containing the Wind Chill Temperature. See {@link WCT} for more details.
 * To access the `wct` value, use the `wct` property of the returned `WCT` object, e.g., `result.wct`.
 *
 * - `wct` - Wind Chill Temperature, [°C].
 * - `warnings` - Added: the call's {@link ModelWarning} rows, in the order of its checks.
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
