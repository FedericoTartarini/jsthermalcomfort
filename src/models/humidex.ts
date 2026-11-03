import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo, OutputsOf } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { dew_point_tmp } from "../psychrometrics/dew_point_tmp.ts";

export const HUMIDEX_INFO = deepFreeze({
  name: "humidex",
  label: "Humidex",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    model: {
      kind: "choice",
      allowed: ["rana", "masterson"],
      default: "rana",
      message: "Invalid model. The model must be either 'rana' or 'masterson'",
    },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    humidex: { kind: "numeric", nullable: true, unit: "°C" },
    discomfort: { kind: "label", unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type HumidexInputs = InputsOf<typeof HUMIDEX_INFO>;

/**
 * Dataclass to represent the Humidex and its discomfort category.
 *
 * @interface
 */
export type Humidex = OutputsOf<typeof HUMIDEX_INFO>;

/**
 * Calculate the humidex (short for "humidity index"). It has been developed by the
 * Canadian Meteorological service. It was introduced in 1965 and then it was revised
 * by Masterton and Richardson (1979) [Masterson1979](../../docs/references.md#masterson1979). It aims to describe how hot,
 * humid weather is felt by the average person. The Humidex differs from the heat index
 * in being related to the dew point rather than relative humidity [Havenith2016](../../docs/references.md#havenith2016).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.model - The model to be used for the calculation. Options are 'rana' and 'masterson'. Defaults to 'rana'.
 *
 * > [!NOTE]
 * > The 'rana' model is the Humidex model proposed by [Rana et al. (2013)](https://doi.org/10.1016/j.enbuild.2013.04.019).
 * > The 'masterson' model is the Humidex model proposed by Masterton and Richardson (1979) [Masterson1979](../../docs/references.md#masterson1979).
 *
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Humidex value and its discomfort category. See {@link Humidex} for more details.
 * To access the `humidex` and `discomfort` values, use the respective attributes of the returned `Humidex` instance, e.g., `result.humidex`.
 *
 * - `humidex` - Humidex value, [°C].
 * - `discomfort` - Degree of comfort or discomfort as defined in Havenith and Fiala (2016).
 *
 * @example
 * ```ts
 * import { humidex } from "jsthermalcomfort/models";
 *
 * const result = humidex({ tdb: 25, rh: 50 });
 * console.log(result.humidex); // 28.2
 * console.log(result.discomfort); // "Little or no discomfort"
 *
 * const results = [
 *   { tdb: 25, rh: 50 },
 *   { tdb: 30, rh: 60 },
 * ].map((inputs) => humidex({ ...inputs, round_output: false }));
 * console.log(results.map((r) => r.humidex)); // [28.227037412839586, 38.55535958479931]
 * console.log(results.map((r) => r.discomfort));
 * // ["Little or no discomfort", "Evident discomfort"]
 * ```
 */
export function humidex(inputs: HumidexInputs): Humidex {
  // Validate inputs using the HumidexInputs class
  const { tdb, rh, model, round_output } = parseInputs(HUMIDEX_INFO, inputs);

  if (rh > 100 || rh < 0) {
    throw new RangeError("Relative humidity must be between 0 and 100%");
  }

  if (!HUMIDEX_INFO.inputs.model.allowed.some((value) => value === model)) {
    throw new RangeError(HUMIDEX_INFO.inputs.model.message);
  }

  let hi =
    tdb +
    (5 / 9) * ((6.112 * 10 ** ((7.5 * tdb) / (237.7 + tdb)) * rh) / 100 - 10);
  if (model === "masterson") {
    hi =
      tdb +
      (5 / 9) *
        (6.11 *
          Math.exp(
            5417.753 * (1 / 273.15 - 1 / (dew_point_tmp(tdb, rh) + 273.15)),
          ) -
          10);
  }

  if (round_output) {
    hi = round(hi, 1);
  }

  let stress_category = "Heat stroke probable";
  if (hi <= 30) stress_category = "Little or no discomfort";
  if (hi > 30 && hi <= 35) stress_category = "Noticeable discomfort";
  if (hi > 35 && hi <= 40) stress_category = "Evident discomfort";
  if (hi > 40 && hi <= 45)
    stress_category = "Intense discomfort; avoid exertion";
  if (hi > 45 && hi <= 54) stress_category = "Dangerous discomfort";

  return buildOutputs(
    HUMIDEX_INFO,
    { humidex: hi, discomfort: stress_category },
    [],
  );
}
