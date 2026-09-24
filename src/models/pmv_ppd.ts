import {
  round,
  units_converter,
  validateInputs,
  ASHRAE_55_LIMITS,
  _ashrae_airspeed_bounds_broken,
  ISO_7730_LIMITS,
  is_iso_7730,
  Standard,
} from "../utilities/utilities.js";
import { cooling_effect } from "./cooling_effect.ts";
import { classifyFromBins } from "./classifierBins.ts";
import { deepFreeze } from "./modelDocs.ts";
import type {
  ApplicabilityWarning,
  Bound,
  ClassifierBins,
  ModelInfo,
} from "./modelDocs.ts";

/**
 * The parameters the PMV wrappers share, keyed like upstream's keyword
 * arguments (ADR 0002). `standard` is upstream's `model` (ADR 0003). The
 * wrappers' own params types narrow it to what each standard accepts.
 *
 * @property { number } tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @property { number } tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @property { number } vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @property { number } rh - relative humidity, [%]
 * @property { number } met - metabolic rate
 * @property { number } clo - clothing insulation
 * @property { number } [wme=0] - external work
 * @property { PmvStandard } [standard="7730-2025"] - comfort standard used for calculation
 * @property {'SI'|'IP'} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * @property { boolean } limit_inputs - Default is True. By default, if the inputs are outside the standard applicability
 *    limits the function returns NaN. If false, returns pmv and ppd values even if input values are outside
 *    the applicability limits of the model.
 *
 *    The ASHRAE 55 2020 limits are 10 < tdb [°C] < 40, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 2, 1 < met [met] < 4, and 0 < clo [clo] < 1.5.
 *    The ISO 7730 2005 limits are 10 < tdb [°C] < 30, 10 < tr [°C] < 40,
 *    0 < vr [m/s] < 1, 0.8 < met [met] < 4, 0 < clo [clo] < 2, and -2 < PMV < 2.
 * @property { boolean } airspeed_control - This only applies if standard = "ASHRAE".
 *
 *    Default is True. By default, it is assumed that the occupant has control over the airspeed.
 *    In this case, the ASHRAE 55 Standard does not impose any airspeed limits.
 *    On the other hand, if the occupant has no control over the airspeed,
 *    the ASHRAE 55 imposes an upper limit for v which varies as a function of
 *    the operative temperature, for more information please consult the Standard.
 * @property { boolean } round_output - If true, rounds pmv to 2 decimal places and ppd to 1. Defaults to true.
 * @property { boolean } suppress_warnings - If true, writes nothing to the console when the ASHRAE cooling effect
 *    cannot be calculated and is assumed to be 0. Defaults to false. The returned `warnings` are unaffected.
 */
export interface PmvPpdParams {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme?: number;
  standard?: PmvStandard;
  units?: "SI" | "IP";
  limit_inputs?: boolean;
  airspeed_control?: boolean;
  round_output?: boolean;
  suppress_warnings?: boolean;
}

/**
 * @property { number } pmv - Predicted Mean Vote
 * @property { number } ppd - Predicted Percentage of Dissatisfied occupants, [%]
 * @property { string|number } tsv - Thermal Sensation Vote category, or NaN if pmv is NaN. Classified from the returned pmv, so from the rounded one when `round_output` is true.
 * @property { boolean|number } [compliance] - ASHRAE 55 only: whether the unrounded pmv lies inside `PMV_COMPLIANCE_INTERVAL_ASHRAE`, or NaN when `limit_inputs` suppressed the pmv. Absent under ISO 7730.
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 */
export interface Pmv_ppdReturns {
  pmv: number;
  ppd: number;
  tsv: string | number;
  compliance?: boolean | number;
  readonly warnings: ApplicabilityWarning[];
}

/**
 * Thermal Sensation Vote bins used by pmv_ppd_iso (left-inclusive).
 * Note: pmv_ppd_ashrae uses right-inclusive; see pythermalcomfort#382.
 */
export const PMV_THERMAL_SENSATION_VOTE_BINS_ISO: Readonly<ClassifierBins> =
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
 * Thermal Sensation Vote bins used by pmv_ppd_ashrae (right-inclusive).
 * Note: pmv_ppd_iso uses left-inclusive; see pythermalcomfort#382.
 */
export const PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE: Readonly<ClassifierBins> =
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

/**
 * Model metadata for PMV / PPD (ISO 7730).
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * @public
 */
export const PMV_PPD_ISO_INFO: ModelInfo = deepFreeze({
  name: "pmv_ppd_iso",
  label: "PMV / PPD (ISO 7730)",
  description: "Predicted Mean Vote and Predicted Percentage Dissatisfied.",
  standards: [Standard.iso_7730_2025, Standard.iso_7730_2005],
  inputs: {
    tdb: { unit: "°C", applicability: ISO_7730_LIMITS.tdb },
    tr: { unit: "°C", applicability: ISO_7730_LIMITS.tr },
    vr: { unit: "m/s", applicability: ISO_7730_LIMITS.vr },
    met: { unit: "met", applicability: ISO_7730_LIMITS.met },
    clo: { unit: "clo", applicability: ISO_7730_LIMITS.clo },
    rh: { unit: "%" },
    wme: { unit: "met" },
  },
  outputs: {
    pmv: { unit: null, applicability: ISO_7730_LIMITS.pmv },
    ppd: { unit: "%" },
    tsv: { unit: null, classifier: PMV_THERMAL_SENSATION_VOTE_BINS_ISO },
  },
  derived: {
    // Computed from tdb and rh, not supplied by the caller. Exposed so a
    // front end can explain why a warm, humid combination that looks inside
    // every input limit still returns NaN.
    pa: { unit: "Pa", applicability: ISO_7730_LIMITS.pa },
  },
});

/**
 * Model metadata for PMV / PPD (ASHRAE 55).
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * No `derived` row and no `pmv` applicability: ASHRAE 55 bounds neither
 * vapour pressure nor the PMV output, and `pmv_ppd` gates both under ISO 7730
 * only (`if (iso) check("pa", ...)` and `if (iso) check("pmv", ...)` above).
 * The airspeed limits that apply when the occupant cannot control the
 * airspeed depend on the call (operative temperature, met and clo), so they
 * have no fixed `Bound` here; a call that breaks one reports it in
 * `warnings` with a bound built for that call.
 *
 * @public
 */
export const PMV_PPD_ASHRAE_INFO: ModelInfo = deepFreeze({
  name: "pmv_ppd_ashrae",
  label: "PMV / PPD (ASHRAE 55)",
  description:
    "Predicted Mean Vote and Predicted Percentage Dissatisfied, with the ASHRAE 55 cooling effect of elevated air speed.",
  standards: [Standard.ashrae_55_2023],
  inputs: {
    tdb: { unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: { unit: "m/s", applicability: ASHRAE_55_LIMITS.vr },
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
 * The standards PMV implements: pythermalcomfort's pmv_ppd_iso and
 * pmv_ppd_ashrae accept only these. Both the `standard` parameter's type and
 * the runtime schema come from this list, so any other Standard (ISO 7933, say)
 * is refused rather than checked against ASHRAE 55's bounds by default.
 */
const PMV_STANDARDS = [
  Standard.iso_7730_2005,
  Standard.iso_7730_2025,
  Standard.ashrae_55_2023,
] as const;

/** One of the standards `pmv_ppd` implements. */
export type PmvStandard = (typeof PMV_STANDARDS)[number];

/**
 * Returns Predicted Mean Vote ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV} ) and
 * Predicted Percentage of Dissatisfied ( {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD} )
 * calculated in accordance with main thermal comfort Standards. The PMV is an index that predicts the mean
 * value of the thermal sensation votes (self-reported perceptions) of a large group of people on a
 * sensation scale expressed from –3 to +3 corresponding to the categories:
 * cold, cool, slightly cool, neutral, slightly warm, warm, and hot. {@link #ref_1|[1]}
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the
 * ASHRAE 55 PMV equation, the SET is used to calculate the cooling effect first,
 * this is then subtracted from both the air and mean radiant temperatures, and the
 * differences are used as input to the PMV model, while the airspeed is set to 0.1m/s.
 * Please read more in the Note below.
 *
 * Notes:
 *
 * You can use this function to calculate the {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PMV}
 * and {@link https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method|PPD} in accordance with
 * either the ASHRAE 55 2020 Standard {@link #ref_1|[1]} or the ISO 7730 Standard {@link #ref_2|[2]}.
 *
 * This is a version that supports scalar arguments.
 *
 * Not exported from the package: upstream has no public `pmv_ppd`, only the
 * `pmv_ppd_iso` and `pmv_ppd_ashrae` wrappers, which call this.
 *
 * @param { PmvPpdParams } params - the parameters, named as in pythermalcomfort.
 * @param { number } params.tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param { number } params.tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param { number } params.vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 *
 * Note: vr is the relative air speed caused by body movement and not the air
 * speed measured by the air speed sensor. The relative air speed is the sum of the
 * average air speed measured by the sensor plus the activity-generated air speed
 * (Vag). Where Vag is the activity-generated air speed caused by motion of
 * individual body parts. vr can be calculated using the function `v_relative` which is in .utilities.js.
 * @param { number } params.rh - relative humidity, [%]
 * @param { number } params.met - metabolic rate
 * @param { number } params.clo - clothing insulation
 *
 * Note: The activity as well as the air speed modify the insulation characteristics
 * of the clothing and the adjacent air layer. Consequently, the ISO 7730 states that
 * the clothing insulation shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects
 * for the effect of the body movement for met equal or higher than 1.2 met using
 * the equation clo = Icl × (0.6 + 0.4/met) The dynamic clothing insulation, clo,
 * can be calculated using the function `clo_dynamic` which is in .utilities.js.
 * @param { number } [params.wme=0] - external work
 * @param { PmvStandard } [params.standard="7730-2025"] - comfort standard used for calculation
 *
 * · If an ISO 7730 edition, then the ISO Equation is used
 *
 * · If "55-2023", then the ASHRAE Equation is used
 *
 * Note: While the PMV equation is the same for both the ISO and ASHRAE standards, the ASHRAE Standard Use of
 * the PMV model is limited to air speeds below 0.10m/s (20 fpm). When air speeds exceed 0.10 m/s (20 fpm), the comfort
 * zone boundaries are adjusted based on the SET model. This change was introduced by the
 * {@link https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf|Addendum_C to Standard 55-2020}
 * The switches (`units`, `limit_inputs`, `airspeed_control`, `round_output`,
 * `suppress_warnings`) are described on {@link PmvPpdParams}.
 *
 * @returns { Pmv_ppdReturns } - Result of pmv and ppd
 *
 * @example
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // Calculate relative air speed
 * const v_r = v_relative(v, met);
 * // Calculate dynamic clothing
 * const clo_d = clo_dynamic(clo, met);
 * const results = pmv_ppd({ tdb, tr, vr: v_r, rh, met, clo: clo_d });
 * console.log(results); // Output: { pmv: 0.06, ppd: 5.1 }
 * console.log(results.pmv); // Output: -0.06
 */
const PMV_PPD_SCHEMA = {
  tdb: { type: "number" },
  tr: { type: "number" },
  vr: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
  standard: { enum: PMV_STANDARDS },
  units: { enum: ["SI", "IP"], required: false },
  limit_inputs: { type: "boolean", required: false },
  airspeed_control: { type: "boolean", required: false },
  round_output: { type: "boolean", required: false },
  suppress_warnings: { type: "boolean", required: false },
};

/**
 * Partial water vapour pressure, using the Antoine relation ISO 7730 uses.
 *
 * Kept in one place so the PMV heat-loss terms and the ISO applicability
 * check cannot disagree at the boundary. Matches pythermalcomfort's
 * `pmv_ppd_iso` exactly.
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @returns {number} partial water vapour pressure, [Pa]
 */
function partial_vapour_pressure(tdb: number, rh: number): number {
  return rh * 10 * Math.exp(16.6536 - 4030.183 / (tdb + 235));
}

export function pmv_ppd(params: PmvPpdParams): Pmv_ppdReturns {
  let { tdb, tr, vr } = params;
  const { rh, met, clo } = params;
  // Destructuring defaults also apply to a key passed as undefined, so a
  // caller building `{ limit_inputs }` from a missing value keeps the gate on.
  const {
    wme = 0,
    standard = Standard.iso_7730_2025,
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
    PMV_PPD_SCHEMA,
  );

  if (units.toUpperCase() === "IP") {
    // Conversion from IP to SI units
    ({ tdb, tr, vr } = units_converter({ tdb, tr, vr }, "IP"));
  }

  // Computed from the SI inputs before the ASHRAE cooling effect shifts tdb.
  // ce is always 0 under ISO, so this is the same tdb either way, but taking
  // it here makes the independence explicit.
  const pa = partial_vapour_pressure(tdb, rh);

  // The rows a call broke (#199), built on every call whatever limit_inputs
  // is. Apart from a PMV the calculation itself failed to produce, they are
  // all the limit_inputs gate below reads, so a NaN and its explanation cannot
  // disagree. The checks and bounds are
  // pythermalcomfort's; unlike its warnings, the rows are also filled with
  // limit_inputs off, so a caller that shows out-of-range numbers can say why.
  // Inputs are taken here, before the ASHRAE cooling effect shifts them.
  const iso = is_iso_7730(standard);
  const input_limits = iso ? ISO_7730_LIMITS : ASHRAE_55_LIMITS;
  const warnings: ApplicabilityWarning[] = [];
  const check = (
    key: string,
    role: ApplicabilityWarning["role"],
    value: number,
    bound: Required<Bound>,
  ) => {
    // A NaN value is not outside the bound, so it adds no row.
    if (value < bound.min || value > bound.max) {
      warnings.push({ key, role, value, bound });
    }
  };
  for (const [key, value] of Object.entries({ tdb, tr, vr, met, clo })) {
    check(key, "input", value, input_limits[key]);
  }
  // ASHRAE 55's airspeed limits when the occupant cannot control the airspeed
  // are upper bounds only, and the operative-temperature one moves with the
  // call, so they arrive as bounds already broken rather than through check().
  if (!iso && airspeed_control === false) {
    for (const bound of _ashrae_airspeed_bounds_broken(tdb, tr, vr, met, clo)) {
      warnings.push({ key: "vr", role: "input", value: vr, bound });
    }
  }
  if (iso) check("pa", "derived", pa, ISO_7730_LIMITS.pa);

  let ce = 0;
  if (standard === Standard.ashrae_55_2023) {
    //if v_r is higher than 0.1 follow methodology ASHRAE Appendix H, H3
    // suppress_warnings has no pythermalcomfort counterpart: it stands in for
    // Python's warnings filter, which JavaScript lacks (see cooling_effect).
    // The inputs are SI by now, hence "SI" rather than units.
    ce =
      vr > 0.1
        ? cooling_effect({
            tdb,
            tr,
            vr,
            rh,
            met,
            clo,
            wme,
            units: "SI",
            suppress_warnings,
          }).ce
        : 0;
  }

  tdb = tdb - ce;
  tr = tr - ce;
  vr = ce > 0 ? 0.1 : vr;

  let pmv = _pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme);
  let ppd =
    100.0 -
    95.0 *
      Math.exp(-0.03353 * Math.pow(pmv, 4.0) - 0.2179 * Math.pow(pmv, 2.0));

  if (iso) check("pmv", "output", pmv, ISO_7730_LIMITS.pmv);

  // Checks that inputs are within the bounds accepted by the model if not return NaN
  const gated = limit_inputs && (isNaN(pmv) || warnings.length > 0);

  // ASHRAE 55 only, as upstream's pmv_ppd_ashrae computes it: from the
  // unrounded pmv, and NaN where limit_inputs finds an input out of bounds.
  // Upstream masks on the inputs alone, not on a NaN pmv, so neither does this.
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
  // label never disagrees with the number shown. Left-inclusive for ISO,
  // right-inclusive for ASHRAE (intentional divergence per pythermalcomfort#382).
  const bins = iso
    ? PMV_THERMAL_SENSATION_VOTE_BINS_ISO
    : PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE;
  const tsv = classifyFromBins(pmv, bins);

  return iso
    ? { pmv, ppd, tsv, warnings }
    : { pmv, ppd, tsv, compliance, warnings };
}

/**
 * @param {number} tdb
 * @param {number} tr
 * @param {number} vr
 * @param {number} rh
 * @param {number} met
 * @param {number} clo
 * @param {number} wme
 *
 * @returns {number} _pmv
 */
export function _pmv_ppd_optimized(
  tdb: number,
  tr: number,
  vr: number,
  rh: number,
  met: number,
  clo: number,
  wme: number,
): number {
  const pa = partial_vapour_pressure(tdb, rh);

  const icl = 0.155 * clo; //thermal insulation of the clothing in M2K/W
  const m = met * 58.15; //metabolic rate in W/M2
  const w = wme * 58.15; //external work in W/M2
  const mw = m - w; //internal heat production in the human body

  //calculation of the clothing area factor
  let f_cl;
  if (icl <= 0.078) {
    f_cl = 1 + 1.29 * icl; // ratio of surface clothed body over nude body
  } else {
    f_cl = 1.05 + 0.645 * icl;
  }

  //heat transfer coefficient by forced convection
  const hcf = 12.1 * Math.sqrt(vr);
  let hc = hcf;

  const taa = tdb + 273;
  const tra = tr + 273;
  // initial guess for clothing surface temperature, per ISO 7730:2025 Annex D
  const t_cla = taa + (35.5 - tdb) / (3.5 * (6.45 * icl + 0.1));

  const p1 = icl * f_cl;
  const p2 = p1 * 3.96;
  const p3 = p1 * 100;
  const p4 = p1 * taa;
  const p5 = 308.7 - 0.028 * mw + p2 * Math.pow(tra / 100.0, 4);
  let xn = t_cla / 100;
  let xf = t_cla / 50;
  const eps = 0.00015;

  let n = 0;

  while (Math.abs(xn - xf) > eps) {
    xf = (xf + xn) / 2;
    let hcn = 2.38 * Math.pow(Math.abs(100.0 * xf - taa), 0.25);
    if (hcf > hcn) {
      hc = hcf;
    } else {
      hc = hcn;
    }
    xn = (p5 + p4 * hc - p2 * Math.pow(xf, 4)) / (100 + p3 * hc);
    n += 1;
    if (n > 150) {
      throw new Error("Max iterations exceeded");
    }
  }

  const tcl = 100 * xn - 273;
  //heat loss diff. through skin
  const hl1 = 3.05 * 0.001 * (5733 - 6.99 * mw - pa);
  //heat loss by sweating
  let hl2;
  if (mw > 58.15) {
    hl2 = 0.42 * (mw - 58.15);
  } else {
    hl2 = 0;
  }
  //latent respiration heat loss
  const hl3 = 1.7 * 0.00001 * m * (5867 - pa);
  //dry respiration heat loss
  const hl4 = 0.0014 * m * (34 - tdb);
  //heat loss by radiation
  const hl5 = 3.96 * f_cl * (Math.pow(xn, 4) - Math.pow(tra / 100.0, 4));
  //heat loss by convection
  const hl6 = f_cl * hc * (tcl - tdb);

  const ts = 0.303 * Math.exp(-0.036 * m) + 0.028;

  return ts * (mw - hl1 - hl2 - hl3 - hl4 - hl5 - hl6);
}
