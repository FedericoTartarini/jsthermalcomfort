import {
  round,
  validateInputs,
  ASHRAE_55_LIMITS,
  Standard,
} from "../utilities/utilities.js";
import { pmv_ppd_ashrae } from "./pmv_ppd_ashrae.ts";
import { deepFreeze } from "./modelDocs.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_V_LIMITED,
} from "../_internal/ashrae55.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// VerTmpGradReturnType to <Model>Result, the name every converted model's
// result has.
//
// ADR 0013. Upstream documents acceptability as "True if the value of air
// speed at the ankle level is acceptable (PPD_vg <= 5%)"
// (classes_return.py:714-715 at v4.6.2), ankle_draft's text. It is the
// vertical-gradient PPD that is compared, before it is rounded
// (vertical_tmp_grad_ppd.py:128-131): an unrounded 5.018 returns ppd_vg 5.0
// and false, an unrounded 4.993 returns 5.0 and true.
/**
 * @typedef {object} VerticalTmpGradPpdResult
 * @property {number} ppd_vg - Predicted Percentage of Dissatisfied occupants with vertical temperature gradient, [%].
 * @property {boolean|number} acceptability - True if the predicted percentage of dissatisfied occupants with vertical temperature gradient is acceptable (PPD_vg <= 5%), compared before `ppd_vg` is rounded; NaN when `limit_inputs` returns NaN for the inputs.
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type VerticalTmpGradPpdResult = {
  ppd_vg: number;
  acceptability: boolean | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `vertical_tmp_grad_ppd`: upstream's keyword parameters,
 * quantities and switches alike, with upstream's defaults (ADR 0002).
 * Documented on the function's `params`.
 */
export interface VerticalTmpGradPpdParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  vertical_tmp_grad: number;
  round_output?: boolean;
  limit_inputs?: boolean;
  suppress_warnings?: boolean;
}

/**
 * Model metadata for the vertical temperature gradient model.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * Upstream checks `vr` once, against the equation's own range,
 * `ASHRAE_55_V_LIMITED`, 0 to 0.2 m/s (its `'v_limited'` check,
 * vertical_tmp_grad_ppd.py:140-146 at v4.6.2), and not against
 * `ASHRAE_55_LIMITS.vr`; a `vr` it breaks is a row keyed `vr`.
 * `rh` and `vertical_tmp_grad` are not checked. `acceptability` is a boolean,
 * so it carries no unit and no classifier.
 *
 * @public
 */
export const VERTICAL_TMP_GRAD_PPD_INFO: ModelInfo = deepFreeze({
  name: "vertical_tmp_grad_ppd",
  label: "Vertical air temperature gradient",
  description:
    "Percentage of occupants dissatisfied with the difference in air temperature between head and feet.",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: { unit: "m/s", applicability: ASHRAE_55_V_LIMITED },
    rh: { unit: "%" },
    met: { unit: "met", applicability: ASHRAE_55_LIMITS.met },
    clo: { unit: "clo", applicability: ASHRAE_55_LIMITS.clo },
    vertical_tmp_grad: { unit: "°C/m" },
  },
  outputs: {
    ppd_vg: { unit: "%" },
    acceptability: { unit: null },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three).
// Upstream returns NaN or a number for one (a NaN rh gives ppd_vg NaN and
// acceptability False; a -inf vertical_tmp_grad gives 0 and True), except
// that it raises StopIteration for a +inf vr. A boolean quantity,
// which upstream reads as 0 or 1, throws a TypeError too: quantities are
// numbers (ADR 0005). limit_inputs is validated, as upstream gives it to
// VerticalTGradPPDInputs (vertical_tmp_grad_ppd.py:97-106). round_output is
// declared but not validated: upstream does not give it to
// VerticalTGradPPDInputs and reads it with `if round_output:` (:130), so it is
// read with JavaScript's truth value, which differs from Python's on three
// values (ADR 0001): NaN is true in Python and false here, and an empty array
// or object is false in Python and true here.
const VERTICAL_TMP_GRAD_PPD_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  vertical_tmp_grad: { type: "number" },
  round_output: {},
  limit_inputs: { type: "boolean" },
  suppress_warnings: { type: "boolean" },
};

// ADR 0013. Upstream's docstring gives the equation's range as "vr < 0.2 m/s
// (40 fpm)" (vertical_tmp_grad_ppd.py:24-25 at v4.6.2) and the limit_inputs
// ranges as strict ("10 < tdb [°C] < 40", :74-75); the bounds are inclusive
// (_valid_range, _internal/validation.py:22, :47), so vr = 0.2 computes.
/**
 * Calculates the percentage of thermally dissatisfied people with a vertical temperature gradient between feet and head {@link #ref_1|[1]}.
 * This equation is only applicable for 0 <= vr <= 0.2 m/s (40 fpm). The model subtracts a baseline of 34.5 % of
 * dissatisfied occupants; when the result would be negative, ppd_vg is 0.
 *
 * @public
 * @memberof models
 * @docname Vertical air temperature gradient
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, [°C].
 *
 * Note: The air temperature is the average value over two heights: 0.6 m (24 in.)
 * and 1.1 m (43 in.) for seated occupants
 * and 1.1 m (43 in.) and 1.7 m (67 in.) for standing occupants.
 *
 * @param {number} params.tr - Mean radiant temperature, [°C].
 * @param {number} params.vr - Relative air speed, [m/s].
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function
 * {@link #v_relative|v_relative}.
 *
 * @param {number} params.rh - Relative humidity, [%].
 * @param {number} params.met - Metabolic rate, [met].
 * @param {number} params.clo - Clothing insulation, [clo].
 *
 * Note: this is the basic insulation also known as the intrinsic clothing insulation value of the
 * clothing ensemble (Icl,r), this is the thermal insulation from the skin
 * surface to the outer clothing surface, including enclosed air layers, under actual
 * environmental conditions. This value is not the total insulation (IT,r).
 * The dynamic clothing insulation, clo, can be calculated using the function
 * {@link #clo_dynamic_ashrae|clo_dynamic_ashrae}.
 *
 * @param {number} params.vertical_tmp_grad - Vertical temperature gradient between the feet and the head, [°C/m].
 * @param {boolean} [params.round_output=true] - If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param {boolean} [params.limit_inputs=true] - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns values even if input values are
 * outside the applicability limits of the model. Defaults to True. The
 * applicability limits are 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40,
 * 0 <= vr [m/s] <= 0.2, 1 <= met [met] <= 4, and 0 <= clo [clo] <= 1.5.
 * @param {boolean} [params.suppress_warnings=false] - Write nothing to the console when the cooling effect inside `pmv_ppd_ashrae` cannot be calculated and is assumed to be 0; the returned `warnings` are unaffected
 *
 * @returns {VerticalTmpGradPpdResult} the Predicted Percentage of Dissatisfied occupants with vertical temperature gradient and acceptability.
 *
 * @example
 * const result = vertical_tmp_grad_ppd({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5, vertical_tmp_grad: 7 });
 * console.log(result.ppd_vg); // 12.6
 * console.log(result.acceptability); // false
 */
export function vertical_tmp_grad_ppd(
  params: VerticalTmpGradPpdParams,
): VerticalTmpGradPpdResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as the removed units (ADR 0008).
  _check_params_object(
    params,
    "vertical_tmp_grad_ppd",
    VERTICAL_TMP_GRAD_PPD_SCHEMA,
  );
  const { tdb, tr, vr, rh, met, clo, vertical_tmp_grad } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  // suppress_warnings has no pythermalcomfort counterpart: it stands in for
  // Python's warnings filter, which JavaScript lacks (see cooling_effect).
  const {
    round_output = true,
    limit_inputs = true,
    suppress_warnings = false,
  } = params;
  validateInputs(
    {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      vertical_tmp_grad,
      limit_inputs,
      suppress_warnings,
    },
    VERTICAL_TMP_GRAD_PPD_SCHEMA,
  );

  // As upstream (vertical_tmp_grad_ppd.py:115-124): the PMV unmasked and
  // rounded to 2 decimals, pmv_ppd_ashrae's default; the gate is this model's
  // own, below. pmv_ppd_ashrae's rows are not this model's.
  const tsv = pmv_ppd_ashrae({
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    standard: Standard.ashrae_55_2023,
    limit_inputs: false,
    suppress_warnings,
  }).pmv;
  // Upstream's arithmetic (ADR 0009), where the math library differs.
  // Math.exp can be an ulp off numpy's np.exp, and upstream's `** 2` on its
  // 0-d array gives what Python's float power gives: at tsv 3.41,
  // (tsv - 1.91) ** 2 is 2.2500000000000004 there and 2.250000000000001 in
  // np.square, in x * x and in JavaScript's **. In a 76,407-case sweep
  // against pythermalcomfort 4.6.2 these made 681 of 38,226 unrounded ppd_vg
  // differ, by at most 1.42e-14 (677 from exp, 4 from the square), and no
  // rounded ppd_vg or acceptability.
  const numerator = Math.exp(
    0.13 * (tsv - 1.91) ** 2 + 0.15 * vertical_tmp_grad - 1.6,
  );
  // 34.5 % baseline subtracted, negative values set to zero (:126-127).
  let ppd_vg = Math.max((numerator / (1 + numerator) - 0.345) * 100, 0);
  // Compared before rounding, as upstream (:128-131).
  const acceptability = ppd_vg <= 5;
  if (round_output) ppd_vg = round(ppd_vg, 1);

  // The rows are the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). Upstream checks only under
  // limit_inputs; the rows are built on every call, so with the gate off they
  // say what the numbers were computed despite. Upstream passes vr as
  // v_limited only, not as v, so vr has no 0 to 2 m/s row (:140-146).
  const warnings: ApplicabilityWarning[] = [];
  _check_ashrae55_compliance(warnings, {
    tdb,
    tr,
    met,
    clo,
    v_limited: { value: vr, key: "vr" },
  });
  // ADR 0006: upstream's np.where(all_valid, ..., np.nan) masks the
  // acceptability to NaN as well (:156-157).
  if (limit_inputs && warnings.length > 0) {
    return { ppd_vg: NaN, acceptability: NaN, warnings };
  }

  return { ppd_vg, acceptability, warnings };
}
