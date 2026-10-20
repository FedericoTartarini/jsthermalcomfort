import { validateInputs, round, Standard } from "../utilities/utilities.js";
import { pmv_ppd_iso } from "./pmv_ppd_iso.ts";
import { _check_params_object, _upper_units } from "../_internal/validation.ts";
import type { ApplicabilityWarning } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// APmvResult to <Model>Result, the name every converted model's result has;
// upstream's class is APMV (pythermalcomfort/classes_return.py:98 at v4.6.2).
/**
 * @typedef {object} PmvAResult
 * @property {number} a_pmv - Predicted Mean Vote
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type PmvAResult = {
  a_pmv: number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `pmv_a`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface PmvAParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  a_coefficient: number;
  wme?: number;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
}

// A non-finite number throws a TypeError here (ADR 0001, reason three), where
// upstream returns a result for each. At tdb 25, tr 25, vr 0.1, rh 50,
// met 1.2, clo 0.5 and a_coefficient 0.293 it returns NaN, except 0.0 and
// -0.0 for an a_coefficient of +inf and -inf, and 0.12 for a NaN or -inf vr
// with limit_inputs False. An infinite a_coefficient gives NaN where the
// rounded pmv is zero (tdb 24.46 with the other inputs as above), as inf
// times zero is NaN. A boolean for any numeric parameter, a quantity or
// a_coefficient, which upstream reads as 1 or 0 (a_coefficient True returns
// 0.07, False 0.08), throws a TypeError too (ADR 0005 as amended
// 2026-10-21). units is validated, as upstream gives it to APMVInputs
// (pmv_a.py:107-117 at v4.6.2). limit_inputs is declared and left to
// pmv_ppd_iso, which validates it as upstream's pmv_ppd_iso does: APMVInputs
// is not given it, PMVPPDInputs is (pmv_ppd_iso.py:143-153).
const PMV_A_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  a_coefficient: { type: "number" },
  wme: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: {},
};

// ADR 0013. Upstream's docstring gives the ISO 7730 limits as strict
// ("10 < tdb [°C] < 30", pythermalcomfort/models/pmv_a.py:63-65 at v4.6.2);
// pmv_ppd_iso's bounds are inclusive (_valid_range,
// _internal/validation.py:47). Its Returns section names the class
// AdaptivePMV (pmv_a.py:70-73), where the class is APMV
// (classes_return.py:98). Its example prints AdaptivePMV(a_pmv=0.74) and
// then 0.71 for one call (pmv_a.py:103-104); upstream returns 0.71.
/**
 * Returns Adaptive Predicted Mean Vote (aPMV) {@link #ref_25|[25]}.
 * This index was developed by Yao, R. et al. (2009). The model takes into account factors
 * such as culture, climate, social, psychological and behavioral adaptations, which have
 * an impact on the senses used to detect thermal comfort. This model uses an adaptive
 * coefficient (λ) representing the adaptive factors that affect the sense of thermal comfort.
 *
 * @public
 * @memberof models
 * @docname Adaptive Predicted Mean Vote (aPMV)
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param {number} params.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param {number} params.vr - Relative air speed, default in [m/s] or [fps] if `units` = 'IP'.
 *
 *   Note: vr is the sum of the average air speed measured by the sensor and the activity-generated
 *   air speed (Vag). Calculate vr using {@link #v_relative|v_relative}.
 * @param {number} params.rh - Relative humidity, [%].
 * @param {number} params.met - Metabolic rate, [met].
 * @param {number} params.clo - Clothing insulation, [clo].
 *
 *   Note: Correct for body movement effects using {@link #clo_dynamic_iso|clo_dynamic_iso}.
 * @param {number} params.a_coefficient - Adaptive coefficient.
 * @param {number} [params.wme=0] - External work, [met], default is 0.
 * @param {'SI'|'IP'} [params.units='SI'] - Units system, 'SI' or 'IP'. Defaults to 'SI'.
 * @param {boolean} [params.limit_inputs=true] - If True, returns nan for inputs outside standard limits. Defaults to True.
 *
 *   Note: ISO 7730 {@link #ref_2|[2]} {@link #ref_28|[28]} limits, inclusive: 10 <= tdb [°C] <= 30, 10 <= tr [°C] <= 40, 0 <= vr [m/s] <= 1,
 *   0.8 <= met [met] <= 4, 0 <= clo [clo] <= 2, 0 <= pa [Pa] <= 2700, -2 <= PMV <= 2.
 *
 * @returns {PmvAResult} the Predicted Mean Vote (a_pmv), and the applicability bounds the call broke.
 *
 * @example
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // Calculate relative air speed
 * const vr = v_relative(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic_iso(clo, met, v);
 * const results = pmv_a({ tdb: 28, tr: 28, vr, rh: 50, met, clo: clo_d, a_coefficient: 0.293 });
 * console.log(results.a_pmv); // 0.71
 */
export function pmv_a(params: PmvAParams): PmvAResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as round_output, which upstream's pmv_a does not take
  // (ADR 0008).
  _check_params_object(params, "pmv_a", PMV_A_SCHEMA);
  const { tdb, tr, vr, rh, met, clo, a_coefficient } = params;
  // Destructuring defaults also apply to a default passed as undefined.
  const { wme = 0, units = "SI", limit_inputs = true } = params;
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      a_coefficient,
      wme,
      units: _upper_units(units),
    },
    PMV_A_SCHEMA,
  );

  // As upstream (pmv_a.py:119-130): under ISO 7730-2025, with pmv_ppd_iso's
  // default round_output, so the pmv is rounded to 2 decimals before the
  // aPMV formula. Its rows are upstream's UserWarnings from the same call
  // (pmv_ppd_iso.py:181-202), which upstream's pmv_a passes on.
  const { pmv, warnings } = pmv_ppd_iso({
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
  });

  // np.around(x, 2) (pmv_a.py:132): round is half to even. A zero
  // denominator gives ±Infinity, as numpy's division gives ±inf.
  return { a_pmv: round(pmv / (1 + a_coefficient * pmv), 2), warnings };
}
