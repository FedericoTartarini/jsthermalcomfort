import { round, validateInputs } from "../utilities/utilities.js";
import { classifyFromBins } from "./classifierBins.js";

/**
 * @typedef {object} HeatIndexResult
 * @property {number} hi - Heat Index, default in [°C] in [°F] if `units` = 'IP'.
 * @property {string|number} stress_category - Thermal stress category, or NaN if hi is NaN. Classified from the unrounded SI value (see note below).
 * @public
 */
/**
 * Calculates the Heat Index (HI) using the Rothfusz regression. It combines air temperature and relative humidity to determine an apparent temperature.
 * The HI equation {@link #ref_12|[12]} is derived by multiple regression analysis in temperature and relative humidity from the first version
 * of Steadman’s (1979) apparent temperature (AT) {@link #ref_13|[13]}.
 *
 * The Rothfusz regression is only valid above 27 °C (80.6 °F). Under the
 * default `limit_inputs=true` the function returns `{ hi: NaN, stress_category: NaN }` when `tdb`
 * is below this threshold; pass `limit_inputs=false` to compute regardless.
 * Matches pythermalcomfort 3.9.3 `heat_index_rothfusz`.
 *
 * **Note on stress_category classification:** The returned `stress_category` is determined from the
 * unrounded SI value of `hi`, then the `hi` value is rounded for return. This ensures rounding does not
 * change the category, fixing pythermalcomfort#381. Once that issue is resolved upstream, this note
 * can be removed.
 *
 * @public
 * @memberof models
 * @docname Heat Index
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} rh Relative humidity, [%].
 * @param {Object} [options] (Optional) Other parameters.
 * @param {boolean} [options.round=true] - If True rounds output value, if False it does not round it.
 * @param {"SI" | "IP"} [options.units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [options.limit_inputs=true] - If True (default), `tdb` below the Rothfusz applicability threshold (27 °C / 80.6 °F) returns `NaN`. If False, the regression is evaluated regardless of input range.
 *
 * @returns {HeatIndexResult} set containing results for the model
 *
 * @example
 * const hi = heat_index_rothfusz(25, 50); // returns {hi: NaN, stress_category: NaN} (below 27 °C threshold)
 * const hi2 = heat_index_rothfusz(25, 50, { limit_inputs: false }); // returns {hi: 25.9, stress_category: "no risk"}
 * const hi3 = heat_index_rothfusz(30, 80); // returns {hi: 37.7, stress_category: "extreme caution"}
 *
 * @category Thermophysiological models
 */
const HEAT_INDEX_SCHEMA = {
  tdb: { type: "number" },
  rh: { type: "number" },
  round: { type: "boolean", required: false },
  units: { enum: ["SI", "IP"], required: false },
  limit_inputs: { type: "boolean", required: false },
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
export const HEAT_INDEX_STRESS_CATEGORY_BINS = {
  edges: [27, 32, 41, 54, 1000],
  labels: ["no risk", "caution", "extreme caution", "danger", "extreme danger"],
  right: true,
};

export function heat_index_rothfusz(
  tdb,
  rh,
  options = { round: true, units: "SI" },
) {
  if (options.units) options.units = options.units.toUpperCase();
  validateInputs(
    {
      tdb,
      rh,
      round: options.round,
      units: options.units,
      limit_inputs: options.limit_inputs,
    },
    HEAT_INDEX_SCHEMA,
  );

  const limit_inputs = options.limit_inputs ?? true;
  if (limit_inputs) {
    const threshold = options.units === "IP" ? 80.6 : 27;
    if (tdb < threshold) {
      return { hi: NaN, stress_category: NaN };
    }
  }

  let hi;
  let tdb_squared = Math.pow(tdb, 2);
  let rh_squared = Math.pow(rh, 2);

  if (options.units === undefined || options.units === "SI") {
    hi =
      -8.784695 +
      1.61139411 * tdb +
      2.338549 * rh -
      0.14611605 * tdb * rh -
      0.012308094 * tdb_squared -
      0.016424828 * rh_squared +
      0.002211732 * tdb_squared * rh +
      0.00072546 * tdb * rh_squared -
      0.000003582 * tdb_squared * rh_squared;
  } else {
    hi =
      -42.379 +
      2.04901523 * tdb +
      10.14333127 * rh -
      0.22475541 * tdb * rh -
      0.00683783 * tdb_squared -
      0.05481717 * rh_squared +
      0.00122874 * tdb_squared * rh +
      0.00085282 * tdb * rh_squared -
      0.00000199 * tdb_squared * rh_squared;
  }

  // Classify from unrounded SI value. In IP mode, convert hi to SI for classification,
  // but keep the returned hi in IP units.
  let hi_si_for_classification = hi;
  if (options.units === "IP") {
    hi_si_for_classification = ((hi - 32) * 5) / 9;
  }
  const stress_category = classifyFromBins(
    hi_si_for_classification,
    HEAT_INDEX_STRESS_CATEGORY_BINS,
  );

  hi = options.round === undefined || options.round ? round(hi, 1) : hi;

  return { hi: hi, stress_category };
}

/**
 * Backwards-compatible alias for {@link heat_index_rothfusz}.
 * This name is deprecated in favor of `heat_index_rothfusz` for consistency with pythermalcomfort,
 * but will continue to be supported indefinitely.
 *
 * @public
 * @memberof models
 * @deprecated Use {@link heat_index_rothfusz} instead. This alias will not be removed.
 *
 * @param {number} tdb Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} rh Relative humidity, [%].
 * @param {Object} [options] (Optional) Other parameters.
 * @param {boolean} [options.round=true] - If True rounds output value, if False it does not round it.
 * @param {"SI" | "IP"} [options.units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [options.limit_inputs=true] - If True (default), `tdb` below the Rothfusz applicability threshold (27 °C / 80.6 °F) returns `NaN`. If False, the regression is evaluated regardless of input range.
 *
 * @returns {HeatIndexResult} set containing results for the model
 *
 * @example
 * const hi = heat_index(25, 50); // returns {hi: NaN, stress_category: NaN} (below 27 °C threshold)
 * const hi2 = heat_index(25, 50, { limit_inputs: false }); // returns {hi: 25.9, stress_category: "no risk"}
 * const hi3 = heat_index(30, 80); // returns {hi: 37.7, stress_category: "extreme caution"}
 */
export const heat_index = heat_index_rothfusz;
