import type { HI } from "./heat_index_rothfusz.ts";
import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import {
  _mapping,
  HEAT_INDEX_RISK_CATEGORIES,
} from "../_internal/validation.ts";
import { psy_ta_rh } from "../psychrometrics/psy_ta_rh.ts";

export const HEAT_INDEX_SCHOEN_INFO = deepFreeze({
  name: "heat_index_schoen",
  label: "Heat Index (Schoen)",
  standards: [],
  inputs: {
    tdb: { kind: "numeric", unit: "°C" },
    rh: { kind: "numeric", unit: "%" },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    hi: { kind: "numeric", nullable: true, unit: "°C" },
    stress_category: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: HEAT_INDEX_RISK_CATEGORIES,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type HISchoenInputs = InputsOf<typeof HEAT_INDEX_SCHOEN_INFO>;

/**
 * Calculate the Temperature Humidity Index (THI), also known as Heat Index Schoen,
 * in accordance with the Schoen (2005) model [Schoen2005](../../docs/references.md#schoen2005).
 *
 * The temperature-humidity index (THI) is a simplified scale of apparent
 * temperature, considering only dry-bulb temperature and humidity. It is another
 * formulation of the heat index.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 * Stress categories are always determined from the unrounded heat index.
 *
 * @returns A dataclass containing the Heat Index. See {@link HI} for more details.
 * To access the `hi` value, use the `hi` attribute of the returned `HI` instance, e.g., `result.hi`.
 *
 * - `hi` - Heat Index, [°C].
 * - `stress_category`
 *
 * @example
 * ```ts
 * import { heat_index_schoen } from "jsthermalcomfort/models";
 *
 * const result = heat_index_schoen({ tdb: 29, rh: 50 });
 * console.log(result.hi); // 30
 * console.log(result.stress_category); // "caution"
 * ```
 */
export function heat_index_schoen(inputs: HISchoenInputs): HI {
  // Validate inputs using the HIInputs class
  const { tdb, rh, round_output } = parseInputs(HEAT_INDEX_SCHOEN_INFO, inputs);

  // Calculate dew point temperature
  const t_dew = psy_ta_rh(tdb, rh, 101325).dew_point_tmp;

  let hi = _schoen_heat_index_optimized(tdb, t_dew);

  const stress_category = _mapping(
    hi,
    HEAT_INDEX_SCHOEN_INFO.outputs.stress_category.classifier,
  );

  if (round_output) {
    hi = round(hi, 1);
  }

  return buildOutputs(
    HEAT_INDEX_SCHOEN_INFO,
    {
      hi,
      stress_category,
    },
    [],
  );
}

function _schoen_heat_index_optimized(tdb: number, t_dew: number): number {
  return (
    tdb -
    1.0799 * Math.exp(0.03755 * tdb) * (1 - Math.exp(0.0801 * (t_dew - 14)))
  );
}
