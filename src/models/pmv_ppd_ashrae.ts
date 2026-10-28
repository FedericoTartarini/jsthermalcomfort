import { _pmv_ppd_optimized } from "./_pmv_ppd_optimized.ts";
import { cooling_effect } from "./cooling_effect.ts";
import { validateInputs } from "../utilities/utilities.js";
import { units_converter } from "../utilities/units_converter.ts";
import {
  _legacy_check_ashrae55_compliance,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { Standard } from "../utilities/options.ts";
import { round } from "../_internal/round.ts";
import { classifyFromBins } from "../_internal/classifierBins.ts";
import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import { _check_params_object } from "../_internal/validation.ts";
import type {
  ApplicabilityWarning,
  Bound,
  LegacyModelInfo,
} from "../_internal/modelInfo.ts";

/**
 * Thermal Sensation Vote bins used by pmv_ppd_ashrae (right-inclusive).
 * Note: pmv_ppd_iso uses left-inclusive; see pythermalcomfort#382.
 */
export const PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE: ClassifierBins =
  Object.freeze({
    edges: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 10],
    labels: [
      "Cold",
      "Cool",
      "Slightly Cool",
      "Neutral",
      "Slightly Warm",
      "Warm",
      "Hot",
    ],
    right: true,
  });

/**
 * The PMV interval inside which pmv_ppd_ashrae reports `compliance` true:
 * -0.5 < pmv < 0.5, both ends excluded, read from the unrounded PMV, as
 * upstream's `pmv_ppd_ashrae` computes it. Unlike an applicability bound it
 * gates nothing: a PMV outside it is still returned, as non-compliant.
 *
 * Upstream writes the interval inline. It is a named export here because a
 * consumer needs it (ADR 0001): the app draws the comfort zone from the same
 * interval the model reads, instead of keeping its own ±0.5.
 */
export const PMV_COMPLIANCE_INTERVAL_ASHRAE: Readonly<Required<Bound>> =
  Object.freeze({ min: -0.5, max: 0.5 });

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// PmvPpdAshrae to <Model>Result, the name every converted model's result has.
/**
 * @typedef {Object} PmvPpdAshraeResult
 * @property {number} pmv - Predicted Mean Vote on the ASHRAE 55 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @property {string|number} tsv - Thermal Sensation Vote category, or NaN if pmv is NaN. Uses right-inclusive bins (pythermalcomfort#382).
 * @property {boolean|number} compliance - True if -0.5 < pmv < 0.5 (`PMV_COMPLIANCE_INTERVAL_ASHRAE`), read from the unrounded pmv; NaN when `limit_inputs` returns NaN for the inputs.
 * @property {import("../_internal/modelInfo.ts").ApplicabilityWarning[]} warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 */
export type PmvPpdAshraeResult = {
  pmv: number;
  ppd: number;
  tsv: string | number;
  compliance: boolean | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `pmv_ppd_ashrae`: upstream's keyword parameters, quantities
 * and switches alike, with upstream's defaults (ADR 0002), `standard` narrowed
 * to the one ASHRAE 55 version upstream accepts. Documented on the function's
 * `params`.
 */
export interface PmvPpdAshraeParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  standard?: typeof Standard.ashrae_55_2023;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
  airspeed_control?: boolean;
  round_output?: boolean;
  suppress_warnings?: boolean;
}

/**
 * Model metadata for PMV / PPD (ASHRAE 55).
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * No `derived` row and no `pmv` applicability: ASHRAE 55 bounds neither
 * vapour pressure nor the PMV output, and `pmv_ppd_iso` gates both.
 * The airspeed limits that apply when the occupant cannot control the
 * airspeed depend on the call (operative temperature, met and clo), so they
 * have no fixed `Bound` here; a call that breaks one reports it in
 * `warnings` with a bound built for that call.
 */
export const PMV_PPD_ASHRAE_INFO: LegacyModelInfo = deepFreeze({
  name: "pmv_ppd_ashrae",
  label: "PMV / PPD (ASHRAE 55)",
  description:
    "Predicted Mean Vote and Predicted Percentage Dissatisfied, with the ASHRAE 55 cooling effect of elevated air speed.",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: { unit: "m/s", applicability: ASHRAE_55_LIMITS.v },
    met: { unit: "met", applicability: ASHRAE_55_LIMITS.met },
    clo: { unit: "clo", applicability: ASHRAE_55_LIMITS.clo },
    rh: { unit: "%" },
    wme: { unit: "met" },
  },
  outputs: {
    pmv: { unit: null },
    ppd: { unit: "%" },
    tsv: { unit: null, classifier: PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE },
    compliance: { unit: null },
  },
});

/**
 * Calculate PMV and PPD in accordance with ASHRAE 55.
 *
 * The ASHRAE equation applies a cooling effect (via SET) before computing
 * PMV — this lowers the result compared to the raw ISO equation when
 * elevated air speed is present.
 *
 * Valid ASHRAE 55 input ranges (when `limit_inputs` is true):
 * - 10 < tdb [°C] < 40
 * - 10 < tr  [°C] < 40
 * -  0 < vr  [m/s] < 2
 * -  1 < met [met] < 4
 * -  0 < clo [clo] < 1.5
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry-bulb air temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.tr  - Mean radiant temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.vr  - Relative air speed [m/s] (or [fps] if units = 'IP')
 * @param {number} params.rh  - Relative humidity [%]
 * @param {number} params.met - Metabolic rate [met]
 * @param {number} params.clo - Clothing insulation [clo]. This is the dynamic clothing insulation,
 *    which can be calculated using the function `clo_dynamic_ashrae`.
 * @param {number} [params.wme=0] - External work [met]
 * @param {'55-2023'} [params.standard='55-2023'] - Version of the ASHRAE 55 Standard; any other value throws
 * @param {'SI'|'IP'} [params.units='SI'] - Unit system
 * @param {boolean}   [params.limit_inputs=true] - Return NaN for out-of-range inputs
 * @param {boolean}   [params.airspeed_control=true] - Occupant controls airspeed
 * @param {boolean}   [params.round_output=true] - Round pmv to 2 decimal places and ppd to 1
 * @param {boolean}   [params.suppress_warnings=false] - Write nothing to the console when the cooling effect cannot be calculated and is assumed to be 0; the returned `warnings` are unaffected
 * @returns {PmvPpdAshraeResult} PMV and PPD values
 *
 * @example
 * const r = pmv_ppd_ashrae({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 * console.log(r.compliance); // true
 */
// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const PMV_PPD_ASHRAE_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  // Upstream raises a ValueError for any `model=` but "55-2023"; the shared
  // PMV module would also accept an ISO 7730 standard and compute ISO's
  // equation.
  standard: { enum: [Standard.ashrae_55_2023] },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  airspeed_control: { type: "boolean" },
  round_output: { type: "boolean" },
  suppress_warnings: { type: "boolean" },
};

export function pmv_ppd_ashrae(params: PmvPpdAshraeParams): PmvPpdAshraeResult {
  // The quantities were positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have.
  _check_params_object(params, "pmv_ppd_ashrae");
  let { tdb, tr, vr } = params;
  const { rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  // suppress_warnings has no pythermalcomfort counterpart: it stands in for
  // Python's warnings filter, which JavaScript lacks.
  const {
    wme = 0,
    standard = Standard.ashrae_55_2023,
    units = "SI",
    limit_inputs = true,
    airspeed_control = true,
    round_output = true,
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
      wme,
      standard,
      units: units.toUpperCase(),
      limit_inputs,
      airspeed_control,
      round_output,
      suppress_warnings,
    },
    PMV_PPD_ASHRAE_SCHEMA,
  );
  if (units.toUpperCase() === "IP") {
    // Conversion from IP to SI units
    ({ tdb, tr, vr } = units_converter("IP", { tdb, tr, vr }));
  }

  // The rows a call broke (#199), built on every call whatever limit_inputs
  // is, from the inputs before the cooling effect shifts them, through the
  // shared helper, as in upstream's pmv_ppd_ashrae.
  const warnings: ApplicabilityWarning[] = [];
  _legacy_check_ashrae55_compliance(warnings, {
    tdb,
    tr,
    v: vr,
    met,
    clo,
    airspeed_control,
    v_param_name: "vr",
  });

  //if v_r is higher than 0.1 follow methodology ASHRAE Appendix H, H3
  // The inputs are SI by now, hence "SI" rather than units.
  let ce = 0;
  if (vr > 0.1) {
    const result = cooling_effect({
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      wme,
      units: "SI",
    });
    ce = result.ce;
    // cooling_effect's notice row goes to the console unless suppress_warnings is set.
    for (const row of result.warnings) {
      if (row.kind === "notice" && !suppress_warnings)
        console.warn(row.message);
    }
  }

  tdb = tdb - ce;
  tr = tr - ce;
  vr = ce > 0 ? 0.1 : vr;

  let pmv = _pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme);
  let ppd =
    100.0 -
    95.0 *
      Math.exp(-0.03353 * Math.pow(pmv, 4.0) - 0.2179 * Math.pow(pmv, 2.0));

  // Checks that inputs are within the bounds accepted by the model if not return NaN
  const gated = limit_inputs && (isNaN(pmv) || warnings.length > 0);

  // As upstream's pmv_ppd_ashrae computes it: from the unrounded pmv, and NaN
  // where limit_inputs finds an input out of bounds. Upstream masks on the
  // inputs alone, not on a NaN pmv, so neither does this.
  const compliance =
    limit_inputs && warnings.length > 0
      ? NaN
      : pmv > PMV_COMPLIANCE_INTERVAL_ASHRAE.min &&
        pmv < PMV_COMPLIANCE_INTERVAL_ASHRAE.max;

  if (gated) {
    pmv = NaN;
    ppd = NaN;
  }

  if (round_output) {
    pmv = round(pmv, 2);
    ppd = round(ppd, 1);
  }

  // Classified from the pmv returned, so after rounding, as upstream does: the
  // label never disagrees with the number shown. Right-inclusive, where ISO's
  // is left-inclusive (intentional divergence per pythermalcomfort#382).
  const tsv = classifyFromBins(pmv, PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE);

  return { pmv, ppd, tsv, compliance, warnings };
}
