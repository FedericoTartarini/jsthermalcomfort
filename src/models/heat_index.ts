import { round, validateInputs } from "../utilities/utilities.js";
import { classifyFromBins } from "./classifierBins.ts";
import { deepFreeze } from "./modelDocs.ts";
import type { ClassifierBins, ModelInfo } from "./modelDocs.ts";

// Renamed from HeatIndexResult to <Model>Result, the name every converted
// model's result has.
/**
 * @property {number} hi - Heat Index, [°C].
 * @property {string|number} stress_category - Thermal stress category, or NaN if hi is NaN. Classified from the unrounded value.
 * @public
 */
export interface HeatIndexRothfuszResult {
  hi: number;
  stress_category: string | number;
}

/**
 * The params of `heat_index_rothfusz`: upstream's keyword parameters,
 * quantities and switches alike, with upstream's defaults (ADR 0002).
 * Documented on the function's `params`.
 */
export interface HeatIndexRothfuszParams {
  tdb: number;
  rh: number;
  round_output?: boolean;
  limit_inputs?: boolean;
}
/**
 * Calculates the Heat Index (HI) using the Rothfusz regression. It combines air temperature and relative humidity to determine an apparent temperature.
 * The HI equation {@link #ref_12|[12]} is derived by multiple regression analysis in temperature and relative humidity from the first version
 * of Steadman’s (1979) apparent temperature (AT) {@link #ref_13|[13]}.
 *
 * The Rothfusz regression is only valid above 27 °C (80.6 °F). Under the
 * default `limit_inputs=true` the function returns `{ hi: NaN, stress_category: NaN }` when `tdb`
 * is below this threshold; pass `limit_inputs=false` to compute regardless.
 *
 * @public
 * @memberof models
 * @docname Heat Index
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, [°C].
 * @param {number} params.rh - Relative humidity, [%].
 * @param {boolean} [params.round_output=true] - If True rounds output value, if False it does not round it. Stress categories are always determined from the unrounded heat index.
 * @param {boolean} [params.limit_inputs=true] - If True (default), `tdb` below the Rothfusz applicability threshold (27 °C) returns `NaN`. If False, the regression is evaluated regardless of input range.
 *
 * @returns {HeatIndexRothfuszResult} set containing results for the model
 *
 * @example
 * const hi = heat_index_rothfusz({ tdb: 25, rh: 50 }); // returns {hi: NaN, stress_category: NaN} (below 27 °C threshold)
 * const hi2 = heat_index_rothfusz({ tdb: 25, rh: 50, limit_inputs: false }); // returns {hi: 25.9, stress_category: "no risk"}
 * const hi3 = heat_index_rothfusz({ tdb: 30, rh: 80 }); // returns {hi: 37.7, stress_category: "extreme caution"}
 *
 * @category Thermophysiological models
 */

/**
 * Applicability limits of the Rothfusz regression, in SI units.
 *
 * Same shape as `ISO_7730_LIMITS`, so both read the same way and both match
 * what #182 will generate from `limits.json`. Frozen, and referenced by
 * identity from `HEAT_INDEX_ROTHFUSZ_INFO` rather than copied into it.
 *
 * Exported so a test can assert that the metadata references this object
 * rather than a literal copy of it. It is deliberately NOT added to
 * `src/models/index.js`, so it does not become public API -- the consumer
 * path is `HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability`. Same
 * arrangement as `ISO_7730_LIMITS`.
 */
export const HEAT_INDEX_ROTHFUSZ_LIMITS = Object.freeze({
  tdb: Object.freeze({ min: 27 }),
});

// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const HEAT_INDEX_SCHEMA = {
  tdb: { type: "number" },
  rh: { type: "number" },
  round_output: { type: "boolean" },
  limit_inputs: { type: "boolean" },
};

/**
 * Stress category bins for heat index classification (right-inclusive).
 * Edges are [27, 32, 41, 54, 1000], giving categories:
 * - hi <= 27: "no risk"
 * - 27 < hi <= 32: "caution"
 * - 32 < hi <= 41: "extreme caution"
 * - 41 < hi <= 54: "danger"
 * - 54 < hi <= 1000: "extreme danger"
 * - hi > 1000: NaN
 */
export const HEAT_INDEX_STRESS_CATEGORY_BINS: Readonly<ClassifierBins> =
  Object.freeze({
    edges: [27, 32, 41, 54, 1000],
    labels: [
      "no risk",
      "caution",
      "extreme caution",
      "danger",
      "extreme danger",
    ],
    right: true,
  });

/**
 * Model metadata for Heat Index (Rothfusz regression).
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * @public
 */
export const HEAT_INDEX_ROTHFUSZ_INFO: ModelInfo = deepFreeze({
  label: "Heat Index (Rothfusz)",
  description: "Apparent temperature — how hot it feels at a given humidity.",
  standards: [],
  inputs: {
    tdb: { unit: "°C", applicability: HEAT_INDEX_ROTHFUSZ_LIMITS.tdb },
    rh: { unit: "%" },
  },
  outputs: {
    hi: { unit: "°C" },
    stress_category: {
      unit: null,
      classifier: HEAT_INDEX_STRESS_CATEGORY_BINS,
    },
  },
});

export function heat_index_rothfusz(
  params: HeatIndexRothfuszParams,
): HeatIndexRothfuszResult {
  // tdb and rh were positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  if (typeof params !== "object" || params === null) {
    throw new TypeError(
      `heat_index_rothfusz takes one params object, got ${String(params)}`,
    );
  }
  const { tdb, rh } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const { round_output = true, limit_inputs = true } = params;
  validateInputs({ tdb, rh, round_output, limit_inputs }, HEAT_INDEX_SCHEMA);

  // heat index should only be calculated for temperatures above 27 °C
  // Upstream also emits a UserWarning here. JavaScript has no warnings filter
  // (ADR 0001), and `warnings` rows stay PMV-only in v2, so the NaN comes alone.
  if (limit_inputs && tdb < HEAT_INDEX_ROTHFUSZ_LIMITS.tdb.min) {
    return { hi: NaN, stress_category: NaN };
  }

  const tdb_squared = Math.pow(tdb, 2);
  const rh_squared = Math.pow(rh, 2);
  const hi =
    -8.784695 +
    1.61139411 * tdb +
    2.338549 * rh -
    0.14611605 * tdb * rh -
    0.012308094 * tdb_squared -
    0.016424828 * rh_squared +
    0.002211732 * tdb_squared * rh +
    0.00072546 * tdb * rh_squared -
    0.000003582 * tdb_squared * rh_squared;

  // Classified before rounding, as upstream does, so rounding onto a bin edge
  // cannot drop the category.
  const stress_category = classifyFromBins(hi, HEAT_INDEX_STRESS_CATEGORY_BINS);

  return { hi: round_output ? round(hi, 1) : hi, stress_category };
}
