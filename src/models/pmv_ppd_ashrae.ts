import { _pmv_ppd_optimized } from "./_pmv_ppd_optimized.ts";
import { cooling_effect, COOLING_EFFECT_INFO } from "./cooling_effect.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_LIMITS,
  ASHRAE_55_STILL_AIR_THRESHOLD,
} from "../_internal/ashrae55.ts";
import type { ClassifierBins } from "../_internal/classifierBins.ts";
import { BASE_INPUTS_UNITS, parseInputs } from "../_internal/define.ts";
import {
  buildOutputs,
  deepFreeze,
  toComputedOutputs,
} from "../_internal/modelInfo.ts";
import type {
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _as_flag, _mapping } from "../_internal/validation.ts";
import { Standard, Units } from "../utilities/options.ts";
import { units_converter } from "../utilities/units_converter.ts";

/** Thermal sensation of each PMV range. Bins include their upper edge. */
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
  right: true,
} as const satisfies ClassifierBins);

const STANDARDS = deepFreeze([Standard.ashrae_55_2023] as const);

export const PMV_PPD_ASHRAE_INFO = deepFreeze({
  name: "pmv_ppd_ashrae",
  label: "PMV / PPD (ASHRAE 55)",
  standards: STANDARDS,
  inputs: {
    tdb: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: { kind: "numeric", unit: "m/s", applicability: ASHRAE_55_LIMITS.v },
    rh: { kind: "numeric", unit: "%" },
    met: {
      kind: "numeric",
      unit: "met",
      applicability: ASHRAE_55_LIMITS.met,
    },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: ASHRAE_55_LIMITS.clo,
    },
    wme: { kind: "numeric", unit: "met", default: 0 },
    standard: {
      kind: "choice",
      allowed: STANDARDS,
      default: Standard.ashrae_55_2023,
      message: (model: string) =>
        `Model '${model.toLowerCase()}' is not supported. Supported models are: ${Standard.ashrae_55_2023}.`,
    },
    units: BASE_INPUTS_UNITS,
    limit_inputs: { kind: "bool", default: true },
    airspeed_control: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    pmv: { kind: "numeric", nullable: true, unit: null },
    ppd: { kind: "numeric", nullable: true, unit: "%" },
    tsv: {
      kind: "label",
      nullable: true,
      unit: null,
      classifier: TSV_CATEGORIES,
    },
    compliance: {
      kind: "flag",
      nullable: true,
      unit: null,
      interval: { min: -0.5, max: 0.5 },
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type PMVPPDAshraeInputs = InputsOf<typeof PMV_PPD_ASHRAE_INFO>;

/**
 * Dataclass to represent the Predicted Mean Vote (PMV) and Predicted Percentage of
 * Dissatisfied (PPD) calculated in accordance with ASHRAE Standard 55.
 *
 * @interface
 */
export type PMVPPDAshrae = OutputsOf<typeof PMV_PPD_ASHRAE_INFO>;

/**
 * Return Predicted Mean Vote (PMV) and Predicted Percentage of Dissatisfied (PPD)
 * calculated in accordance with the ASHRAE 55 Standard.
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the
 * ASHRAE 55 PMV equation, the SET is used to calculate the cooling effect first,
 * this is then subtracted from both the air and mean radiant temperatures, and the
 * differences are used as input to the PMV model, while the airspeed is set to 0.1m/s.
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
 * > `clo_dynamic_ashrae`.
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.standard - Select the version of the ASHRAE 55 Standard to use. Currently, the only option available is "55-2023".
 * @param inputs.units - Select the SI (International System of Units) or the IP (Imperial Units) system. Supported values are
 * 'SI' and 'IP'. Defaults to 'SI'.
 * @param inputs.limit_inputs - If True, limits the inputs to the standard applicability limits. Defaults to True.
 *
 * > [!NOTE]
 * > By default, if the inputs are outside the standard applicability limits, the
 * > function returns NaN. If False returns pmv and ppd
 * > values even if input values are outside the applicability limits of the model.
 * >
 * > The ASHRAE 55 2020 limits are 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40,
 * > 0 <= vr [m/s] <= 2, 1 <= met [met] <= 4, and 0 <= clo [clo] <= 1.5.
 * @param inputs.airspeed_control - By default, this function assumes that the
 * occupant has control over the airspeed. In this case, the ASHRAE 55 Standard does
 * not impose any airspeed limits. On the other hand, if the occupant has no control
 * over the airspeed, the ASHRAE 55 imposes an upper limit for v which varies as a
 * function of the operative temperature, for more information please consult the
 * Standard.
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 *
 * @returns A dataclass containing the Predicted Mean Vote and Predicted Percentage of
 * Dissatisfied. See {@link PMVPPDAshrae} for
 * more details. To access the `pmv`, `ppd`, `tsv`, and `compliance` values, use the corresponding
 * attributes of the returned `PMVPPDAshrae` instance, e.g., `result.pmv`, `result.compliance`.
 *
 * - `pmv` - Predicted Mean Vote.
 * - `ppd` - Predicted Percentage of Dissatisfied.
 * - `tsv` - Predicted thermal sensation vote.
 * - `compliance` - 1.0 if PMV is within the acceptable range (-0.5 < PMV < 0.5) according to
 *   ASHRAE Standard 55-2023, 0.0 if not, and NaN where the inputs are outside the
 *   applicability limits (``limit_inputs=True``).
 *
 * @example
 * ```ts
 * import { pmv_ppd_ashrae } from "jsthermalcomfort/models";
 * import { clo_dynamic_ashrae } from "jsthermalcomfort/utilities";
 * import { v_relative } from "jsthermalcomfort/environment";
 *
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 * // calculate relative air speed
 * const v_r = v_relative(v, met);
 * // calculate dynamic clothing
 * const clo_d = clo_dynamic_ashrae(clo, met);
 * const results = pmv_ppd_ashrae({
 *   tdb,
 *   tr,
 *   vr: v_r,
 *   rh,
 *   met,
 *   clo: clo_d,
 *   standard: "55-2023",
 * });
 * console.log(results.pmv); // -0
 * console.log(results.ppd); // 5
 * console.log(results.compliance); // true
 *
 * const result = [22, 25, 28].map((tdb) =>
 *   pmv_ppd_ashrae({
 *     tdb,
 *     tr: 25,
 *     vr: 0.1,
 *     rh: 50,
 *     met: 1.4,
 *     clo: 0.5,
 *     standard: "55-2023",
 *   }),
 * );
 * console.log(result.map(({ pmv }) => pmv)); // [-0, 0.41, 0.81]
 * console.log(result.map(({ ppd }) => ppd)); // [5, 8.5, 19]
 * console.log(result.map(({ tsv }) => tsv)); // ["Neutral", "Neutral", "Slightly Warm"]
 * console.log(result.map(({ compliance }) => compliance)); // [true, true, false]
 * ```
 */
export function pmv_ppd_ashrae(inputs: PMVPPDAshraeInputs): PMVPPDAshrae {
  // Validate inputs using the PMVPPDInputs class
  let {
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    units,
    limit_inputs,
    airspeed_control,
    round_output,
  } = parseInputs(PMV_PPD_ASHRAE_INFO, inputs);

  if (units.toUpperCase() === Units.IP) {
    ({ tdb, tr, v: vr } = units_converter(Units.IP, { tdb, tr, v: vr }));
  }

  const warnings: ModelWarning[] = [];
  // if v_r is higher than 0.1 follow methodology ASHRAE Appendix H, H3
  const cooling = toComputedOutputs(
    COOLING_EFFECT_INFO,
    cooling_effect({ tdb, tr, vr, rh, met, clo, wme }),
  );
  warnings.push(...cooling.warnings);
  const ce = vr > ASHRAE_55_STILL_AIR_THRESHOLD ? cooling.ce : 0.0;

  const tdb_ce = tdb - ce;
  const tr_ce = tr - ce;
  const vr_ce = ce > 0 ? ASHRAE_55_STILL_AIR_THRESHOLD : vr;

  let pmv_array = _pmv_ppd_optimized(tdb_ce, tr_ce, vr_ce, rh, met, clo, wme);

  let ppd_array =
    100.0 -
    95.0 *
      Math.exp(
        -0.03353 * Math.pow(pmv_array, 4.0) - 0.2179 * Math.pow(pmv_array, 2.0),
      );

  const { interval } = PMV_PPD_ASHRAE_INFO.outputs.compliance;
  // 1.0 if -0.5 < PMV < 0.5, otherwise 0.0, and NaN where PMV is undefined
  let compliance_array = _as_flag(
    pmv_array > interval.min && pmv_array < interval.max,
    !Number.isNaN(pmv_array),
  );

  const [tdb_valid, tr_valid, v_valid, met_valid, clo_valid] =
    _check_ashrae55_compliance(
      {
        tdb,
        tr,
        v: vr,
        met,
        clo,
        airspeed_control,
        v_param_name: "vr",
      },
      warnings,
    );
  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid)
  );
  pmv_array = limit_inputs && !all_valid ? NaN : pmv_array;
  ppd_array = limit_inputs && !all_valid ? NaN : ppd_array;
  compliance_array = limit_inputs && !all_valid ? NaN : compliance_array;

  if (round_output) {
    pmv_array = round(pmv_array, 2);
    ppd_array = round(ppd_array, 1);
  }

  return buildOutputs(
    PMV_PPD_ASHRAE_INFO,
    {
      pmv: pmv_array,
      ppd: ppd_array,
      tsv: _mapping(pmv_array, PMV_PPD_ASHRAE_INFO.outputs.tsv.classifier),
      compliance: compliance_array,
    },
    warnings,
  );
}
