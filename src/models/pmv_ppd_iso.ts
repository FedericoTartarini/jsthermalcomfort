import { _pmv_ppd_optimized } from "./_pmv_ppd_optimized.ts";
import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _mapping, _valid_range } from "../_internal/validation.ts";
import { Standard, Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

/** Thermal sensation of each PMV range. Bins include their lower edge. */
const TSV_CATEGORIES = deepFreeze({
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
} as const satisfies ClassifierBins);

export const PMV_CATEGORY_BINS_ISO_7730 = deepFreeze({
  [Standard.iso_7730_2025]: {
    edges: [0.2, 0.5, 0.7, 1.0, 10],
    labels: ["I", "II", "III", "IV", "none"],
    right: false,
  },
  [Standard.iso_7730_2005]: {
    edges: [0.2, 0.5, 0.7, 10],
    labels: ["A", "B", "C", "none"],
    right: false,
  },
} as const satisfies Readonly<Record<string, ClassifierBins>>);

const STANDARDS = deepFreeze([
  Standard.iso_7730_2025,
  Standard.iso_7730_2005,
] as const);

export const PMV_PPD_ISO_INFO = deepFreeze({
  name: "pmv_ppd_iso",
  label: "PMV / PPD (ISO 7730)",
  standards: STANDARDS,
  inputs: {
    tdb: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 10.0, max: 30.0 },
    },
    tr: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 10.0, max: 40.0 },
    },
    vr: {
      kind: "numeric",
      unit: "m/s",
      applicability: { min: 0.0, max: 1.0 },
    },
    rh: { kind: "numeric", unit: "%" },
    met: {
      kind: "numeric",
      unit: "met",
      applicability: { min: 0.8, max: 4.0 },
    },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: { min: 0.0, max: 2.0 },
    },
    wme: { kind: "numeric", unit: "met", default: 0 },
    standard: {
      kind: "choice",
      allowed: STANDARDS,
      default: Standard.iso_7730_2025,
      message: `PMV calculations can only be performed in compliance with ISO ${Standard.iso_7730_2005} or ISO ${Standard.iso_7730_2025}`,
    },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    pmv: {
      kind: "numeric",
      nullable: true,
      unit: null,
      applicability: { min: -2, max: 2 },
    },
    ppd: { kind: "numeric", nullable: true, unit: "%" },
    tsv: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: TSV_CATEGORIES,
    },
    category: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: PMV_CATEGORY_BINS_ISO_7730[Standard.iso_7730_2025],
    },
  },
  derived: {
    pa: { unit: "Pa", applicability: { min: 0.0, max: 2700.0 } },
  },
} as const satisfies ModelInfo);

/** @interface */
export type PMVPPDInputs = InputsOf<typeof PMV_PPD_ISO_INFO>;

/**
 * Dataclass to represent the Predicted Mean Vote (PMV) and Predicted Percentage of
 * Dissatisfied (PPD).
 *
 * @interface
 */
export type PMVPPD = OutputsOf<typeof PMV_PPD_ISO_INFO>;

/**
 * Return Predicted Mean Vote (PMV) and Predicted Percentage of Dissatisfied (PPD)
 * calculated in accordance with the ISO 7730.
 *
 * The ISO uses the same formulation of the PMV as published by Fanger [Fanger1970](../../docs/references.md#fanger1970).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C] in [°F] if `units` = 'IP'
 * @param inputs.tr - Mean radiant temperature, [°C] in [°F] if `units` = 'IP'
 * @param inputs.vr - Relative air speed, [m/s] in [fps] if `units` = 'IP'
 *
 * > [!NOTE]
 * > vr is the relative air speed caused by body movement and not the air
 * > speed measured by the air speed sensor. The relative air speed is the sum of the
 * > average air speed measured by the sensor plus the activity-generated air speed
 * > (Vag). Where Vag is the activity-generated air speed caused by motion of
 * > individual body parts. vr can be calculated using the function
 * > `v_relative`.
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 *
 * > [!NOTE]
 * > this is the basic insulation also known as the intrinsic clothing insulation value of the
 * > clothing ensemble (`I`:sub:`cl,r`), this is the thermal insulation from the skin
 * > surface to the outer clothing surface, including enclosed air layers, under actual
 * > environmental conditions. This value is not the total insulation (`I`:sub:`T,r`).
 * > The dynamic clothing insulation, clo, can be calculated using the function
 * > `clo_dynamic_iso`.
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.standard - The ISO 7730 edition to reference. Supported values are "7730-2005"
 * and "7730-2025"; any other value raises a ``ValueError``. The two
 * editions currently use identical PMV/PPD equations and applicability
 * limits, so this parameter does not affect the numerical result. It is
 * retained to record the intended edition, reject unsupported edition
 * values, and allow future differentiation if the editions diverge. The
 * selected edition is not stored on the returned ``PMVPPD`` object.
 * Defaults to "7730-2025", the current edition of the standard.
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system.
 * Supported values are 'SI' and 'IP'. Defaults to 'SI'.
 * @param inputs.limit_inputs - If True, limits the inputs to the standard applicability limits. Defaults to True.
 *
 * > [!NOTE]
 * > By default, if the inputs are outside the standard applicability limits the
 * > function returns nan. If False returns pmv and ppd values even if input values are
 * > outside the applicability limits of the model.
 * >
 * > The ISO 7730 limits are 10 <= tdb [°C] <= 30, 10 <= tr [°C] <= 40,
 * > 0 <= vr [m/s] <= 1, 0.8 <= met [met] <= 4, 0 <= clo [clo] <= 2, 0 <= pa [Pa] <= 2700,
 * > and -2 <= PMV <= 2.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Predicted Mean Vote and Predicted Percentage of
 * Dissatisfied. See {@link PMVPPD} for
 * more details. To access the `pmv`, `ppd`, `tsv` values, use the corresponding
 * attributes of the returned `PMVPPD` instance, e.g., `result.pmv`.
 *
 * - `pmv` - Predicted Mean Vote.
 * - `ppd` - Predicted Percentage of Dissatisfied.
 * - `tsv` - Predicted thermal sensation vote.
 * - `category`
 *
 * @example
 * ```ts
 * import { pmv_ppd_iso } from "jsthermalcomfort/models";
 * import { v_relative } from "jsthermalcomfort/environment";
 *
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo_dynamic = 0.5;
 * // calculate relative air speed
 * const v_r = v_relative(v, met);
 * const results = pmv_ppd_iso({
 *   tdb,
 *   tr,
 *   vr: v_r,
 *   rh,
 *   met,
 *   clo: clo_dynamic,
 *   standard: "7730-2025",
 * });
 * console.log(results.pmv); // 0.17
 * console.log(results.ppd); // 5.6
 *
 * const result = [22, 25].map((tdb) =>
 *   pmv_ppd_iso({
 *     tdb,
 *     tr: 25,
 *     vr: 0.1,
 *     rh: 50,
 *     met: 1.4,
 *     clo: 0.5,
 *     standard: "7730-2025",
 *   }),
 * );
 * console.log(result.map(({ pmv }) => pmv)); // [-0, 0.41]
 * console.log(result.map(({ ppd }) => ppd)); // [5, 8.5]
 * ```
 */
export function pmv_ppd_iso(inputs: PMVPPDInputs): PMVPPD {
  // Validate inputs using the PMVPPDInputs class
  let {
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    standard,
    units,
    limit_inputs,
    round_output,
  } = parseInputs(PMV_PPD_ISO_INFO, inputs);

  if (units.toUpperCase() === Units.IP) {
    ({ tdb, tr, v: vr } = units_converter(Units.IP, { tdb, tr, v: vr }));
  }

  standard = standard.toLowerCase();

  let pmv = _pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme);

  let ppd_array =
    100.0 -
    95.0 *
      Math.exp(-0.03353 * Math.pow(pmv, 4.0) - 0.2179 * Math.pow(pmv, 2.0));

  // Checks that inputs are within the bounds accepted by the model if not return nan
  // ISO 7730 Clause 4 applicability limits
  const pa = rh * 10.0 * Math.exp(16.6536 - 4030.183 / (tdb + 235.0));

  const warnings: ModelWarning[] = [];
  const tdb_valid = _valid_range(
    tdb,
    PMV_PPD_ISO_INFO.inputs.tdb.applicability,
    "tdb",
    "input",
    PMV_PPD_ISO_INFO.inputs.tdb.unit,
    warnings,
  );
  const tr_valid = _valid_range(
    tr,
    PMV_PPD_ISO_INFO.inputs.tr.applicability,
    "tr",
    "input",
    PMV_PPD_ISO_INFO.inputs.tr.unit,
    warnings,
  );
  const v_valid = _valid_range(
    vr,
    PMV_PPD_ISO_INFO.inputs.vr.applicability,
    "vr",
    "input",
    PMV_PPD_ISO_INFO.inputs.vr.unit,
    warnings,
  );
  const met_valid = _valid_range(
    met,
    PMV_PPD_ISO_INFO.inputs.met.applicability,
    "met",
    "input",
    PMV_PPD_ISO_INFO.inputs.met.unit,
    warnings,
  );
  const clo_valid = _valid_range(
    clo,
    PMV_PPD_ISO_INFO.inputs.clo.applicability,
    "clo",
    "input",
    PMV_PPD_ISO_INFO.inputs.clo.unit,
    warnings,
  );
  const pa_valid = _valid_range(
    pa,
    PMV_PPD_ISO_INFO.derived.pa.applicability,
    "pa",
    "derived",
    PMV_PPD_ISO_INFO.derived.pa.unit,
    warnings,
  );
  const pmv_valid = _valid_range(
    pmv,
    PMV_PPD_ISO_INFO.outputs.pmv.applicability,
    "pmv",
    "output",
    PMV_PPD_ISO_INFO.outputs.pmv.unit,
    warnings,
  );

  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid) ||
    Number.isNaN(pa_valid) ||
    Number.isNaN(pmv_valid)
  );
  pmv = limit_inputs && !all_valid ? NaN : pmv;
  ppd_array = limit_inputs && !all_valid ? NaN : ppd_array;

  const category = _mapping(
    Math.abs(pmv),
    PMV_CATEGORY_BINS_ISO_7730[standard as (typeof STANDARDS)[number]],
  );

  if (round_output) {
    pmv = round(pmv, 2);
    ppd_array = round(ppd_array, 1);
  }

  return buildOutputs(
    PMV_PPD_ISO_INFO,
    {
      pmv,
      ppd: ppd_array,
      tsv: _mapping(pmv, PMV_PPD_ISO_INFO.outputs.tsv.classifier),
      category,
    },
    warnings,
  );
}
