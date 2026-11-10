import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
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

/**
 * Calculate the Wet Bulb Globe Temperature (WBGT) index in compliance with the ISO
 * 7243 Standard [7243ISO2017](../../docs/references.md#7243iso2017).
 *
 * The WBGT is a heat stress index that
 * measures the thermal environment to which a person is exposed. In most
 * situations, this index is simple to calculate. It should be used as a
 * screening tool to determine whether heat stress is present. The PHS model
 * allows a more accurate estimation of stress. PHS can be calculated using
 * the function {@link phs}.
 *
 * The WBGT determines the impact of heat on a person throughout the course of a working
 * day (up to 8 hours). It does not apply to very brief heat exposures. It pertains to
 * the evaluation of male and female people who are fit for work in both indoor and
 * outdoor occupational environments, as well as other sorts of surroundings [7243ISO2017](../../docs/references.md#7243iso2017).
 *
 * The WBGT is defined as a function of only twb and tg if the person is not exposed to
 * direct radiant heat from the sun. When a person is exposed to direct radiant heat,
 * tdb must also be specified.
 *
 * @param inputs
 * @param inputs.twb - Natural (no forced air flow) wet bulb temperature, [°C].
 * @param inputs.tg - Globe temperature, [°C].
 * @param inputs.tdb - Dry bulb air temperature, [°C]. This value is needed as input if the person is
 * exposed to direct solar radiation.
 * @param inputs.with_solar_load - True if the globe sensor is exposed to direct solar radiation. Defaults to False.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Wet Bulb Globe Temperature Index. See
 * {@link WBGT} for more details. To access the
 * `wbgt` value, use the `wbgt` attribute of the returned `WBGT` instance, e.g.,
 * `result.wbgt`.
 *
 * - `wbgt` - Wet Bulb Globe Temperature Index.
 *
 * @example
 * ```ts
 * import { wbgt } from "jsthermalcomfort/models";
 *
 * let result = wbgt({ twb: 25, tg: 32 });
 * console.log(result.wbgt); // 27.1
 *
 * result = wbgt({ twb: 25, tg: 32, tdb: 20, with_solar_load: true });
 * console.log(result.wbgt); // 25.9
 * ```
 */
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

  return buildOutputs(WBGT_INFO, { wbgt: t_wbg }, []);
}
