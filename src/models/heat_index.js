import { round, validateInputs } from "../utilities/utilities.js";
import { attachBins, classifyFromBins } from "./classifierBins.js";
import { attachModelDocs } from "./modelDocs.js";

/**
 * @typedef {object} HeatIndexResult
 * @property {number} hi - Heat Index, default in [°C] in [°F] if `units` = 'IP'.
 * @property {string|number} stress_category - Rothfusz stress category, or
 * NaN when `hi` is non-finite or above the last mapped bin (1000 °C).
 * @public
 */

/** @type {ClassifierBins} */
const HEAT_INDEX_BINS = {
  edges: [27, 32, 41, 54, 1000],
  labels: ["no risk", "caution", "extreme caution", "danger", "extreme danger"],
  right: true,
};

/**
 * Maps a Heat Index [°C] to the Rothfusz stress category.
 * Right-closed bins match pythermalcomfort `heat_index_rothfusz`
 * (`np.digitize(..., right=True)`): 27 no risk, 32 caution, 41 extreme
 * caution, 54 danger, 1000 extreme danger.
 *
 * @public
 * @param {number} value - Heat Index in SI [°C]
 * @returns {string|number} Category label, or NaN for non-finite / unmapped
 * @property {ClassifierBins} bins
 */
export function mapping(value) {
  return classifyFromBins(value, HEAT_INDEX_BINS);
}

/**
 * Calculates the Heat Index (HI). It combines air temperature and relative humidity to determine an apparent temperature.
 * The HI equation {@link #ref_12|[12]} is derived by multiple regression analysis in temperature and relative humidity from the first version
 * of Steadman’s (1979) apparent temperature (AT) {@link #ref_13|[13]}.
 *
 * The Rothfusz regression is only valid above 27 °C (80.6 °F). Under the
 * default `limit_inputs=true` the function returns `{ hi: NaN }` when `tdb`
 * is below this threshold; pass `limit_inputs=false` to compute regardless.
 * Matches pythermalcomfort 3.9.3 `heat_index_rothfusz`.
 *
 * @public
 * @memberof models
 * @docname Heat Index
 *
 * @property {string} label - Display name (`@docname`)
 * @property {string} description - Leading JSDoc summary
 * @property {ClassifierFn} mapping - Rothfusz stress-category classifier (`mapping.bins`)
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

export function heat_index(tdb, rh, options = { round: true, units: "SI" }) {
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

  hi = options.round === undefined || options.round ? round(hi, 1) : hi;

  const hiSi = options.units === "IP" ? ((hi - 32) * 5) / 9 : hi;
  return { hi: hi, stress_category: mapping(hiSi) };
}

attachModelDocs(
  heat_index,
  "Heat Index",
  "Calculates the Heat Index (HI). It combines air temperature and relative humidity to determine an apparent temperature. The HI equation is derived by multiple regression analysis in temperature and relative humidity from the first version of Steadman’s (1979) apparent temperature (AT).",
);
attachBins(mapping, HEAT_INDEX_BINS);
heat_index.mapping = mapping;
