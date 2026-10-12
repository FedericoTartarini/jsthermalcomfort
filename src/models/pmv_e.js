import { validateInputs, Standard } from "../utilities/utilities.js";
import { pmv_ppd_iso } from "./pmv_ppd_iso.js";

/**
 * @typedef {Object} EPmvResult
 * @property {number} e_pmv - Adjusted PMV with expectancy factor, rounded to two
 *   decimal places, or NaN outside the ISO applicability limits.
 * @public
 */

/**
 * @typedef {Object} E_pmvKwargs
 * @property {'SI'|'IP'} [units='SI'] - Unit system. Case-insensitive.
 * @property {boolean} [limit_inputs=true] - Return NaN outside the ISO 7730
 *   applicability limits. Set false to calculate outside those limits.
 * @public
 */

const PMV_E_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  e_coefficient: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
};

/**
 * Round the final expectancy-adjusted PMV as NumPy around(value, 2) does.
 * Keep this local: changing the shared rounding helper affects other models.
 *
 * @param {number} value - Unrounded expectancy-adjusted PMV.
 * @returns {number} Two-decimal result using ties-to-even, preserving signed zero.
 */
function roundPmvE(value) {
  const scaled = value * 100;
  const lower = Math.floor(scaled);
  const rounded =
    scaled - lower === 0.5
      ? lower % 2 === 0
        ? lower
        : lower + 1
      : Math.round(scaled);
  return rounded === 0 ? Math.sign(value) * 0 : rounded / 100;
}

/**
 * Calculate Adjusted Predicted Mean Vote with Expectancy Factor (ePMV).
 * Fanger et al. (2002) extend PMV for non-air-conditioned buildings in warm
 * climates, where occupants' expectations can reduce perceived warmth
 * {@link #ref_26|[26]}.
 *
 * Follows pythermalcomfort's pmv_e: calculate ISO 7730:2025 PMV, reduce met by
 * met * PMV * 0.067 only when that PMV is positive, recalculate ISO PMV, then
 * multiply by e_coefficient and round to two decimals using ties-to-even.
 * Both intermediate ISO PMV calls use their default rounded output.
 *
 * Inputs are finite scalar numbers. Use Array.map() for batches; NumPy array
 * broadcasting is not part of this JavaScript API. Python's optional units and
 * limit_inputs arguments are supplied in the JavaScript kwargs object.
 * The shared ISO PMV solver is unchanged by this model alignment.
 *
 * @public
 * @memberof models
 * @docname Adjusted Predicted Mean Vote with Expectancy Factor (ePMV)
 * @param {number} tdb - Dry bulb air temperature [°C], or [°F] in IP units.
 * @param {number} tr - Mean radiant temperature [°C], or [°F] in IP units.
 * @param {number} vr - Relative air speed [m/s], or [fps] in IP units. This
 *   includes activity-generated air speed; it can be calculated with v_relative.
 * @param {number} rh - Relative humidity [%].
 * @param {number} met - Metabolic rate [met].
 * @param {number} clo - Intrinsic clothing insulation under actual conditions [clo].
 * @param {number} e_coefficient - Expectancy factor.
 * @param {number} [wme=0] - External work [met].
 * @param {E_pmvKwargs} [kwargs={}] - Optional units and applicability-limit settings.
 * @returns {EPmvResult} Object containing e_pmv, including NaN for an
 *   out-of-applicability result when limit_inputs is true.
 * @example
 * const result = pmv_e(24, 30, 0.22, 50, 1.4, 0.5, 0.6);
 * console.log(result.e_pmv); // 0.29
 * const batch = [24, 30].map((tdb) => pmv_e(tdb, 30, 0.22, 50, 1.4, 0.5, 0.6).e_pmv);
 * console.log(batch); // [0.29, 0.91]
 */
export function pmv_e(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  e_coefficient,
  wme = 0,
  kwargs = {},
) {
  if (kwargs === null || typeof kwargs !== "object" || Array.isArray(kwargs)) {
    throw new TypeError('Parameter "kwargs" must be an options object');
  }
  const { units = "SI", limit_inputs = true } = kwargs;
  if (typeof units !== "string") {
    throw new TypeError('Parameter "units" must be a string');
  }
  const options = { units: units.toUpperCase(), limit_inputs };
  validateInputs(
    { tdb, tr, vr, rh, met, clo, e_coefficient, wme, ...options },
    PMV_E_SCHEMA,
  );

  const initialPmv = pmv_ppd_iso(
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    Standard.iso_7730_2025,
    options,
  ).pmv;
  const adjustedMet = initialPmv > 0 ? met * (1 - 0.067 * initialPmv) : met;
  const adjustedPmv = pmv_ppd_iso(
    tdb,
    tr,
    vr,
    rh,
    adjustedMet,
    clo,
    wme,
    Standard.iso_7730_2025,
    options,
  ).pmv;

  return { e_pmv: roundPmvE(adjustedPmv * e_coefficient) };
}
