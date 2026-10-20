import {
  round,
  units_converter,
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
import { _check_params_object, _upper_units } from "../_internal/validation.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// AnkleDraftRet to <Model>Result, the name every converted model's result has.
/**
 * @typedef {object} AnkleDraftResult
 * @property {number} ppd_ad - Predicted Percentage of Dissatisfied occupants with ankle draft, [%].
 * @property {boolean|number} acceptability - Indicates if the air speed at the ankle level is acceptable according to ASHRAE 55 2020 standard; NaN when `limit_inputs` returns NaN for the inputs.
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type AnkleDraftResult = {
  ppd_ad: number;
  acceptability: boolean | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `ankle_draft`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002). Documented on the
 * function's `params`.
 */
export interface AnkleDraftParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  v_ankle: number;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
  suppress_warnings?: boolean;
}

/**
 * Model metadata for the ankle draft model.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * `vr` has two bounds, as upstream checks it twice: the Table 7.3.4 range,
 * a row keyed `vr`, and the equation's own range, a row keyed `v_limited`
 * (upstream's key). `v_limited` is `vr` in m/s, so it is listed under
 * `derived`, where a consumer finds the unit of that row's key. Under
 * `limit_inputs` a `vr` outside the equation's range throws, so the
 * `v_limited` row reaches a result only with `limit_inputs` off.
 * `acceptability` is a boolean, so it carries no unit and no classifier.
 *
 * @public
 */
export const ANKLE_DRAFT_INFO: ModelInfo = deepFreeze({
  name: "ankle_draft",
  label: "Ankle draft",
  description:
    "Percentage of occupants dissatisfied with the air speed at the ankles, 0.1 m above the floor.",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: { unit: "m/s", applicability: ASHRAE_55_LIMITS.vr },
    rh: { unit: "%" },
    met: { unit: "met", applicability: ASHRAE_55_LIMITS.met },
    clo: { unit: "clo", applicability: ASHRAE_55_LIMITS.clo },
    v_ankle: { unit: "m/s" },
  },
  derived: {
    v_limited: { unit: "m/s", applicability: ASHRAE_55_V_LIMITED },
  },
  outputs: {
    ppd_ad: { unit: "%" },
    acceptability: { unit: null },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three).
// Upstream returns NaN or a number for one, except that it raises
// StopIteration where the cooling effect runs (vr above 0.1 m/s) or vr is
// +inf, and its ValueError below for a NaN or -inf vr under limit_inputs. A
// boolean quantity, which upstream reads as 0 or 1, throws a TypeError too:
// quantities are numbers (ADR 0005). limit_inputs is validated, as upstream
// gives it to AnkleDraftInputs (ankle_draft.py:96-106).
const ANKLE_DRAFT_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  v_ankle: { type: "number" },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  suppress_warnings: { type: "boolean" },
};

// Upstream's docstring gives the equation's range as "vr < 0.2 m/s (40 fps)",
// and the limit_inputs ranges as strict ("10 < tdb [°C] < 40"). 0.2 m/s is
// about 0.656 fps (40 fpm); the bounds are inclusive (_valid_range,
// _internal/validation.py:22), so vr = 0.2 computes; and a vr outside 0 to
// 0.2 m/s raises a ValueError rather than returning NaN (ankle_draft.py:151-154).
/**
 * Calculates the percentage of thermally dissatisfied people with the ankle draft (0.1 m) above floor level {@link #ref_23|[23]}.
 * This equation is only applicable for 0 <= vr <= 0.2 m/s (about 0.656 fps).
 *
 * @public
 * @memberof models
 * @docname Ankle draft
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, default in [°C] or [°F] if `units` = 'IP'.
 *
 * Note: The air temperature is the average value over two heights: 0.6 m (24 in.)
 * and 1.1 m (43 in.) for seated occupants, and 1.1 m (43 in.) and 1.7 m (67 in.) for standing occupants.
 *
 * @param {number} params.tr - Mean radiant temperature, default in [°C] or [°F] if `units` = 'IP'.
 * @param {number} params.vr - Relative air speed, default in [m/s] or [fps] if `units` = 'IP'.
 *
 * Note: `vr` is the relative air speed caused by body movement and not the air speed measured by the air speed sensor.
 * The relative air speed is the sum of the average air speed measured by the sensor plus the activity-generated air speed (Vag).
 * Vag is the activity-generated air speed caused by motion of individual body parts.
 * `vr` can be calculated using the function {@link #v_relative|v_relative}.
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
 * @param {number} params.v_ankle - Air speed at 0.1 m (4 in.) above the floor, default in [m/s] or [fps] if `units` = 'IP'.
 * @param {"SI"|"IP"} [params.units="SI"] - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * @param {boolean} [params.limit_inputs=true] - By default, if the inputs are outside the standard applicability limits the
 * function returns nan, and if `vr` is outside 0 <= vr [m/s] <= 0.2 it throws. If False, returns values even if input values are
 * outside the applicability limits of the model. Defaults to True. The
 * applicability limits are 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40,
 * 0 <= vr [m/s] <= 0.2, 1 <= met [met] <= 4, and 0 <= clo [clo] <= 1.5.
 * @param {boolean} [params.suppress_warnings=false] - Write nothing to the console when the cooling effect inside `pmv_ppd_ashrae` cannot be calculated and is assumed to be 0; the returned `warnings` are unaffected
 *
 * @returns {AnkleDraftResult} set containing results for the model
 *
 * @example
 * const results = ankle_draft({ tdb: 25, tr: 25, vr: 0.2, rh: 50, met: 1.2, clo: 0.5, v_ankle: 0.3, units: "SI" });
 * console.log(results); // { ppd_ad: 18.5, acceptability: true, warnings: [] }
 */
export function ankle_draft(params: AnkleDraftParams): AnkleDraftResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key (ADR 0008).
  _check_params_object(params, "ankle_draft", ANKLE_DRAFT_SCHEMA);
  let { tdb, tr, vr, v_ankle } = params;
  const { rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  // suppress_warnings has no pythermalcomfort counterpart: it stands in for
  // Python's warnings filter, which JavaScript lacks (see cooling_effect).
  const {
    units = "SI",
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
      v_ankle,
      units: _upper_units(units),
      limit_inputs,
      suppress_warnings,
    },
    ANKLE_DRAFT_SCHEMA,
  );

  if (units.toUpperCase() === "IP") {
    ({
      tdb,
      tr,
      vr,
      vel: v_ankle,
    } = units_converter({ tdb, tr, vr, vel: v_ankle }));
  }

  // As upstream: the PMV unmasked and rounded to 2 decimals; the gate is
  // this model's own, below. pmv_ppd_ashrae's rows are not this model's.
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
  const ppd_ad = round(
    (Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv) /
      (1 + Math.exp(-2.58 + 3.05 * v_ankle - 1.06 * tsv))) *
      100,
    1,
  );
  const acceptability = ppd_ad <= 20;

  // The rows are the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). Upstream checks only under
  // limit_inputs; the rows are built on every call, so with the gate off they
  // say what the numbers were computed despite. The gate reads the rows.
  // Upstream passes no airspeed_control, so the no-control rules never apply.
  const warnings: ApplicabilityWarning[] = [];
  _check_ashrae55_compliance(warnings, {
    tdb,
    tr,
    v_range: { value: vr, key: "vr" },
    met,
    clo,
    v_limited: vr,
  });
  if (limit_inputs) {
    // Upstream raises when every v_limited is NaN once masked
    // (ankle_draft.py:151), which for one finite vr is whenever it is outside
    // its bound.
    if (warnings.some((row) => row.key === "v_limited")) {
      throw new RangeError(
        "This equation is only applicable for air speed lower than 0.2 m/s",
      );
    }
    // ADR 0006: upstream's NaN for the masked acceptability.
    if (warnings.length > 0) {
      return { ppd_ad: NaN, acceptability: NaN, warnings };
    }
  }

  return { ppd_ad, acceptability, warnings };
}
