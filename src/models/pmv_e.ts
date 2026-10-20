import { round, validateInputs, Standard } from "../utilities/utilities.js";
import { pmv_ppd_iso } from "./pmv_ppd_iso.ts";
import { _check_params_object, _upper_units } from "../_internal/validation.ts";

// Renamed from EPmvResult to <Model>Result, the name every converted model's
// result has. A type alias, as the JSDoc typedef it replaces emitted, so the
// result stays assignable to Record<string, unknown>. The field and its text
// are upstream's EPMV (pythermalcomfort/classes_return.py:271-281 at v4.6.2).
/**
 * @typedef {Object} PmvEResult
 * @property {number} e_pmv - Adjusted Predicted Mean Votes with Expectancy Factor.
 * @public
 */
export type PmvEResult = {
  e_pmv: number;
};

/**
 * The params of `pmv_e`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface PmvEParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  e_coefficient: number;
  wme?: number;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
}

// A non-finite number throws a TypeError here (ADR 0001, reason three), where
// upstream returns NaN for a non-finite quantity, and inf or -inf for an
// infinite e_coefficient. A boolean quantity, which upstream reads as 0 or 1,
// and an array, which upstream broadcasts for every quantity but
// e_coefficient, throw a TypeError too: quantities are numbers (ADR 0005).
// Upstream raises a TypeError for a None quantity, as this does for null.
// Upstream's EPMVInputs checks the quantities and units
// (pmv_e.py:109-119 at v4.6.2); limit_inputs is checked by pmv_ppd_iso, which
// upstream gives it to (:121-133), and is validated here as it is there.
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

// ADR 0013. Upstream's docstring gives the ISO 7730 limits as strict
// ("10 < tdb [°C] < 30", pmv_e.py:75-77 at v4.6.2); pmv_ppd_iso's bounds are
// inclusive (pmv_ppd_iso.py:185-191; _valid_range, _internal/validation.py:47).
/**
 * Returns Adjusted Predicted Mean Votes with Expectancy Factor (ePMV). This index
 * was developed by Fanger, P. O. et al. (2002). In non-air- conditioned buildings in
 * warm climates, occupants may sense the warmth as being less severe than the PMV
 * predicts. The main reason is low expectations, but a metabolic rate that is
 * estimated too high can also contribute to explaining the difference. An extension of
 * the PMV model that includes an expectancy factor is introduced for use in non-air-
 * conditioned buildings in warm climates {@link #ref_26|[26]}.
 *
 * @public
 * @memberof models
 * @docname Adjusted Predicted Mean Votes with Expectancy Factor (ePMV)
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} params.tr - Mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'.
 * @param {number} params.vr - Relative air speed, default in [m/s] in [fps] if `units` = 'IP'.
 *
 *   Note: vr is the relative air speed caused by body movement and not the air
 *   speed measured by the air speed sensor. The relative air speed is the sum of the
 *   average air speed measured by the sensor plus the activity-generated air speed
 *   (Vag). Where Vag is the activity-generated air speed caused by motion of
 *   individual body parts. vr can be calculated using the function
 *   {@link #v_relative|v_relative}.
 * @param {number} params.rh - Relative humidity, [%].
 * @param {number} params.met - Metabolic rate, [met].
 * @param {number} params.clo - Clothing insulation, [clo].
 *
 *   Note: this is the basic insulation also known as the intrinsic clothing insulation value of the
 *   clothing ensemble (Icl,r), this is the thermal insulation from the skin
 *   surface to the outer clothing surface, including enclosed air layers, under actual
 *   environmental conditions. This value is not the total insulation (IT,r).
 *   The dynamic clothing insulation, clo, can be calculated using the function
 *   {@link #clo_dynamic_iso|clo_dynamic_iso}.
 * @param {number} params.e_coefficient - Expectancy factor.
 * @param {number} [params.wme=0] - External work, [met]. Defaults to 0.
 * @param {'SI'|'IP'} [params.units='SI'] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 *   Supported values are 'SI' and 'IP'. Defaults to 'SI'.
 * @param {boolean} [params.limit_inputs=true] - By default, if the inputs are outside the standard applicability limits the
 *   function returns nan. If False, returns pmv and ppd values even if input values are
 *   outside the applicability limits of the model. Defaults to True.
 *
 *   Note: The ISO 7730-2005 {@link #ref_2|[2]} and ISO 7730-2025 limits are 10 <= tdb [°C] <= 30, 10 <= tr [°C] <= 40,
 *   0 <= vr [m/s] <= 1, 0.8 <= met [met] <= 4, 0 <= clo [clo] <= 2, 0 <= pa [Pa] <= 2700, and -2 <= PMV <= 2.
 *
 * @returns {PmvEResult} the Adjusted Predicted Mean Votes with Expectancy Factor, in `e_pmv`.
 *
 * @example
 * const tdb = 28;
 * const tr = 28;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // calculate relative air speed
 * const v_r = v_relative(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic_iso(clo, met, v);
 * const results = pmv_e({ tdb, tr, vr: v_r, rh, met, clo: clo_d, e_coefficient: 0.6 });
 * console.log(results.e_pmv); // 0.48
 */
export function pmv_e(params: PmvEParams): PmvEResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as round_output, which the old e_pmv passed on to pmv
  // (ADR 0008).
  _check_params_object(params, "pmv_e", PMV_E_SCHEMA);
  const { tdb, tr, vr, rh, clo, e_coefficient } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const { wme = 0, units = "SI", limit_inputs = true } = params;
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met: params.met,
      clo,
      e_coefficient,
      wme,
      units: _upper_units(units),
      limit_inputs,
    },
    PMV_E_SCHEMA,
  );

  // Upstream calls pmv_ppd_iso under ISO 7730-2025 with units and
  // limit_inputs only (pmv_e.py:121-145), so its pmv is rounded to 2 decimal
  // places (round_output's default, pmv_ppd_iso.py:205-206) before met is
  // adjusted.
  const iso_pmv = (met: number) =>
    pmv_ppd_iso({
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      standard: Standard.iso_7730_2025,
      units,
      limit_inputs,
    }).pmv;

  let pmv = iso_pmv(params.met);
  // np.where(_pmv > 0, ...) (pmv_e.py:134): a NaN pmv leaves met as it is.
  const met = pmv > 0 ? params.met * (1 + pmv * -0.067) : params.met;
  pmv = iso_pmv(met);

  // np.around(_pmv * e_coefficient, 2) (pmv_e.py:147): round is half to even.
  return { e_pmv: round(pmv * e_coefficient, 2) };
}
