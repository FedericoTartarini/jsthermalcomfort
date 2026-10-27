import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { inputsInfo, parseParams } from "../_internal/define.ts";
import type { Definition, ParamsOf } from "../_internal/define.ts";
import { deepFreeze } from "../_internal/modelDocs.ts";
import type { ModelInfo, ModelWarning } from "../_internal/modelDocs.ts";
import { round } from "../_internal/round.ts";
import { _mapping, _valid_range } from "../_internal/validation.ts";

/** The applicability limit, upstream's `(27.0, np.inf)`. */
const HEAT_INDEX_ROTHFUSZ_LIMITS = deepFreeze({ tdb: { min: 27.0 } });

/**
 * The stress categories of the heat index, right-inclusive: upstream's
 * `{27.0: "no risk", **HEAT_INDEX_STRESS_CATEGORIES}`
 * (`models/heat_index_rothfusz.py:83`, `_internal/validation.py:172`). An hi
 * above 1000 is unmapped, NaN.
 */
export const HEAT_INDEX_STRESS_CATEGORY_BINS: Readonly<ClassifierBins> =
  deepFreeze({
    edges: [27.0, 32.0, 41.0, 54.0, 1000.0],
    labels: [
      "no risk",
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ],
    right: true,
  });

// Each comment is upstream's Parameters entry, its prose type dropped
// (deviation heat_index_rothfusz-6).
const HEAT_INDEX_ROTHFUSZ_PARAMS = {
  /** Dry bulb air temperature, [°C]. */
  tdb: {
    kind: "numeric",
    unit: "°C",
    applicability: HEAT_INDEX_ROTHFUSZ_LIMITS.tdb,
  },
  /** Relative humidity, [%]. */
  rh: { kind: "numeric", unit: "%" },
  /**
   * If True, rounds output value. If False, it does not round it. Defaults to True.
   * Stress categories are always determined from the unrounded heat index.
   */
  round_output: { kind: "bool", default: true },
  /**
   * If True, limits the inputs to the standard applicability limits. Defaults to True.
   *
   * Note: By default, if the inputs are outside the standard applicability limits the
   * function returns NaN. If False returns heat index
   * values even if input values are outside the applicability limits of the model.
   *
   * The applicability limit is tdb \>= 27°C.
   */
  limit_inputs: { kind: "bool", default: true },
} as const satisfies Definition;

// deviation heat_index_rothfusz-1
/**
 * The params of {@link heat_index_rothfusz}: upstream's `HIInputs`, as its
 * keyword arguments.
 *
 * @interface
 */
export type HIInputs = ParamsOf<typeof HEAT_INDEX_ROTHFUSZ_PARAMS>;

// Upstream's HI (classes_return.py:298), kept in the model file (deviation
// heat_index_rothfusz-1).
/** Dataclass to represent the Heat Index (HI). */
export interface HI {
  // Upstream adds "or [°F] depending on the units", which no model returning
  // HI has (deviation heat_index_rothfusz-7).
  /** Heat Index, [°C]. */
  readonly hi: number;
  readonly stress_category: string | number;
}

// deviation heat_index_rothfusz-3
/**
 * What {@link heat_index_rothfusz} returns: upstream's {@link HI}, plus the
 * range rows of the call.
 */
export interface HeatIndexRothfuszResult extends HI {
  /** Added: the bounds the call broke, whatever `limit_inputs` is. */
  readonly warnings: readonly ModelWarning[];
}

// deviation heat_index_rothfusz-2
/** Model info for {@link heat_index_rothfusz}. */
export const HEAT_INDEX_ROTHFUSZ_INFO: ModelInfo = deepFreeze({
  name: "heat_index_rothfusz",
  label: "Heat Index (Rothfusz)",
  standards: [],
  inputs: inputsInfo(HEAT_INDEX_ROTHFUSZ_PARAMS),
  outputs: {
    hi: { unit: "°C" },
    stress_category: {
      unit: null,
      classifier: HEAT_INDEX_STRESS_CATEGORY_BINS,
    },
  },
});

// The example is a TypeScript call with upstream's inputs and outputs
// (deviation heat_index_rothfusz-5).
/**
 * Calculate the Heat Index (HI) in accordance with the Rothfusz (1990) model
 * [Rothfusz1990](../../docs/references.md).
 *
 * @param params - The model's parameters, upstream's keyword arguments.
 * @returns A dataclass containing the Heat Index. See {@link HI} for more
 * details. To access the `hi` value, use the `hi` attribute of the returned
 * `HI` instance, e.g., `result.hi`.
 *
 * @example
 * ```ts
 * import { heat_index_rothfusz } from "jsthermalcomfort/models";
 *
 * const result = heat_index_rothfusz({ tdb: 29, rh: 50 });
 * console.log(result.hi); // 29.7
 * console.log(result.stress_category); // "caution"
 * ```
 */
export function heat_index_rothfusz(params: HIInputs): HeatIndexRothfuszResult {
  const { tdb, rh, round_output, limit_inputs } = parseParams(
    "heat_index_rothfusz",
    HEAT_INDEX_ROTHFUSZ_PARAMS,
    params,
  );

  const hi = _rothfusz_heat_index_optimized(tdb, rh);

  // heat index should only be calculated for temperatures above 27 °C
  // Upstream checks only under limit_inputs; the row is made on every call
  // (deviation heat_index_rothfusz-4).
  const warnings: ModelWarning[] = [];
  const tdb_valid = _valid_range(
    tdb,
    HEAT_INDEX_ROTHFUSZ_LIMITS.tdb,
    "tdb",
    "input",
    HEAT_INDEX_ROTHFUSZ_PARAMS.tdb.unit,
    warnings,
  );
  let hi_valid = limit_inputs && Number.isNaN(tdb_valid) ? NaN : hi;

  const stress_category = _mapping(hi_valid, HEAT_INDEX_STRESS_CATEGORY_BINS);

  if (round_output) {
    hi_valid = round(hi_valid, 1);
  }

  return Object.freeze({
    hi: hi_valid,
    stress_category,
    warnings: Object.freeze(warnings),
  });
}

function _rothfusz_heat_index_optimized(tdb: number, rh: number): number {
  // Upstream's tdb**2 and rh**2 run under numba, which lowers a constant
  // integer power to multiplications (numba/cpython/numbers.py:281-288,
  // static_power_impl, numba 0.68.0), so x**2 is x * x (ADR 0009). It equals
  // Math.pow(x, 2) on 2,000,000 random doubles (node v26.8.2), and the unrounded hi equals
  // upstream's bit for bit on the 409 such cases of the parity data.
  return (
    -8.784695 +
    1.61139411 * tdb +
    2.338549 * rh -
    0.14611605 * tdb * rh -
    1.2308094e-2 * (tdb * tdb) -
    1.6424828e-2 * (rh * rh) +
    2.211732e-3 * (tdb * tdb) * rh +
    7.2546e-4 * tdb * (rh * rh) -
    3.582e-6 * (tdb * tdb) * (rh * rh)
  );
}
