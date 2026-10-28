import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
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
    humidex: { kind: "numeric", unit: "°C" },
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

  return Object.freeze({
    humidex: hi,
    discomfort: stress_category,
    warnings: Object.freeze([]),
  });
}
