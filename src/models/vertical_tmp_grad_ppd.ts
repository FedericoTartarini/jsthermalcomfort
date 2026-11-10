import { pmv_ppd_ashrae, PMV_PPD_ASHRAE_INFO } from "./pmv_ppd_ashrae.ts";
import {
  _check_ashrae55_compliance,
  ASHRAE_55_COMPLIANCE_STANDARDS,
  ASHRAE_55_LIMITS,
} from "../_internal/ashrae55.ts";
import { parseInputs } from "../_internal/define.ts";
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
import { _as_flag } from "../_internal/validation.ts";
import { Standard } from "../utilities/options.ts";

export const VERTICAL_TMP_GRAD_PPD_INFO = deepFreeze({
  name: "vertical_tmp_grad_ppd",
  label: "Vertical air temperature gradient",
  standards: ASHRAE_55_COMPLIANCE_STANDARDS,
  inputs: {
    tdb: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tdb },
    tr: { kind: "numeric", unit: "°C", applicability: ASHRAE_55_LIMITS.tr },
    vr: {
      kind: "numeric",
      unit: "m/s",
      applicability: ASHRAE_55_LIMITS.v_limited,
    },
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
    vertical_tmp_grad: { kind: "numeric", unit: "°C/m" },
    round_output: { kind: "bool", default: true },
    limit_inputs: { kind: "bool", default: true },
  },
  outputs: {
    ppd_vg: { kind: "numeric", nullable: true, unit: "%" },
    acceptability: { kind: "flag", nullable: true, unit: null },
  },
} as const satisfies ModelInfo);

/** @interface */
export type VerticalTGradPPDInputs = InputsOf<
  typeof VERTICAL_TMP_GRAD_PPD_INFO
>;

/**
 * Dataclass to represent the Predicted Percentage of Dissatisfied (PPD) with
 * vertical temperature gradient.
 *
 * @interface
 */
export type VerticalTGradPPD = OutputsOf<typeof VERTICAL_TMP_GRAD_PPD_INFO>;

/**
 * Calculate the percentage of thermally dissatisfied people with a vertical
 * temperature gradient between feet and head [55ASHRAE2023](../../docs/references.md#55ashrae2023). This equation is only
 * applicable for vr < 0.2 m/s (40 fpm). The model subtracts a baseline of 34.5 % of
 * dissatisfied occupants; when the result would be negative, ppd_vg is 0.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 *
 * > [!NOTE]
 * > The air temperature is the average value over two heights: 0.6 m (24 in.)
 * > and 1.1 m (43 in.) for seated occupants
 * > and 1.1 m (43 in.) and 1.7 m (67 in.) for standing occupants.
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.vr - Relative air speed, [m/s].
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
 * @param inputs.vertical_tmp_grad - Vertical temperature gradient between the feet and the head, [°C/m].
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param inputs.limit_inputs - By default, if the inputs are outside the standard applicability limits the
 * function returns nan. If False, returns values even if input values are
 * outside the applicability limits of the model. Defaults to True. The
 * applicability limits are 10 <= tdb [°C] <= 40, 10 <= tr [°C] <= 40,
 * 0 <= vr [m/s] <= 0.2, 1 <= met [met] <= 4, and 0 <= clo [clo] <= 1.5.
 *
 * @returns A dataclass containing the Predicted Percentage of Dissatisfied occupants with vertical temperature gradient and acceptability.
 * See {@link VerticalTGradPPD} for more details.
 * To access the `ppd_vg` and `acceptability` values, use the corresponding attributes of the returned `VerticalTGradPPD` instance, e.g., `result.ppd_vg`.
 *
 * - `ppd_vg` - Predicted Percentage of Dissatisfied occupants with vertical temperature gradient.
 * - `acceptability` - 1.0 if the vertical air temperature difference is acceptable (PPD_vg ≤ 5 %),
 *   0.0 if not, and NaN where the inputs are outside the applicability limits.
 *
 * @example
 * ```ts
 * import { vertical_tmp_grad_ppd } from "jsthermalcomfort/models";
 *
 * const result = vertical_tmp_grad_ppd({
 *   tdb: 25,
 *   tr: 25,
 *   vr: 0.1,
 *   rh: 50,
 *   met: 1.2,
 *   clo: 0.5,
 *   vertical_tmp_grad: 7,
 * });
 * console.log(result.ppd_vg); // 12.6
 * console.log(result.acceptability); // false
 * ```
 */
export function vertical_tmp_grad_ppd(
  inputs: VerticalTGradPPDInputs,
): VerticalTGradPPD {
  // Validate inputs using the VerticalTGradPPDInputs class
  const {
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    vertical_tmp_grad,
    round_output,
    limit_inputs,
  } = parseInputs(VERTICAL_TMP_GRAD_PPD_INFO, inputs);

  const warnings: ModelWarning[] = [];
  const pmv_result = toComputedOutputs(
    PMV_PPD_ASHRAE_INFO,
    pmv_ppd_ashrae({
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      standard: Standard.ashrae_55_2023,
      limit_inputs: false,
    }),
  );
  // With limit_inputs=False upstream's call warns only its notices (deviation vertical_tmp_grad_ppd-3).
  warnings.push(...pmv_result.warnings.filter((row) => row.kind === "notice"));
  const tsv = pmv_result.pmv;
  const numerator = Math.exp(
    0.13 * (tsv - 1.91) ** 2 + 0.15 * vertical_tmp_grad - 1.6,
  );
  // 34.5 % baseline subtracted, negative values set to zero (Liu et al. 2020, eq. 3)
  let ppd_val = Math.max((numerator / (1 + numerator) - 0.345) * 100, 0.0);
  let acceptability = _as_flag(ppd_val <= 5, !Number.isNaN(ppd_val));

  if (round_output) {
    ppd_val = round(ppd_val, 1);
  }

  const [tdb_valid, tr_valid, met_valid, clo_valid, v_limited_valid] =
    _check_ashrae55_compliance(
      {
        tdb,
        tr,
        v_limited: vr,
        met,
        clo,
      },
      warnings,
    );

  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid) ||
    Number.isNaN(v_limited_valid)
  );

  ppd_val = limit_inputs && !all_valid ? NaN : ppd_val;
  acceptability = limit_inputs && !all_valid ? NaN : acceptability;

  return buildOutputs(
    VERTICAL_TMP_GRAD_PPD_INFO,
    {
      ppd_vg: ppd_val,
      acceptability,
    },
    warnings,
  );
}
