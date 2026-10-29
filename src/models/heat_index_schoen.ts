import type { HI } from "./heat_index_rothfusz.ts";
import { parseInputs } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import type { InputsOf, ModelInfo } from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import {
  _mapping,
  HEAT_INDEX_STRESS_CATEGORIES,
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
    hi: { kind: "numeric", unit: "°C" },
    stress_category: {
      kind: "label",
      masked: true,
      unit: null,
      classifier: {
        edges: [27.0, ...HEAT_INDEX_STRESS_CATEGORIES.edges],
        labels: ["no risk", ...HEAT_INDEX_STRESS_CATEGORIES.labels],
        right: true,
      },
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type HISchoenInputs = InputsOf<typeof HEAT_INDEX_SCHOEN_INFO>;

export function heat_index_schoen(inputs: HISchoenInputs): HI {
  // Validate inputs using the HeatIndexInputs class
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

  return Object.freeze({
    hi,
    stress_category,
    warnings: Object.freeze([]),
  });
}

function _schoen_heat_index_optimized(tdb: number, t_dew: number): number {
  return (
    tdb -
    1.0799 * Math.exp(0.03755 * tdb) * (1 - Math.exp(0.0801 * (t_dew - 14)))
  );
}
