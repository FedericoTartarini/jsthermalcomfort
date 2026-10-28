import { _pmv_ppd_optimized } from "./_pmv_ppd_optimized.ts";
import { validateInputs, ISO_7730_LIMITS } from "../utilities/utilities.js";
import { units_converter } from "../utilities/units_converter.ts";
import { Standard, Units } from "../utilities/options.ts";
import { round } from "../_internal/round.ts";
import { classifyFromBins } from "../_internal/classifierBins.ts";
import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { deepFreeze } from "../_internal/modelInfo.ts";
import {
  _check_params_object,
  _legacy_valid_range,
} from "../_internal/validation.ts";
import type {
  ApplicabilityWarning,
  LegacyModelInfo,
} from "../_internal/modelInfo.ts";

/**
 * Thermal Sensation Vote bins used by pmv_ppd_iso (left-inclusive).
 * Note: pmv_ppd_ashrae uses right-inclusive; see pythermalcomfort#382.
 */
export const PMV_THERMAL_SENSATION_VOTE_BINS_ISO: ClassifierBins =
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
    right: false,
  });

/**
 * The categories of thermal environment of ISO 7730:2025, the edition
 * pmv_ppd_iso defaults to, which classifies its `category` with them under
 * that edition. Like `PMV_CATEGORY_BINS_ISO_7730_2005` they cut |pmv|, not
 * pmv, and are read from the unrounded PMV.
 *
 * ISO 7730:2025 Annex A Table A.1 names four categories, I to IV, at |PMV|
 * 0.2, 0.5, 0.7 and 1.0. Left-inclusive bins on |pmv| make each strict at
 * both ends, as the 2005 bins are: a PMV of exactly ±0.2 is category II, not
 * I, and a PMV of exactly ±1.0 is "none". The top edge, 10, is the thermal
 * sensation vote bins' sentinel, as in the 2005 bins.
 *
 * Upstream has no ISO 7730 category anywhere. The category and these bins are
 * a consumer-needed addition (ADR 0001): the app draws a model's categories
 * and prints the room's category from the bins of the edition it runs,
 * instead of keeping its own edges.
 */
export const PMV_CATEGORY_BINS_ISO_7730_2025: ClassifierBins = deepFreeze({
  edges: [0.2, 0.5, 0.7, 1.0, 10],
  labels: ["I", "II", "III", "IV", "none"],
  right: false,
});

/**
 * The categories of thermal environment of ISO 7730:2005, which pmv_ppd_iso
 * classifies its `category` with under that edition. These bins cut |pmv|,
 * not pmv: pair them with the absolute PMV, never with the signed PMV axis as
 * chart bands. pmv_ppd_iso reads them from the unrounded PMV.
 *
 * ISO 7730:2005 Annex A Table A.1 defines the categories of thermal
 * environment by open intervals: A is -0.2 < PMV < 0.2, B is -0.5 < PMV < 0.5,
 * C is -0.7 < PMV < 0.7. Left-inclusive bins on |pmv| give exactly those open
 * ends, so a PMV of exactly ±0.5 is category C, not B. Beyond C the label is
 * "none"; the top edge, 10, is the thermal sensation vote bins' sentinel, so
 * |pmv| above it is NaN, as the vote is.
 *
 * The table also lists PPD limits (6, 10 and 15 %). They are not exported:
 * they are rounded readings of the PPD curve at 0.2, 0.5 and 0.7 (5.8, 10.2
 * and 15.3 %), so a category read from the PPD disagrees with the one read
 * from the PMV in a thin band at every edge.
 *
 * CEN/TR 16798-2 Table B.1 gives the same intervals for EN 16798-1 categories
 * I to III.
 *
 * Upstream has no ISO 7730 category anywhere: these bins are a consumer-needed
 * addition (ADR 0001), as `PMV_CATEGORY_BINS_ISO_7730_2025` is.
 *
 * Frozen deep, not with Object.freeze as the vote bins are: no model info
 * holds these bins, so no info's deepFreeze reaches their arrays.
 */
export const PMV_CATEGORY_BINS_ISO_7730_2005: ClassifierBins = deepFreeze({
  edges: [0.2, 0.5, 0.7, 10],
  labels: ["A", "B", "C", "none"],
  right: false,
});

// A type alias, as the JSDoc typedef it replaces emitted, so the result stays
// assignable to Record<string, unknown>; an interface is not. Renamed from
// PmvPpdIso to <Model>Result, the name every converted model's result has.
/**
 * @typedef {Object} PmvPpdIsoResult
 * @property {number} pmv - Predicted Mean Vote on the ISO 7730 scale [-3, +3]
 * @property {number} ppd - Predicted Percentage of Dissatisfied [%]
 * @property {string|number} tsv - Thermal Sensation Vote category, or NaN if pmv is NaN. Uses left-inclusive bins (pythermalcomfort#382).
 * @property {string|number} category - ISO 7730 category of thermal environment: under 7730-2025 "I", "II", "III", "IV" or "none", the unrounded |pmv| classified by `PMV_CATEGORY_BINS_ISO_7730_2025`; under 7730-2005 "A", "B", "C" or "none", by `PMV_CATEGORY_BINS_ISO_7730_2005`; NaN when `limit_inputs` returns NaN for the inputs.
 * @property {import("../_internal/modelInfo.ts").ApplicabilityWarning[]} warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 */
export type PmvPpdIsoResult = {
  pmv: number;
  ppd: number;
  tsv: string | number;
  category: string | number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `pmv_ppd_iso`: upstream's keyword parameters, quantities and
 * switches alike, with upstream's defaults (ADR 0002), `standard` being one of
 * the two ISO 7730 editions upstream accepts. Documented on the function's
 * `params`.
 */
export interface PmvPpdIsoParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  standard?: typeof Standard.iso_7730_2005 | typeof Standard.iso_7730_2025;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
  round_output?: boolean;
}

/**
 * Model metadata for PMV / PPD (ISO 7730).
 *
 * The `category` classifier is `PMV_CATEGORY_BINS_ISO_7730_2025`, the bins of
 * the default and first edition. A call under 7730-2005 classifies `category`
 * by `PMV_CATEGORY_BINS_ISO_7730_2005` instead.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 */
export const PMV_PPD_ISO_INFO: LegacyModelInfo = deepFreeze({
  name: "pmv_ppd_iso",
  label: "PMV / PPD (ISO 7730)",
  description: "Predicted Mean Vote and Predicted Percentage Dissatisfied.",
  standards: [Standard.iso_7730_2025, Standard.iso_7730_2005],
  inputs: {
    tdb: { unit: "°C", applicability: ISO_7730_LIMITS.tdb! },
    tr: { unit: "°C", applicability: ISO_7730_LIMITS.tr! },
    vr: { unit: "m/s", applicability: ISO_7730_LIMITS.vr! },
    met: { unit: "met", applicability: ISO_7730_LIMITS.met! },
    clo: { unit: "clo", applicability: ISO_7730_LIMITS.clo! },
    rh: { unit: "%" },
    wme: { unit: "met" },
  },
  outputs: {
    pmv: { unit: null, applicability: ISO_7730_LIMITS.pmv! },
    ppd: { unit: "%" },
    tsv: { unit: null, classifier: PMV_THERMAL_SENSATION_VOTE_BINS_ISO },
    category: { unit: null, classifier: PMV_CATEGORY_BINS_ISO_7730_2025 },
  },
  derived: {
    // Computed from tdb and rh, not supplied by the caller. Exposed so a
    // front end can explain why a warm, humid combination that looks inside
    // every input limit still returns NaN.
    pa: { unit: "Pa", applicability: ISO_7730_LIMITS.pa! },
  },
});

// A non-finite number throws a TypeError here, where upstream lets it
// propagate (ADR 0001, reason three).
const PMV_PPD_ISO_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  // Upstream raises a ValueError for any `model=` but the two ISO 7730
  // editions.
  standard: { enum: [Standard.iso_7730_2005, Standard.iso_7730_2025] },
  units: { enum: ["SI", "IP"] },
  limit_inputs: { type: "boolean" },
  round_output: { type: "boolean" },
};

/** The category bins of each ISO 7730 edition. */
const PMV_CATEGORY_BINS: Readonly<
  Record<NonNullable<PmvPpdIsoParams["standard"]>, ClassifierBins>
> = {
  [Standard.iso_7730_2005]: PMV_CATEGORY_BINS_ISO_7730_2005,
  [Standard.iso_7730_2025]: PMV_CATEGORY_BINS_ISO_7730_2025,
};

/**
 * Calculate PMV and PPD in accordance with ISO 7730.
 *
 * The ISO equation uses Fanger's original PMV formulation without the
 * ASHRAE cooling-effect adjustment.
 *
 * ISO 7730 applies stricter input limits than ASHRAE 55. When
 * `limit_inputs` is true (the default), inputs outside the following
 * ranges cause the function to return NaN:
 * - 10 < tdb [°C] < 30
 * - 10 < tr  [°C] < 40
 * -  0 < vr  [m/s] < 1
 * - 0.8 < met [met] < 4
 * -  0 < clo [clo] < 2
 * -  0 < pa  [Pa] < 2700
 * - -2 < PMV < 2 (result is clamped to NaN outside this range)
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry-bulb air temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.tr  - Mean radiant temperature [°C] (or [°F] if units = 'IP')
 * @param {number} params.vr  - Relative air speed [m/s] (or [fps] if units = 'IP')
 * @param {number} params.rh  - Relative humidity [%]
 * @param {number} params.met - Metabolic rate [met]
 * @param {number} params.clo - Clothing insulation [clo]. This is the dynamic clothing insulation,
 *    which can be calculated using the function `clo_dynamic_iso`.
 * @param {number} [params.wme=0] - External work [met]
 * @param {"7730-2005"|"7730-2025"} [params.standard="7730-2025"] - which edition of ISO 7730
 *    the calculation is being performed against. Accepts `"7730-2005"` or
 *    `"7730-2025"`.
 *
 *    **The two editions specify identical equations and applicability limits**,
 *    so this argument changes only `category`, which each edition's Annex A
 *    Table A.1 bounds and names differently. It also lets a caller record which edition
 *    they are working to, and the library confirm it implements it — passing
 *    an unsupported edition throws rather than silently computing something
 *    else.
 *
 *    Mirrors the `model` argument on `pythermalcomfort`'s `pmv_ppd_iso`,
 *    including the default.
 * @param {'SI'|'IP'} [params.units='SI'] - Unit system
 * @param {boolean}   [params.limit_inputs=true] - Return NaN for out-of-range inputs
 * @param {boolean}   [params.round_output=true] - Round pmv to 2 decimal places and ppd to 1
 * @returns {PmvPpdIsoResult} PMV and PPD values
 *
 * @example
 * const r = pmv_ppd_iso({ tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 });
 * console.log(r.pmv); // 0.08
 * console.log(r.ppd); // 5.1
 */
export function pmv_ppd_iso(params: PmvPpdIsoParams): PmvPpdIsoResult {
  // The quantities and the standard were positional before v2 (ADR 0002); a
  // call still written that way fails here, naming the shape it should have.
  _check_params_object(params, "pmv_ppd_iso");
  let { tdb, tr, vr } = params;
  const { rh, met, clo } = params;
  // Destructuring defaults also apply to a switch passed as undefined.
  const {
    wme = 0,
    standard = Standard.iso_7730_2025,
    units = "SI",
    limit_inputs = true,
    round_output = true,
  } = params;
  // Validate inputs using the PMVPPDInputs class
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
      round_output,
    },
    PMV_PPD_ISO_SCHEMA,
  );

  if (units.toUpperCase() === Units.IP) {
    ({ tdb, tr, v: vr } = units_converter(Units.IP, { tdb, tr, v: vr }));
  }

  let pmv = _pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme);

  let ppd_array =
    100.0 -
    95.0 *
      Math.exp(-0.03353 * Math.pow(pmv, 4.0) - 0.2179 * Math.pow(pmv, 2.0));

  // Checks that inputs are within the bounds accepted by the model if not return nan
  // ISO 7730 Clause 4 applicability limits
  const pa = rh * 10.0 * Math.exp(16.6536 - 4030.183 / (tdb + 235.0));

  const warnings: ApplicabilityWarning[] = [];
  for (const [key, value] of Object.entries({ tdb, tr, vr, met, clo })) {
    _legacy_valid_range(warnings, key, "input", value, ISO_7730_LIMITS[key]!);
  }
  _legacy_valid_range(warnings, "pa", "derived", pa, ISO_7730_LIMITS.pa!);
  _legacy_valid_range(warnings, "pmv", "output", pmv, ISO_7730_LIMITS.pmv!);

  if (limit_inputs && (Number.isNaN(pmv) || warnings.length > 0)) {
    pmv = NaN;
    ppd_array = NaN;
  }

  const category = classifyFromBins(Math.abs(pmv), PMV_CATEGORY_BINS[standard]);

  if (round_output) {
    pmv = round(pmv, 2);
    ppd_array = round(ppd_array, 1);
  }

  return {
    pmv,
    ppd: ppd_array,
    tsv: classifyFromBins(pmv, PMV_THERMAL_SENSATION_VOTE_BINS_ISO),
    category,
    warnings,
  };
}
